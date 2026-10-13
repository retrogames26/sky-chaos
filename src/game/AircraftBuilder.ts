import * as THREE from 'three';

export interface AircraftParts {
  root: THREE.Group;
  cabinDoorPivot: THREE.Group;
  cargoDoorPivot: THREE.Group;
  emergencyExitPivot: THREE.Group;
  boardingStairs: THREE.Group;
  landingGear: THREE.Group;
  leftFan: THREE.Group;
  rightFan: THREE.Group;
  leftFlap: THREE.Mesh;
  rightFlap: THREE.Mesh;
  leftSpoiler: THREE.Mesh;
  rightSpoiler: THREE.Mesh;
  leftAileron: THREE.Mesh;
  rightAileron: THREE.Mesh;
  leftElevator: THREE.Mesh;
  rightElevator: THREE.Mesh;
  pilotYoke: THREE.Group;
  copilotYoke: THREE.Group;
  throttleHandle: THREE.Group;
  galleySmokeParticles: THREE.Group;
  avionicsSparkLight: THREE.PointLight;
  cabinLight: THREE.PointLight;
  cockpitLight: THREE.PointLight;
  beaconLight: THREE.PointLight;
  strobeLight: THREE.PointLight;
  landingLightsGroup: THREE.Group;
  navLightsGroup: THREE.Group;
  parachuteLocker: THREE.Group;
}

export function buildPassengerAircraft(): AircraftParts {
  const root = new THREE.Group();
  root.name = 'SkyChaosAirliner';

  const fuselageWhite = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const bellyGray = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.35,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });
  const liveryAmber = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.3,
    metalness: 0.2,
  });
  const liveryNavy = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.2,
  });
  const wingMetal = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.3,
    metalness: 0.45,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.65,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.85,
  });
  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.05,
  });
  const cockpitGlass = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const cabinWallMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.7,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const cabinFloorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
  });
  const aisleCarpetMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.9,
  });
  const seatFabricMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.65,
  });
  const headrestMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.5,
  });

  const fuselageCenterY = 2.65;
  const fuselageRadius = 1.95;

  const bellyGeo = new THREE.CylinderGeometry(
    fuselageRadius,
    fuselageRadius,
    29.0,
    28,
    1,
    true,
    Math.PI * 0.55,
    Math.PI * 0.9
  );
  bellyGeo.rotateX(Math.PI / 2);
  const bellyMesh = new THREE.Mesh(bellyGeo, bellyGray);
  bellyMesh.position.set(0, fuselageCenterY, 1.5);
  bellyMesh.castShadow = true;
  bellyMesh.receiveShadow = true;
  root.add(bellyMesh);

  const roofGeo = new THREE.CylinderGeometry(
    fuselageRadius,
    fuselageRadius,
    29.0,
    28,
    1,
    true,
    -Math.PI * 0.45,
    Math.PI * 0.9
  );
  roofGeo.rotateX(Math.PI / 2);
  const roofMesh = new THREE.Mesh(roofGeo, fuselageWhite);
  roofMesh.position.set(0, fuselageCenterY, 1.5);
  roofMesh.castShadow = true;
  root.add(roofMesh);

  const rightWallLower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 29.0), fuselageWhite);
  rightWallLower.position.set(1.82, 2.15, 1.5);
  rightWallLower.castShadow = true;
  root.add(rightWallLower);

  const rightWallUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 29.0), fuselageWhite);
  rightWallUpper.position.set(1.78, 3.65, 1.5);
  root.add(rightWallUpper);

  for (let z = -11.5; z <= 14.5; z += 1.6) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.7), fuselageWhite);
    pillar.position.set(1.84, 2.98, z);
    root.add(pillar);

    const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.58), cockpitGlass);
    winPane.position.set(1.86, 2.98, z + 0.8);
    root.add(winPane);

    const winRim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.64), liveryNavy);
    winRim.position.set(1.88, 2.98, z + 0.8);
    root.add(winRim);
  }

  const leftFwdWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 2.7), fuselageWhite);
  leftFwdWall.position.set(-1.82, 2.8, -11.65);
  root.add(leftFwdWall);

  const leftWallLower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 24.7), fuselageWhite);
  leftWallLower.position.set(-1.82, 2.15, 3.65);
  leftWallLower.castShadow = true;
  root.add(leftWallLower);

  const leftWallUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 24.7), fuselageWhite);
  leftWallUpper.position.set(-1.78, 3.65, 3.65);
  root.add(leftWallUpper);

  for (let z = -7.8; z <= 14.5; z += 1.6) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.7), fuselageWhite);
    pillar.position.set(-1.84, 2.98, z);
    root.add(pillar);

    const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.58), cockpitGlass);
    winPane.position.set(-1.86, 2.98, z + 0.8);
    root.add(winPane);
  }

  const rightStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 28.8), liveryAmber);
  rightStripe.position.set(1.9, 2.45, 1.5);
  root.add(rightStripe);

  const leftStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 24.5), liveryAmber);
  leftStripe.position.set(-1.9, 2.45, 3.65);
  root.add(leftStripe);

  // Smooth Parametric Airliner Nose Construction
  // Seamlessly transitions from main fuselage cylinder (z = -13.0, y = 2.65, r = 1.95) to radome tip (z = -19.4)
  const createNoseLoftGeometry = (
    tMin: number,
    tMax: number,
    radialSegs: number = 36,
    longitudinalSegs: number = 16
  ): THREE.BufferGeometry => {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const totalLength = 6.4; // from z = -13.0 to z = -19.4

    for (let j = 0; j <= longitudinalSegs; j++) {
      const frac = j / longitudinalSegs;
      const t = tMin + frac * (tMax - tMin);
      const z = -13.0 - t * totalLength;
      const centerY = 2.65 - 0.22 * t;
      // Smooth, symmetrical taper with a rounded radome tip.
      const r = 1.95 * Math.pow(Math.max(0, 1 - t * t), 0.62);

      for (let i = 0; i <= radialSegs; i++) {
        const u = i / radialSegs;
        const angle = u * Math.PI * 2;
        const x = r * Math.sin(angle);
        const y = centerY + r * Math.cos(angle);

        positions.push(x, y, z);
        uvs.push(u, t);
      }
    }

    for (let j = 0; j < longitudinalSegs; j++) {
      for (let i = 0; i < radialSegs; i++) {
        const a = j * (radialSegs + 1) + i;
        const b = (j + 1) * (radialSegs + 1) + i;
        const c = (j + 1) * (radialSegs + 1) + (i + 1);
        const d = j * (radialSegs + 1) + (i + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  };

  // 1. Forward fuselage section (t: 0.0 to 0.68, z: -13.0 to -17.35)
  const fwdFuselageGeo = createNoseLoftGeometry(0.0, 0.68, 36, 14);
  const fwdFuselageMesh = new THREE.Mesh(fwdFuselageGeo, fuselageWhite);
  fwdFuselageMesh.castShadow = true;
  fwdFuselageMesh.receiveShadow = true;
  root.add(fwdFuselageMesh);

  // 2. Weather Radar Radome Cone (t: 0.68 to 1.0, z: -17.35 to -19.4)
  const radomeGeo = createNoseLoftGeometry(0.68, 1.0, 36, 12);
  const radomeMesh = new THREE.Mesh(radomeGeo, liveryNavy);
  radomeMesh.castShadow = true;
  radomeMesh.receiveShadow = true;
  root.add(radomeMesh);

  // 3. Nose Livery Speed Stripe (t: 0.05 to 0.70)
  const noseStripeGeo = new THREE.BufferGeometry();
  const stripePositions: number[] = [];
  const stripeIndices: number[] = [];
  for (let j = 0; j <= 12; j++) {
    const t = 0.05 + (j / 12) * 0.62;
    const z = -13.0 - t * 6.4;
    const centerY = 2.65 - 0.22 * t;
    const r = 1.95 * Math.pow(Math.max(0, 1 - t * t), 0.62);
    for (const side of [-1, 1]) {
      const angle = (side * Math.PI) / 2 + 0.05;
      const x = (r + 0.015) * Math.sin(angle);
      const y = centerY + (r + 0.015) * Math.cos(angle);
      stripePositions.push(x, y - 0.1, z);
      stripePositions.push(x, y + 0.1, z);
    }
  }
  for (let j = 0; j < 12; j++) {
    for (let s = 0; s < 2; s++) {
      const base = j * 4 + s * 2;
      const next = (j + 1) * 4 + s * 2;
      stripeIndices.push(base, next, base + 1);
      stripeIndices.push(next, next + 1, base + 1);
    }
  }
  noseStripeGeo.setAttribute('position', new THREE.Float32BufferAttribute(stripePositions, 3));
  noseStripeGeo.setIndex(stripeIndices);
  noseStripeGeo.computeVertexNormals();
  const noseStripeMesh = new THREE.Mesh(noseStripeGeo, liveryAmber);
  root.add(noseStripeMesh);

  // 4. Cockpit Windshield Assembly (Contoured to upper nose surface)
  const windshieldGroup = new THREE.Group();
  windshieldGroup.position.set(0, 2.55, -15.8);

  // Center Windshield Post
  const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), liveryNavy);
  centerPost.position.set(0, 0.76, -0.42);
  centerPost.rotation.x = -0.62;
  windshieldGroup.add(centerPost);

  // Brow Arch (Glareshield top rim)
  const browArch = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.12), liveryNavy);
  browArch.position.set(0, 1.15, -0.15);
  browArch.rotation.x = 0.12;
  windshieldGroup.add(browArch);

  // Windshield Base Frame
  const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 0.15), darkMetal);
  baseFrame.position.set(0, 0.36, -0.68);
  baseFrame.rotation.x = -0.58;
  windshieldGroup.add(baseFrame);

  // Pilot & Copilot Front Windscreen Panes
  const frontGlassGeo = new THREE.PlaneGeometry(0.98, 0.92);
  const frontGlassL = new THREE.Mesh(frontGlassGeo, cockpitGlass);
  frontGlassL.position.set(-0.55, 0.74, -0.42);
  frontGlassL.rotation.x = -0.62;
  frontGlassL.rotation.y = 0.18;
  windshieldGroup.add(frontGlassL);

  const frontGlassR = new THREE.Mesh(frontGlassGeo, cockpitGlass);
  frontGlassR.position.set(0.55, 0.74, -0.42);
  frontGlassR.rotation.x = -0.62;
  frontGlassR.rotation.y = -0.18;
  windshieldGroup.add(frontGlassR);

  // Left & Right Side Sliding Windows
  const sideGlassGeo = new THREE.PlaneGeometry(1.45, 0.85);
  const sideGlassL = new THREE.Mesh(sideGlassGeo, cockpitGlass);
  sideGlassL.position.set(-1.42, 0.78, 0.42);
  sideGlassL.rotation.y = Math.PI / 2 - 0.22;
  sideGlassL.rotation.z = -0.08;
  windshieldGroup.add(sideGlassL);

  const sideGlassR = new THREE.Mesh(sideGlassGeo, cockpitGlass);
  sideGlassR.position.set(1.42, 0.78, 0.42);
  sideGlassR.rotation.y = -Math.PI / 2 + 0.22;
  sideGlassR.rotation.z = 0.08;
  windshieldGroup.add(sideGlassR);

  // Windshield Wipers
  for (const side of [-0.48, 0.48]) {
    const wiperArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.55, 0.02), darkMetal);
    wiperArm.position.set(side, 0.65, -0.48);
    wiperArm.rotation.x = -0.62;
    wiperArm.rotation.z = side > 0 ? 0.35 : -0.35;
    windshieldGroup.add(wiperArm);
  }

  root.add(windshieldGroup);

  const tailCone = new THREE.Mesh(
    new THREE.ConeGeometry(1.95, 6.8, 28),
    fuselageWhite
  );
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.set(0, 2.85, 19.4);
  tailCone.castShadow = true;
  root.add(tailCone);

  const apuNozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 0.6, 16),
    darkMetal
  );
  apuNozzle.rotation.x = Math.PI / 2;
  apuNozzle.position.set(0, 2.95, 22.8);
  root.add(apuNozzle);

  const tailFinShape = new THREE.Shape();
  tailFinShape.moveTo(0, 0);
  tailFinShape.lineTo(4.6, 0);
  tailFinShape.lineTo(1.8, 6.2);
  tailFinShape.lineTo(0.2, 6.2);
  tailFinShape.closePath();

  const tailFinGeo = new THREE.ExtrudeGeometry(tailFinShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
  });
  const tailFin = new THREE.Mesh(tailFinGeo, liveryNavy);
  tailFin.rotation.y = Math.PI / 2;
  tailFin.position.set(-0.12, 3.6, 21.6);
  tailFin.castShadow = true;
  root.add(tailFin);

  const tailStripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 2.2), liveryAmber);
  tailStripe.position.set(0, 6.4, 19.8);
  tailStripe.rotation.x = -0.38;
  root.add(tailStripe);

  const hStabGeo = new THREE.BoxGeometry(10.4, 0.16, 2.1);
  const hStab = new THREE.Mesh(hStabGeo, wingMetal);
  hStab.position.set(0, 3.2, 20.2);
  hStab.castShadow = true;
  root.add(hStab);

  const leftElevator = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.55), darkMetal);
  leftElevator.position.set(-2.8, 3.2, 21.45);
  root.add(leftElevator);

  const rightElevator = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.55), darkMetal);
  rightElevator.position.set(2.8, 3.2, 21.45);
  root.add(rightElevator);

  const wingCenterBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 5.2), bellyGray);
  wingCenterBox.position.set(0, 1.25, 0.5);
  root.add(wingCenterBox);

  const leftWingGroup = new THREE.Group();
  const wingCoreGeo = new THREE.BoxGeometry(13.5, 0.26, 3.4);
  const leftWingMesh = new THREE.Mesh(wingCoreGeo, wingMetal);
  leftWingMesh.position.set(-8.2, 1.55, 1.4);
  leftWingMesh.rotation.y = -0.22;
  leftWingMesh.rotation.z = -0.05;
  leftWingMesh.castShadow = true;
  leftWingMesh.receiveShadow = true;
  leftWingGroup.add(leftWingMesh);

  const leftSharklet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.85, 1.2), liveryAmber);
  leftSharklet.position.set(-14.7, 2.65, 2.85);
  leftSharklet.rotation.z = -0.18;
  leftWingGroup.add(leftSharklet);

  const portLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff2222 })
  );
  portLight.position.set(-14.85, 2.2, 2.4);
  leftWingGroup.add(portLight);

  const leftFlap = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 0.85), darkMetal);
  leftFlap.position.set(-5.2, 1.38, 2.95);
  leftFlap.rotation.y = -0.22;
  leftWingGroup.add(leftFlap);

  const leftSpoiler = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 0.75), darkMetal);
  leftSpoiler.position.set(-6.2, 1.68, 1.85);
  leftSpoiler.rotation.y = -0.22;
  leftWingGroup.add(leftSpoiler);

  const leftAileron = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.65), darkMetal);
  leftAileron.position.set(-11.2, 1.65, 4.15);
  leftAileron.rotation.y = -0.22;
  leftWingGroup.add(leftAileron);
  root.add(leftWingGroup);

  const rightWingGroup = new THREE.Group();
  const rightWingMesh = new THREE.Mesh(wingCoreGeo, wingMetal);
  rightWingMesh.position.set(8.2, 1.55, 1.4);
  rightWingMesh.rotation.y = 0.22;
  rightWingMesh.rotation.z = 0.05;
  rightWingMesh.castShadow = true;
  rightWingMesh.receiveShadow = true;
  rightWingGroup.add(rightWingMesh);

  const rightSharklet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.85, 1.2), liveryAmber);
  rightSharklet.position.set(14.7, 2.65, 2.85);
  rightSharklet.rotation.z = 0.18;
  rightWingGroup.add(rightSharklet);

  const starboardLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x10b981 })
  );
  starboardLight.position.set(14.85, 2.2, 2.4);
  rightWingGroup.add(starboardLight);

  const rightFlap = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 0.85), darkMetal);
  rightFlap.position.set(5.2, 1.38, 2.95);
  rightFlap.rotation.y = 0.22;
  rightWingGroup.add(rightFlap);

  const rightSpoiler = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 0.75), darkMetal);
  rightSpoiler.position.set(6.2, 1.68, 1.85);
  rightSpoiler.rotation.y = 0.22;
  rightWingGroup.add(rightSpoiler);

  const rightAileron = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.65), darkMetal);
  rightAileron.position.set(11.2, 1.65, 4.15);
  rightAileron.rotation.y = 0.22;
  rightWingGroup.add(rightAileron);
  root.add(rightWingGroup);

  const createJetEngine = (xPos: number): THREE.Group => {
    const engGroup = new THREE.Group();
    engGroup.position.set(xPos, 0.95, -0.8);

    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 2.4), bellyGray);
    pylon.position.set(0, 0.55, 0.6);
    engGroup.add(pylon);

    const nacelle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.82, 2.8, 24, 1, true),
      fuselageWhite
    );
    nacelle.rotation.x = Math.PI / 2;
    nacelle.castShadow = true;
    engGroup.add(nacelle);

    const intakeLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.08, 12, 24),
      chromeMat
    );
    intakeLip.position.set(0, 0, -1.4);
    engGroup.add(intakeLip);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.52, 2.5, 20),
      liveryNavy
    );
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0, 0.1);
    engGroup.add(core);

    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.35, 0.9, 16),
      darkMetal
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, 0, 1.65);
    engGroup.add(exhaust);

    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, 0, -1.15);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 16), chromeMat);
    spinner.rotation.x = -Math.PI / 2;
    fanGroup.add(spinner);

    for (let i = 0; i < 12; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.03), chromeMat);
      blade.rotation.z = (i * Math.PI) / 6;
      blade.rotation.y = 0.35;
      fanGroup.add(blade);
    }
    engGroup.add(fanGroup);
    root.add(engGroup);
    return fanGroup;
  };

  const leftFan = createJetEngine(-4.8);
  const rightFan = createJetEngine(4.8);

  const landingGear = new THREE.Group();

  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 1.35, 12), chromeMat);
  noseStrut.position.set(0, 0.85, -15.2);
  landingGear.add(noseStrut);

  for (const wx of [-0.22, 0.22]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 16), tireRubber);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.32, -15.2);
    landingGear.add(wheel);
  }

  for (const side of [-1, 1]) {
    const gx = side * 2.65;
    const mainStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 1.45, 12), chromeMat);
    mainStrut.position.set(gx, 0.9, 1.2);
    landingGear.add(mainStrut);

    for (const wx of [-0.32, 0.32]) {
      for (const wz of [-0.35, 0.35]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 18), tireRubber);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(gx + wx, 0.42, 1.2 + wz);
        landingGear.add(tire);
      }
    }
  }
  root.add(landingGear);

  const cabinDoorPivot = new THREE.Group();
  cabinDoorPivot.position.set(-1.84, 2.65, -10.25);

  const cabinDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 1.5), fuselageWhite);
  cabinDoorMesh.position.set(0, 0, 0.75);
  cabinDoorPivot.add(cabinDoorMesh);

  const doorWin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.36), cockpitGlass);
  doorWin.position.set(0, 0.35, 0.75);
  cabinDoorPivot.add(doorWin);

  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.45), liveryAmber);
  doorHandle.position.set(0.08, -0.1, 0.95);
  cabinDoorPivot.add(doorHandle);

  cabinDoorPivot.rotation.y = -2.1;
  root.add(cabinDoorPivot);

  const cargoDoorPivot = new THREE.Group();
  cargoDoorPivot.position.set(-1.93, 1.9, 12.8);
  // Contrasting inset and panel make the rear hold door readable from the apron.
  const cargoDoorInset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.18, 1.9), darkMetal);
  cargoDoorInset.position.set(0, 0, 0.92);
  cargoDoorPivot.add(cargoDoorInset);
  const cargoDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.08, 1.78), liveryAmber);
  cargoDoorMesh.position.set(0.07, 0, 0.92);
  cargoDoorPivot.add(cargoDoorMesh);
  const cargoDoorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.12), chromeMat);
  cargoDoorHandle.position.set(0.17, -0.18, 0.25);
  cargoDoorPivot.add(cargoDoorHandle);
  cargoDoorPivot.rotation.y = -1.2;
  root.add(cargoDoorPivot);

  const boardingStairs = new THREE.Group();
  boardingStairs.position.set(0, 0, -9.5);

  const topPlat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 2.0), darkMetal);
  topPlat.position.set(-2.35, 1.58, 0);
  boardingStairs.add(topPlat);

  for (let s = 0; s < 10; s++) {
    const t = s / 9;
    const sx = -5.5 + t * 2.65;
    const sy = 0.15 + t * 1.4;
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.6), bellyGray);
    step.position.set(sx, sy, 0);
    step.castShadow = true;
    boardingStairs.add(step);
  }

  for (const rz of [-0.82, 0.82]) {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.08), fuselageWhite);
    stringer.position.set(-4.15, 0.85, rz);
    stringer.rotation.z = 0.48;
    boardingStairs.add(stringer);

    const handrail = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.07, 0.07), liveryAmber);
    handrail.position.set(-4.15, 1.75, rz);
    handrail.rotation.z = 0.48;
    boardingStairs.add(handrail);

    const postBot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), liveryAmber);
    postBot.position.set(-5.5, 0.55, rz);
    boardingStairs.add(postBot);

    const postTop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), liveryAmber);
    postTop.position.set(-2.8, 2.0, rz);
    boardingStairs.add(postTop);
  }

  root.add(boardingStairs);

  const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.08, 33.0), cabinFloorMat);
  cabinFloor.position.set(0, 1.61, -0.7);
  cabinFloor.receiveShadow = true;
  root.add(cabinFloor);

  const aisleCarpet = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.02, 26.5), aisleCarpetMat);
  aisleCarpet.position.set(0, 1.655, 0.5);
  root.add(aisleCarpet);

  const bulkheadLeft = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.25, 0.12), cabinWallMat);
  bulkheadLeft.position.set(-1.12, 2.75, -12.6);
  root.add(bulkheadLeft);

  const bulkheadRight = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.25, 0.12), cabinWallMat);
  bulkheadRight.position.set(1.12, 2.75, -12.6);
  root.add(bulkheadRight);

  const bulkheadHeader = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.12), cabinWallMat);
  bulkheadHeader.position.set(0, 3.68, -12.6);
  root.add(bulkheadHeader);

  const rearBulkhead = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.3, 0.15), cabinWallMat);
  rearBulkhead.position.set(0, 2.78, 15.8);
  root.add(rearBulkhead);

  for (const side of [-1, 1]) {
    const bin = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 16.2), cabinWallMat);
    bin.position.set(side * 1.38, 3.52, 0.5);
    root.add(bin);

    const binTrim = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 16.2), liveryAmber);
    binTrim.position.set(side * 1.03, 3.35, 0.5);
    root.add(binTrim);
  }

  const createCockpitSeat = (x: number): THREE.Group => {
    const seat = new THREE.Group();
    seat.position.set(x, 1.65, -15.0);
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), darkMetal);
    cushion.position.y = 0.42;
    seat.add(cushion);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.85, 0.1), darkMetal);
    backrest.position.set(0, 0.85, 0.24);
    seat.add(backrest);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.4, 12), chromeMat);
    base.position.y = 0.2;
    seat.add(base);
    return seat;
  };
  root.add(createCockpitSeat(-0.58));
  root.add(createCockpitSeat(0.58));

  const instPanel = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.65, 0.45), darkMetal);
  instPanel.position.set(0, 2.38, -16.15);
  root.add(instPanel);

  const screenColors = [0x0ea5e9, 0x10b981, 0xf59e0b, 0x0ea5e9];
  [-0.82, -0.32, 0.28, 0.78].forEach((sx, idx) => {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.32),
      new THREE.MeshBasicMaterial({ color: screenColors[idx] })
    );
    screen.position.set(sx, 2.42, -15.91);
    root.add(screen);
  });

  const createYoke = (x: number): THREE.Group => {
    const yokeGroup = new THREE.Group();
    yokeGroup.position.set(x, 2.15, -15.65);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 10), darkMetal);
    column.position.y = -0.2;
    yokeGroup.add(column);

    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.05), liveryNavy);
    yokeGroup.add(bar);

    const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.045), liveryNavy);
    hornL.position.set(-0.17, 0.08, 0);
    yokeGroup.add(hornL);

    const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.045), liveryNavy);
    hornR.position.set(0.17, 0.08, 0);
    yokeGroup.add(hornR);

    root.add(yokeGroup);
    return yokeGroup;
  };
  const pilotYoke = createYoke(-0.58);
  const copilotYoke = createYoke(0.58);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 1.1), darkMetal);
  pedestal.position.set(0, 1.94, -15.45);
  root.add(pedestal);

  const throttleHandle = new THREE.Group();
  throttleHandle.position.set(0, 2.25, -15.55);
  const leverArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.04), chromeMat);
  leverArm.position.y = 0.1;
  throttleHandle.add(leverArm);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 12), liveryAmber);
  knob.rotation.z = Math.PI / 2;
  knob.position.y = 0.22;
  throttleHandle.add(knob);
  root.add(throttleHandle);

  const galleyCounter = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 2.1), darkMetal);
  galleyCounter.position.set(1.25, 2.22, -10.8);
  root.add(galleyCounter);

  const ovenFace = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.75, 0.9), chromeMat);
  ovenFace.position.set(1.22, 3.18, -10.8);
  root.add(ovenFace);

  const trayMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.65), liveryAmber);
  trayMesh.position.set(1.15, 2.84, -10.8);
  root.add(trayMesh);

  const paBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.32), liveryAmber);
  paBox.position.set(-1.68, 2.85, -11.2);
  root.add(paBox);

  const galleySmokeParticles = new THREE.Group();
  galleySmokeParticles.position.set(1.15, 3.0, -10.8);
  galleySmokeParticles.visible = false;
  for (let i = 0; i < 8; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.18 + (i % 3) * 0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.65 })
    );
    puff.position.set(
      (Math.sin(i * 1.7) * 0.25),
      i * 0.12,
      (Math.cos(i * 2.1) * 0.25)
    );
    galleySmokeParticles.add(puff);
  }
  root.add(galleySmokeParticles);

  const seatColsX = [-1.22, -0.78, 0.78, 1.22];
  for (let row = 1; row <= 6; row++) {
    const zPos = -6.0 + (row - 1) * 2.4;
    for (const sx of seatColsX) {
      const seatGrp = new THREE.Group();
      seatGrp.position.set(sx, 1.65, zPos);

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.44), seatFabricMat);
      base.position.y = 0.38;
      seatGrp.add(base);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.08), seatFabricMat);
      back.position.set(0, 0.74, 0.18);
      seatGrp.add(back);

      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.09), headrestMat);
      headrest.position.set(0, 1.05, 0.18);
      seatGrp.add(headrest);

      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.32), darkMetal);
      leg.position.y = 0.18;
      seatGrp.add(leg);

      root.add(seatGrp);
    }
  }

  const lavatoryBox = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.15, 1.6), cabinWallMat);
  lavatoryBox.position.set(-1.15, 2.72, 10.6);
  root.add(lavatoryBox);

  const breakerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.85), darkMetal);
  breakerPanel.position.set(1.65, 2.75, 10.6);
  root.add(breakerPanel);

  const breakerStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.75), liveryAmber);
  breakerStripe.position.set(1.64, 3.15, 10.6);
  root.add(breakerStripe);

  const extinguisherMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.48, 12),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  extinguisherMesh.position.set(1.62, 2.45, 9.4);
  root.add(extinguisherMesh);

  const manifestBoard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 1.1), liveryAmber);
  manifestBoard.position.set(-1.65, 2.75, 12.5);
  root.add(manifestBoard);

  const cargoPad = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 2.2), liveryAmber);
  cargoPad.position.set(0, 1.66, 13.9);
  root.add(cargoPad);

  // Emergency Overwing Exit Door (Starboard side at z = 0.8)
  const emergencyExitPivot = new THREE.Group();
  emergencyExitPivot.position.set(1.82, 2.65, 0.8);
  const emergencyExitDoor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 0.95), liveryAmber);
  emergencyExitDoor.position.set(0, 0, 0.45);
  emergencyExitPivot.add(emergencyExitDoor);
  const exitSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.16, 0.45),
    new THREE.MeshBasicMaterial({ color: 0x10b981 })
  );
  exitSign.position.set(-0.06, 0.85, 0.45);
  emergencyExitPivot.add(exitSign);
  root.add(emergencyExitPivot);

  // Parachute Locker Cabinet in Rear Cabin (Starboard/Port jumpseat wall at z = 8.5)
  const parachuteLocker = new THREE.Group();
  parachuteLocker.position.set(-1.62, 2.45, 8.5);
  const lockerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.6, 1.4), darkMetal);
  parachuteLocker.add(lockerFrame);
  const lockerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 1.2), cockpitGlass);
  lockerGlass.position.x = 0.13;
  parachuteLocker.add(lockerGlass);

  // 4 Emergency Parachute Packs mounted inside
  for (let p = 0; p < 4; p++) {
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.34, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 })
    );
    pack.position.set(0.04, -0.4 + (p % 2) * 0.45, -0.32 + Math.floor(p / 2) * 0.55);
    parachuteLocker.add(pack);
  }
  const lockerStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.18, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  lockerStripe.position.set(0, 0.65, 0);
  parachuteLocker.add(lockerStripe);
  root.add(parachuteLocker);

  // Navigation, Beacon, Strobe, and Landing Lights
  const navLightsGroup = new THREE.Group();
  // Tail navigation white light
  const tailNavLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  tailNavLight.position.set(0, 3.2, 22.8);
  navLightsGroup.add(tailNavLight);
  root.add(navLightsGroup);

  // Red Rotating Beacon (Top and bottom of fuselage)
  const beaconLight = new THREE.PointLight(0xef4444, 4.0, 18);
  beaconLight.position.set(0, 4.75, 1.5);
  root.add(beaconLight);

  const beaconBelly = new THREE.PointLight(0xef4444, 3.0, 14);
  beaconBelly.position.set(0, 0.65, 1.5);
  beaconLight.add(beaconBelly);

  // High-intensity wingtip Strobe Light
  const strobeLight = new THREE.PointLight(0xffffff, 0, 35);
  strobeLight.position.set(0, 2.5, 2.5);
  root.add(strobeLight);

  // Forward Landing Lights
  const landingLightsGroup = new THREE.Group();
  const noseSpotL = new THREE.SpotLight(0xfffbeb, 6.0, 120, Math.PI / 6, 0.45);
  noseSpotL.position.set(-0.35, 1.1, -15.2);
  noseSpotL.target.position.set(0, 0, -85);
  landingLightsGroup.add(noseSpotL);
  landingLightsGroup.add(noseSpotL.target);

  const noseSpotR = new THREE.SpotLight(0xfffbeb, 6.0, 120, Math.PI / 6, 0.45);
  noseSpotR.position.set(0.35, 1.1, -15.2);
  noseSpotR.target.position.set(0, 0, -85);
  landingLightsGroup.add(noseSpotR);
  landingLightsGroup.add(noseSpotR.target);
  root.add(landingLightsGroup);

  const cabinLight = new THREE.PointLight(0xfffbeb, 1.4, 24);
  cabinLight.position.set(0, 3.65, -1.0);
  root.add(cabinLight);

  const cockpitLight = new THREE.PointLight(0x38bdf8, 1.1, 8);
  cockpitLight.position.set(0, 3.4, -15.2);
  root.add(cockpitLight);

  const avionicsSparkLight = new THREE.PointLight(0xef4444, 0, 10);
  avionicsSparkLight.position.set(0.8, 3.1, 10.6);
  root.add(avionicsSparkLight);

  return {
    root,
    cabinDoorPivot,
    cargoDoorPivot,
    emergencyExitPivot,
    boardingStairs,
    landingGear,
    leftFan,
    rightFan,
    leftFlap,
    rightFlap,
    leftSpoiler,
    rightSpoiler,
    leftAileron,
    rightAileron,
    leftElevator,
    rightElevator,
    pilotYoke,
    copilotYoke,
    throttleHandle,
    galleySmokeParticles,
    avionicsSparkLight,
    cabinLight,
    cockpitLight,
    beaconLight,
    strobeLight,
    landingLightsGroup,
    navLightsGroup,
    parachuteLocker,
  };
}

export function createParachuteBackpackMesh(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'WearableParachuteBackpack';

  const packMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.5,
    metalness: 0.1,
  });
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.18), packMat);
  pack.castShadow = true;
  grp.add(pack);

  const cordMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 12), cordMat);
  cord.position.set(-0.14, 0.1, 0.1);
  grp.add(cord);

  const strapMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  for (const sx of [-0.12, 0.12]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.03), strapMat);
    strap.position.set(sx, 0, -0.1);
    grp.add(strap);
  }
  return grp;
}

export function createDeployedCanopyMesh(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'DeployedParachuteCanopy';

  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const canopyGeo = new THREE.SphereGeometry(3.4, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = 4.8;
  grp.add(canopy);

  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const stripeGeo = new THREE.SphereGeometry(3.42, 8, 12, 0, Math.PI * 0.5, 0, Math.PI * 0.42);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = 4.8;
  grp.add(stripe);

  const lineMat = new THREE.LineBasicMaterial({
    color: 0xe2e8f0,
    opacity: 0.85,
    transparent: true,
  });
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const rimX = Math.cos(angle) * 3.2;
    const rimZ = Math.sin(angle) * 3.2;
    const rimY = 4.8 - Math.sin(Math.PI * 0.42) * 1.1;

    const points = [
      new THREE.Vector3(rimX, rimY, rimZ),
      new THREE.Vector3(0, 0.2, 0),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, lineMat);
    grp.add(line);
  }
  return grp;
}
