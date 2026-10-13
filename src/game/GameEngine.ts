import * as THREE from 'three';
import {
  ActiveIncident,
  AircraftTelemetry,
  AnnouncementOption,
  CabinMess,
  CargoCrate,
  FlightPhase,
  FlightRoute,
  HeldObjectInfo,
  InteractionTarget,
  LuggageItem,
  MealType,
  PassengerData,
  PeerPlayer,
  PlayerControlMode,
  PreflightChecklistState,
  SkydivingState,
} from '../types/game';
import {
  AircraftParts,
  buildPassengerAircraft,
  createDeployedCanopyMesh,
  createParachuteBackpackMesh,
} from './AircraftBuilder';
import { ANNOUNCEMENT_OPTIONS, createInitialScenario } from './GameCatalog';
import { PhysicsWorld, PlayerPhysicsState, VehiclePhysicsState } from './PhysicsWorld';
import { buildAirportAndFlightWorld, WorldObjects } from './WorldBuilder';
import { soundEngine } from '../services/SoundEngine';
import { multiplayerClient, MultiplayerMessage } from '../services/multiplayerClient';

export interface GameUIStateSnapshot {
  controlMode: PlayerControlMode;
  flightPhase: FlightPhase;
  telemetry: AircraftTelemetry;
  checklist: PreflightChecklistState;
  interactionTarget: InteractionTarget | null;
  heldObject: HeldObjectInfo | null;
  passengers: PassengerData[];
  cargo: CargoCrate[];
  activeIncident: ActiveIncident | null;
  activeSubtitle: string | null;
  toastBanner: { text: string; tone: 'info' | 'warning' | 'success' | 'danger' } | null;
  inspectingPassenger: PassengerData | null;
  showManifestModal: boolean;
  showAnnouncementMenu: boolean;
  showGalleyMenu: boolean;
  showControlsDrawer: boolean;
  pointerLocked: boolean;
  peers: PeerPlayer[];
  skydiving: SkydivingState | null;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private physics: PhysicsWorld;
  private aircraft: AircraftParts;
  private world: WorldObjects;

  private route: FlightRoute;
  private unlockedUpgrades: string[] = [];
  private onStateChange: (snapshot: GameUIStateSnapshot) => void;
  private onFlightEnded: (outcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'CRASHED') => void;

  private controlMode: PlayerControlMode = 'ON_FOOT';
  private flightPhase: FlightPhase = 'PREFLIGHT';
  private telemetry: AircraftTelemetry;
  private player: PlayerPhysicsState;
  private heldObject: HeldObjectInfo | null = null;

  private passengers: PassengerData[] = [];
  private luggage: LuggageItem[] = [];
  private cargo: CargoCrate[] = [];
  private messes: CabinMess[] = [];
  private manifestInspected: boolean = false;
  private mealsPreparedCount: number = 0;
  private announcementsMade: Set<string> = new Set();
  private incidentsResolvedCount: number = 0;

  private entityGroup: THREE.Group;
  private passengerMeshes: Map<string, { group: THREE.Group; beltMesh: THREE.Mesh; badgeMesh: THREE.Mesh }> = new Map();
  private luggageMeshes: Map<string, THREE.Mesh> = new Map();
  private cargoMeshes: Map<string, THREE.Group> = new Map();
  private messMeshes: Map<string, THREE.Mesh> = new Map();
  private heldItemViewGroup: THREE.Group;
  private peerMeshes: Map<string, THREE.Group> = new Map();

  private tugState: VehiclePhysicsState = {
    position: new THREE.Vector3(-5.4, 0, -7.2),
    yaw: 0,
    speed: 0,
    steerAngle: 0,
  };
  private fuelTruckState: VehiclePhysicsState = {
    position: new THREE.Vector3(11.5, 0, -6.5),
    yaw: 0,
    speed: 0,
    steerAngle: 0,
  };
  private cartAttachedToTug: boolean = false;

  private interactionTarget: InteractionTarget | null = null;
  private activeIncident: ActiveIncident | null = null;
  private activeSubtitle: string | null = null;
  private subtitleTimeout: number | null = null;
  private toastBanner: { text: string; tone: 'info' | 'warning' | 'success' | 'danger' } | null = null;
  private toastTimeout: number | null = null;
  private inspectingPassengerId: string | null = null;
  private showManifestModal: boolean = false;
  private showAnnouncementMenu: boolean = false;
  private showGalleyMenu: boolean = false;
  private showControlsDrawer: boolean = false;
  private skydivingState: SkydivingState | null = null;
  private skydiveCanopyMesh: THREE.Group | null = null;
  private skydiveBodyMesh: THREE.Group | null = null;
  private chaseCameraPos: THREE.Vector3 = new THREE.Vector3(45, 12, 50);
  private orbitYaw: number = 0;
  private orbitPitch: number = 0.28;
  private orbitDist: number = 42;

  private keys: Set<string> = new Set();
  private pointerLocked: boolean = false;
  private isDraggingLook: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private animFrameId: number | null = null;
  private lastFrameTime: number = performance.now();
  private uiSyncAccumulator: number = 0;
  private netSyncAccumulator: number = 0;
  private turbulenceTimer: number = 0;
  private incidentCooldown: number = 14;
  private isPaused: boolean = false;
  private flightEndedTriggered: boolean = false;
  private peers: Map<string, PeerPlayer> = new Map();
  private unsubMultiplayer: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    route: FlightRoute,
    unlockedUpgrades: string[],
    onStateChange: (snapshot: GameUIStateSnapshot) => void,
    onFlightEnded: (outcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'CRASHED') => void
  ) {
    this.container = container;
    this.route = route;
    this.unlockedUpgrades = unlockedUpgrades;
    this.onStateChange = onStateChange;
    this.onFlightEnded = onFlightEnded;

    this.physics = new PhysicsWorld();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0ea5e9);
    this.scene.fog = new THREE.FogExp2(0x7dd3fc, 0.00028);

    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      5500
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.85);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
    sunLight.position.set(120, 220, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 650;
    const d = 95;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    this.world = buildAirportAndFlightWorld();
    this.scene.add(this.world.worldGroup);

    this.aircraft = buildPassengerAircraft();
    this.scene.add(this.aircraft.root);

    this.entityGroup = new THREE.Group();
    this.aircraft.root.add(this.entityGroup);

    this.heldItemViewGroup = new THREE.Group();
    this.camera.add(this.heldItemViewGroup);
    this.scene.add(this.camera);

    this.telemetry = this.createInitialTelemetry();
    this.player = {
      localPos: new THREE.Vector3(-7.8, 0, -9.5),
      velocity: new THREE.Vector3(),
      yaw: -Math.PI / 2,
      pitch: 0.05,
      grounded: true,
      insideCabin: false,
    };

    this.resetScenario(this.route);
    this.bindEvents();
    this.setupMultiplayerListeners();
    this.startLoop();
  }

  private createInitialTelemetry(): AircraftTelemetry {
    return {
      airspeedKts: 0,
      altitudeFt: 0,
      headingDeg: 0,
      pitchDeg: 0,
      rollDeg: 0,
      verticalSpeedFpm: 0,
      throttlePct: 0,
      fuelPct: 100,
      gearDown: true,
      flapsDeg: 15,
      brakesOn: false,
      parkingBrake: true,
      spoilersExtended: false,
      reverseThrust: false,
      cabinDoorClosed: false,
      cargoDoorClosed: false,
      enginesRunning: false,
      airframeHealth: 100,
      distanceToDestMeters: 2200,
      lateralOffsetMeters: -45,
      onGround: true,
      inTurbulence: false,
      cameraView: 'COCKPIT',
      autopilotHold: true,
      navLights: true,
      beaconLights: false,
      strobeLights: false,
      landingLights: false,
      cabinLights: true,
      radioFreq: '118.70',
    };
  }

  public resetScenario(newRoute?: FlightRoute) {
    if (newRoute) this.route = newRoute;
    this.controlMode = 'ON_FOOT';
    this.flightPhase = 'PREFLIGHT';
    this.telemetry = this.createInitialTelemetry();
    this.flightEndedTriggered = false;
    this.heldObject = null;
    this.updateHeldItemVisual();

    this.aircraft.root.position.set(0, 0, 0);
    this.aircraft.root.rotation.set(0, 0, 0);

    this.player.localPos.set(-7.8, 0, -9.5);
    this.player.velocity.set(0, 0, 0);
    this.player.yaw = -Math.PI / 2;
    this.player.pitch = 0.04;
    this.player.grounded = true;
    this.player.insideCabin = false;

    const scenario = createInitialScenario(this.route);
    this.passengers = scenario.passengers;
    this.luggage = scenario.luggage;
    this.cargo = scenario.cargo;
    this.messes = scenario.messes;
    this.manifestInspected = false;
    this.mealsPreparedCount = 0;
    this.announcementsMade.clear();
    this.incidentsResolvedCount = 0;
    this.activeIncident = null;
    this.inspectingPassengerId = null;
    this.showManifestModal = false;
    this.showAnnouncementMenu = false;
    this.showGalleyMenu = false;

    this.rebuildScenarioMeshes();
    this.triggerToast(
      `Flight ${this.route.flightNumber} (${this.route.departureCode} → ${this.route.destinationCode}): Board via the stairs and complete pre-flight tasks!`,
      'info'
    );
    this.emitUIState();
  }

  private rebuildScenarioMeshes() {
    while (this.entityGroup.children.length > 0) {
      const child = this.entityGroup.children[0];
      child.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
          mesh.geometry.dispose();
        }
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : mesh.material
          ? [mesh.material]
          : [];
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          material.dispose();
        }
      });
      this.entityGroup.remove(child);
    }
    this.passengerMeshes.clear();
    this.luggageMeshes.clear();
    this.cargoMeshes.clear();
    this.messMeshes.clear();

    for (const pax of this.passengers) {
      const grp = new THREE.Group();
      grp.position.set(pax.position.x, pax.position.y, pax.position.z);

      const torsoMat = new THREE.MeshStandardMaterial({ color: pax.outfitColor, roughness: 0.5 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.24), torsoMat);
      torso.position.set(0, 0.68, 0);
      grp.add(torso);

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), skinMat);
      head.position.set(0, 1.08, 0);
      grp.add(head);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      for (const ex of [-0.055, 0.055]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
        eye.position.set(ex, 1.1, -0.145);
        grp.add(eye);
      }

      const beltMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.05, 0.28),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      beltMesh.position.set(0, 0.48, -0.02);
      beltMesh.visible = pax.seatbeltFastened;
      grp.add(beltMesh);

      const badgeMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.09, 0),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      badgeMesh.position.set(0, 1.42, 0);
      grp.add(badgeMesh);

      this.entityGroup.add(grp);
      this.passengerMeshes.set(pax.id, { group: grp, beltMesh, badgeMesh });
    }

    for (const bag of this.luggage) {
      const bagMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.34, 0.62),
        new THREE.MeshStandardMaterial({ color: bag.color, roughness: 0.4, metalness: 0.1 })
      );
      bagMesh.position.set(bag.position.x, bag.position.y, bag.position.z);
      bagMesh.castShadow = true;
      this.entityGroup.add(bagMesh);
      this.luggageMeshes.set(bag.id, bagMesh);
    }

    for (const item of this.cargo) {
      const crateGrp = new THREE.Group();
      crateGrp.position.set(item.position.x, item.position.y, item.position.z);

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.62, 0.68),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.3 })
      );
      box.castShadow = true;
      crateGrp.add(box);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.14, 0.7),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      crateGrp.add(stripe);

      this.entityGroup.add(crateGrp);
      this.cargoMeshes.set(item.id, crateGrp);
    }

    for (const mess of this.messes) {
      let mesh: THREE.Mesh;
      if (mess.type === 'SPILL' || mess.type === 'GOO') {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.36, 0.025, 16),
          new THREE.MeshBasicMaterial({
            color: mess.type === 'SPILL' ? 0xf97316 : 0x84cc16,
          })
        );
      } else {
        mesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.18, 0),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 })
        );
      }
      mesh.position.set(mess.position.x, mess.position.y, mess.position.z);
      this.entityGroup.add(mesh);
      this.messMeshes.set(mess.id, mesh);
    }
  }

  private updateHeldItemVisual() {
    while (this.heldItemViewGroup.children.length > 0) {
      this.heldItemViewGroup.remove(this.heldItemViewGroup.children[0]);
    }
    if (!this.heldObject) return;

    let mesh: THREE.Mesh;
    if (this.heldObject.kind === 'LUGGAGE') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.2, 0.38),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
      );
    } else if (this.heldObject.kind === 'CARGO') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.32, 0.32),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.06, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
      );
    }
    mesh.position.set(0.38, -0.28, -0.65);
    mesh.rotation.y = -0.25;
    this.heldItemViewGroup.add(mesh);
  }

  private findBestInteractionTarget(): InteractionTarget | null {
    if (this.controlMode === 'IN_COCKPIT') {
      return {
        id: 'exit_pilot_seat',
        type: 'PILOT_SEAT',
        prompt: 'Press E to exit pilot seat (Return to cabin walk mode)',
        subPrompt: 'Autopilot attitude hold will stabilize wings while you are out of the seat',
        distance: 0,
      };
    }

    const eyeLocal = new THREE.Vector3(
      this.player.localPos.x,
      this.player.localPos.y + 1.55,
      this.player.localPos.z
    );
    const lookDir = new THREE.Vector3(
      -Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
      Math.sin(this.player.pitch),
      -Math.cos(this.player.yaw) * Math.cos(this.player.pitch)
    ).normalize();

    const candidates: Array<InteractionTarget & { score: number }> = [];

    const consider = (
      targetPos: THREE.Vector3,
      maxDist: number,
      item: Omit<InteractionTarget, 'distance'>,
      isPassenger: boolean = false
    ) => {
      const toTarget = new THREE.Vector3().subVectors(targetPos, eyeLocal);
      const dist = toTarget.length();
      if (dist > maxDist) return;

      const dir = toTarget.clone().normalize();
      const dot = lookDir.dot(dir);
      if (dot < 0.15 && dist > 1.2) return;

      if (isPassenger) {
        // High-precision reticle targeting for passengers:
        // Calculates perpendicular distance from the player's crosshair ray to the passenger center.
        // Even when an aisle passenger is radially closer, aiming directly at the window seat yields
        // a near-zero perpDist, allowing the window passenger to be cleanly selected.
        const proj = toTarget.dot(lookDir);
        if (proj < 0.2) return;
        const perpDist = toTarget.clone().sub(lookDir.clone().multiplyScalar(proj)).length();
        // Strongly weight reticle aim alignment over raw distance
        const score = perpDist * 4.5 + proj * 0.25;
        candidates.push({ ...item, distance: dist, score });
      } else {
        const score = dist - dot * 1.6;
        candidates.push({ ...item, distance: dist, score });
      }
    };

    if (!this.player.insideCabin) {
      if (!this.telemetry.cabinDoorClosed) {
        consider(new THREE.Vector3(-5.2, 0.8, -9.5), 3.8, {
          id: 'board_stairs',
          type: 'BOARD_STAIRS',
          prompt: 'Press E to board aircraft (or walk directly up the stairs)',
          subPrompt: 'Enters the forward cabin vestibule',
        });
      }

      consider(new THREE.Vector3(this.tugState.position.x, 0.65, this.tugState.position.z), 4.2, {
        id: 'tug_vehicle',
        type: 'DRIVE_TUG',
        prompt: 'Press E to Drive Baggage Tug',
        subPrompt: 'Tow luggage carts to cargo hold & drive across tarmac (WASD)',
      });

      consider(new THREE.Vector3(this.fuelTruckState.position.x, 1.2, this.fuelTruckState.position.z), 4.8, {
        id: 'fuel_truck_vehicle',
        type: 'FUEL_TRUCK',
        prompt: 'Press E to Refuel Aircraft & Drive Fuel Truck',
        subPrompt: 'Fills twin wing fuel tanks to 100% (WASD to drive tanker)',
      });
    }

    consider(new THREE.Vector3(-1.75, 2.35, -9.5), 3.1, {
      id: 'cabin_door',
      type: 'CABIN_DOOR',
      prompt: this.telemetry.cabinDoorClosed
        ? 'Press E to open forward cabin door'
        : 'Press E to close & arm forward cabin door',
      subPrompt: this.telemetry.cabinDoorClosed
        ? 'Deploys mobile boarding staircase'
        : 'Required before engine start and taxi',
    });

    consider(new THREE.Vector3(-0.58, 2.2, -15.0), 2.9, {
      id: 'pilot_seat',
      type: 'PILOT_SEAT',
      prompt: 'Press E to enter pilot seat & flight controls',
      subPrompt: 'Locks into cockpit HUD (W/S Pitch, A/D Roll/Steer, Shift/Ctrl Throttle)',
    });

    if (this.activeIncident && !this.activeIncident.resolved) {
      const incPos = new THREE.Vector3(
        this.activeIncident.targetPosition.x,
        this.activeIncident.targetPosition.y,
        this.activeIncident.targetPosition.z
      );
      consider(incPos, 3.5, {
        id: `incident_${this.activeIncident.id}`,
        type: 'INCIDENT_FIX',
        prompt: `Press E to ${this.activeIncident.actionPrompt}`,
        subPrompt: `EMERGENCY: ${this.activeIncident.title} (${Math.ceil(this.activeIncident.timerSeconds)}s left!)`,
      });
    }

    if (!this.heldObject) {
      for (const bag of this.luggage) {
        if (bag.state === 'ON_CART' || bag.state === 'LOOSE_CABIN') {
          consider(new THREE.Vector3(bag.position.x, bag.position.y + 0.2, bag.position.z), 3.4, {
            id: bag.id,
            type: 'LUGGAGE',
            refId: bag.id,
            prompt:
              bag.state === 'LOOSE_CABIN'
                ? `Press E to secure loose suitcase (${bag.ownerName})`
                : `Press E to pick up suitcase (${bag.ownerName})`,
            subPrompt: 'Carry into cabin overhead bins or rear cargo hold',
          });
        }
      }
    }

    if (this.heldObject?.kind === 'LUGGAGE') {
      for (const zBin of [-5.5, -2.0, 1.5, 5.0]) {
        consider(new THREE.Vector3(-1.2, 3.1, zBin), 3.4, {
          id: `bin_L_${zBin}`,
          type: 'OVERHEAD_BIN',
          prompt: `Press E to stow ${this.heldObject.label} in overhead bin`,
          subPrompt: 'Secures passenger carry-on against turbulence',
        });
        consider(new THREE.Vector3(1.2, 3.1, zBin), 3.4, {
          id: `bin_R_${zBin}`,
          type: 'OVERHEAD_BIN',
          prompt: `Press E to stow ${this.heldObject.label} in overhead bin`,
          subPrompt: 'Secures passenger carry-on against turbulence',
        });
      }
      consider(new THREE.Vector3(0, 2.0, 13.8), 3.6, {
        id: 'cargo_hold_bag',
        type: 'CARGO_HOLD_SLOT',
        prompt: `Press E to lock ${this.heldObject.label} in rear cargo hold`,
      });
    }

    if (!this.heldObject) {
      for (const crate of this.cargo) {
        if (crate.state === 'ON_APRON') {
          consider(new THREE.Vector3(crate.position.x, crate.position.y + 0.3, crate.position.z), 3.5, {
            id: crate.id,
            type: 'HAZARD_CARGO',
            refId: crate.id,
            prompt: `Press E to pick up hazardous cargo: ${crate.label}`,
            subPrompt: `${crate.hazardClass} · Bonus +$${crate.bonusReward} (Secure in Rear Hold)`,
          });
        }
      }
    }

    // Cargo door is a physical interaction target on the aircraft's port-side rear hold.
    consider(new THREE.Vector3(-2.05, 1.95, 12.8), 3.6, {
      id: 'rear_cargo_door',
      type: 'CARGO_DOOR',
      prompt: this.telemetry.cargoDoorClosed
        ? 'Press E to open rear cargo door'
        : 'Press E to close and secure rear cargo door',
      subPrompt: this.telemetry.cargoDoorClosed
        ? 'Open the hold before loading baggage'
        : 'Close the hold before departure',
    });

    if (this.heldObject?.kind === 'CARGO') {
      consider(new THREE.Vector3(0, 2.0, 13.8), 3.8, {
        id: 'cargo_hold_hazmat',
        type: 'CARGO_HOLD_SLOT',
        prompt: `Press E to strap down ${this.heldObject.label} in Hazmat Hold`,
        subPrompt: 'Secures dangerous cargo for flight',
      });
    }

    consider(new THREE.Vector3(-1.62, 2.65, 12.5), 3.2, {
      id: 'manifest_board_cabin',
      type: 'MANIFEST_BOARD',
      prompt: 'Press E to inspect Hazardous Cargo Manifest',
      subPrompt: 'Verifies containment protocols for Class 6/7/8 cargo',
    });
    consider(new THREE.Vector3(-6.2, 1.0, 3.2), 3.4, {
      id: 'manifest_board_apron',
      type: 'MANIFEST_BOARD',
      prompt: 'Press E to inspect Hazardous Cargo Manifest',
      subPrompt: 'Verifies containment protocols for Class 6/7/8 cargo',
    });

    consider(new THREE.Vector3(1.2, 2.5, -10.8), 3.0, {
      id: 'galley_prep',
      type: 'GALLEY_PREP',
      prompt: 'Press E to prepare passenger meal in Galley',
      subPrompt: 'Select Chicken, Pasta, Veggie, or Hot Coffee tray',
    });

    consider(new THREE.Vector3(-1.65, 2.75, -11.2), 3.0, {
      id: 'pa_system',
      type: 'PA_SYSTEM',
      prompt: 'Press E to make Cabin PA Announcement',
      subPrompt: 'Broadcast boarding, seatbelt, turbulence, or landing notice',
    });

    consider(new THREE.Vector3(-1.62, 2.45, 8.5), 3.2, {
      id: 'parachute_locker',
      type: 'PARACHUTE_LOCKER',
      prompt: this.heldObject?.kind === 'PARACHUTE'
        ? 'Press E to return Parachute to Cabin Emergency Locker'
        : 'Press E to equip Emergency Parachute Backpack (Aerosport T-10)',
      subPrompt: 'Emergency crew bailout gear for in-flight crises',
    });

    if (!this.telemetry.onGround && this.telemetry.altitudeFt > 120) {
      consider(new THREE.Vector3(1.75, 2.5, 0.8), 3.4, {
        id: 'emergency_exit_starboard',
        type: 'EMERGENCY_EXIT',
        prompt: this.heldObject?.kind === 'PARACHUTE'
          ? 'Press E to BAIL OUT with Parachute! (Emergency Skydive)'
          : 'Press E: WARNING - No parachute equipped!',
        subPrompt: 'Overwing emergency jump exit',
      });
      if (!this.telemetry.cabinDoorClosed) {
        consider(new THREE.Vector3(-1.75, 2.35, -9.5), 3.4, {
          id: 'emergency_exit_forward',
          type: 'EMERGENCY_EXIT',
          prompt: this.heldObject?.kind === 'PARACHUTE'
            ? 'Press E to BAIL OUT with Parachute! (Emergency Skydive)'
            : 'Press E: WARNING - No parachute equipped!',
          subPrompt: 'Forward cabin jump exit',
        });
      }
    }

    consider(new THREE.Vector3(0, 2.2, -15.6), 2.8, {
      id: 'cockpit_controls_panel',
      type: 'COCKPIT_CONTROLS',
      prompt: 'Press E to open Flight Controls & Systems Panel',
      subPrompt: 'Interactive switches for lights, spoilers, parking brake, and radio',
    });

    for (const mess of this.messes) {
      if (!mess.cleaned) {
        consider(new THREE.Vector3(mess.position.x, mess.position.y + 0.25, mess.position.z), 3.1, {
          id: mess.id,
          type: 'CABIN_MESS',
          refId: mess.id,
          prompt: `Press E to clean ${mess.label}`,
          subPrompt: '+25% Cabin Cleanliness rating',
        });
      }
    }

    for (const pax of this.passengers) {
      if (!pax.boarded) continue;
      // Head/chest center of seated passenger
      const paxPos = new THREE.Vector3(pax.position.x, pax.position.y + 0.95, pax.position.z);

      let prompt = `Press E to check ${pax.name} (Seat ${pax.seat})`;
      let subPrompt = `Order: ${pax.mealOrder} · Mood: ${Math.round(pax.happiness)}%`;

      if (pax.isPanicking || pax.needsMedicalAid) {
        prompt = `Press E to calm & assist panicking passenger ${pax.name} (Seat ${pax.seat})`;
        subPrompt = 'Restores passenger calm and cabin safety';
      } else if (this.heldObject?.kind === 'MEAL' && !pax.mealServed) {
        prompt = `Press E to serve ${this.heldObject.mealType} to ${pax.name} (Seat ${pax.seat} · Wants: ${pax.mealOrder})`;
        subPrompt =
          this.heldObject.mealType === pax.mealOrder
            ? 'Exact order match! (+Bonus Satisfaction)'
            : 'Wrong meal order (Passenger will grumble)';
      } else if (!pax.ticketChecked) {
        prompt = `Press E to inspect boarding pass — ${pax.name} (Seat ${pax.seat})`;
        subPrompt = 'Verify destination & boarding status';
      } else if (!pax.seatbeltFastened) {
        prompt = `Press E to fasten seatbelt for ${pax.name} (Seat ${pax.seat})`;
        subPrompt = 'Required for pre-flight safety check';
      }

      consider(
        paxPos,
        3.5,
        {
          id: pax.id,
          type: 'PASSENGER',
          refId: pax.id,
          prompt,
          subPrompt,
        },
        true
      );
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.score - b.score);
    return candidates[0];
  }

  public triggerInteractKeyE() {
    if (this.controlMode === 'IN_COCKPIT') {
      this.exitPilotSeat();
      return;
    }
    if (this.controlMode === 'DRIVING_TUG') {
      this.exitTug();
      return;
    }
    if (this.controlMode === 'DRIVING_FUEL_TRUCK') {
      this.exitFuelTruck();
      return;
    }

    const target = this.findBestInteractionTarget();
    if (!target) return;

    switch (target.type) {
      case 'BOARD_STAIRS': {
        this.player.localPos.set(-1.1, 1.65, -9.5);
        this.player.yaw = Math.PI;
        this.player.insideCabin = true;
        soundEngine.playInteract();
        this.triggerToast('Boarded aircraft cabin. Check tickets, clean spills, and prep the flight!', 'info');
        break;
      }

      case 'CABIN_DOOR': {
        this.toggleCabinDoor();
        break;
      }

      case 'CARGO_DOOR': {
        this.toggleCargoDoor();
        break;
      }

      case 'PILOT_SEAT': {
        this.enterPilotSeat();
        break;
      }

      case 'LUGGAGE': {
        if (target.refId) this.pickUpLuggage(target.refId);
        break;
      }

      case 'OVERHEAD_BIN':
      case 'CARGO_HOLD_SLOT': {
        this.stowHeldItem();
        break;
      }

      case 'HAZARD_CARGO': {
        if (target.refId) this.pickUpHazardousCargo(target.refId);
        break;
      }

      case 'MANIFEST_BOARD': {
        this.manifestInspected = true;
        this.cargo.forEach((c) => (c.manifestInspected = true));
        this.showManifestModal = true;
        this.releasePointerLock();
        soundEngine.playTaskSuccess();
        multiplayerClient.sendGameAction('manifest:inspected');
        break;
      }

      case 'GALLEY_PREP': {
        this.showGalleyMenu = true;
        this.releasePointerLock();
        soundEngine.playInteract();
        break;
      }

      case 'PA_SYSTEM': {
        this.showAnnouncementMenu = true;
        this.releasePointerLock();
        soundEngine.playInteract();
        break;
      }

      case 'CABIN_MESS': {
        if (target.refId) this.cleanCabinMess(target.refId);
        break;
      }

      case 'PASSENGER': {
        if (target.refId) this.interactWithPassenger(target.refId);
        break;
      }

      case 'INCIDENT_FIX': {
        this.resolveActiveIncident();
        break;
      }

      case 'DRIVE_TUG': {
        this.enterTug();
        break;
      }

      case 'FUEL_TRUCK': {
        this.enterFuelTruck();
        break;
      }
    }

    this.emitUIState();
  }

  public enterTug() {
    this.controlMode = 'DRIVING_TUG';
    this.releasePointerLock();
    soundEngine.playDoorLatch(true);
    this.triggerToast(
      'Driving Baggage Tug! W/S Drive, A/D Steer, Space Brake. Drive near the luggage cart to hitch it, then to the cargo door to load! Press E to exit.',
      'success'
    );
    this.emitUIState();
  }

  public exitTug() {
    this.controlMode = 'ON_FOOT';
    this.player.localPos.set(this.world.tugGroup.position.x - 2.0, 0, this.world.tugGroup.position.z);
    this.player.insideCabin = false;
    soundEngine.playDoorLatch(false);
    this.triggerToast('Exited Baggage Tug. On-foot walking restored.', 'info');
    this.emitUIState();
  }

  public enterFuelTruck() {
    this.controlMode = 'DRIVING_FUEL_TRUCK';
    this.releasePointerLock();
    soundEngine.playDoorLatch(true);
    this.triggerToast(
      'Driving Aviation Fuel Tanker! W/S Drive, A/D Steer, Space Brake. Drive near aircraft wings to fuel tanks to 100%! Press E to exit.',
      'info'
    );
    this.emitUIState();
  }

  public exitFuelTruck() {
    this.controlMode = 'ON_FOOT';
    this.player.localPos.set(this.world.fuelTruckGroup.position.x - 2.2, 0, this.world.fuelTruckGroup.position.z);
    this.player.insideCabin = false;
    soundEngine.playDoorLatch(false);
    this.triggerToast('Exited Fuel Truck. On-foot walking restored.', 'info');
    this.emitUIState();
  }

  public refuelAircraft() {
    if (this.telemetry.fuelPct < 99) {
      this.telemetry.fuelPct = 100;
      soundEngine.playTaskSuccess();
      this.triggerToast('Aircraft Jet-A1 fuel tanks topped off to 100% capacity!', 'success');
      this.emitUIState();
    }
  }

  public autoUnloadBaggageCart() {
    let newlyLoaded = 0;
    for (const bag of this.luggage) {
      if (bag.state === 'ON_CART') {
        bag.state = 'STOWED_CARGO';
        const m = this.luggageMeshes.get(bag.id);
        if (m) m.visible = false;
        newlyLoaded++;
        multiplayerClient.sendGameAction('luggage:stowed', bag.id);
      }
    }
    if (newlyLoaded > 0) {
      soundEngine.playTaskSuccess();
      const loaded = this.luggage.filter((b) => b.state === 'STOWED_CABIN' || b.state === 'STOWED_CARGO').length;
      this.triggerToast(
        `Luggage Cart unloaded into cargo hold! (${loaded}/${this.luggage.length} bags loaded)`,
        'success'
      );
      this.emitUIState();
    }
  }

  public toggleCabinDoor(fromRemote = false) {
    this.telemetry.cabinDoorClosed = !this.telemetry.cabinDoorClosed;
    soundEngine.playDoorLatch(this.telemetry.cabinDoorClosed);

    if (this.telemetry.cabinDoorClosed) {
      if (!this.player.insideCabin) {
        this.player.localPos.set(-1.1, 1.65, -9.5);
        this.player.insideCabin = true;
      }
      this.triggerToast('Passenger door closed. Check the separate cargo door before departure.', 'success');
    } else {
      this.triggerToast('Passenger door opened. Boarding stairs deployed.', 'info');
    }

    if (!fromRemote) {
      multiplayerClient.sendGameAction('door:set', undefined, {
        closed: this.telemetry.cabinDoorClosed,
      });
    }
    this.emitUIState();
  }

  public toggleCargoDoor(fromRemote = false) {
    if (this.telemetry.enginesRunning && this.telemetry.onGround === false) {
      this.triggerToast('Cargo door locked while airborne.', 'warning');
      return;
    }
    this.telemetry.cargoDoorClosed = !this.telemetry.cargoDoorClosed;
    soundEngine.playDoorLatch(this.telemetry.cargoDoorClosed);
    this.triggerToast(
      this.telemetry.cargoDoorClosed ? 'Rear cargo door closed and secured.' : 'Rear cargo door open. Align the belt loader to transfer baggage.',
      this.telemetry.cargoDoorClosed ? 'success' : 'info'
    );
    if (!fromRemote) {
      multiplayerClient.sendGameAction('cargo-door:set', undefined, { closed: this.telemetry.cargoDoorClosed });
    }
    this.emitUIState();
  }

  public enterPilotSeat() {
    this.controlMode = 'IN_COCKPIT';
    this.inspectingPassengerId = null;
    this.showManifestModal = false;
    this.showAnnouncementMenu = false;
    this.showGalleyMenu = false;

    this.player.localPos.set(-0.58, 1.65, -15.0);
    this.player.yaw = 0;
    this.player.pitch = -0.04;

    if (this.telemetry.cabinDoorClosed) {
      this.telemetry.enginesRunning = true;
      this.triggerToast(
        'Pilot Seat Locked: Engines Spooled! Hold SHIFT to increase throttle, A/D to steer onto Runway 36L (or press T for Instant Runway Lineup).',
        'success'
      );
    } else {
      this.triggerToast(
        'SAFETY LOCK: Close the Forward Cabin Door (Press E on door or click "Close Door & Start Engines" on HUD) before departure!',
        'warning'
      );
    }

    soundEngine.playInteract();
    this.emitUIState();
  }

  public exitPilotSeat() {
    this.controlMode = 'ON_FOOT';
    this.telemetry.autopilotHold = true;
    this.player.localPos.set(0.0, 1.65, -13.6);
    this.player.yaw = Math.PI;
    this.player.pitch = 0;
    soundEngine.playInteract();
    this.triggerToast(
      this.telemetry.onGround
        ? 'Exited Pilot Seat. Walking controls (WASD) restored.'
        : 'Autopilot Attitude Hold engaged while you are in the cabin!',
      'info'
    );
    this.emitUIState();
  }

  public quickCloseDoorAndStartEngines() {
    if (!this.telemetry.cabinDoorClosed) {
      this.toggleCabinDoor();
    }
    this.telemetry.enginesRunning = true;
    soundEngine.playTaskSuccess();
    this.triggerToast('Doors sealed & Twin Turbofans started! Ready to taxi or press T to line up on Runway 36L.', 'success');
    this.emitUIState();
  }

  public quickLineupOnRunway() {
    if (!this.telemetry.cabinDoorClosed) {
      this.telemetry.cabinDoorClosed = true;
      this.telemetry.cargoDoorClosed = true;
    }
    this.telemetry.enginesRunning = true;
    // The runway shortcut must leave the aircraft able to accelerate.
    // Keeping the initial scenario's parking brake engaged makes net thrust
    // negative and prevents the advertised quick-start takeoff from working.
    this.telemetry.parkingBrake = false;
    this.telemetry.brakesOn = false;
    this.telemetry.throttlePct = 0;
    this.aircraft.root.position.set(45, 0, -55);
    this.aircraft.root.rotation.set(0, 0, 0);
    this.telemetry.headingDeg = 0;
    this.telemetry.pitchDeg = 0;
    this.telemetry.rollDeg = 0;
    this.telemetry.airspeedKts = 0;
    this.flightPhase = 'TAXI';
    soundEngine.playTaskSuccess();
    this.triggerToast(
      'Lined up on Runway 36L Centerline! Hold SHIFT for 100% Takeoff Thrust, then hold S at 115 kts to Rotate & Climb!',
      'success'
    );
    this.emitUIState();
  }

  private pickUpLuggage(bagId: string) {
    const bag = this.luggage.find((b) => b.id === bagId);
    if (!bag) return;
    bag.state = 'HELD';
    const mesh = this.luggageMeshes.get(bag.id);
    if (mesh) mesh.visible = false;

    this.heldObject = {
      kind: 'LUGGAGE',
      id: bag.id,
      label: `Suitcase (${bag.ownerName})`,
    };
    this.updateHeldItemVisual();
    soundEngine.playInteract();
    this.triggerToast(`Picked up ${bag.ownerName}'s suitcase. Carry it into the cabin and press E on an Overhead Bin!`, 'info');
  }

  private pickUpHazardousCargo(cargoId: string) {
    const item = this.cargo.find((c) => c.id === cargoId);
    if (!item) return;
    item.state = 'HELD';
    item.manifestInspected = true;
    this.manifestInspected = true;

    const grp = this.cargoMeshes.get(item.id);
    if (grp) grp.visible = false;

    this.heldObject = {
      kind: 'CARGO',
      id: item.id,
      label: item.label,
    };
    this.updateHeldItemVisual();
    soundEngine.playWarningAlarm();
    this.triggerToast(
      `WARNING: Carrying ${item.label} (${item.hazardClass}). Walk carefully to the Rear Hold and press E to strap it down!`,
      'warning'
    );
  }

  private stowHeldItem() {
    if (!this.heldObject) return;

    if (this.heldObject.kind === 'LUGGAGE') {
      const bag = this.luggage.find((b) => b.id === this.heldObject?.id);
      if (bag) {
        bag.state = 'STOWED_CABIN';
        multiplayerClient.sendGameAction('luggage:stowed', bag.id);
      }
      this.heldObject = null;
      this.updateHeldItemVisual();
      soundEngine.playTaskSuccess();
      const loaded = this.luggage.filter((b) => b.state === 'STOWED_CABIN' || b.state === 'STOWED_CARGO').length;
      this.triggerToast(`Luggage stowed securely! (${loaded}/${this.luggage.length} bags loaded)`, 'success');
    } else if (this.heldObject.kind === 'CARGO') {
      const item = this.cargo.find((c) => c.id === this.heldObject?.id);
      if (item) {
        item.state = 'SECURED_HOLD';
        const slotIdx = this.cargo.findIndex((c) => c.id === item.id);
        item.position = { x: -0.75 + slotIdx * 0.75, y: 2.02, z: 13.9 };
        const grp = this.cargoMeshes.get(item.id);
        if (grp) {
          grp.position.set(item.position.x, item.position.y, item.position.z);
          grp.visible = true;
        }
        multiplayerClient.sendGameAction('cargo:secured', item.id);
      }
      this.heldObject = null;
      this.updateHeldItemVisual();
      soundEngine.playTaskSuccess();
      const secured = this.cargo.filter((c) => c.state === 'SECURED_HOLD').length;
      this.triggerToast(
        `Hazardous Cargo strapped into containment rack! (${secured}/${this.cargo.length} secured, +$${item?.bonusReward || 400} bonus)`,
        'success'
      );
    }
  }

  public prepareMealInGalley(mealType: MealType) {
    this.mealsPreparedCount++;
    this.heldObject = {
      kind: 'MEAL',
      id: `meal_${Date.now()}`,
      label: `${mealType} Airline Tray`,
      mealType,
    };
    this.showGalleyMenu = false;
    this.updateHeldItemVisual();
    soundEngine.playTaskSuccess();
    this.triggerToast(`Prepared hot ${mealType} tray! Deliver it to a passenger requesting ${mealType}.`, 'success');
    this.emitUIState();
  }

  private cleanCabinMess(messId: string, fromRemote = false) {
    const mess = this.messes.find((m) => m.id === messId);
    if (!mess || mess.cleaned) return;
    mess.cleaned = true;
    const mesh = this.messMeshes.get(mess.id);
    if (mesh) mesh.visible = false;

    soundEngine.playTaskSuccess();
    const cleanedCount = this.messes.filter((m) => m.cleaned).length;
    const pct = Math.round((cleanedCount / this.messes.length) * 100);
    this.triggerToast(`Cleaned ${mess.label}! Cabin Cleanliness: ${pct}%`, 'success');

    if (!fromRemote) {
      multiplayerClient.sendGameAction('mess:cleaned', messId);
    }
  }

  private interactWithPassenger(paxId: string) {
    const pax = this.passengers.find((p) => p.id === paxId);
    if (!pax) return;

    if (pax.isPanicking || pax.needsMedicalAid) {
      pax.isPanicking = false;
      pax.needsMedicalAid = false;
      pax.happiness = Math.min(100, pax.happiness + 20);
      if (this.activeIncident?.type === 'PANIC_PASSENGER') {
        this.resolveActiveIncident();
      } else {
        soundEngine.playTaskSuccess();
        this.triggerToast(`Calmed ${pax.name} and provided comfort kit!`, 'success');
      }
      return;
    }

    if (this.heldObject?.kind === 'MEAL' && !pax.mealServed) {
      const servedType = this.heldObject.mealType;
      pax.mealServed = true;
      pax.hunger = 0;
      const isMatch = servedType === pax.mealOrder;
      const upgBonus = this.unlockedUpgrades.includes('upg_turbo_galley') ? 10 : 0;
      pax.happiness = Math.min(100, pax.happiness + (isMatch ? 24 + upgBonus : 6));
      this.heldObject = null;
      this.updateHeldItemVisual();
      soundEngine.playTaskSuccess();
      multiplayerClient.sendGameAction('pax:meal', pax.id);
      this.triggerToast(
        isMatch
          ? `Served ${servedType} to ${pax.name} — Exact order match! (+Mood)`
          : `Served ${servedType} to ${pax.name} (They ordered ${pax.mealOrder}, but ate it anyway).`,
        isMatch ? 'success' : 'info'
      );
      return;
    }

    if (!pax.ticketChecked) {
      this.inspectingPassengerId = pax.id;
      this.releasePointerLock();
      soundEngine.playInteract();
      return;
    }

    if (!pax.seatbeltFastened) {
      pax.seatbeltFastened = true;
      const m = this.passengerMeshes.get(pax.id);
      if (m) m.beltMesh.visible = true;
      soundEngine.playInteract();
      multiplayerClient.sendGameAction('pax:belt', pax.id);
      this.triggerToast(`Fastened seatbelt for ${pax.name} (Seat ${pax.seat}).`, 'success');
    } else {
      this.inspectingPassengerId = pax.id;
      this.releasePointerLock();
    }
  }

  public submitTicketDecision(paxId: string, decision: 'APPROVED' | 'DENIED', fromRemote = false) {
    const pax = this.passengers.find((p) => p.id === paxId);
    if (!pax) return;

    pax.ticketChecked = true;
    pax.ticketDecision = decision;
    this.inspectingPassengerId = null;

    if (decision === 'DENIED') {
      pax.boarded = false;
      const m = this.passengerMeshes.get(pax.id);
      if (m) m.group.visible = false;

      if (!pax.isTicketValid) {
        soundEngine.playTaskSuccess();
        this.triggerToast(
          `GOOD CATCH! Denied invalid boarding pass for ${pax.name} (${pax.invalidityReason}).`,
          'success'
        );
      } else {
        soundEngine.playWarningAlarm();
        this.triggerToast(
          `OOPS! ${pax.name} had a valid ticket to ${this.route.destinationCode}, and you kicked them off the plane!`,
          'warning'
        );
      }
    } else {
      if (pax.isTicketValid) {
        pax.happiness = Math.min(100, pax.happiness + 8);
        soundEngine.playTaskSuccess();
        this.triggerToast(`Verified valid boarding pass for ${pax.name} (Seat ${pax.seat}).`, 'success');
      } else {
        soundEngine.playWarningAlarm();
        this.triggerToast(
          `WARNING: You approved ${pax.name}'s fake ticket to "${pax.ticketDestination}"! Expect cabin trouble later.`,
          'warning'
        );
      }
    }

    if (!fromRemote) {
      multiplayerClient.sendGameAction('pax:ticket', paxId, { decision });
    }
    this.emitUIState();
  }

  public makeAnnouncement(optionId: AnnouncementOption['id'], fromRemote = false) {
    const opt = ANNOUNCEMENT_OPTIONS.find((o) => o.id === optionId);
    if (!opt) return;

    this.announcementsMade.add(opt.id);
    this.showAnnouncementMenu = false;
    soundEngine.playPaChime();

    this.activeSubtitle = opt.subtitle;
    if (this.subtitleTimeout) window.clearTimeout(this.subtitleTimeout);
    this.subtitleTimeout = window.setTimeout(() => {
      this.activeSubtitle = null;
      this.emitUIState();
    }, 6500);

    for (const pax of this.passengers) {
      if (!pax.boarded) continue;
      if (optionId === 'BOARDING_WELCOME') {
        pax.happiness = Math.min(100, pax.happiness + 10);
      } else if (optionId === 'FASTEN_SEATBELTS') {
        pax.seatbeltFastened = true;
        const m = this.passengerMeshes.get(pax.id);
        if (m) m.beltMesh.visible = true;
      } else if (optionId === 'TURBULENCE_WARNING') {
        pax.isPanicking = false;
        pax.seatbeltFastened = true;
        const m = this.passengerMeshes.get(pax.id);
        if (m) m.beltMesh.visible = true;
      } else if (optionId === 'LANDING_PREP') {
        pax.seatbeltFastened = true;
        pax.happiness = Math.min(100, pax.happiness + 5);
        const m = this.passengerMeshes.get(pax.id);
        if (m) m.beltMesh.visible = true;
      }
    }

    this.triggerToast(`PA Broadcast: "${opt.title}" — Passengers reacted!`, 'success');
    if (!fromRemote) {
      multiplayerClient.sendGameAction('pa:announce', optionId);
    }
    this.emitUIState();
  }

  private triggerRandomIncident() {
    if (this.activeIncident) return;

    const types: ActiveIncident['type'][] = [
      'GALLEY_SMOKE',
      'PRESSURE_ALERT',
      'PANIC_PASSENGER',
      'CARGO_LEAK',
    ];
    const chosen = types[Math.floor(Math.random() * types.length)];

    if (chosen === 'GALLEY_SMOKE') {
      this.aircraft.galleySmokeParticles.visible = true;
      this.activeIncident = {
        id: `inc_${Date.now()}`,
        type: 'GALLEY_SMOKE',
        title: 'Galley Convection Oven Smoke!',
        description: 'Overheated foil tray in the Forward Galley is filling the cabin with smoke!',
        actionPrompt: 'vent & extinguish Galley Oven (Forward Starboard Galley)',
        targetPosition: { x: 1.15, y: 2.5, z: -10.8 },
        timerSeconds: 45,
        maxSeconds: 45,
        resolved: false,
      };
    } else if (chosen === 'PRESSURE_ALERT') {
      this.aircraft.avionicsSparkLight.intensity = 4.0;
      this.activeIncident = {
        id: `inc_${Date.now()}`,
        type: 'PRESSURE_ALERT',
        title: 'Cabin Pressurization Breaker Tripped!',
        description: 'Rear avionics outflow valve tripped! Reset the breaker panel in the rear cabin.',
        actionPrompt: 'reset Pressurization Breaker Panel (Rear Starboard Wall)',
        targetPosition: { x: 1.5, y: 2.6, z: 10.6 },
        timerSeconds: 45,
        maxSeconds: 45,
        resolved: false,
      };
    } else if (chosen === 'CARGO_LEAK') {
      this.activeIncident = {
        id: `inc_${Date.now()}`,
        type: 'CARGO_LEAK',
        title: 'Hazardous Cargo Containment Vibration!',
        description: 'A hazmat crate in the Rear Hold is vibrating loose! Re-seal the containment clamp.',
        actionPrompt: 're-seal Hazardous Cargo Containment Rack (Rear Hold)',
        targetPosition: { x: 0, y: 2.1, z: 13.8 },
        timerSeconds: 45,
        maxSeconds: 45,
        resolved: false,
      };
    } else {
      const boardedPax = this.passengers.filter((p) => p.boarded);
      const targetPax = boardedPax[Math.floor(Math.random() * boardedPax.length)] || this.passengers[0];
      targetPax.isPanicking = true;
      targetPax.needsMedicalAid = true;
      this.activeIncident = {
        id: `inc_${Date.now()}`,
        type: 'PANIC_PASSENGER',
        title: `Passenger Emergency — Seat ${targetPax.seat}!`,
        description: `${targetPax.name} is having an acute air-sickness panic episode in Seat ${targetPax.seat}!`,
        actionPrompt: `assist & calm ${targetPax.name} at Seat ${targetPax.seat}`,
        targetPosition: { ...targetPax.position },
        timerSeconds: 45,
        maxSeconds: 45,
        resolved: false,
      };
    }

    soundEngine.playWarningAlarm();
    this.triggerToast(`ALERT: ${this.activeIncident.title} — Press E to leave seat or send crew to resolve!`, 'danger');
    this.emitUIState();
  }

  public resolveActiveIncident(fromRemote = false) {
    if (!this.activeIncident) return;
    this.activeIncident.resolved = true;
    this.aircraft.galleySmokeParticles.visible = false;
    this.aircraft.avionicsSparkLight.intensity = 0;
    this.passengers.forEach((p) => {
      p.isPanicking = false;
      p.needsMedicalAid = false;
    });
    this.incidentsResolvedCount++;
    this.activeIncident = null;
    soundEngine.playTaskSuccess();
    this.triggerToast('Emergency Resolved! Airframe & passenger safety stabilized (+Bonus XP).', 'success');

    if (!fromRemote) {
      multiplayerClient.sendGameAction('incident:resolved');
    }
    this.emitUIState();
  }

  private startLoop() {
    const step = (now: number) => {
      this.animFrameId = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      if (!this.isPaused) {
        this.updateSimulation(dt, now / 1000);
      }
      this.renderer.render(this.scene, this.camera);
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  private updateSimulation(dt: number, elapsedSec: number) {
    this.world.radarDish.rotation.y += dt * 1.1;

    if (this.controlMode === 'ON_FOOT') {
      const forward = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
                      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
      const right = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
                    (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
      const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const jump = this.keys.has('Space');

      this.physics.updatePlayerWalk(
        dt,
        this.player,
        { forward, right, sprint, jump },
        this.telemetry.cabinDoorClosed
      );

      if (!this.telemetry.onGround || this.telemetry.airspeedKts > 1) {
        const res = this.physics.updateFlightPhysics(
          dt,
          this.aircraft.root,
          this.telemetry,
          this.flightPhase,
          { pitchInput: 0, rollInput: 0, throttleDelta: 0, brakes: false },
          {
            hasTurbulenceDamper: this.unlockedUpgrades.includes('upg_yaw_damper'),
            hasTitaniumGear: this.unlockedUpgrades.includes('upg_oleo_struts'),
          }
        );
        this.flightPhase = res.nextPhase;
      }
    } else if (this.controlMode === 'DRIVING_TUG') {
      const throttle =
        (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
        (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
      const steer =
        (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
        (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
      const brake = this.keys.has('Space');

      this.physics.updateVehiclePhysics(dt, this.tugState, { throttle, steer, brake }, 16);
      this.world.tugGroup.position.copy(this.tugState.position);
      this.world.tugGroup.rotation.y = this.tugState.yaw;

      const cartDist = this.tugState.position.distanceTo(this.world.luggageCartGroup.position);
      if (!this.cartAttachedToTug && cartDist < 3.2) {
        this.cartAttachedToTug = true;
        soundEngine.playTaskSuccess();
        this.triggerToast('Baggage Cart HITCHED to Tug! Drive to rear aircraft cargo door to unload.', 'success');
      }

      if (this.cartAttachedToTug) {
        const cartOffset = new THREE.Vector3(
          Math.sin(this.tugState.yaw) * 3.2,
          0,
          Math.cos(this.tugState.yaw) * 3.2
        );
        this.world.luggageCartGroup.position.copy(this.tugState.position).add(cartOffset);
        this.world.luggageCartGroup.rotation.y = this.tugState.yaw;

        const doorDist = this.world.luggageCartGroup.position.distanceTo(new THREE.Vector3(-2.2, 0, 10.5));
        const beltDist = this.world.baggageConveyorGroup.position.distanceTo(new THREE.Vector3(-2.2, 0, 12.8));
        if (doorDist < 4.8 && beltDist < 4.5 && !this.telemetry.cargoDoorClosed) {
          this.autoUnloadBaggageCart();
        }
      }
    } else if (this.controlMode === 'DRIVING_FUEL_TRUCK') {
      const throttle =
        (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
        (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
      const steer =
        (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
        (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
      const brake = this.keys.has('Space');

      this.physics.updateVehiclePhysics(dt, this.fuelTruckState, { throttle, steer, brake }, 13);
      this.world.fuelTruckGroup.position.copy(this.fuelTruckState.position);
      this.world.fuelTruckGroup.rotation.y = this.fuelTruckState.yaw;

      const wingDist = this.fuelTruckState.position.distanceTo(new THREE.Vector3(9.5, 0, -2.0));
      if (wingDist < 8.5 && this.telemetry.fuelPct < 99) {
        this.refuelAircraft();
      }
    } else {
      // IN_COCKPIT
      let pitchInput = 0;
      // KeyS or ArrowDown: Stick BACK -> PITCH UP / ROTATE / CLIMB!
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) pitchInput += 1;
      // KeyW or ArrowUp: Stick FORWARD -> PITCH DOWN!
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
        if (!this.telemetry.onGround || this.telemetry.airspeedKts > 60) {
          pitchInput -= 1;
        }
      }

      const rollInput =
        (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
        (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);

      const yawInput =
        (this.keys.has('KeyE') ? 1 : 0) -
        (this.keys.has('KeyQ') ? 1 : 0);

      let throttleDelta =
        (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyZ') || this.keys.has('Equal') ? 1 : 0) -
        (this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyX') || this.keys.has('Minus') ? 1 : 0);

      // On runway roll at low speed, pressing W accelerates throttle to takeoff thrust!
      if (this.telemetry.onGround && this.telemetry.airspeedKts < 65 && (this.keys.has('KeyW') || this.keys.has('ArrowUp'))) {
        throttleDelta = Math.max(throttleDelta, 1);
      }

      const brakes = this.keys.has('Space');

      const res = this.physics.updateFlightPhysics(
        dt,
        this.aircraft.root,
        this.telemetry,
        this.flightPhase,
        { pitchInput, rollInput, yawInput, throttleDelta, brakes },
        {
          hasTurbulenceDamper: this.unlockedUpgrades.includes('upg_yaw_damper'),
          hasTitaniumGear: this.unlockedUpgrades.includes('upg_oleo_struts'),
        }
      );

      this.flightPhase = res.nextPhase;

      if (res.touchdownEvent) {
        const vs = res.touchdownEvent.verticalSpeedFpm;
        if (res.touchdownEvent.hardLanding) {
          soundEngine.playWarningAlarm();
          this.triggerToast(`HARD TOUCHDOWN (${vs} fpm)! Apply Wheel Brakes (SPACE) to stop!`, 'danger');
        } else {
          soundEngine.playTaskSuccess();
          this.triggerToast(`Touchdown at ${vs} fpm! Hold SPACE to brake to a complete stop on the runway.`, 'success');
        }
      }

      this.aircraft.pilotYoke.rotation.z = THREE.MathUtils.degToRad(-rollInput * 35);
      this.aircraft.pilotYoke.position.z = -15.65 + pitchInput * 0.08;
      this.aircraft.copilotYoke.rotation.z = THREE.MathUtils.degToRad(-rollInput * 35);
      this.aircraft.throttleHandle.rotation.x = THREE.MathUtils.degToRad(
        -35 + (this.telemetry.throttlePct / 100) * 70
      );
    }

    const targetDoorRot = this.telemetry.cabinDoorClosed ? 0 : -2.1;
    this.aircraft.cabinDoorPivot.rotation.y = THREE.MathUtils.lerp(
      this.aircraft.cabinDoorPivot.rotation.y,
      targetDoorRot,
      6 * dt
    );
    const targetCargoRot = this.telemetry.cargoDoorClosed ? 0 : -1.2;
    this.aircraft.cargoDoorPivot.rotation.y = THREE.MathUtils.lerp(
      this.aircraft.cargoDoorPivot.rotation.y,
      targetCargoRot,
      6 * dt
    );

    const targetStairsX = this.telemetry.cabinDoorClosed ? -6.5 : 0;
    this.aircraft.boardingStairs.position.x = THREE.MathUtils.lerp(
      this.aircraft.boardingStairs.position.x,
      targetStairsX,
      3.5 * dt
    );
    this.aircraft.boardingStairs.visible = this.telemetry.airspeedKts < 15;

    const targetGearY = this.telemetry.gearDown ? 0 : 1.35;
    this.aircraft.landingGear.position.y = THREE.MathUtils.lerp(
      this.aircraft.landingGear.position.y,
      targetGearY,
      4 * dt
    );
    this.aircraft.landingGear.visible = this.aircraft.landingGear.position.y < 1.25;

    if (this.telemetry.enginesRunning) {
      const spinRate = 4.0 + (this.telemetry.throttlePct / 100) * 28.0;
      this.aircraft.leftFan.rotation.z += spinRate * dt;
      this.aircraft.rightFan.rotation.z -= spinRate * dt;
    }

    const flapRad = THREE.MathUtils.degToRad(this.telemetry.flapsDeg);
    this.aircraft.leftFlap.rotation.x = flapRad;
    this.aircraft.rightFlap.rotation.x = flapRad;

    soundEngine.updateEngineSound(
      this.telemetry.enginesRunning,
      this.telemetry.throttlePct,
      this.telemetry.airspeedKts
    );

    if (!this.telemetry.onGround && (this.flightPhase === 'CRUISE' || this.flightPhase === 'APPROACH')) {
      this.turbulenceTimer -= dt;
      if (this.turbulenceTimer <= 0) {
        this.telemetry.inTurbulence = !this.telemetry.inTurbulence;
        this.turbulenceTimer = this.telemetry.inTurbulence ? 7.5 : 14.0;
        if (this.telemetry.inTurbulence) {
          soundEngine.playTurbulenceRumble();
          const warned = this.announcementsMade.has('TURBULENCE_WARNING');
          if (!warned) {
            this.triggerToast(
              'TURBULENCE HIT! Make a Turbulence PA Announcement or buckle passengers to prevent panic!',
              'warning'
            );
            this.luggage.forEach((b) => {
              if (b.state === 'ON_CART') {
                b.state = 'LOOSE_CABIN';
                b.position = { x: 0, y: 1.75, z: -2.5 };
                const m = this.luggageMeshes.get(b.id);
                if (m) m.visible = true;
              }
            });
          }
        }
      }

      this.incidentCooldown -= dt;
      if (this.incidentCooldown <= 0 && !this.activeIncident) {
        this.incidentCooldown = 26;
        this.triggerRandomIncident();
      }
    } else {
      this.telemetry.inTurbulence = false;
    }

    if (this.activeIncident && !this.activeIncident.resolved) {
      this.activeIncident.timerSeconds -= dt;
      if (this.activeIncident.timerSeconds <= 0) {
        this.telemetry.airframeHealth = Math.max(0, this.telemetry.airframeHealth - 18);
        this.passengers.forEach((p) => (p.happiness = Math.max(10, p.happiness - 15)));
        this.activeIncident = null;
        soundEngine.playWarningAlarm();
        this.triggerToast('Incident timer expired! Airframe & passenger satisfaction took a hit!', 'danger');
      }
    }

    this.physics.updateLooseLuggagePhysics(
      dt,
      this.luggage,
      this.telemetry.inTurbulence,
      this.telemetry.rollDeg
    );
    for (const bag of this.luggage) {
      const m = this.luggageMeshes.get(bag.id);
      if (!m) continue;
      if (bag.state === 'ON_CART') {
        // These meshes are separate from the cart, so keep their world positions attached to its bed.
        const idx = Math.max(0, Number(bag.id.split('_').pop()) - 1);
        const localX = (idx % 2) * 0.72 - 0.36;
        const localZ = Math.floor(idx / 2) * 0.72 - 0.72;
        const yaw = this.world.luggageCartGroup.rotation.y;
        const rotatedX = localX * Math.cos(yaw) + localZ * Math.sin(yaw);
        const rotatedZ = -localX * Math.sin(yaw) + localZ * Math.cos(yaw);
        bag.position.x = this.world.luggageCartGroup.position.x + rotatedX;
        bag.position.y = 0.68;
        bag.position.z = this.world.luggageCartGroup.position.z + rotatedZ;
        m.position.set(bag.position.x, bag.position.y, bag.position.z);
      } else if (bag.state === 'LOOSE_CABIN') {
        m.position.set(bag.position.x, bag.position.y, bag.position.z);
      }
    }

    for (const pax of this.passengers) {
      const refs = this.passengerMeshes.get(pax.id);
      if (!refs || !pax.boarded) continue;

      if (this.telemetry.inTurbulence && !pax.seatbeltFastened) {
        pax.isPanicking = true;
        pax.happiness = Math.max(10, pax.happiness - 4 * dt);
      }

      if (pax.isPanicking) {
        refs.group.position.y = pax.position.y + Math.abs(Math.sin(elapsedSec * 10)) * 0.14;
      } else {
        refs.group.position.y = pax.position.y;
      }

      refs.badgeMesh.rotation.y = elapsedSec * 2.5;
      const mat = refs.badgeMesh.material as THREE.MeshBasicMaterial;
      if (pax.isPanicking || pax.needsMedicalAid) {
        mat.color.setHex(0xef4444);
        refs.badgeMesh.visible = true;
      } else if (!pax.ticketChecked || !pax.mealServed || !pax.seatbeltFastened) {
        mat.color.setHex(0xf59e0b);
        refs.badgeMesh.visible = true;
      } else {
        mat.color.setHex(0x10b981);
        refs.badgeMesh.visible = false;
      }
    }

    this.updateCameraTransform();

    if (
      (this.flightPhase === 'FLIGHT_COMPLETE' || this.flightPhase === 'FLIGHT_FAILED') &&
      !this.flightEndedTriggered
    ) {
      this.flightEndedTriggered = true;
      this.releasePointerLock();
      const outcome =
        this.flightPhase === 'FLIGHT_FAILED'
          ? 'CRASHED'
          : this.telemetry.airframeHealth < 70
          ? 'PARTIAL_SUCCESS'
          : 'SUCCESS';
      this.onFlightEnded(outcome);
    }

    this.uiSyncAccumulator += dt;
    if (this.uiSyncAccumulator >= 0.1) {
      this.uiSyncAccumulator = 0;
      this.interactionTarget = this.findBestInteractionTarget();
      this.emitUIState();
    }

    this.netSyncAccumulator += dt;
    if (this.netSyncAccumulator >= 0.12) {
      this.netSyncAccumulator = 0;
      multiplayerClient.sendPlayerTransform(
        {
          x: Number(this.player.localPos.x.toFixed(2)),
          y: Number(this.player.localPos.y.toFixed(2)),
          z: Number(this.player.localPos.z.toFixed(2)),
        },
        Number(this.player.yaw.toFixed(2)),
        this.controlMode,
        this.heldObject?.label || null
      );

      if (this.controlMode === 'IN_COCKPIT') {
        multiplayerClient.sendAircraftSync(
          {
            x: this.aircraft.root.position.x,
            y: this.aircraft.root.position.y,
            z: this.aircraft.root.position.z,
          },
          {
            pitch: this.telemetry.pitchDeg,
            yaw: this.telemetry.headingDeg,
            roll: this.telemetry.rollDeg,
          },
          {
            airspeedKts: this.telemetry.airspeedKts,
            altitudeFt: this.telemetry.altitudeFt,
            throttlePct: this.telemetry.throttlePct,
            gearDown: this.telemetry.gearDown,
            flapsDeg: this.telemetry.flapsDeg,
            enginesRunning: this.telemetry.enginesRunning,
            phase: this.flightPhase,
          }
        );
      } else if (this.controlMode === 'DRIVING_TUG') {
        multiplayerClient.sendVehicleSync(
          'tug',
          {
            x: Number(this.world.tugGroup.position.x.toFixed(2)),
            y: Number(this.world.tugGroup.position.y.toFixed(2)),
            z: Number(this.world.tugGroup.position.z.toFixed(2)),
          },
          Number(this.tugState.yaw.toFixed(2)),
          Number(this.tugState.speed.toFixed(2))
        );
      } else if (this.controlMode === 'DRIVING_FUEL_TRUCK') {
        multiplayerClient.sendVehicleSync(
          'fuel_truck',
          {
            x: Number(this.world.fuelTruckGroup.position.x.toFixed(2)),
            y: Number(this.world.fuelTruckGroup.position.y.toFixed(2)),
            z: Number(this.world.fuelTruckGroup.position.z.toFixed(2)),
          },
          Number(this.fuelTruckState.yaw.toFixed(2)),
          Number(this.fuelTruckState.speed.toFixed(2))
        );
      }
    }
  }

  private updateCameraTransform() {
    this.aircraft.root.updateMatrixWorld();

    if (this.controlMode === 'DRIVING_TUG') {
      const tugPos = this.world.tugGroup.position;
      const yaw = this.tugState.yaw;
      const camOffset = new THREE.Vector3(Math.sin(yaw) * 6.5, 3.2, Math.cos(yaw) * 6.5);
      this.camera.position.copy(tugPos).add(camOffset);
      this.camera.lookAt(tugPos.x, tugPos.y + 1.2, tugPos.z);
      this.heldItemViewGroup.visible = false;
      return;
    }

    if (this.controlMode === 'DRIVING_FUEL_TRUCK') {
      const truckPos = this.world.fuelTruckGroup.position;
      const yaw = this.fuelTruckState.yaw;
      const camOffset = new THREE.Vector3(Math.sin(yaw) * 9.5, 4.2, Math.cos(yaw) * 9.5);
      this.camera.position.copy(truckPos).add(camOffset);
      this.camera.lookAt(truckPos.x, truckPos.y + 1.8, truckPos.z);
      this.heldItemViewGroup.visible = false;
      return;
    }

    if (this.controlMode === 'IN_COCKPIT') {
      this.heldItemViewGroup.visible = false;

      if (this.telemetry.cameraView === 'CHASE') {
        const localOffset = new THREE.Vector3(0, 9.2, 38.0);
        const worldCamPos = localOffset.applyMatrix4(this.aircraft.root.matrixWorld);
        const lookAtLocal = new THREE.Vector3(0, 2.6, -12.0);
        const worldLookAt = lookAtLocal.applyMatrix4(this.aircraft.root.matrixWorld);

        this.camera.position.copy(worldCamPos);
        this.camera.lookAt(worldLookAt);
        return;
      }

      if (this.telemetry.cameraView === 'WING') {
        const localOffset = new THREE.Vector3(2.4, 2.2, 1.8);
        const worldCamPos = localOffset.applyMatrix4(this.aircraft.root.matrixWorld);
        const lookAtLocal = new THREE.Vector3(14.0, 1.2, -1.0);
        const worldLookAt = lookAtLocal.applyMatrix4(this.aircraft.root.matrixWorld);

        this.camera.position.copy(worldCamPos);
        this.camera.lookAt(worldLookAt);
        return;
      }

      // PILOT COCKPIT: eye point is in aircraft-local coordinates, just behind the windscreen.
      // The old camera multiplied the aircraft rotation by the on-foot yaw/pitch, which could
      // double-rotate the view and aim through the fuselage.
      const localEye = new THREE.Vector3(0, 3.12, -16.05);
      const worldEye = localEye.applyMatrix4(this.aircraft.root.matrixWorld);
      this.camera.position.copy(worldEye);
      this.camera.quaternion.copy(this.aircraft.root.quaternion);
      this.camera.rotateY(this.player.yaw * 0.35);
      this.camera.rotateX(this.player.pitch * 0.35);
      return;
    }

    // ON_FOOT
    this.heldItemViewGroup.visible = true;
    const localEye = new THREE.Vector3(
      this.player.localPos.x,
      this.player.localPos.y + 1.56,
      this.player.localPos.z
    );
    const worldEye = localEye.applyMatrix4(this.aircraft.root.matrixWorld);
    this.camera.position.copy(worldEye);

    const lookQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(this.player.pitch, this.player.yaw, 0, 'YXZ')
    );
    const shipQuat = new THREE.Quaternion().setFromEuler(this.aircraft.root.rotation);
    this.camera.quaternion.copy(shipQuat).multiply(lookQuat);
  }

  private setupMultiplayerListeners() {
    this.unsubMultiplayer = multiplayerClient.subscribe((msg: MultiplayerMessage) => {
      if (msg.type === 'room:state') {
        this.peers.clear();
        msg.peers.forEach((p) => {
          if (p.playerId !== multiplayerClient.getPlayerId()) {
            this.peers.set(p.playerId, p);
          }
        });
        this.syncPeerMeshes();
      } else if (msg.type === 'peer:updated') {
        if (msg.peer.playerId !== multiplayerClient.getPlayerId()) {
          this.peers.set(msg.peer.playerId, msg.peer);
          this.syncPeerMeshes();
        }
      } else if (msg.type === 'peer:left') {
        this.peers.delete(msg.playerId);
        const m = this.peerMeshes.get(msg.playerId);
        if (m) {
          this.entityGroup.remove(m);
          this.peerMeshes.delete(msg.playerId);
        }
      } else if (msg.type === 'game:action') {
        if (msg.playerId === multiplayerClient.getPlayerId()) return;
        this.applyRemoteGameAction(msg.action, msg.refId, msg.payload);
      } else if (msg.type === 'aircraft:sync') {
        if (
          msg.playerId !== multiplayerClient.getPlayerId() &&
          this.controlMode !== 'IN_COCKPIT'
        ) {
          this.aircraft.root.position.set(msg.position.x, msg.position.y, msg.position.z);
          this.telemetry.pitchDeg = msg.rotation.pitch;
          this.telemetry.headingDeg = msg.rotation.yaw;
          this.telemetry.rollDeg = msg.rotation.roll;
          this.telemetry.airspeedKts = msg.telemetry.airspeedKts;
          this.telemetry.altitudeFt = msg.telemetry.altitudeFt;
          this.telemetry.throttlePct = msg.telemetry.throttlePct;
          this.telemetry.gearDown = msg.telemetry.gearDown;
          this.telemetry.flapsDeg = msg.telemetry.flapsDeg;
          this.telemetry.enginesRunning = msg.telemetry.enginesRunning;
          this.flightPhase = msg.telemetry.phase as FlightPhase;
        }
      } else if (msg.type === 'vehicle:sync') {
        if (msg.playerId !== multiplayerClient.getPlayerId()) {
          if (msg.vehicleId === 'tug' && this.controlMode !== 'DRIVING_TUG') {
            this.world.tugGroup.position.set(msg.position.x, msg.position.y, msg.position.z);
            this.world.tugGroup.rotation.y = msg.yaw;
          } else if (msg.vehicleId === 'fuel_truck' && this.controlMode !== 'DRIVING_FUEL_TRUCK') {
            this.world.fuelTruckGroup.position.set(msg.position.x, msg.position.y, msg.position.z);
            this.world.fuelTruckGroup.rotation.y = msg.yaw;
          }
        }
      } else if (msg.type === 'lobby:started') {
        this.triggerToast('Flight Departure Started by Host!', 'success');
        soundEngine.playPaChime();
      }
    });
  }

  private syncPeerMeshes() {
    this.peers.forEach((peer, id) => {
      let grp = this.peerMeshes.get(id);
      if (!grp) {
        grp = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 1.35, 12),
          new THREE.MeshStandardMaterial({
            color: peer.role === 'PILOT' ? 0x0ea5e9 : 0xf59e0b,
            roughness: 0.4,
          })
        );
        body.position.y = 0.68;
        grp.add(body);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xfde68a })
        );
        head.position.y = 1.52;
        grp.add(head);

        this.entityGroup.add(grp);
        this.peerMeshes.set(id, grp);
      }
      grp.position.set(peer.localPosition.x, peer.localPosition.y, peer.localPosition.z);
      grp.rotation.y = peer.yaw;
    });
  }

  private applyRemoteGameAction(action: string, refId?: string, payload?: unknown) {
    if (action === 'door:set') {
      const data = payload as { closed: boolean };
      if (this.telemetry.cabinDoorClosed !== data.closed) {
        this.toggleCabinDoor(true);
      }
    } else if (action === 'cargo-door:set') {
      const data = payload as { closed: boolean };
      if (this.telemetry.cargoDoorClosed !== data.closed) {
        this.toggleCargoDoor(true);
      }
    } else if (action === 'mess:cleaned' && refId) {
      this.cleanCabinMess(refId, true);
    } else if (action === 'luggage:stowed' && refId) {
      const bag = this.luggage.find((b) => b.id === refId);
      if (bag) {
        bag.state = 'STOWED_CABIN';
        const m = this.luggageMeshes.get(bag.id);
        if (m) m.visible = false;
      }
    } else if (action === 'cargo:secured' && refId) {
      const item = this.cargo.find((c) => c.id === refId);
      if (item) {
        item.state = 'SECURED_HOLD';
      }
    } else if (action === 'pax:ticket' && refId) {
      const data = payload as { decision: 'APPROVED' | 'DENIED' };
      this.submitTicketDecision(refId, data.decision, true);
    } else if (action === 'pax:belt' && refId) {
      const pax = this.passengers.find((p) => p.id === refId);
      if (pax) {
        pax.seatbeltFastened = true;
        const m = this.passengerMeshes.get(pax.id);
        if (m) m.beltMesh.visible = true;
      }
    } else if (action === 'pax:meal' && refId) {
      const pax = this.passengers.find((p) => p.id === refId);
      if (pax) pax.mealServed = true;
    } else if (action === 'pa:announce' && refId) {
      this.makeAnnouncement(refId as AnnouncementOption['id'], true);
    } else if (action === 'incident:resolved') {
      this.resolveActiveIncident(true);
    }
    this.emitUIState();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    // Browsers may not deliver keyup when a tab loses focus. Clear held input
    // so aircraft and ground vehicles never keep accelerating off-screen.
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA')
    ) {
      return;
    }

    this.keys.add(e.code);

    if (e.code === 'KeyE') {
      e.preventDefault();
      this.triggerInteractKeyE();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      this.resetScenario();
    } else if (e.code === 'KeyG' && this.controlMode === 'IN_COCKPIT') {
      e.preventDefault();
      this.toggleLandingGear();
    } else if (e.code === 'KeyF' && this.controlMode === 'IN_COCKPIT') {
      e.preventDefault();
      this.cycleFlaps();
    } else if (e.code === 'KeyC') {
      e.preventDefault();
      this.cycleCameraView();
    } else if (e.code === 'KeyT' && this.controlMode === 'IN_COCKPIT' && this.telemetry.onGround) {
      e.preventDefault();
      this.quickLineupOnRunway();
    } else if (this.controlMode === 'IN_COCKPIT') {
      if (e.code === 'Digit1') {
        this.setThrottlePct(0);
      } else if (e.code === 'Digit2') {
        this.setThrottlePct(50);
      } else if (e.code === 'Digit3') {
        this.setThrottlePct(85);
      } else if (e.code === 'Digit4') {
        this.setThrottlePct(100);
      }
    }
  };

  public setThrottlePct(pct: number) {
    this.telemetry.throttlePct = Math.max(0, Math.min(100, Math.round(pct)));
    if (this.telemetry.throttlePct > 0) {
      this.telemetry.enginesRunning = true;
    }
    this.emitUIState();
  }

  public adjustThrottle(deltaPct: number) {
    this.setThrottlePct(this.telemetry.throttlePct + deltaPct);
  }

  public setCameraView(view: 'COCKPIT' | 'CHASE' | 'WING') {
    this.telemetry.cameraView = view;
    this.triggerToast(`Camera switched to ${view} view`, 'info');
    this.emitUIState();
  }

  public cycleCameraView() {
    const cycle: Record<'COCKPIT' | 'CHASE' | 'WING', 'COCKPIT' | 'CHASE' | 'WING'> = {
      COCKPIT: 'CHASE',
      CHASE: 'WING',
      WING: 'COCKPIT',
    };
    this.setCameraView(cycle[this.telemetry.cameraView]);
  }

  public toggleLandingGear() {
    if (!this.telemetry.onGround) {
      this.telemetry.gearDown = !this.telemetry.gearDown;
      soundEngine.playInteract();
      this.triggerToast(
        `Landing Gear ${this.telemetry.gearDown ? 'EXTENDED (DOWN)' : 'RETRACTED (UP)'}`,
        'info'
      );
      this.emitUIState();
    } else {
      this.triggerToast('Cannot retract landing gear while on the ground!', 'warning');
    }
  }

  public cycleFlaps() {
    const nextFlaps: Record<0 | 15 | 30, 0 | 15 | 30> = { 0: 15, 15: 30, 30: 0 };
    this.telemetry.flapsDeg = nextFlaps[this.telemetry.flapsDeg];
    soundEngine.playInteract();
    this.triggerToast(`Wing Flaps set to ${this.telemetry.flapsDeg}°`, 'info');
    this.emitUIState();
  }

  public applyWheelBrakes(brakes: boolean) {
    this.telemetry.brakesOn = brakes;
    this.emitUIState();
  }

  private handleWindowBlur = () => {
    this.keys.clear();
    this.isDraggingLook = false;
    this.releasePointerLock();
  };

  private handleVisibilityChange = () => {
    if (document.hidden) this.handleWindowBlur();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (
      this.inspectingPassengerId ||
      this.showManifestModal ||
      this.showAnnouncementMenu ||
      this.showGalleyMenu ||
      this.isPaused
    ) {
      return;
    }
    if (e.button === 0 && !this.pointerLocked && this.container) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouseNorm = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseNorm, this.camera);
      for (const [paxId, paxRef] of this.passengerMeshes.entries()) {
        const hits = raycaster.intersectObjects(paxRef.group.children, true);
        if (hits.length > 0 && hits[0].distance < 4.5) {
          this.interactWithPassenger(paxId);
          this.emitUIState();
          return;
        }
      }
    }

    this.isDraggingLook = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.requestPointerLock();
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPaused) return;
    const sensitivity = 0.0023;

    if (this.pointerLocked) {
      this.player.yaw -= e.movementX * sensitivity;
      this.player.pitch = Math.max(
        -1.35,
        Math.min(1.35, this.player.pitch - e.movementY * sensitivity)
      );
    } else if (this.isDraggingLook) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.player.yaw -= dx * sensitivity * 1.3;
      this.player.pitch = Math.max(
        -1.35,
        Math.min(1.35, this.player.pitch - dy * sensitivity * 1.3)
      );
    }
  };

  private handleMouseUp = () => {
    this.isDraggingLook = false;
  };

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitUIState();
  };

  public requestPointerLock() {
    try {
      if (
        this.renderer.domElement.requestPointerLock &&
        document.pointerLockElement !== this.renderer.domElement
      ) {
        this.renderer.domElement.requestPointerLock();
      }
    } catch {
      // ignore
    }
  }

  public releasePointerLock() {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // ignore
    }
  }

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) this.releasePointerLock();
  }

  public closeModals() {
    this.inspectingPassengerId = null;
    this.showManifestModal = false;
    this.showAnnouncementMenu = false;
    this.showGalleyMenu = false;
    this.emitUIState();
  }

  public openModal(modal: 'MANIFEST' | 'ANNOUNCEMENT' | 'GALLEY') {
    this.releasePointerLock();
    if (modal === 'MANIFEST') {
      this.manifestInspected = true;
      this.showManifestModal = true;
    } else if (modal === 'ANNOUNCEMENT') {
      this.showAnnouncementMenu = true;
    } else if (modal === 'GALLEY') {
      this.showGalleyMenu = true;
    }
    this.emitUIState();
  }

  private triggerToast(text: string, tone: 'info' | 'warning' | 'success' | 'danger') {
    this.toastBanner = { text, tone };
    if (this.toastTimeout) window.clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => {
      this.toastBanner = null;
      this.emitUIState();
    }, 5500);
  }

  public getChecklistState(): PreflightChecklistState {
    const luggageLoadedCount = this.luggage.filter(
      (b) => b.state === 'STOWED_CABIN' || b.state === 'STOWED_CARGO'
    ).length;
    const ticketsCheckedCount = this.passengers.filter((p) => p.ticketChecked).length;
    const hazardousCargoSecuredCount = this.cargo.filter(
      (c) => c.state === 'SECURED_HOLD'
    ).length;
    const boardedPax = this.passengers.filter((p) => p.boarded);
    const mealsServedCount = boardedPax.filter((p) => p.mealServed).length;
    const cleanedCount = this.messes.filter((m) => m.cleaned).length;
    const cleanlinessPct = Math.round((cleanedCount / this.messes.length) * 100);
    const seatbeltsFastenedCount = boardedPax.filter((p) => p.seatbeltFastened).length;

    const safetyChecksComplete =
      this.telemetry.cabinDoorClosed &&
      this.telemetry.cargoDoorClosed &&
      seatbeltsFastenedCount >= Math.min(3, boardedPax.length);

    return {
      luggageLoadedCount,
      luggageTotalCount: this.luggage.length,
      ticketsCheckedCount,
      ticketsTotalCount: this.passengers.length,
      hazardousCargoSecuredCount,
      hazardousCargoTotalCount: this.cargo.length,
      manifestInspected: this.manifestInspected,
      mealsPreparedCount: this.mealsPreparedCount,
      mealsServedCount,
      mealsTotalOrders: boardedPax.length,
      cleanlinessPct,
      announcementsMade: Array.from(this.announcementsMade),
      seatbeltsFastenedCount,
      validSeatedPassengersCount: boardedPax.length,
      cabinDoorClosed: this.telemetry.cabinDoorClosed,
      cargoDoorClosed: this.telemetry.cargoDoorClosed,
      safetyChecksComplete,
    };
  }

  public getFlightSummaryMetrics() {
    const cl = this.getChecklistState();
    const ticketsAccurateCount = this.passengers.filter(
      (p) =>
        p.ticketChecked &&
        ((p.isTicketValid && p.ticketDecision === 'APPROVED') ||
          (!p.isTicketValid && p.ticketDecision === 'DENIED'))
    ).length;
    const boardedPax = this.passengers.filter((p) => p.boarded);
    const avgHappiness =
      boardedPax.length > 0
        ? boardedPax.reduce((acc, p) => acc + p.happiness, 0) / boardedPax.length
        : 80;

    return {
      routeId: this.route.id,
      landingVsFpm: this.telemetry.verticalSpeedFpm || -180,
      luggageLoadedCount: cl.luggageLoadedCount,
      luggageTotalCount: cl.luggageTotalCount,
      ticketsAccurateCount,
      ticketsTotalCount: cl.ticketsTotalCount,
      hazardousCargoIntactCount: cl.hazardousCargoSecuredCount,
      mealsServedCount: cl.mealsServedCount,
      mealsTotalOrders: cl.mealsTotalOrders,
      cleanlinessPct: cl.cleanlinessPct,
      incidentsResolvedCount: this.incidentsResolvedCount,
      airframeHealth: this.telemetry.airframeHealth,
      passengerSatisfactionPct: avgHappiness,
    };
  }

  private emitUIState() {
    const inspectingPassenger = this.inspectingPassengerId
      ? this.passengers.find((p) => p.id === this.inspectingPassengerId) || null
      : null;

    this.onStateChange({
      controlMode: this.controlMode,
      flightPhase: this.flightPhase,
      telemetry: { ...this.telemetry },
      checklist: this.getChecklistState(),
      interactionTarget: this.interactionTarget ? { ...this.interactionTarget } : null,
      heldObject: this.heldObject ? { ...this.heldObject } : null,
      passengers: this.passengers.map((p) => ({ ...p })),
      cargo: this.cargo.map((c) => ({ ...c })),
      activeIncident: this.activeIncident ? { ...this.activeIncident } : null,
      activeSubtitle: this.activeSubtitle,
      toastBanner: this.toastBanner ? { ...this.toastBanner } : null,
      inspectingPassenger,
      showManifestModal: this.showManifestModal,
      showAnnouncementMenu: this.showAnnouncementMenu,
      showGalleyMenu: this.showGalleyMenu,
      showControlsDrawer: this.showControlsDrawer,
      pointerLocked: this.pointerLocked,
      peers: Array.from(this.peers.values()),
      skydiving: this.skydivingState ? { ...this.skydivingState } : null,
    });
  }

  public dispose() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.unsubMultiplayer) this.unsubMultiplayer();
    if (this.toastTimeout !== null) window.clearTimeout(this.toastTimeout);
    if (this.subtitleTimeout !== null) window.clearTimeout(this.subtitleTimeout);
    this.toastTimeout = null;
    this.subtitleTimeout = null;
    this.keys.clear();
    soundEngine.updateEngineSound(false, 0, 0);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    // Release scene GPU resources as well as the renderer itself. This matters
    // when React remounts the simulator or the player restarts a scenario.
    this.scene.traverse((object) => {
      const renderable = object as THREE.Mesh;
      if (renderable.geometry && typeof renderable.geometry.dispose === 'function') {
        renderable.geometry.dispose();
      }
      const materials = Array.isArray(renderable.material)
        ? renderable.material
        : renderable.material
        ? [renderable.material]
        : [];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
