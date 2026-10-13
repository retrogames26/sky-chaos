import * as THREE from 'three';

export interface WorldObjects {
  worldGroup: THREE.Group;
  radarDish: THREE.Group;
  destBeaconLight: THREE.PointLight;
  cloudGroup: THREE.Group;
  tugGroup: THREE.Group;
  fuelTruckGroup: THREE.Group;
  luggageCartGroup: THREE.Group;
}

export function buildAirportAndFlightWorld(): WorldObjects {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'SkyChaosWorld';

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.95 });
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const redLineMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const terminalConcrete = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5 });
  const terminalGlass = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.65,
  });
  const amberAccent = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  const vehicleWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(10000, 12000), grassMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.set(0, -0.05, -2000);
  groundPlane.receiveShadow = true;
  worldGroup.add(groundPlane);

  const apronMesh = new THREE.Mesh(new THREE.PlaneGeometry(90, 160), apronMat);
  apronMesh.rotation.x = -Math.PI / 2;
  apronMesh.position.set(-5, 0.0, -10);
  apronMesh.receiveShadow = true;
  worldGroup.add(apronMesh);

  const standLine = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 42), yellowLineMat);
  standLine.rotation.x = -Math.PI / 2;
  standLine.position.set(0, 0.02, -5);
  worldGroup.add(standLine);

  const taxiwayConnector = new THREE.Mesh(new THREE.PlaneGeometry(60, 26), asphaltMat);
  taxiwayConnector.rotation.x = -Math.PI / 2;
  taxiwayConnector.position.set(22, 0.01, -35);
  worldGroup.add(taxiwayConnector);

  const taxiLine = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.45), yellowLineMat);
  taxiLine.rotation.x = -Math.PI / 2;
  taxiLine.position.set(22, 0.03, -35);
  worldGroup.add(taxiLine);

  for (const bx of [-16.5, 16.5]) {
    const sideSafety = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 46), redLineMat);
    sideSafety.rotation.x = -Math.PI / 2;
    sideSafety.position.set(bx, 0.02, 2);
    worldGroup.add(sideSafety);
  }

  const depRunway = new THREE.Mesh(new THREE.PlaneGeometry(38, 1170), asphaltMat);
  depRunway.rotation.x = -Math.PI / 2;
  depRunway.position.set(45, 0.015, -465);
  depRunway.receiveShadow = true;
  worldGroup.add(depRunway);

  for (let z = 90; z >= -1020; z -= 28) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 14), whiteLineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(45, 0.03, z);
    worldGroup.add(dash);

    for (const ex of [45 - 18.5, 45 + 18.5]) {
      const edgeLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      edgeLight.position.set(ex, 0.35, z);
      worldGroup.add(edgeLight);
    }
  }

  for (let k = -14; k <= 14; k += 3.5) {
    const key = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 18), whiteLineMat);
    key.rotation.x = -Math.PI / 2;
    key.position.set(45 + k, 0.03, 95);
    worldGroup.add(key);
  }

  const terminalGroup = new THREE.Group();
  terminalGroup.position.set(-34, 0, -10);

  const termBase = new THREE.Mesh(new THREE.BoxGeometry(22, 11, 95), terminalConcrete);
  termBase.position.y = 5.5;
  termBase.castShadow = true;
  termBase.receiveShadow = true;
  terminalGroup.add(termBase);

  const termWindowWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.5, 88), terminalGlass);
  termWindowWall.position.set(11.1, 6.0, 0);
  terminalGroup.add(termWindowWall);

  const termRoof = new THREE.Mesh(new THREE.BoxGeometry(26, 0.9, 100), amberAccent);
  termRoof.position.set(1.5, 11.4, 0);
  terminalGroup.add(termRoof);

  worldGroup.add(terminalGroup);

  const towerGroup = new THREE.Group();
  towerGroup.position.set(-36, 0, -78);

  const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 34, 16), terminalConcrete);
  towerShaft.position.y = 17;
  towerShaft.castShadow = true;
  towerGroup.add(towerShaft);

  const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 4.8, 5.5, 16), terminalGlass);
  towerCab.position.y = 36.5;
  towerGroup.add(towerCab);

  const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.8, 16), amberAccent);
  towerRoof.position.y = 39.6;
  towerGroup.add(towerRoof);

  const radarDish = new THREE.Group();
  radarDish.position.set(0, 41.2, 0);
  const dishMesh = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 0.35), vehicleWhite);
  radarDish.add(dishMesh);
  towerGroup.add(radarDish);

  worldGroup.add(towerGroup);

  const luggageCart = new THREE.Group();
  luggageCart.position.set(-5.4, 0, -4.4);
  const cartBed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 3.2), amberAccent);
  cartBed.position.y = 0.45;
  luggageCart.add(cartBed);
  for (const cx of [-0.85, 0.85]) {
    for (const cz of [-1.2, 1.2]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 12), darkMetal);
      w.rotation.z = Math.PI / 2;
      w.position.set(cx, 0.22, cz);
      luggageCart.add(w);
    }
  }
  worldGroup.add(luggageCart);

  // Tug with wheels, cab, seat and beacon light
  const tug = new THREE.Group();
  tug.name = 'AirportTug';
  tug.position.set(-5.4, 0, -7.2);

  const tugChassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.6), amberAccent);
  tugChassis.position.y = 0.35;
  tug.add(tugChassis);

  const tugHood = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.3), vehicleWhite);
  tugHood.position.set(0, 0.8, -0.6);
  tug.add(tugHood);

  const tugSeat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.55), darkMetal);
  tugSeat.position.set(0, 0.8, 0.45);
  tug.add(tugSeat);

  const tugSteering = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), darkMetal);
  tugSteering.rotation.x = Math.PI / 4;
  tugSteering.position.set(0, 1.05, 0.05);
  tug.add(tugSteering);

  const tugBeacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  tugBeacon.position.set(0, 1.15, -0.8);
  tug.add(tugBeacon);

  for (const wx of [-0.85, 0.85]) {
    for (const wz of [-0.75, 0.75]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), darkMetal);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.32, wz);
      wheel.castShadow = true;
      tug.add(wheel);
    }
  }
  worldGroup.add(tug);

  const hazardPallet = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 4.0), redLineMat);
  hazardPallet.position.set(-6.2, 0.11, 4.8);
  worldGroup.add(hazardPallet);

  // Aviation Fuel Tanker Truck
  const fuelTruck = new THREE.Group();
  fuelTruck.name = 'AirportFuelTruck';
  fuelTruck.position.set(11.5, 0, -6.5);

  const fuelChassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 7.8), darkMetal);
  fuelChassis.position.y = 0.55;
  fuelTruck.add(fuelChassis);

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 5.2, 20), vehicleWhite);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 1.9, 0.6);
  fuelTruck.add(tank);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 2.2), amberAccent);
  cab.position.set(0, 1.7, -2.7);
  fuelTruck.add(cab);

  const cabWindshield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.2), terminalGlass);
  cabWindshield.position.set(0, 2.0, -3.75);
  fuelTruck.add(cabWindshield);

  const fuelHoseReel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 12), redLineMat);
  fuelHoseReel.rotation.z = Math.PI / 2;
  fuelHoseReel.position.set(-1.15, 1.4, -0.4);
  fuelTruck.add(fuelHoseReel);

  for (const fx of [-1.15, 1.15]) {
    for (const fz of [-2.6, 0.4, 2.4]) {
      const fw = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 16), darkMetal);
      fw.rotation.z = Math.PI / 2;
      fw.position.set(fx, 0.48, fz);
      fw.castShadow = true;
      fuelTruck.add(fw);
    }
  }
  worldGroup.add(fuelTruck);

  const createRampWorker = (x: number, z: number, rotY: number) => {
    const worker = new THREE.Group();
    worker.position.set(x, 0, z);
    worker.rotation.y = rotY;
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.75, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a })
    );
    legs.position.y = 0.38;
    worker.add(legs);
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.65, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x84cc16 })
    );
    vest.position.y = 1.08;
    worker.add(vest);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfde68a })
    );
    head.position.y = 1.6;
    worker.add(head);
    worldGroup.add(worker);
  };
  createRampWorker(-7.8, -6.5, 0.8);
  createRampWorker(8.2, -4.5, -1.1);

  const silhouetteJet = new THREE.Group();
  silhouetteJet.position.set(-14, 0, -58);
  silhouetteJet.rotation.y = 0.45;
  const silFuse = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 26, 16), vehicleWhite);
  silFuse.rotation.x = Math.PI / 2;
  silFuse.position.y = 2.4;
  silhouetteJet.add(silFuse);
  const silWings = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 3.2), vehicleWhite);
  silWings.position.y = 1.8;
  silhouetteJet.add(silWings);
  const silTail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.8, 2.8), amberAccent);
  silTail.position.set(0, 4.6, 11.5);
  silhouetteJet.add(silTail);
  worldGroup.add(silhouetteJet);

  const destRunway = new THREE.Mesh(new THREE.PlaneGeometry(44, 1200), asphaltMat);
  destRunway.rotation.x = -Math.PI / 2;
  destRunway.position.set(45, 0.02, -2350);
  destRunway.receiveShadow = true;
  worldGroup.add(destRunway);

  for (let z = -1760; z >= -2920; z -= 30) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 15), whiteLineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(45, 0.04, z);
    worldGroup.add(dash);

    for (const ex of [45 - 21, 45 + 21]) {
      const l = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      l.position.set(ex, 0.4, z);
      worldGroup.add(l);
    }
  }

  for (let k = -16; k <= 16; k += 4) {
    const key = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 20), whiteLineMat);
    key.rotation.x = -Math.PI / 2;
    key.position.set(45 + k, 0.04, -1780);
    worldGroup.add(key);
  }

  const destTerminal = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 110), terminalConcrete);
  destTerminal.position.set(-10, 7, -2350);
  worldGroup.add(destTerminal);

  const destTower = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 48, 16), amberAccent);
  destTower.position.set(-10, 24, -2250);
  worldGroup.add(destTower);

  const destBeaconLight = new THREE.PointLight(0x10b981, 8, 450);
  destBeaconLight.position.set(45, 38, -1800);
  worldGroup.add(destBeaconLight);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  for (const rz of [-1250, -1450, -1650]) {
    const altY = rz === -1250 ? 68 : rz === -1450 ? 44 : 20;
    const approachGate = new THREE.Mesh(new THREE.RingGeometry(18, 20.5, 24), ringMat);
    approachGate.position.set(45, altY, rz);
    worldGroup.add(approachGate);
  }

  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    transparent: true,
    opacity: 0.86,
  });

  const cloudPositions = [
    [-140, 125, -350],
    [180, 140, -520],
    [-80, 110, -780],
    [160, 130, -1050],
    [-150, 120, -1350],
    [195, 115, -1680],
    [-110, 135, -2050],
    [175, 125, -2450],
  ];

  cloudPositions.forEach(([cx, cy, cz]) => {
    const cluster = new THREE.Group();
    cluster.position.set(cx, cy, cz);
    for (let p = 0; p < 5; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(18 + (p % 3) * 8, 12, 12), cloudMat);
      puff.position.set((p - 2) * 14, (p % 2) * 6, (p % 3) * 8);
      puff.scale.y = 0.58;
      cluster.add(puff);
    }
    cloudGroup.add(cluster);
  });
  worldGroup.add(cloudGroup);

  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92 });
  const mountainCoords = [
    [-420, -600, 160, 210],
    [520, -850, 190, 260],
    [-480, -1450, 210, 280],
    [490, -1750, 175, 230],
    [-450, -2400, 190, 250],
  ];
  mountainCoords.forEach(([mx, mz, rad, h]) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 8), mountainMat);
    peak.position.set(mx, h / 2 - 2, mz);
    worldGroup.add(peak);
  });

  return {
    worldGroup,
    radarDish,
    destBeaconLight,
    cloudGroup,
    tugGroup: tug,
    fuelTruckGroup: fuelTruck,
    luggageCartGroup: luggageCart,
  };
}
