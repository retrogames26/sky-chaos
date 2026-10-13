import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Megaphone,
  Play,
  RotateCcw,
  Share2,
  Ticket,
  UserMinus,
  Users,
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
import { multiplayerClient } from '../services/multiplayerClient';

interface ModalsProps {
  ui: GameUIStateSnapshot;
  route: FlightRoute;
  profile: PlayerProfile;
  firebaseStatus: { configured: boolean; message: string };
  activeModal: 'NONE' | 'BRIEFING' | 'PAUSE' | 'MULTIPLAYER';
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
  onStartMultiplayerFlight?: () => void;
  onKickMultiplayerPlayer?: (playerId: string) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onDismissDebrief: () => void;
  onGoogleSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
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
  onStartMultiplayerFlight,
  onKickMultiplayerPlayer,
  onVolumeChange,
  onToggleMute,
  onDismissDebrief,
  onGoogleSignIn,
  onSignOut,
}) => {
  const [hangarTab, setHangarTab] = useState<'ROUTES' | 'UPGRADES' | 'ACHIEVEMENTS' | 'COOP'>('ROUTES');
  const [callsignDraft, setCallsignDraft] = useState(profile.callsign);
  const [roomDraft, setRoomDraft] = useState(roomCode);
  const [roleDraft, setRoleDraft] = useState<CrewRole>(crewRole);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyInviteLink = () => {
    const link = multiplayerClient.getInviteLink();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleGenerateRandomCode = () => {
    const code = multiplayerClient.generateRoomCode();
    setRoomDraft(code);
    onJoinMultiplayerRoom(code, roleDraft);
  };

  // 1. Boarding Pass Verification Modal
  if (ui.inspectingPassenger) {
    const pax: PassengerData = ui.inspectingPassenger;
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
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

          <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-slate-950 p-4 text-sm">
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
              <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/60 p-2.5 text-xs text-red-200">
                <strong>DISCREPANCY DETECTED:</strong> {pax.invalidityReason}
              </div>
            )}
            {pax.isTicketValid && (
              <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2.5 text-xs text-emerald-200">
                Barcode and destination match Flight {route.flightNumber} manifest.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => onTicketDecision(pax.id, 'APPROVED')}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 shadow"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Boarding Pass
            </button>
            <button
              onClick={() => onTicketDecision(pax.id, 'DENIED')}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 shadow"
            >
              <XCircle className="h-4 w-4" />
              Flag & Deny Boarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Galley Catering Station Modal
  if (ui.showGalleyMenu) {
    const meals: MealType[] = ['Chicken', 'Pasta', 'Veggie', 'Coffee'];
    const boardedPax = ui.passengers.filter((p) => p.boarded && !p.mealServed);

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
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
            Select a meal tray to prepare, then walk down the aisle and press{' '}
            <strong className="text-amber-400">E</strong> on the passenger requesting it.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {meals.map((meal) => {
              const waitingCount = boardedPax.filter((p) => p.mealOrder === meal).length;
              return (
                <button
                  key={meal}
                  onClick={() => onPrepareMeal(meal)}
                  className="flex flex-col items-start justify-between rounded-xl border border-white/10 bg-slate-950 p-4 text-left transition-colors hover:border-amber-400 shadow"
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

  // 3. Cabin Announcement Modal
  if (ui.showAnnouncementMenu) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
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
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3.5 text-left transition-colors hover:border-amber-400 shadow"
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

  // 4. Preflight Briefing & Dispatch Manifest
  if (ui.showManifestModal || activeModal === 'BRIEFING') {
    const { checklist, passengers, cargo, telemetry } = ui;
    const expectedBonus = cargo.filter((c) => c.state === 'SECURED_HOLD').reduce((s, c) => s + c.bonusReward, 0);

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
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
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">EXPECTED PAYOUT</span>
              <span className="text-base font-bold text-emerald-400">
                ${route.baseReward + expectedBonus}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">HAZMAT RISK LEVEL</span>
              <span className="text-base font-bold text-amber-400">{route.turbulenceLevel}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">FUEL & HYDRAULICS</span>
              <span className="text-base font-bold text-cyan-400">{Math.round(telemetry.fuelPct)}% FULL</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">SAFETY CLEARANCE</span>
              <span
                className={`text-base font-bold ${
                  checklist.safetyChecksComplete ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {checklist.safetyChecksComplete ? 'READY FOR FLIGHT' : 'CHECKS PENDING'}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="font-display text-sm font-bold text-white">
              Special Dangerous Goods Manifest (Rear Cargo Hold)
            </h3>
            <div className="mt-2.5 space-y-2">
              {cargo.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 p-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{item.code}</span>
                      <span className="font-semibold text-white">{item.label}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{item.riskDescription}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        item.state === 'SECURED_HOLD' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {item.state === 'SECURED_HOLD' ? 'STRAPPED & SECURE' : 'UNSECURED ON APRON'}
                    </span>
                    <div className="text-[11px] text-emerald-400">+${item.bonusReward} bonus</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
              <h3 className="font-display text-sm font-bold text-white">
                Passenger Manifest
              </h3>
              <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                <span className="rounded bg-white/10 px-2 py-0.5 text-slate-300">
                  Passengers detected: <strong className="text-white">{passengers.filter((p) => p.boarded).length} / {passengers.length}</strong>
                </span>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300">
                  Boarding passes checked: <strong className="text-white">{passengers.filter((p) => p.ticketChecked).length} / {passengers.length}</strong>
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {passengers.map((pax) => {
                const statusColor = !pax.ticketChecked
                  ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                  : pax.ticketDecision === 'APPROVED'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                  : 'text-red-400 bg-red-950/40 border-red-500/30';

                const statusLabel = !pax.ticketChecked
                  ? 'UNCHECKED'
                  : pax.ticketDecision === 'APPROVED'
                  ? 'APPROVED'
                  : 'DENIED';

                return (
                  <div
                    key={pax.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/70 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{pax.seat}</span>
                      <span className="font-medium text-white">{pax.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-400">
                        {pax.mealOrder}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Dedicated Multiplayer Lobby Modal
  if (activeModal === 'MULTIPLAYER') {
    const isHost = multiplayerClient.isHost();
    const allMembers = [
      {
        playerId: multiplayerClient.getPlayerId(),
        callsign: profile.callsign,
        role: crewRole,
        isHost,
        isSelf: true,
      },
      ...ui.peers.map((p) => ({
        playerId: p.playerId,
        callsign: p.callsign,
        role: p.role,
        isHost: !isHost && p.playerId === multiplayerClient.getHostPlayerId(),
        isSelf: false,
      })),
    ];

    const roles: Array<{ role: CrewRole; title: string; desc: string; color: string }> = [
      {
        role: 'PILOT',
        title: 'Captain / Pilot',
        desc: 'Flight deck controls, throttle, pitch/roll/yaw, takeoff & runway landing.',
        color: 'text-cyan-400 border-cyan-400/40 bg-cyan-950/40',
      },
      {
        role: 'COPILOT',
        title: 'First Officer / Co-Pilot',
        desc: 'Flaps, landing gear, engine start, navigation, and co-pilot yoke.',
        color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
      },
      {
        role: 'CABIN_CREW',
        title: 'Lead Flight Attendant / Purser',
        desc: 'Galley meal service, boarding pass inspection, passenger panic & PA announcements.',
        color: 'text-amber-400 border-amber-400/40 bg-amber-950/40',
      },
      {
        role: 'GROUND_CREW',
        title: 'Ground Ramp Agent / Tug Driver',
        desc: 'Drive airport baggage tug, tow luggage carts, refuel wings with tanker truck.',
        color: 'text-purple-400 border-purple-400/40 bg-purple-950/40',
      },
    ];

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Users className="h-6 w-6 text-cyan-400" />
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Multiplayer Co-Op Airline Lobby
                </h2>
                <p className="text-xs text-slate-400">
                  Invite friends to operate this flight together in real-time online co-op
                </p>
              </div>
            </div>
            <button
              onClick={onCloseAllModals}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Room Code & Invitation Link Box */}
          <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-cyan-300">
                  PRIVATE ROOM CODE
                </span>
                <span className="font-mono text-2xl font-black text-white tracking-widest">
                  {roomCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateRandomCode}
                  className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  New Code
                </button>

                <button
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400 shadow"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
                </button>
              </div>
            </div>

            {/* Direct Join Input */}
            <div className="mt-3 flex items-center gap-2 border-t border-cyan-500/20 pt-3 text-xs">
              <span className="text-slate-400">Join different room:</span>
              <input
                type="text"
                value={roomDraft}
                onChange={(e) => setRoomDraft(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="w-36 rounded border border-white/15 bg-slate-900 px-2.5 py-1 font-mono text-white"
              />
              <button
                onClick={() => onJoinMultiplayerRoom(roomDraft, roleDraft)}
                className="rounded bg-white/10 px-3 py-1 font-semibold text-white hover:bg-white/20"
              >
                Connect Room
              </button>
            </div>
          </div>

          {/* Role Selection Grid */}
          <div className="mt-5">
            <h3 className="font-display text-sm font-bold text-white">
              Select Your Crew Assignment Role
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {roles.map((r) => {
                const isSelected = crewRole === r.role;
                return (
                  <button
                    key={r.role}
                    onClick={() => {
                      setRoleDraft(r.role);
                      multiplayerClient.setRole(r.role);
                      onJoinMultiplayerRoom(roomCode, r.role);
                    }}
                    className={`rounded-xl border p-3.5 text-left transition-all shadow ${
                      isSelected
                        ? r.color
                        : 'border-white/10 bg-slate-950 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-white">
                        {r.title}
                      </span>
                      {isSelected && (
                        <span className="font-mono text-[10px] font-bold uppercase rounded bg-white/15 px-2 py-0.5 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Players Currently in Lobby */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-white">
                Active Flight Crew ({allMembers.length} Joined)
              </h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live WebSocket Synced
              </span>
            </div>

            <div className="mt-2.5 space-y-2">
              {allMembers.map((member) => (
                <div
                  key={member.playerId}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {member.isHost ? (
                      <span title="Room Host">
                        <Crown className="h-4 w-4 text-amber-400" />
                      </span>
                    ) : (
                      <Users className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="font-semibold text-white">
                      {member.callsign} {member.isSelf && '(You)'}
                    </span>
                    <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                      {member.role}
                    </span>
                    {member.isHost && (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-300 font-bold">
                        HOST
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-emerald-400">READY</span>
                    {isHost && !member.isSelf && (
                      <button
                        onClick={() => {
                          multiplayerClient.kickPlayer(member.playerId);
                          onKickMultiplayerPlayer?.(member.playerId);
                        }}
                        className="rounded p-1 text-red-400 hover:bg-red-950 hover:text-red-300"
                        title="Remove Player"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Host Start Game / Launch Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="text-xs text-slate-400">
              {isHost
                ? 'You are the Host. Click "Start Co-Op Flight" when all crew members are ready.'
                : 'Waiting for Host to begin flight operations...'}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onCloseAllModals}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                Close Window
              </button>
              {isHost && (
                <button
                  onClick={() => {
                    multiplayerClient.startFlight();
                    onStartMultiplayerFlight?.();
                    onCloseAllModals();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-400 shadow-lg"
                >
                  <Play className="h-4 w-4" />
                  Start Co-Op Flight
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. Post-Flight Debrief Report Modal
  if (debriefReport) {
    const isSuccess = debriefReport.outcome === 'SUCCESS';
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
        <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          <div className="border-b border-white/10 pb-4 text-center">
            <div className="font-mono text-xs font-bold text-amber-400">
              FLIGHT DEBRIEF · {debriefReport.flightNumber}
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              {isSuccess
                ? 'Flight Completed Successfully!'
                : debriefReport.outcome === 'PARTIAL_SUCCESS'
                ? 'Rough Landing Recorded!'
                : 'Catastrophic Flight Termination!'}
            </h2>
            <p className="mt-1 text-xs text-slate-300">{debriefReport.summaryReason}</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-xs tabular-nums text-center">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">PASSENGER RATING</span>
              <span className="text-xl font-bold text-amber-400">{debriefReport.starRating} ★</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">CASH EARNED</span>
              <span className="text-xl font-bold text-emerald-400">+${debriefReport.totalCashEarned}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
              <span className="block text-[10px] text-slate-400">CAREER XP</span>
              <span className="text-xl font-bold text-cyan-400">+{debriefReport.xpEarned} XP</span>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-slate-950 p-3.5 font-mono text-xs tabular-nums">
            <div className="flex justify-between text-slate-300">
              <span>Base Route Payout</span>
              <span className="text-white">${debriefReport.baseFlightReward}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Baggage Handling Bonus</span>
              <span className="text-emerald-400">+${debriefReport.luggageBonus}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Ticket Verification Accuracy</span>
              <span className="text-emerald-400">+${debriefReport.ticketAccuracyBonus}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Hazardous Cargo Protection</span>
              <span className="text-emerald-400">+${debriefReport.hazardousCargoBonus}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cabin In-Flight Meal Service</span>
              <span className="text-emerald-400">+${debriefReport.mealServiceBonus}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cabin Cleanliness Bonus</span>
              <span className="text-emerald-400">+${debriefReport.cleanlinessBonus}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Touchdown Vertical Speed</span>
              <span className={debriefReport.landingVerticalSpeedFpm < -650 ? 'text-red-400' : 'text-emerald-400'}>
                {debriefReport.landingVerticalSpeedFpm} FPM
              </span>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={onDismissDebrief}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 shadow"
            >
              Return to Airport Apron
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. Pause / Hangar Career Menu
  if (activeModal === 'PAUSE') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="font-mono text-xs font-bold text-amber-400">
                SKY CHAOS AIRLINES · CAREER HEADQUARTERS
              </div>
              <h2 className="mt-0.5 font-display text-2xl font-bold text-white">
                Pilot Profile & Aircraft Hangar
              </h2>
            </div>
            <button
              onClick={onCloseAllModals}
              className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              Resume Game (ESC)
            </button>
          </div>

          {/* Callsign & Stats Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={callsignDraft}
                onChange={(e) => setCallsignDraft(e.target.value)}
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 font-mono text-sm font-bold text-white"
              />
              <button
                onClick={() => onUpdateCallsign(callsignDraft)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                Update Callsign
              </button>
            </div>

            <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
              <div>
                <span className="block text-[10px] text-slate-400">BANK BALANCE</span>
                <span className="text-base font-bold text-emerald-400">${profile.cash}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">PILOT LEVEL</span>
                <span className="text-base font-bold text-cyan-400">LVL {profile.level}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">AVG RATING</span>
                <span className="text-base font-bold text-amber-400">{profile.avgRating} ★</span>
              </div>
            </div>
          </div>

          {/* Cloud Auth Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>{firebaseStatus.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {profile.authMode === 'FIREBASE' ? (
                <button
                  onClick={onSignOut}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={onGoogleSignIn}
                  className="rounded-lg bg-cyan-600 px-3 py-1 font-semibold text-white hover:bg-cyan-500"
                >
                  Sign In with Google Cloud
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-5 flex gap-2 border-b border-white/10 pb-2">
            {(['ROUTES', 'UPGRADES', 'ACHIEVEMENTS', 'COOP'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setHangarTab(tab)}
                className={`rounded-lg px-4 py-2 font-display text-xs font-bold tracking-wider transition-colors ${
                  hangarTab === tab
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab === 'ROUTES'
                  ? 'FLIGHT ROUTES'
                  : tab === 'UPGRADES'
                  ? 'AIRCRAFT UPGRADES'
                  : tab === 'ACHIEVEMENTS'
                  ? 'ACHIEVEMENTS'
                  : 'CO-OP MULTIPLAYER'}
              </button>
            ))}
          </div>

          {/* Tab 1: Flight Routes */}
          {hangarTab === 'ROUTES' && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {FLIGHT_ROUTES.map((r) => {
                const isSelected = r.id === route.id;
                return (
                  <div
                    key={r.id}
                    className={`flex flex-col justify-between rounded-xl border p-4 ${
                      isSelected ? 'border-amber-400 bg-slate-950' : 'border-white/10 bg-slate-950/60'
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

          {/* Tab 2: Aircraft Upgrades */}
          {hangarTab === 'UPGRADES' && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {UPGRADE_CATALOG.map((u) => {
                const owned = profile.unlockedUpgrades.includes(u.id);
                const canAfford = profile.cash >= u.cost;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950 p-4"
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

          {/* Tab 3: Achievements */}
          {hangarTab === 'ACHIEVEMENTS' && (
            <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const unlocked = profile.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl border p-3.5 ${
                      unlocked ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-white/10 bg-slate-950'
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

          {/* Tab 4: Co-Op Multiplayer Quick Sync */}
          {hangarTab === 'COOP' && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                <h3 className="font-display text-sm font-bold text-amber-400">
                  Real-Time Co-Op Session Controls
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Share your Room Code or invite link with friends to play co-op with live synchronized positions and flight deck operations.
                </p>

                <div className="mt-3 space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400">Active Room Code</label>
                    <input
                      type="text"
                      value={roomDraft}
                      onChange={(e) => setRoomDraft(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded border border-white/15 bg-slate-900 px-3 py-1.5 font-mono text-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyInviteLink}
                      className="flex-1 rounded-lg bg-cyan-600 py-2 font-semibold text-white hover:bg-cyan-500 flex items-center justify-center gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
                    </button>
                    <button
                      onClick={() => onJoinMultiplayerRoom(roomDraft, roleDraft)}
                      className="flex-1 rounded-lg bg-amber-500 py-2 font-semibold text-slate-950 hover:bg-amber-400"
                    >
                      Sync Room
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                <h3 className="font-display text-sm font-bold text-cyan-400">
                  Audio & Sound Simulation
                </h3>
                <div className="mt-3 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>Synthesizer Sound Volume</span>
                      <span className="font-mono">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="mt-1.5 w-full accent-amber-500"
                    />
                  </div>
                  <button
                    onClick={onToggleMute}
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 font-medium text-white hover:bg-white/10 w-full"
                  >
                    {muted ? 'Unmute Audio' : 'Mute All Audio'}
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
