import React from 'react';
import {
  AlertTriangle,
  DoorClosed,
  Megaphone,
  RotateCcw,
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
  onToggleMute: () => void;
  onOpenModal: (modal: 'MANIFEST' | 'ANNOUNCEMENT' | 'GALLEY' | 'BRIEFING' | 'PAUSE') => void;
  onQuickDoorAndEngines: () => void;
  onQuickLineupRunway: () => void;
  onExitPilotSeat: () => void;
  onResetScenario: () => void;
  onRequestPointerLock: () => void;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  ui,
  route,
  muted,
  onToggleMute,
  onOpenModal,
  onQuickDoorAndEngines,
  onQuickLineupRunway,
  onExitPilotSeat,
  onResetScenario,
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

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-5 rounded-lg border border-white/10 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono font-semibold text-amber-400">{route.flightNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{route.departureCode} to {route.destinationCode}</span>
              <span aria-hidden="true">·</span>
              <span>{route.weatherCondition}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-3">
              <h1 className="font-display text-base font-bold tracking-wide text-white">
                {controlMode === 'IN_COCKPIT' ? 'Cockpit Flight Deck' : 'Cabin & Apron Crew View'}
              </h1>
              <span className="text-xs text-slate-400" aria-hidden="true">/</span>
              <span className="font-mono text-xs font-semibold text-cyan-400">
                PHASE: {flightPhase}
              </span>
            </div>
          </div>

          <div className="h-7 w-px bg-white/10" />

          <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
            <div>
              <span className="block text-[10px] text-slate-400">HULL INTEGRITY</span>
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
            {peers.length > 0 && (
              <div>
                <span className="block text-[10px] text-slate-400">CO-OP CREW</span>
                <span className="font-semibold text-amber-400">{peers.length + 1} ONLINE</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex max-w-xl flex-col items-center gap-2">
          {activeIncident && !activeIncident.resolved && (
            <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-950/90 px-4 py-2.5 text-white shadow-lg backdrop-blur-md">
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

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => onOpenModal('BRIEFING')}
            className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/50 hover:text-white whitespace-nowrap shrink-0 backdrop-blur-md"
          >
            Flight Prep & Manifest
          </button>
          <button
            onClick={() => onOpenModal('ANNOUNCEMENT')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/50 hover:text-white whitespace-nowrap shrink-0 backdrop-blur-md"
          >
            <Megaphone className="h-3.5 w-3.5 text-amber-400" />
            PA System
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
            className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
          >
            Hangar & Menu
          </button>
        </div>
      </div>

      <div className="relative my-auto flex items-center justify-between">
        <div className="pointer-events-auto w-76 rounded-lg border border-white/10 bg-slate-950/80 p-3.5 backdrop-blur-md">
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

            <div className="flex items-center justify-between">
              <span className="text-slate-300">6. Cabin PA Announcements</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  checklist.announcementsMade.length > 0 ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {checklist.announcementsMade.length}/4 Made
              </span>
            </div>

            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">7. Seatbelts & Cabin Door</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    checklist.cabinDoorClosed ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {checklist.cabinDoorClosed ? 'DOOR ARMED' : 'DOOR OPEN'}
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
              Prep Meal
            </button>
            <button
              onClick={onQuickDoorAndEngines}
              className="flex items-center justify-center gap-1 rounded bg-amber-500/20 border border-amber-500/40 px-2 py-1.5 text-[11px] font-medium text-amber-300 transition-colors hover:bg-amber-500/30 whitespace-nowrap"
            >
              <DoorClosed className="h-3 w-3" />
              {telemetry.cabinDoorClosed ? 'Toggle Door' : 'Seal & Spool'}
            </button>
          </div>
        </div>

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
            <div className="mt-6 rounded-lg border border-amber-400/60 bg-slate-950/90 px-4 py-2 text-center shadow-xl backdrop-blur-md">
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

        {controlMode === 'IN_COCKPIT' && (
          <div className="pointer-events-auto w-80 rounded-lg border border-cyan-500/30 bg-slate-950/85 p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-display text-xs font-bold tracking-wider text-cyan-400">
                PRIMARY FLIGHT DISPLAY
              </span>
              <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                CAM: {telemetry.cameraView} (C)
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2.5 font-mono tabular-nums">
              <div className="rounded bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">AIRSPEED (VR 112)</span>
                <span className="text-lg font-bold text-white">{Math.round(telemetry.airspeedKts)}</span>
                <span className="ml-1 text-xs text-cyan-400">KTS</span>
              </div>

              <div className="rounded bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">ALTITUDE</span>
                <span className="text-lg font-bold text-white">{telemetry.altitudeFt}</span>
                <span className="ml-1 text-xs text-cyan-400">FT</span>
              </div>

              <div className="rounded bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">VERTICAL SPEED</span>
                <span
                  className={`text-sm font-bold ${
                    telemetry.verticalSpeedFpm < -650 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {telemetry.verticalSpeedFpm > 0 ? `+${telemetry.verticalSpeedFpm}` : telemetry.verticalSpeedFpm}
                </span>
                <span className="ml-1 text-[11px] text-slate-400">FPM</span>
              </div>

              <div className="rounded bg-slate-900/90 p-2 border border-white/5">
                <span className="block text-[10px] text-slate-400">HEADING / RWY 360°</span>
                <span className="text-sm font-bold text-white">
                  {Math.round(telemetry.headingDeg).toString().padStart(3, '0')}°
                </span>
                <span className="ml-1.5 text-[11px] text-amber-400">
                  {Math.abs(telemetry.lateralOffsetMeters)}m off
                </span>
              </div>
            </div>

            <div className="mt-2.5 rounded border border-white/10 bg-slate-900/80 p-2 text-xs font-mono tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">PITCH: {telemetry.pitchDeg.toFixed(1)}°</span>
                <span className="text-slate-400">BANK: {telemetry.rollDeg.toFixed(1)}°</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-slate-400">THROTTLE:</span>
                <span className="font-bold text-amber-400">{Math.round(telemetry.throttlePct)}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${Math.round(telemetry.throttlePct)}%` }}
                />
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs font-mono tabular-nums text-slate-300">
              <span>GEAR (G): <strong className={telemetry.gearDown ? 'text-emerald-400' : 'text-cyan-400'}>{telemetry.gearDown ? 'DOWN' : 'UP'}</strong></span>
              <span>·</span>
              <span>FLAPS (F): <strong className="text-amber-400">{telemetry.flapsDeg}°</strong></span>
              <span>·</span>
              <span>FUEL: <strong>{Math.round(telemetry.fuelPct)}%</strong></span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {telemetry.onGround && (
                <button
                  onClick={onQuickLineupRunway}
                  className="col-span-2 rounded bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/30 whitespace-nowrap"
                >
                  Line Up on Runway 36L (Press T)
                </button>
              )}
              <button
                onClick={onExitPilotSeat}
                className="col-span-2 rounded bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 whitespace-nowrap"
              >
                Exit Pilot Seat to Cabin (Press E)
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        {activeSubtitle && (
          <div className="max-w-2xl rounded-lg border border-amber-400/40 bg-slate-950/90 px-5 py-2.5 text-center text-sm font-medium text-amber-200 shadow-lg backdrop-blur-md">
            {activeSubtitle}
          </div>
        )}

        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-4 rounded-lg border border-white/10 bg-slate-950/80 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
          {controlMode === 'ON_FOOT' ? (
            <>
              <span><strong className="text-white">W A S D</strong> Walk</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">Mouse</strong> Look ({pointerLocked ? 'Locked - ESC to free' : 'Click 3D view to lock'})</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-amber-400">E</strong> Interact / Board / Pilot Seat</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">Shift</strong> Sprint</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">R</strong> Reset</span>
            </>
          ) : (
            <>
              <span><strong className="text-amber-400">Shift / Ctrl</strong> Throttle Up / Down</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">S / W</strong> Pitch Up (Rotate) / Nose Down</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">A / D</strong> Steer / Bank Roll</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">Space</strong> Wheel Brakes</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">G</strong> Gear</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">F</strong> Flaps</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-white">C</strong> Camera</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-amber-400">E</strong> Exit Pilot Seat</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
