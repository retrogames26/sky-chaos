import React from 'react';
import {
  AlertTriangle,
  Camera,
  DoorClosed,
  Gauge,
  Megaphone,
  RotateCcw,
  Sliders,
  Truck,
  Users,
  Utensils,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FlightRoute } from '../types/game';
import { GameUIStateSnapshot } from '../game/GameEngine';

interface FlightHUDProps {
  ui: GameUIStateSnapshot;
  route: FlightRoute;
  muted: boolean;
  roomCode: string;
  onToggleMute: () => void;
  onOpenModal: (
    modal: 'MANIFEST' | 'ANNOUNCEMENT' | 'GALLEY' | 'BRIEFING' | 'PAUSE' | 'MULTIPLAYER'
  ) => void;
  onQuickDoorAndEngines: () => void;
  onQuickLineupRunway: () => void;
  onExitPilotSeat: () => void;
  onResetScenario: () => void;
  onRequestPointerLock: () => void;
  onSetThrottlePct?: (pct: number) => void;
  onAdjustThrottle?: (delta: number) => void;
  onCycleCamera?: () => void;
  onCycleFlaps?: () => void;
  onToggleGear?: () => void;
  onApplyBrakes?: (brakes: boolean) => void;
  onExitVehicle?: () => void;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  ui,
  route,
  muted,
  roomCode,
  onToggleMute,
  onOpenModal,
  onQuickDoorAndEngines,
  onQuickLineupRunway,
  onExitPilotSeat,
  onResetScenario,
  onSetThrottlePct,
  onAdjustThrottle,
  onCycleCamera,
  onCycleFlaps,
  onToggleGear,
  onApplyBrakes,
  onExitVehicle,
}) => {
  const {
    controlMode,
    flightPhase,
    telemetry,
    checklist,
    interactionTarget,
    heldObject,
    activeIncident,
    activeSubtitle,
    toastBanner,
    pointerLocked,
    peers,
  } = ui;

  const isDriving = controlMode === 'DRIVING_TUG' || controlMode === 'DRIVING_FUEL_TRUCK';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3.5">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/85 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono font-bold text-amber-400">{route.flightNumber}</span>
              <span aria-hidden="true">·</span>
              <span>
                {route.departureCode} to {route.destinationCode}
              </span>
              <span aria-hidden="true">·</span>
              <span>{route.weatherCondition}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-3">
              <h1 className="font-display text-base font-bold tracking-wide text-white">
                {controlMode === 'IN_COCKPIT'
                  ? 'Cockpit Flight Deck'
                  : controlMode === 'DRIVING_TUG'
                  ? 'Airport Baggage Tug'
                  : controlMode === 'DRIVING_FUEL_TRUCK'
                  ? 'Jet-A1 Aviation Fuel Tanker'
                  : 'Apron & Aircraft Cabin'}
              </h1>
              <span className="text-xs text-slate-500" aria-hidden="true">
                /
              </span>
              <span className="font-mono text-xs font-semibold text-cyan-400">
                PHASE: {flightPhase}
              </span>
            </div>
          </div>

          <div className="h-7 w-px bg-white/10" />

          <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
            <div>
              <span className="block text-[10px] text-slate-400">AIRFRAME</span>
              <span
                className={
                  telemetry.airframeHealth > 70
                    ? 'font-semibold text-emerald-400'
                    : 'font-semibold text-red-400'
                }
              >
                {Math.round(telemetry.airframeHealth)}%
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">DEST DIST</span>
              <span className="font-semibold text-white">{telemetry.distanceToDestMeters}m</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">CO-OP CREW</span>
              <span className="font-semibold text-amber-400">{peers.length + 1} ONLINE</span>
            </div>
          </div>
        </div>

        {/* Emergency Alert & Toast Banners */}
        <div className="flex max-w-xl flex-col items-center gap-2">
          {activeIncident && !activeIncident.resolved && (
            <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-950/90 px-4 py-2.5 text-white shadow-xl backdrop-blur-md animate-pulse">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <div className="text-xs">
                <div className="font-display font-bold text-red-200">
                  EMERGENCY: {activeIncident.title} ({Math.ceil(activeIncident.timerSeconds)}s)
                </div>
                <div className="text-red-100/90">{activeIncident.description}</div>
              </div>
            </div>
          )}

          {toastBanner && (
            <div
              className={`rounded-lg border px-4 py-2 text-xs font-medium shadow-md backdrop-blur-md ${
                toastBanner.tone === 'danger'
                  ? 'border-red-500/40 bg-red-950/85 text-red-100'
                  : toastBanner.tone === 'warning'
                  ? 'border-amber-500/40 bg-amber-950/85 text-amber-100'
                  : toastBanner.tone === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/85 text-emerald-100'
                  : 'border-white/15 bg-slate-950/85 text-slate-100'
              }`}
            >
              {toastBanner.text}
            </div>
          )}
        </div>

        {/* Top Right Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => onOpenModal('MULTIPLAYER')}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-950/80 px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-900 hover:text-white whitespace-nowrap shrink-0 backdrop-blur-md shadow"
          >
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            Multiplayer ({roomCode})
          </button>
          <button
            onClick={() => onOpenModal('BRIEFING')}
            className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/50 hover:text-white whitespace-nowrap shrink-0 backdrop-blur-md"
          >
            Flight Prep
          </button>
          <button
            onClick={() => onOpenModal('ANNOUNCEMENT')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/50 hover:text-white whitespace-nowrap shrink-0 backdrop-blur-md"
          >
            <Megaphone className="h-3.5 w-3.5 text-amber-400" />
            PA
          </button>
          <button
            onClick={onResetScenario}
            title="Reset Scenario (R)"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white whitespace-nowrap shrink-0 backdrop-blur-md"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset (R)
          </button>
          <button
            onClick={onToggleMute}
            className="rounded-lg border border-white/10 bg-slate-950/80 p-2 text-slate-200 transition-colors hover:border-white/30 hover:text-white shrink-0 backdrop-blur-md"
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => onOpenModal('PAUSE')}
            className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 shadow"
          >
            Hangar & Career
          </button>
        </div>
      </div>

      {/* Center Reticle & Interactivity Crosshairs */}
      <div className="relative my-auto flex items-center justify-between">
        {/* Left Side: Preflight Checklist or Ground Service Panel */}
        <div className="pointer-events-auto w-76 rounded-xl border border-white/10 bg-slate-950/85 p-3.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="font-display text-xs font-bold tracking-wider text-amber-400">
              FLIGHT PREPARATION CHECKLIST
            </h2>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {checklist.safetyChecksComplete ? 'CLEARED' : 'IN PROGRESS'}
            </span>
          </div>

          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">1. Load Passenger Luggage</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  checklist.luggageLoadedCount >= checklist.luggageTotalCount
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {checklist.luggageLoadedCount}/{checklist.luggageTotalCount} Bags
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">2. Verify Boarding Passes</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  checklist.ticketsCheckedCount >= checklist.ticketsTotalCount
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {checklist.ticketsCheckedCount}/{checklist.ticketsTotalCount} Checked
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">3. Secure Hazardous Cargo</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  checklist.hazardousCargoSecuredCount >= checklist.hazardousCargoTotalCount
                    ? 'text-emerald-400'
                    : 'text-cyan-400'
                }`}
              >
                {checklist.hazardousCargoSecuredCount}/{checklist.hazardousCargoTotalCount} Hazmat
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">4. Prepare & Serve Meals</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  checklist.mealsServedCount >= checklist.mealsTotalOrders
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {checklist.mealsServedCount}/{checklist.mealsTotalOrders} Served
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">5. Clean Cabin Spills & Litter</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  checklist.cleanlinessPct >= 100 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {checklist.cleanlinessPct}% Clean
              </span>
            </div>

            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">6. Doors & Seatbelts</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    checklist.cabinDoorClosed ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {checklist.cabinDoorClosed ? 'DOORS ARMED' : 'DOOR OPEN'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Seatbelts Fastened</span>
                <span className="font-mono tabular-nums">
                  {checklist.seatbeltsFastenedCount}/{checklist.validSeatedPassengersCount}
                </span>
              </div>
            </div>
          </div>

          {heldObject && (
            <div className="mt-3 rounded border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-xs text-amber-200">
              <span className="font-semibold">Holding:</span> {heldObject.label}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onOpenModal('GALLEY')}
              className="flex items-center justify-center gap-1 rounded bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/20 whitespace-nowrap"
            >
              <Utensils className="h-3 w-3 text-amber-400" />
              Galley Meal
            </button>
            <button
              onClick={onQuickDoorAndEngines}
              className="flex items-center justify-center gap-1 rounded bg-amber-500/20 border border-amber-500/40 px-2 py-1.5 text-[11px] font-medium text-amber-300 transition-colors hover:bg-amber-500/30 whitespace-nowrap"
            >
              <DoorClosed className="h-3 w-3" />
              {telemetry.cabinDoorClosed ? 'Toggle Door' : 'Seal & Start'}
            </button>
          </div>
        </div>

        {/* Crosshair & Context Prompts */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex h-5 w-5 items-center justify-center">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-transform ${
                interactionTarget ? 'scale-125 bg-amber-400' : 'bg-white/80'
              }`}
            />
            <div
              className={`absolute h-4 w-4 rounded-full border transition-colors ${
                interactionTarget ? 'border-amber-400/90' : 'border-white/30'
              }`}
            />
          </div>

          {interactionTarget && (
            <div className="mt-6 rounded-xl border border-amber-400/70 bg-slate-950/95 px-5 py-2.5 text-center shadow-2xl backdrop-blur-md">
              <div className="font-display text-sm font-bold text-amber-300 whitespace-nowrap">
                {interactionTarget.prompt}
              </div>
              {interactionTarget.subPrompt && (
                <div className="mt-0.5 text-[11px] text-slate-300 whitespace-nowrap">
                  {interactionTarget.subPrompt}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Driving HUD or Cockpit Flight Deck */}
        {isDriving && (
          <div className="pointer-events-auto w-80 rounded-xl border border-amber-500/40 bg-slate-950/90 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-amber-400" />
                <span className="font-display text-xs font-bold tracking-wider text-amber-400">
                  {controlMode === 'DRIVING_TUG' ? 'AIRPORT BAGGAGE TUG' : 'JET FUEL BOWSER'}
                </span>
              </div>
              <button
                onClick={onExitVehicle}
                className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/20"
              >
                Exit (E)
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded bg-slate-900 p-2.5 border border-white/5">
                <div className="flex justify-between text-slate-400">
                  <span>CONTROLS:</span>
                  <span className="text-white font-mono">W/S Drive · A/D Steer · Space Brake</span>
                </div>
                {controlMode === 'DRIVING_TUG' && (
                  <div className="mt-1.5 text-slate-300 text-[11px]">
                    Drive near the luggage cart to hitch it, then drive to the aircraft rear cargo door to unload all bags!
                  </div>
                )}
                {controlMode === 'DRIVING_FUEL_TRUCK' && (
                  <div className="mt-1.5 text-slate-300 text-[11px]">
                    Drive near the airplane starboard wing to refuel the tanks to 100%!
                  </div>
                )}
              </div>

              <button
                onClick={onExitVehicle}
                className="w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
              >
                Exit Vehicle to Ground (Press E)
              </button>
            </div>
          </div>
        )}

        {controlMode === 'IN_COCKPIT' && (
          <div className="pointer-events-auto w-88 rounded-xl border border-cyan-500/40 bg-slate-950/90 p-3.5 shadow-xl backdrop-blur-md">
            {/* PFD Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-cyan-400" />
                <span className="font-display text-xs font-bold tracking-wider text-cyan-400">
                  PRIMARY FLIGHT DECK (PFD)
                </span>
              </div>
              <button
                onClick={onCycleCamera}
                className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-200 transition-colors hover:bg-white/20"
                title="Cycle Camera View (Press C)"
              >
                <Camera className="h-3 w-3 text-cyan-400" />
                {telemetry.cameraView} (C)
              </button>
            </div>

            {/* Flight Instruments Grid */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono tabular-nums">
              <div className="rounded-lg bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">AIRSPEED (Vr 95 kts)</span>
                <span className="text-xl font-bold text-white">{Math.round(telemetry.airspeedKts)}</span>
                <span className="ml-1 text-xs text-cyan-400">KTS</span>
              </div>

              <div className="rounded-lg bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">ALTITUDE</span>
                <span className="text-xl font-bold text-white">{telemetry.altitudeFt}</span>
                <span className="ml-1 text-xs text-cyan-400">FT</span>
              </div>

              <div className="rounded-lg bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">VERTICAL SPEED</span>
                <span
                  className={`text-sm font-bold ${
                    telemetry.verticalSpeedFpm < -650 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {telemetry.verticalSpeedFpm > 0 ? `+${telemetry.verticalSpeedFpm}` : telemetry.verticalSpeedFpm}
                </span>
                <span className="ml-1 text-[10px] text-slate-400">FPM</span>
              </div>

              <div className="rounded-lg bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">HEADING / RWY 360°</span>
                <span className="text-sm font-bold text-white">
                  {Math.round(telemetry.headingDeg).toString().padStart(3, '0')}°
                </span>
                <span className="ml-1 text-[10px] text-amber-400">
                  {Math.abs(telemetry.lateralOffsetMeters)}m
                </span>
              </div>
            </div>

            {/* Attitude & Throttle Control */}
            <div className="mt-2 rounded-lg border border-white/10 bg-slate-900/80 p-2 text-xs font-mono tabular-nums">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>PITCH: {telemetry.pitchDeg.toFixed(1)}°</span>
                <span>BANK: {telemetry.rollDeg.toFixed(1)}°</span>
                <span>STATUS: <strong className={telemetry.onGround ? 'text-amber-400' : 'text-cyan-400'}>{telemetry.onGround ? 'GROUND' : 'AIRBORNE'}</strong></span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <Sliders className="h-3 w-3 text-amber-400" />
                  THROTTLE:
                </span>
                <span className="font-bold text-amber-400 text-sm">
                  {Math.round(telemetry.throttlePct)}%
                </span>
              </div>

              {/* Interactive Throttle Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(telemetry.throttlePct)}
                onChange={(e) => onSetThrottlePct?.(Number(e.target.value))}
                className="mt-1 w-full accent-amber-400 cursor-pointer"
              />

              {/* Quick Throttle Presets */}
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                <button
                  onClick={() => onSetThrottlePct?.(0)}
                  className={`rounded py-1 text-[10px] font-bold ${
                    telemetry.throttlePct === 0 ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  IDLE 0%
                </button>
                <button
                  onClick={() => onSetThrottlePct?.(65)}
                  className={`rounded py-1 text-[10px] font-bold ${
                    Math.round(telemetry.throttlePct) === 65 ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  CRZ 65%
                </button>
                <button
                  onClick={() => onSetThrottlePct?.(85)}
                  className={`rounded py-1 text-[10px] font-bold ${
                    Math.round(telemetry.throttlePct) === 85 ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  CLB 85%
                </button>
                <button
                  onClick={() => onSetThrottlePct?.(100)}
                  className={`rounded py-1 text-[10px] font-bold ${
                    telemetry.throttlePct === 100 ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-amber-300 hover:bg-white/20'
                  }`}
                >
                  MAX 100%
                </button>
              </div>
            </div>

            {/* Flight Deck Toggles */}
            <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              <button
                onClick={onToggleGear}
                className={`rounded border py-1 font-semibold transition-colors ${
                  telemetry.gearDown
                    ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                    : 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
                }`}
              >
                GEAR: {telemetry.gearDown ? 'DOWN (G)' : 'UP (G)'}
              </button>
              <button
                onClick={onCycleFlaps}
                className="rounded border border-amber-500/40 bg-amber-950/60 py-1 font-semibold text-amber-300 hover:bg-amber-900/60 transition-colors"
              >
                FLAPS: {telemetry.flapsDeg}° (F)
              </button>
              <button
                onClick={() => onApplyBrakes?.(!telemetry.brakesOn)}
                className={`rounded border py-1 font-semibold transition-colors ${
                  telemetry.brakesOn
                    ? 'border-red-500 bg-red-950/80 text-red-300'
                    : 'border-white/15 bg-slate-900 text-slate-300 hover:bg-white/10'
                }`}
              >
                BRAKES: {telemetry.brakesOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {telemetry.onGround && (
                <button
                  onClick={onQuickLineupRunway}
                  className="col-span-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 py-1.5 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/30 whitespace-nowrap shadow"
                >
                  Instant Line Up on Runway 36L (T)
                </button>
              )}
              <button
                onClick={onExitPilotSeat}
                className="col-span-2 rounded-lg bg-white/10 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 whitespace-nowrap"
              >
                Exit Pilot Seat to Cabin (Press E)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Subtitles & Quick Controls Cheat Sheet */}
      <div className="flex flex-col items-center gap-2">
        {activeSubtitle && (
          <div className="max-w-2xl rounded-xl border border-amber-400/40 bg-slate-950/90 px-6 py-2.5 text-center text-sm font-medium text-amber-200 shadow-xl backdrop-blur-md">
            {activeSubtitle}
          </div>
        )}

        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/10 bg-slate-950/85 px-4 py-2 text-xs text-slate-300 shadow backdrop-blur-md">
          {controlMode === 'ON_FOOT' ? (
            <>
              <span>
                <strong className="text-white">WASD</strong> Walk
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">Mouse</strong> Look ({pointerLocked ? 'Locked' : 'Click to lock'})
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-amber-400">E</strong> Interact / Board / Pilot Seat / Drive Tug
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">Shift</strong> Sprint
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">R</strong> Reset
              </span>
            </>
          ) : isDriving ? (
            <>
              <span>
                <strong className="text-white">WASD</strong> Drive & Steer
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">Space</strong> Brake
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-amber-400">E</strong> Exit Vehicle to Ground
              </span>
            </>
          ) : (
            <>
              <span>
                <strong className="text-amber-400">Shift / Ctrl / 1-4</strong> Throttle Up / Down / Presets
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">S</strong> Pitch Up (Rotate / Climb)
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">W</strong> Nose Down
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">A / D</strong> Bank Roll & Steer
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">Q / E</strong> Rudder
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">Space</strong> Wheel Brakes
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">C</strong> Camera (Cockpit / Chase / Wing)
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">G</strong> Gear
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">F</strong> Flaps
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">T</strong> Runway Lineup
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
