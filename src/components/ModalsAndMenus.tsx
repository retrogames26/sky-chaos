import React, { useState } from 'react';
import {
  CheckCircle2,
  Megaphone,
  Ticket,
  Utensils,
  X,
  XCircle,
} from 'lucide-react';
import {
  AnnouncementOption,
  CrewRole,
  DebriefReport,
  FlightRoute,
  MealType,
  PassengerData,
  PlayerProfile,
} from '../types/game';
import {
  ACHIEVEMENT_CATALOG,
  ANNOUNCEMENT_OPTIONS,
  FLIGHT_ROUTES,
  UPGRADE_CATALOG,
} from '../game/GameCatalog';
import { GameUIStateSnapshot } from '../game/GameEngine';

interface ModalsProps {
  ui: GameUIStateSnapshot;
  route: FlightRoute;
  profile: PlayerProfile;
  firebaseStatus: { configured: boolean; message: string };
  activeModal: 'NONE' | 'BRIEFING' | 'PAUSE';
  debriefReport: DebriefReport | null;
  volume: number;
  muted: boolean;
  roomCode: string;
  crewRole: CrewRole;
  onCloseAllModals: () => void;
  onTicketDecision: (paxId: string, decision: 'APPROVED' | 'DENIED') => void;
  onPrepareMeal: (meal: MealType) => void;
  onMakeAnnouncement: (id: AnnouncementOption['id']) => void;
  onSelectRoute: (route: FlightRoute) => void;
  onPurchaseUpgrade: (upgradeId: string, cost: number) => void;
  onUpdateCallsign: (callsign: string) => void;
  onJoinMultiplayerRoom: (room: string, role: CrewRole) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onDismissDebrief: () => void;
}

export const ModalsAndMenus: React.FC<ModalsProps> = ({
  ui,
  route,
  profile,
  firebaseStatus,
  activeModal,
  debriefReport,
  volume,
  muted,
  roomCode,
  crewRole,
  onCloseAllModals,
  onTicketDecision,
  onPrepareMeal,
  onMakeAnnouncement,
  onSelectRoute,
  onPurchaseUpgrade,
  onUpdateCallsign,
  onJoinMultiplayerRoom,
  onVolumeChange,
  onToggleMute,
  onDismissDebrief,
}) => {
  const [hangarTab, setHangarTab] = useState<'ROUTES' | 'UPGRADES' | 'ACHIEVEMENTS' | 'COOP'>('ROUTES');
  const [callsignDraft, setCallsignDraft] = useState(profile.callsign);
  const [roomDraft, setRoomDraft] = useState(roomCode);
  const [roleDraft, setRoleDraft] = useState<CrewRole>(crewRole);

  if (ui.inspectingPassenger) {
    const pax: PassengerData = ui.inspectingPassenger;
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Boarding Pass Verification
              </h2>
            </div>
            <button
              onClick={onCloseAllModals}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-slate-950 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Passenger Name</span>
              <span className="font-semibold text-white">{pax.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Seat</span>
              <span className="font-mono font-bold text-amber-400">{pax.seat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Scheduled Flight Destination</span>
              <span className="font-mono text-emerald-400">
                {route.destinationName} ({route.destinationCode})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ticket Printed Destination</span>
              <span
                className={`font-mono font-semibold ${
                  pax.isTicketValid ? 'text-white' : 'text-red-400'
                }`}
              >
                {pax.ticketDestination}
              </span>
            </div>

            {!pax.isTicketValid && (
              <div className="mt-2 rounded border border-red-500/40 bg-red-950/60 p-2.5 text-xs text-red-200">
                <strong>DISCREPANCY DETECTED:</strong> {pax.invalidityReason}
              </div>
            )}
            {pax.isTicketValid && (
              <div className="mt-2 rounded border border-emerald-500/30 bg-emerald-950/40 p-2.5 text-xs text-emerald-200">
                Barcode and destination match Flight {route.flightNumber} manifest.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => onTicketDecision(pax.id, 'APPROVED')}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Boarding Pass
            </button>
            <button
              onClick={() => onTicketDecision(pax.id, 'DENIED')}
              className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
            >
              <XCircle className="h-4 w-4" />
              Flag & Deny Invalid Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (ui.showGalleyMenu) {
    const meals: MealType[] = ['Chicken', 'Pasta', 'Veggie', 'Coffee'];
    const boardedPax = ui.passengers.filter((p) => p.boarded && !p.mealServed);

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Forward Galley Catering Station
              </h2>
            </div>
            <button
              onClick={onCloseAllModals}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-300">
            Select a hot meal or beverage tray to prepare, then walk down the aisle and press{' '}
            <strong className="text-amber-400">E</strong> on the passenger requesting it.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {meals.map((meal) => {
              const waitingCount = boardedPax.filter((p) => p.mealOrder === meal).length;
              return (
                <button
                  key={meal}
                  onClick={() => onPrepareMeal(meal)}
                  className="flex flex-col items-start justify-between rounded-lg border border-white/10 bg-slate-950 p-3.5 text-left transition-colors hover:border-amber-400"
                >
                  <span className="font-display text-sm font-bold text-white">{meal} Tray</span>
                  <span className="mt-1 font-mono text-xs text-amber-400 tabular-nums">
                    {waitingCount} passenger{waitingCount === 1 ? '' : 's'} waiting
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (ui.showAnnouncementMenu) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Cabin Interphone & PA Broadcast
              </h2>
            </div>
            <button
              onClick={onCloseAllModals}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {ANNOUNCEMENT_OPTIONS.map((opt) => {
              const alreadyMade = ui.checklist.announcementsMade.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => onMakeAnnouncement(opt.id)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 p-3.5 text-left transition-colors hover:border-amber-400"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-white">{opt.title}</span>
                    <span className="font-mono text-xs text-emerald-400">
                      {alreadyMade ? 'BROADCASTED' : 'READY'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs italic text-slate-300">{opt.subtitle}</p>
                  <p className="mt-1 text-[11px] text-amber-400">{opt.effectDescription}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (ui.showManifestModal || activeModal === 'BRIEFING') {
    const { checklist, passengers, cargo, telemetry } = ui;
    const expectedBonus = cargo.filter((c) => c.state === 'SECURED_HOLD').reduce((s, c) => s + c.bonusReward, 0);

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div className="text-xs text-slate-400">
                <span>DISPATCH MANIFEST</span>
                <span className="mx-2">·</span>
                <span className="font-mono text-amber-400">{route.flightNumber}</span>
              </div>
              <h2 className="font-display text-xl font-bold text-white">
                {route.departureName} ({route.departureCode}) to {route.destinationName} ({route.destinationCode})
              </h2>
            </div>
            <button
              onClick={onCloseAllModals}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              Return to 3D View
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3 font-mono text-xs tabular-nums">
            <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">EXPECTED PAYOUT</span>
              <span className="text-base font-bold text-emerald-400">
                ${route.baseReward + expectedBonus}
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">HAZMAT RISK LEVEL</span>
              <span className="text-base font-bold text-amber-400">{route.turbulenceLevel}</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">FUEL & HYDRAULICS</span>
              <span className="text-base font-bold text-cyan-400">{Math.round(telemetry.fuelPct)}% FULL</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">SAFETY CLEARANCE</span>
              <span
                className={`text-base font-bold ${
                  checklist.safetyChecksComplete ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {checklist.safetyChecksComplete ? 'READY' : 'PENDING'}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
              <h3 className="font-display text-sm font-bold text-amber-400">
                Hazardous Cargo Manifest (Rear Hold)
              </h3>
              <div className="mt-3 space-y-2.5 text-xs">
                {cargo.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded border border-white/5 bg-slate-900 p-2.5"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {c.code} · {c.label}
                      </div>
                      <div className="text-[11px] text-slate-400">{c.riskDescription}</div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-emerald-400">+${c.bonusReward}</div>
                      <div className="text-[11px] text-amber-400">{c.state}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
              <h3 className="font-display text-sm font-bold text-cyan-400">
                Passenger Manifest & Catering Status
              </h3>
              <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto text-xs">
                {passengers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded border border-white/5 bg-slate-900 px-3 py-2"
                  >
                    <div>
                      <span className="font-mono font-bold text-amber-400">{p.seat}</span>
                      <span className="mx-2 text-white font-medium">{p.name}</span>
                      <span className="text-slate-400">({p.mealOrder})</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
                      <span className={p.ticketChecked ? 'text-emerald-400' : 'text-amber-400'}>
                        {p.ticketChecked ? p.ticketDecision : 'UNCHECKED'}
                      </span>
                      <span>·</span>
                      <span className={p.mealServed ? 'text-emerald-400' : 'text-slate-400'}>
                        {p.mealServed ? 'FED' : 'HUNGRY'}
                      </span>
                      <span>·</span>
                      <span className={p.seatbeltFastened ? 'text-cyan-400' : 'text-red-400'}>
                        {p.seatbeltFastened ? 'BELTED' : 'UNBUCKLED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (debriefReport) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div className="w-full max-w-xl rounded-xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          <div className="border-b border-white/10 pb-3">
            <div className="text-xs font-mono text-amber-400">
              FLIGHT DEBRIEFING REPORT · {debriefReport.flightNumber}
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              {debriefReport.outcome === 'SUCCESS'
                ? 'Flight Completed Successfully!'
                : debriefReport.outcome === 'PARTIAL_SUCCESS'
                ? 'Rough Landing — Aircraft Down Intact!'
                : 'Emergency Crash Landing'}
            </h2>
            <p className="mt-1 text-xs text-slate-300">{debriefReport.summaryReason}</p>
          </div>

          <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-slate-950 p-4 font-mono text-xs tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-400">Base Route Completion</span>
              <span className="text-white">+${debriefReport.baseFlightReward}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Luggage Handling Bonus</span>
              <span className="text-emerald-400">+${debriefReport.luggageBonus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ticket Verification Accuracy</span>
              <span className="text-emerald-400">+${debriefReport.ticketAccuracyBonus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hazardous Cargo Delivery Bonus</span>
              <span className="text-emerald-400">+${debriefReport.hazardousCargoBonus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">In-Flight Catering & Cabin Cleanliness</span>
              <span className="text-emerald-400">
                +${debriefReport.mealServiceBonus + debriefReport.cleanlinessBonus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Emergency Incident Resolution</span>
              <span className="text-emerald-400">+${debriefReport.incidentHandlingBonus}</span>
            </div>
            {(debriefReport.unsecuredPenalty > 0 || debriefReport.damagePenalty > 0) && (
              <div className="flex justify-between text-red-400">
                <span>Missing Luggage & Airframe Damage Penalties</span>
                <span>-${debriefReport.unsecuredPenalty + debriefReport.damagePenalty}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
              <span className="text-white">NET FLIGHT PAYOUT</span>
              <span className="text-amber-400">+${debriefReport.totalCashEarned} (+{debriefReport.xpEarned} XP)</span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-slate-400">Touchdown Rate / Airline Star Rating</span>
              <span className="text-cyan-400">
                {debriefReport.landingVerticalSpeedFpm} FPM · {debriefReport.starRating} / 5.0 Stars
              </span>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onDismissDebrief}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
            >
              Prepare Next Flight on Apron
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'PAUSE') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs text-slate-400">
                <span>SKY CHAOS AIRLINES HEADQUARTERS</span>
                <span className="mx-2">·</span>
                <span className="font-mono text-amber-400">LEVEL {profile.level} CAPTAIN</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-white">
                Airline Hangar, Upgrades & Co-Op Dispatch
              </h2>
            </div>

            <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
              <div>
                <span className="block text-[10px] text-slate-400">BANK BALANCE</span>
                <span className="text-base font-bold text-emerald-400">${profile.cash}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">PILOT XP</span>
                <span className="text-base font-bold text-amber-400">{profile.xp} XP</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">FLIGHTS / RATING</span>
                <span className="text-base font-bold text-cyan-400">
                  {profile.flightsCompleted} · {profile.avgRating}★
                </span>
              </div>
              <button
                onClick={onCloseAllModals}
                className="rounded-lg bg-amber-500 px-4 py-2 font-sans text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                Resume Game
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-slate-300">
            <span>{firebaseStatus.message}</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={callsignDraft}
                onChange={(e) => setCallsignDraft(e.target.value)}
                className="rounded border border-white/15 bg-slate-900 px-2.5 py-1 font-mono text-xs text-white"
                placeholder="Pilot Callsign"
              />
              <button
                onClick={() => onUpdateCallsign(callsignDraft)}
                className="rounded bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20"
              >
                Save Callsign
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1 rounded-lg bg-slate-950 p-1">
            {(
              [
                ['ROUTES', 'Flight Routes & Destinations'],
                ['UPGRADES', 'Aircraft Upgrades'],
                ['ACHIEVEMENTS', 'Pilot Achievements'],
                ['COOP', 'Online Co-Op & Audio Settings'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setHangarTab(id)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  hangarTab === id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {hangarTab === 'ROUTES' && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {FLIGHT_ROUTES.map((r) => {
                const isSelected = r.id === route.id;
                return (
                  <div
                    key={r.id}
                    className={`flex flex-col justify-between rounded-lg border p-4 ${
                      isSelected
                        ? 'border-amber-400 bg-slate-950'
                        : 'border-white/10 bg-slate-950/60'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-amber-400">
                        {r.flightNumber} · {r.departureCode} → {r.destinationCode}
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold text-white">
                        {r.destinationName}
                      </h3>
                      <div className="mt-2 space-y-1 text-xs text-slate-300">
                        <div>Weather: {r.weatherCondition}</div>
                        <div>Turbulence Risk: {r.turbulenceLevel}</div>
                        <div className="font-mono text-emerald-400">Base Payout: ${r.baseReward}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onSelectRoute(r);
                        onCloseAllModals();
                      }}
                      className="mt-4 w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 hover:text-slate-950"
                    >
                      {isSelected ? 'Restart Current Route' : 'Load Route on Apron'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {hangarTab === 'UPGRADES' && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {UPGRADE_CATALOG.map((u) => {
                const owned = profile.unlockedUpgrades.includes(u.id);
                const canAfford = profile.cash >= u.cost;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col justify-between rounded-lg border border-white/10 bg-slate-950 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-sm font-bold text-white">{u.name}</h3>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {owned ? 'INSTALLED' : `$${u.cost}`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{u.description}</p>
                      <div className="mt-2 font-mono text-xs text-cyan-400">{u.effectLabel}</div>
                    </div>
                    <button
                      disabled={owned || !canAfford}
                      onClick={() => onPurchaseUpgrade(u.id, u.cost)}
                      className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        owned
                          ? 'bg-emerald-950/60 text-emerald-400 cursor-default'
                          : canAfford
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {owned ? 'Upgrade Installed' : canAfford ? `Purchase Upgrade ($${u.cost})` : 'Insufficient Cash'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {hangarTab === 'ACHIEVEMENTS' && (
            <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const unlocked = profile.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-lg border p-3.5 ${
                      unlocked
                        ? 'border-emerald-500/40 bg-emerald-950/20'
                        : 'border-white/10 bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-white">{ach.title}</span>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          unlocked ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {unlocked ? 'UNLOCKED' : `+${ach.rewardXp} XP`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{ach.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {hangarTab === 'COOP' && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
                <h3 className="font-display text-sm font-bold text-amber-400">
                  Real-Time Cooperative Crew Session (WebSocket)
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Open this game in multiple browser windows with the same Room Code to synchronize crew positions, shared tasks, and live flight controls.
                </p>

                <div className="mt-3 space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400">Room Code</label>
                    <input
                      type="text"
                      value={roomDraft}
                      onChange={(e) => setRoomDraft(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded border border-white/15 bg-slate-900 px-3 py-1.5 font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400">Crew Assignment Role</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRoleDraft('PILOT')}
                        className={`rounded border px-3 py-1.5 font-semibold ${
                          roleDraft === 'PILOT'
                            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                            : 'border-white/10 bg-slate-900 text-slate-400'
                        }`}
                      >
                        Captain / Pilot
                      </button>
                      <button
                        onClick={() => setRoleDraft('CABIN_CREW')}
                        className={`rounded border px-3 py-1.5 font-semibold ${
                          roleDraft === 'CABIN_CREW'
                            ? 'border-amber-400 bg-amber-950/60 text-amber-300'
                            : 'border-white/10 bg-slate-900 text-slate-400'
                        }`}
                      >
                        Purser / Cabin Crew
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => onJoinMultiplayerRoom(roomDraft, roleDraft)}
                    className="w-full rounded-lg bg-amber-500 px-3 py-2 font-semibold text-slate-950 hover:bg-amber-400"
                  >
                    Sync Co-Op Room ({roomDraft})
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
                <h3 className="font-display text-sm font-bold text-cyan-400">
                  Audio & Simulation Controls
                </h3>
                <div className="mt-3 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>Master Sound Volume</span>
                      <span className="font-mono">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e) => onVolumeChange( parseFloat(e.target.value) )}
                      className="mt-1.5 w-full accent-amber-500"
                    />
                  </div>
                  <button
                    onClick={onToggleMute}
                    className="rounded border border-white/15 bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-white/10"
                  >
                    {muted ? 'Unmute Synthesizer Audio' : 'Mute All Audio'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
