import * as THREE from 'three';
import {
  AircraftTelemetry,
  FlightPhase,
  LuggageItem,
} from '../types/game';

export interface PlayerPhysicsState {
  localPos: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  grounded: boolean;
  insideCabin: boolean;
}

export class PhysicsWorld {
  public updatePlayerWalk(
    dt: number,
    player: PlayerPhysicsState,
    input: { forward: number; right: number; sprint: boolean; jump: boolean },
    cabinDoorClosed: boolean
  ) {
    const clampedDt = Math.min(dt, 0.05);
    const moveSpeed = input.sprint ? 6.4 : 4.1;

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

      const seatRowsZ = [-6.0, -3.6, -1.2, 1.2];
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

        nextX = Math.max(-22, Math.min(28, nextX));
        nextZ = Math.max(-45, Math.min(35, nextZ));

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

    telemetry.throttlePct = Math.max(
      0,
      Math.min(100, telemetry.throttlePct + controls.throttleDelta * 42 * clampedDt)
    );
    telemetry.brakesOn = controls.brakes;

    if (telemetry.enginesRunning && telemetry.fuelPct > 0) {
      telemetry.fuelPct = Math.max(0, telemetry.fuelPct - (0.04 + (telemetry.throttlePct / 100) * 0.14) * clampedDt);
    } else if (telemetry.fuelPct <= 0) {
      telemetry.throttlePct = 0;
    }

    const maxThrustAccel = telemetry.enginesRunning ? (telemetry.throttlePct / 100) * 34.0 : 0;
    const flapDrag = telemetry.flapsDeg === 30 ? 4.2 : telemetry.flapsDeg === 15 ? 1.8 : 0.0;
    const gearDrag = telemetry.gearDown ? 2.4 : 0.4;
    const aeroDrag = (telemetry.airspeedKts * telemetry.airspeedKts) * 0.00055 + flapDrag + gearDrag;
    const brakeDecel = telemetry.onGround && telemetry.brakesOn ? 38.0 : 0;
    const pitchGravityAccel = -Math.sin(THREE.MathUtils.degToRad(telemetry.pitchDeg)) * 12.0;

    const netAccelKts = maxThrustAccel - aeroDrag - brakeDecel + (telemetry.onGround ? 0 : pitchGravityAccel);
    telemetry.airspeedKts = Math.max(0, Math.min(265, telemetry.airspeedKts + netAccelKts * clampedDt));

    if (telemetry.onGround) {
      const steerRateDeg = Math.min(38, telemetry.airspeedKts * 0.85);
      telemetry.headingDeg = (telemetry.headingDeg - controls.rollInput * steerRateDeg * clampedDt + 360) % 360;
      telemetry.rollDeg = THREE.MathUtils.lerp(telemetry.rollDeg, 0, 8 * clampedDt);

      if (telemetry.airspeedKts > 92 && controls.pitchInput > 0) {
        telemetry.pitchDeg = Math.min(15, telemetry.pitchDeg + controls.pitchInput * 22 * clampedDt);
      } else {
        telemetry.pitchDeg = THREE.MathUtils.lerp(telemetry.pitchDeg, 0, 6 * clampedDt);
      }
    } else {
      const pitchRate = 24.0;
      const rollRate = 42.0;

      telemetry.pitchDeg = Math.max(
        -22,
        Math.min(24, telemetry.pitchDeg + controls.pitchInput * pitchRate * clampedDt)
      );
      telemetry.rollDeg = Math.max(
        -48,
        Math.min(48, telemetry.rollDeg + controls.rollInput * rollRate * clampedDt)
      );

      if (Math.abs(controls.rollInput) < 0.05) {
        telemetry.rollDeg = THREE.MathUtils.lerp(
          telemetry.rollDeg,
          0,
          (telemetry.autopilotHold ? 3.5 : 0.8) * clampedDt
        );
      }
      if (telemetry.autopilotHold && Math.abs(controls.pitchInput) < 0.05) {
        telemetry.pitchDeg = THREE.MathUtils.lerp(telemetry.pitchDeg, 2.0, 2.5 * clampedDt);
      }

      if (telemetry.inTurbulence) {
        const damp = upgrades.hasTurbulenceDamper ? 0.55 : 1.0;
        telemetry.rollDeg += (Math.random() - 0.5) * 26 * damp * clampedDt;
        telemetry.pitchDeg += (Math.random() - 0.5) * 14 * damp * clampedDt;
      }

      const turnRateDegPerSec = -Math.sin(THREE.MathUtils.degToRad(telemetry.rollDeg)) * 22.0;
      telemetry.headingDeg = (telemetry.headingDeg + turnRateDegPerSec * clampedDt + 360) % 360;
    }

    const flapLiftBonus = telemetry.flapsDeg === 30 ? 18 : telemetry.flapsDeg === 15 ? 10 : 0;
    const effectiveSpeed = telemetry.airspeedKts + flapLiftBonus;

    let verticalMetersPerSec = 0;
    if (telemetry.onGround) {
      if (effectiveSpeed > 112 && telemetry.pitchDeg > 3.5) {
        telemetry.onGround = false;
        verticalMetersPerSec = 4.5;
      } else {
        verticalMetersPerSec = 0;
        aircraftGroup.position.y = 0;
      }
    } else {
      const liftFactor = Math.min(1.25, Math.pow(effectiveSpeed / 118, 2));
      const climbFromPitch = Math.sin(THREE.MathUtils.degToRad(telemetry.pitchDeg)) * (telemetry.airspeedKts * 0.24);
      const stallSink = liftFactor < 0.85 ? (0.85 - liftFactor) * 22.0 : 0;
      const bankSink = (1 - Math.cos(THREE.MathUtils.degToRad(telemetry.rollDeg))) * 6.5;
      verticalMetersPerSec = climbFromPitch * liftFactor - stallSink - bankSink;
    }

    telemetry.verticalSpeedFpm = Math.round(verticalMetersPerSec * 196.85);

    const groundSpeedMps = telemetry.airspeedKts * 0.58;
    const yawRad = THREE.MathUtils.degToRad(-telemetry.headingDeg);

    aircraftGroup.position.x += Math.sin(yawRad) * groundSpeedMps * clampedDt;
    aircraftGroup.position.z += -Math.cos(yawRad) * groundSpeedMps * clampedDt;
    aircraftGroup.position.y += verticalMetersPerSec * clampedDt;

    let touchdownEvent: { verticalSpeedFpm: number; hardLanding: boolean } | undefined;
    if (!telemetry.onGround && aircraftGroup.position.y <= 0.05) {
      aircraftGroup.position.y = 0;
      telemetry.onGround = true;
      const impactFpm = telemetry.verticalSpeedFpm;
      telemetry.verticalSpeedFpm = 0;
      telemetry.pitchDeg = 0;
      telemetry.rollDeg = 0;

      const safeLimit = upgrades.hasTitaniumGear ? -920 : -680;
      const isHard = impactFpm < safeLimit || !telemetry.gearDown;
      if (!telemetry.gearDown) {
        telemetry.airframeHealth = Math.max(0, telemetry.airframeHealth - 45);
      } else if (impactFpm < safeLimit) {
        telemetry.airframeHealth = Math.max(0, telemetry.airframeHealth - 28);
      }
      touchdownEvent = { verticalSpeedFpm: impactFpm, hardLanding: isHard };
    }

    telemetry.altitudeFt = Math.max(0, Math.round(aircraftGroup.position.y * 12.5));

    aircraftGroup.rotation.order = 'YXZ';
    aircraftGroup.rotation.y = yawRad;
    aircraftGroup.rotation.x = THREE.MathUtils.degToRad(telemetry.pitchDeg);
    aircraftGroup.rotation.z = THREE.MathUtils.degToRad(-telemetry.rollDeg);

    const destThresholdZ = -1820;
    const dz = aircraftGroup.position.z - destThresholdZ;
    const dx = aircraftGroup.position.x - 45;
    telemetry.distanceToDestMeters = Math.max(0, Math.round(Math.hypot(dx, dz)));
    telemetry.lateralOffsetMeters = Math.round(dx);

    let nextPhase: FlightPhase = phase;
    if (telemetry.airframeHealth <= 0) {
      nextPhase = 'FLIGHT_FAILED';
    } else if (phase === 'PREFLIGHT' && telemetry.enginesRunning && telemetry.airspeedKts > 2) {
      nextPhase = 'TAXI';
    } else if ((phase === 'TAXI' || phase === 'PREFLIGHT') && telemetry.airspeedKts > 45) {
      nextPhase = 'TAKEOFF';
    } else if (phase === 'TAKEOFF' && !telemetry.onGround && telemetry.altitudeFt > 120) {
      nextPhase = 'CRUISE';
    } else if (phase === 'CRUISE' && aircraftGroup.position.z < -1150) {
      nextPhase = 'APPROACH';
    } else if (
      (phase === 'APPROACH' || phase === 'CRUISE') &&
      telemetry.onGround &&
      aircraftGroup.position.z < -1650
    ) {
      nextPhase = 'LANDING';
    } else if (
      phase === 'LANDING' &&
      telemetry.onGround &&
      telemetry.airspeedKts < 6 &&
      aircraftGroup.position.z < -1650
    ) {
      nextPhase = 'FLIGHT_COMPLETE';
    }

    return { nextPhase, touchdownEvent };
  }
}
