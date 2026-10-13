import * as THREE from 'three';
import {
  AircraftTelemetry,
  FlightPhase,
  LuggageItem,
  SkydivingState,
} from '../types/game';

export interface PlayerPhysicsState {
  localPos: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  grounded: boolean;
  insideCabin: boolean;
}

export interface VehiclePhysicsState {
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  steerAngle: number;
}

export class PhysicsWorld {
  private airborneTime: number = 0;

  public updatePlayerWalk(
    dt: number,
    player: PlayerPhysicsState,
    input: { forward: number; right: number; sprint: boolean; jump: boolean },
    cabinDoorClosed: boolean
  ) {
    const clampedDt = Math.min(dt, 0.05);
    const moveSpeed = input.sprint ? 6.8 : 4.2;

    const forwardX = -Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);

    const wishX = forwardX * input.forward + rightX * input.right;
    const wishZ = forwardZ * input.forward + rightZ * input.right;
    const wishLen = Math.hypot(wishX, wishZ);

    if (wishLen > 0.001) {
      player.velocity.x = (wishX / wishLen) * moveSpeed;
      player.velocity.z = (wishZ / wishLen) * moveSpeed;
    } else {
      player.velocity.x *= 0.75;
      player.velocity.z *= 0.75;
    }

    const prevX = player.localPos.x;
    const prevZ = player.localPos.z;
    let nextX = prevX + player.velocity.x * clampedDt;
    let nextZ = prevZ + player.velocity.z * clampedDt;

    const wasInside = prevX > -1.78 && prevX < 1.78 && prevZ > -16.8 && prevZ < 15.6 && player.localPos.y >= 1.35;

    if (wasInside) {
      const maxX = nextZ < -12.6 ? 1.15 : 1.52;
      if (nextX > maxX) nextX = maxX;

      const inDoorwayZ = nextZ >= -10.25 && nextZ <= -8.75;
      if (nextX < -1.52) {
        if (!inDoorwayZ || cabinDoorClosed) {
          nextX = -1.52;
        }
      }

      if (nextZ < -15.35) nextZ = -15.35;
      if (nextZ > 15.1) nextZ = 15.1;

      if ((prevZ >= -12.4 && nextZ < -12.4) || (prevZ <= -12.8 && nextZ > -12.8)) {
        if (Math.abs(nextX) > 0.44) {
          nextZ = prevZ >= -12.4 ? -12.4 : -12.8;
        }
      }

      const seatRowsZ = [-6.0, -3.6, -1.2, 1.2, 3.6, 6.0];
      for (const rz of seatRowsZ) {
        if (Math.abs(nextZ - rz) < 0.46 && Math.abs(nextX) > 0.46) {
          if (Math.abs(prevX) <= 0.46) {
            nextX = Math.sign(nextX) * 0.45;
          } else {
            nextZ = prevZ < rz ? rz - 0.46 : rz + 0.46;
          }
        }
      }

      if (nextX > 0.65 && nextZ > -12.0 && nextZ < -9.6) {
        nextX = 0.65;
      }

      if (nextX < -0.52 && nextZ > 9.7 && nextZ < 11.5) {
        nextX = -0.52;
      }

      player.localPos.x = nextX;
      player.localPos.z = nextZ;
      player.localPos.y = 1.65;
      player.grounded = true;
      player.insideCabin = nextX > -1.78;
    } else {
      const onStairsZ = nextZ >= -10.45 && nextZ <= -8.55;
      const onStairsX = nextX >= -5.7 && nextX <= -1.7;

      if (onStairsZ && onStairsX && !cabinDoorClosed) {
        const progress = Math.max(0, Math.min(1, (nextX - -5.6) / 3.0));
        player.localPos.y = progress * 1.65;
        player.localPos.x = nextX;
        player.localPos.z = nextZ;
        player.grounded = true;
        player.insideCabin = nextX > -1.8;
      } else {
        if (nextX > -2.15 && nextX < 2.15 && nextZ > -18.5 && nextZ < 20.5 && player.localPos.y < 1.35) {
          if (prevX <= -2.15) nextX = -2.15;
          else if (prevX >= 2.15) nextX = 2.15;
        }

        nextX = Math.max(-50, Math.min(65, nextX));
        nextZ = Math.max(-80, Math.min(60, nextZ));

        player.localPos.x = nextX;
        player.localPos.z = nextZ;

        if (player.localPos.y > 0) {
          player.localPos.y = Math.max(0, player.localPos.y - 6.0 * clampedDt);
        }
        player.grounded = player.localPos.y <= 0.01;
        player.insideCabin = false;
      }
    }
  }

  public updateVehiclePhysics(
    dt: number,
    vehicle: VehiclePhysicsState,
    input: { throttle: number; steer: number; brake: boolean },
    maxSpeed: number = 14
  ) {
    const clampedDt = Math.min(dt, 0.05);
    const accelRate = 18.0;
    const drag = 2.5;
    const brakeDecel = 32.0;

    if (input.brake) {
      if (vehicle.speed > 0) {
        vehicle.speed = Math.max(0, vehicle.speed - brakeDecel * clampedDt);
      } else if (vehicle.speed < 0) {
        vehicle.speed = Math.min(0, vehicle.speed + brakeDecel * clampedDt);
      }
    } else if (Math.abs(input.throttle) > 0.05) {
      vehicle.speed = Math.max(
        -maxSpeed * 0.45,
        Math.min(maxSpeed, vehicle.speed + input.throttle * accelRate * clampedDt)
      );
    } else {
      if (Math.abs(vehicle.speed) > 0.1) {
        vehicle.speed -= Math.sign(vehicle.speed) * drag * clampedDt;
      } else {
        vehicle.speed = 0;
      }
    }

    const steerTarget = input.steer * 0.65;
    vehicle.steerAngle = THREE.MathUtils.lerp(vehicle.steerAngle, steerTarget, 10 * clampedDt);

    if (Math.abs(vehicle.speed) > 0.1) {
      const turnRate = (vehicle.speed / 2.6) * Math.sin(vehicle.steerAngle);
      vehicle.yaw += turnRate * clampedDt;
    }

    vehicle.position.x += -Math.sin(vehicle.yaw) * vehicle.speed * clampedDt;
    vehicle.position.z += -Math.cos(vehicle.yaw) * vehicle.speed * clampedDt;

    // Boundaries on airport tarmac
    vehicle.position.x = Math.max(-30, Math.min(75, vehicle.position.x));
    vehicle.position.z = Math.max(-120, Math.min(45, vehicle.position.z));
    vehicle.position.y = 0;
  }

  public updateLooseLuggagePhysics(
    dt: number,
    luggage: LuggageItem[],
    inTurbulence: boolean,
    aircraftRollDeg: number
  ) {
    const clampedDt = Math.min(dt, 0.05);
    for (const bag of luggage) {
      if (bag.state === 'LOOSE_CABIN') {
        if (inTurbulence) {
          bag.velocity.x += (Math.random() - 0.5) * 8.0 * clampedDt + (aircraftRollDeg * 0.12) * clampedDt;
          bag.velocity.z += (Math.random() - 0.5) * 6.0 * clampedDt;
        }
        bag.position.x += bag.velocity.x * clampedDt;
        bag.position.z += bag.velocity.z * clampedDt;
        bag.velocity.x *= 0.92;
        bag.velocity.z *= 0.92;

        if (bag.position.x < -0.4) {
          bag.position.x = -0.4;
          bag.velocity.x = Math.abs(bag.velocity.x) * 0.6;
        }
        if (bag.position.x > 0.4) {
          bag.position.x = 0.4;
          bag.velocity.x = -Math.abs(bag.velocity.x) * 0.6;
        }
        bag.position.z = Math.max(-9.0, Math.min(11.0, bag.position.z));
      }
    }
  }

  public updateFlightPhysics(
    dt: number,
    aircraftGroup: THREE.Group,
    telemetry: AircraftTelemetry,
    phase: FlightPhase,
    controls: {
      pitchInput: number;
      rollInput: number;
      yawInput?: number;
      throttleDelta: number;
      brakes: boolean;
    },
    upgrades: {
      hasTurbulenceDamper: boolean;
      hasTitaniumGear: boolean;
    }
  ): {
    nextPhase: FlightPhase;
    touchdownEvent?: { verticalSpeedFpm: number; hardLanding: boolean };
  } {
    const clampedDt = Math.min(dt, 0.05);

    if (phase === 'FLIGHT_COMPLETE' || phase === 'FLIGHT_FAILED') {
      telemetry.airspeedKts = Math.max(0, telemetry.airspeedKts - 25 * clampedDt);
      return { nextPhase: phase };
    }

    // 1. Throttle adjustment
    if (controls.throttleDelta !== 0) {
      telemetry.throttlePct = Math.max(
        0,
        Math.min(100, telemetry.throttlePct + controls.throttleDelta * 55 * clampedDt)
      );
    }
    telemetry.brakesOn = controls.brakes;

    // Fuel consumption
    if (telemetry.enginesRunning && telemetry.fuelPct > 0) {
      telemetry.fuelPct = Math.max(
        0,
        telemetry.fuelPct - (0.02 + (telemetry.throttlePct / 100) * 0.08) * clampedDt
      );
    } else if (telemetry.fuelPct <= 0) {
      telemetry.throttlePct = 0;
      telemetry.enginesRunning = false;
    }

    // 2. Thrust, Drag, Acceleration
    // Max thrust acceleration tuned for realistic Boeing 737 / Airbus A320 profile
    const thrustPower = (telemetry.throttlePct / 100);
    let engineThrustAccel = telemetry.enginesRunning ? thrustPower * 42.0 : 0;
    if (telemetry.reverseThrust && telemetry.enginesRunning && telemetry.onGround) {
      engineThrustAccel = -32.0; // Reverse thrust deceleration
    }

    const flapDrag = telemetry.flapsDeg === 30 ? 5.5 : telemetry.flapsDeg === 15 ? 2.2 : 0.0;
    const spoilerDrag = telemetry.spoilersExtended ? 14.5 : 0.0;
    const gearDrag = telemetry.gearDown ? 3.0 : 0.4;
    const aeroDrag = (telemetry.airspeedKts * telemetry.airspeedKts) * 0.00048 + flapDrag + gearDrag + spoilerDrag;
    const brakeDecel = telemetry.onGround && (telemetry.brakesOn || telemetry.parkingBrake) ? 45.0 : 0;
    const groundRollingResistance = telemetry.onGround && !telemetry.brakesOn && !telemetry.parkingBrake ? 3.5 : 0;
    const pitchGravityAccel = -Math.sin(THREE.MathUtils.degToRad(telemetry.pitchDeg)) * 14.0;

    const netAccelKts =
      engineThrustAccel -
      aeroDrag -
      brakeDecel -
      groundRollingResistance +
      (telemetry.onGround ? 0 : pitchGravityAccel);

    telemetry.airspeedKts = Math.max(0, Math.min(310, telemetry.airspeedKts + netAccelKts * clampedDt));
    if (telemetry.onGround && telemetry.parkingBrake && !telemetry.reverseThrust && telemetry.throttlePct <= 10) {
      telemetry.airspeedKts = Math.max(0, telemetry.airspeedKts - 60 * clampedDt);
    }

    // 3. Ground handling vs airborne handling
    const yawPedal = controls.yawInput || 0;

    if (telemetry.onGround) {
      this.airborneTime = 0;
      // Front gear steering: agile at taxi speed, stabilized at takeoff roll
      const taxiSteerMultiplier = telemetry.airspeedKts < 35 ? 42.0 : Math.max(12.0, 50 - telemetry.airspeedKts * 0.4);
      const steerInput = controls.rollInput !== 0 ? controls.rollInput : yawPedal;
      telemetry.headingDeg = (telemetry.headingDeg - steerInput * taxiSteerMultiplier * clampedDt + 360) % 360;

      // Wings level on ground
      telemetry.rollDeg = THREE.MathUtils.lerp(telemetry.rollDeg, 0, 10 * clampedDt);

      // Pitch rotation: at speed > 85 kts, pilot can pull back on yoke (pitchInput > 0) to rotate nose up!
      if (telemetry.airspeedKts > 80 && controls.pitchInput > 0) {
        telemetry.pitchDeg = Math.min(16, telemetry.pitchDeg + controls.pitchInput * 24 * clampedDt);
      } else if (controls.pitchInput < 0) {
        telemetry.pitchDeg = Math.max(0, telemetry.pitchDeg + controls.pitchInput * 18 * clampedDt);
      } else {
        telemetry.pitchDeg = THREE.MathUtils.lerp(telemetry.pitchDeg, 0, 8 * clampedDt);
      }
    } else {
      this.airborneTime += clampedDt;
      // Airborne pitch and roll rates
      const pitchRate = 26.0;
      const rollRate = 48.0;
      const yawRate = 18.0;

      telemetry.pitchDeg = Math.max(
        -25,
        Math.min(26, telemetry.pitchDeg + controls.pitchInput * pitchRate * clampedDt)
      );
      telemetry.rollDeg = Math.max(
        -55,
        Math.min(55, telemetry.rollDeg + controls.rollInput * rollRate * clampedDt)
      );

      // Direct rudder yaw pedals
      if (Math.abs(yawPedal) > 0.05) {
        telemetry.headingDeg = (telemetry.headingDeg - yawPedal * yawRate * clampedDt + 360) % 360;
      }

      // Roll self-stabilization (wings-level tendency)
      if (Math.abs(controls.rollInput) < 0.05) {
        telemetry.rollDeg = THREE.MathUtils.lerp(
          telemetry.rollDeg,
          0,
          (telemetry.autopilotHold ? 4.5 : 1.2) * clampedDt
        );
      }
      // Autopilot attitude hold in cruise
      if (telemetry.autopilotHold && Math.abs(controls.pitchInput) < 0.05) {
        telemetry.pitchDeg = THREE.MathUtils.lerp(telemetry.pitchDeg, 2.0, 2.5 * clampedDt);
      }

      // Turbulence shaking
      if (telemetry.inTurbulence) {
        const damp = upgrades.hasTurbulenceDamper ? 0.45 : 1.0;
        telemetry.rollDeg += (Math.random() - 0.5) * 26 * damp * clampedDt;
        telemetry.pitchDeg += (Math.random() - 0.5) * 14 * damp * clampedDt;
      }

      // Coordinated turn from banking
      const turnRateDegPerSec = -Math.sin(THREE.MathUtils.degToRad(telemetry.rollDeg)) * 26.0;
      telemetry.headingDeg = (telemetry.headingDeg + turnRateDegPerSec * clampedDt + 360) % 360;
    }

    // 4. Aerodynamic Lift & Vertical Movement
    const flapLiftBonus = telemetry.flapsDeg === 30 ? 24 : telemetry.flapsDeg === 15 ? 14 : 0;
    const effectiveSpeed = telemetry.airspeedKts + flapLiftBonus;

    // Ground effect cushion when within 5m of runway
    const altitudeMeters = Math.max(0, aircraftGroup.position.y);
    const groundEffect = altitudeMeters < 5.0 ? 1.0 + (5.0 - altitudeMeters) * 0.06 : 1.0;

    let verticalMetersPerSec = 0;

    if (telemetry.onGround) {
      // Rotation & Takeoff criteria:
      // Can rotate when airspeed reaches Vr (~95-105 kts), or with flaps at ~85 kts.
      // Lift factor based on speed & pitch angle
      const rotationLift = Math.sin(THREE.MathUtils.degToRad(telemetry.pitchDeg)) * 1.8;
      const baseLiftRatio = (effectiveSpeed / 108) * (effectiveSpeed / 108);
      const totalLiftForce = baseLiftRatio * (1.0 + rotationLift) * groundEffect;

      if (effectiveSpeed >= (telemetry.flapsDeg > 0 ? 76 : 88) && telemetry.pitchDeg >= 3.0 && totalLiftForce >= 0.72) {
        // LIFTOFF! Wheels unstick from runway
        telemetry.onGround = false;
        this.airborneTime = 0.1;
        verticalMetersPerSec = Math.max(3.0, Math.sin(THREE.MathUtils.degToRad(Math.max(4, telemetry.pitchDeg))) * (telemetry.airspeedKts * 0.38));
      } else {
        verticalMetersPerSec = 0;
        aircraftGroup.position.y = 0;
      }
    } else {
      // Airborne lift and gravity calculation
      const liftFactor = Math.min(1.4, Math.pow(effectiveSpeed / 112, 2)) * groundEffect;
      const climbFromPitch = Math.sin(THREE.MathUtils.degToRad(telemetry.pitchDeg)) * (telemetry.airspeedKts * 0.34);
      const stallSink = liftFactor < 0.58 ? (0.58 - liftFactor) * 18.0 : 0;
      const bankSink = (1 - Math.cos(THREE.MathUtils.degToRad(telemetry.rollDeg))) * 7.5;

      verticalMetersPerSec = climbFromPitch * liftFactor - stallSink - bankSink;
    }

    telemetry.verticalSpeedFpm = Math.round(verticalMetersPerSec * 196.85);

    // 5. Integrate Position
    const groundSpeedMps = telemetry.airspeedKts * 0.58;
    const yawRad = THREE.MathUtils.degToRad(-telemetry.headingDeg);

    aircraftGroup.position.x += Math.sin(yawRad) * groundSpeedMps * clampedDt;
    aircraftGroup.position.z += -Math.cos(yawRad) * groundSpeedMps * clampedDt;
    aircraftGroup.position.y += verticalMetersPerSec * clampedDt;

    // 6. Touchdown and Ground Collision Detection
    let touchdownEvent: { verticalSpeedFpm: number; hardLanding: boolean } | undefined;

    // CRITICAL: Only trigger touchdown if we have been airborne and are descending onto ground level!
    if (!telemetry.onGround) {
      if (aircraftGroup.position.y <= 0.0 && this.airborneTime > 0.6 && verticalMetersPerSec < -0.5) {
        // Touchdown on runway!
        aircraftGroup.position.y = 0;
        telemetry.onGround = true;
        const impactFpm = telemetry.verticalSpeedFpm;
        telemetry.verticalSpeedFpm = 0;
        telemetry.pitchDeg = Math.min(5, Math.max(0, telemetry.pitchDeg * 0.3));
        telemetry.rollDeg = 0;

        const safeLimit = upgrades.hasTitaniumGear ? -920 : -680;
        const isHard = impactFpm < safeLimit || !telemetry.gearDown;
        if (!telemetry.gearDown) {
          telemetry.airframeHealth = Math.max(0, telemetry.airframeHealth - 45);
        } else if (impactFpm < safeLimit) {
          telemetry.airframeHealth = Math.max(0, telemetry.airframeHealth - 25);
        }
        touchdownEvent = { verticalSpeedFpm: impactFpm, hardLanding: isHard };
      } else if (aircraftGroup.position.y < 0.0 && this.airborneTime < 0.6) {
        // Brief runway transition guard only; never snap an established flight back to the ground.
        aircraftGroup.position.y = 0;
      }
    } else {
      aircraftGroup.position.y = 0;
    }

    telemetry.altitudeFt = Math.max(0, Math.round(aircraftGroup.position.y * 12.5));

    // 7. Update Aircraft Rotation Order and Angles
    aircraftGroup.rotation.order = 'YXZ';
    aircraftGroup.rotation.y = yawRad;
    aircraftGroup.rotation.x = THREE.MathUtils.degToRad(telemetry.pitchDeg);
    aircraftGroup.rotation.z = THREE.MathUtils.degToRad(-telemetry.rollDeg);

    // 8. Distance and Navigation Calculations
    const destThresholdZ = -2350;
    const dz = aircraftGroup.position.z - destThresholdZ;
    const dx = aircraftGroup.position.x - 45;
    telemetry.distanceToDestMeters = Math.max(0, Math.round(Math.hypot(dx, dz)));
    telemetry.lateralOffsetMeters = Math.round(dx);

    // 9. Flight Phase State Machine Transitions
    let nextPhase: FlightPhase = phase;
    if (telemetry.airframeHealth <= 0) {
      nextPhase = 'FLIGHT_FAILED';
    } else if (phase === 'PREFLIGHT' && telemetry.enginesRunning && telemetry.airspeedKts > 2) {
      nextPhase = 'TAXI';
    } else if ((phase === 'TAXI' || phase === 'PREFLIGHT') && telemetry.airspeedKts > 45) {
      nextPhase = 'TAKEOFF';
    } else if (phase === 'TAKEOFF' && !telemetry.onGround && telemetry.altitudeFt > 100) {
      nextPhase = 'CRUISE';
    } else if (phase === 'CRUISE' && aircraftGroup.position.z < -1400) {
      nextPhase = 'APPROACH';
    } else if (
      (phase === 'APPROACH' || phase === 'CRUISE') &&
      telemetry.onGround &&
      aircraftGroup.position.z < -1900
    ) {
      nextPhase = 'LANDING';
    } else if (
      phase === 'LANDING' &&
      telemetry.onGround &&
      telemetry.airspeedKts < 8 &&
      aircraftGroup.position.z < -2000
    ) {
      nextPhase = 'FLIGHT_COMPLETE';
    }

    return { nextPhase, touchdownEvent };
  }

  public updateSkydivingPhysics(
    dt: number,
    state: SkydivingState,
    input: { forward: number; right: number; deployChute: boolean }
  ) {
    const clampedDt = Math.min(dt, 0.05);

    if (state.landed) {
      state.velocity.x = 0;
      state.velocity.y = 0;
      state.velocity.z = 0;
      state.position.y = 0;
      return;
    }

    if (input.deployChute && !state.parachuteDeployed && state.position.y > 5.0) {
      state.parachuteDeployed = true;
    }

    // Steering turn
    state.yaw -= input.right * 1.8 * clampedDt;

    // Aerodynamic terminal velocities
    // Freefall terminal sink: ~ -48 m/s
    // Open canopy terminal sink: ~ -4.8 m/s
    const targetTerminalSink = state.parachuteDeployed ? -4.8 : -48.0;
    const gravity = -9.8;

    state.velocity.y += gravity * clampedDt;
    state.velocity.y = THREE.MathUtils.lerp(state.velocity.y, targetTerminalSink, (state.parachuteDeployed ? 4.5 : 0.8) * clampedDt);

    // Forward glide speed
    const forwardSpeed = state.parachuteDeployed
      ? (input.forward > 0 ? 11.0 : input.forward < 0 ? 3.0 : 7.0)
      : (input.forward > 0 ? 24.0 : 8.0);

    const fwdX = -Math.sin(state.yaw) * forwardSpeed;
    const fwdZ = -Math.cos(state.yaw) * forwardSpeed;

    state.velocity.x = THREE.MathUtils.lerp(state.velocity.x, fwdX, 3.0 * clampedDt);
    state.velocity.z = THREE.MathUtils.lerp(state.velocity.z, fwdZ, 3.0 * clampedDt);

    state.position.x += state.velocity.x * clampedDt;
    state.position.z += state.velocity.z * clampedDt;
    state.position.y += state.velocity.y * clampedDt;

    // Touchdown on terrain
    if (state.position.y <= 0) {
      state.position.y = 0;
      state.landed = true;
      state.velocity.x = 0;
      state.velocity.y = 0;
      state.velocity.z = 0;

      const safeLanding = state.parachuteDeployed;
      state.landingReport = safeLanding
        ? 'Emergency Parachute Bailout SUCCESSFUL! Touched down safely on airport terrain.'
        : 'CATASTROPHIC BAILOUT! Forgot to deploy parachute before hitting the terrain!';
    }
  }
}
