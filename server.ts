import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface ServerPlayerProfile {
  uid: string;
  callsign: string;
  cash: number;
  xp: number;
  level: number;
  flightsCompleted: number;
  avgRating: number;
  unlockedUpgrades: string[];
  unlockedAchievements: string[];
  authMode: 'FIREBASE' | 'LOCAL_SERVER';
}

interface RoomPeer {
  playerId: string;
  callsign: string;
  role: 'PILOT' | 'COPILOT' | 'CABIN_CREW' | 'GROUND_CREW' | 'BAGGAGE_HANDLER' | 'FUEL_OPERATOR';
  mode: 'ON_FOOT' | 'IN_COCKPIT' | 'DRIVING_TUG' | 'DRIVING_FUEL_TRUCK';
  localPosition: { x: number; y: number; z: number };
  yaw: number;
  heldLabel: string | null;
  isHost?: boolean;
}

interface MultiplayerRoom {
  roomId: string;
  hostPlayerId: string;
  inFlight: boolean;
  clients: Map<WebSocket, string>;
  peers: Map<string, RoomPeer>;
  sharedActions: Array<{ action: string; refId?: string; payload?: unknown }>;
}

const UPGRADE_COSTS: Record<string, number> = {
  upg_cargo_straps: 1200,
  upg_turbo_galley: 1500,
  upg_yaw_damper: 2100,
  upg_oleo_struts: 2800,
};

let authoritativeProfile: ServerPlayerProfile = {
  uid: 'pilot_server_01',
  callsign: 'CAPT. MAVERICK-ISH',
  cash: 1500,
  xp: 0,
  level: 1,
  flightsCompleted: 0,
  avgRating: 5.0,
  unlockedUpgrades: [],
  unlockedAchievements: [],
  authMode: 'LOCAL_SERVER',
};

const rooms = new Map<string, MultiplayerRoom>();

function getOrCreateRoom(roomId: string): MultiplayerRoom {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      hostPlayerId: '',
      inFlight: false,
      clients: new Map(),
      peers: new Map(),
      sharedActions: [],
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(room: MultiplayerRoom, msg: unknown, excludeWs?: WebSocket) {
  const payload = JSON.stringify(msg);
  room.clients.forEach((_, clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(payload);
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/profile', (_req, res) => {
    res.json(authoritativeProfile);
  });

  app.post('/api/profile/callsign', (req, res) => {
    const callsign = String(req.body?.callsign || 'CAPT. CHAOS')
      .trim()
      .slice(0, 24);
    authoritativeProfile.callsign = callsign || 'CAPT. CHAOS';
    res.json(authoritativeProfile);
  });

  app.post('/api/upgrade', (req, res) => {
    const upgradeId = String(req.body?.upgradeId || '');
    const cost = UPGRADE_COSTS[upgradeId];
    if (!cost) {
      res.status(400).json({ error: 'Unknown upgrade ID' });
      return;
    }
    if (
      !authoritativeProfile.unlockedUpgrades.includes(upgradeId) &&
      authoritativeProfile.cash >= cost
    ) {
      authoritativeProfile.cash -= cost;
      authoritativeProfile.unlockedUpgrades.push(upgradeId);
    }
    res.json(authoritativeProfile);
  });

  app.post('/api/flight-complete', (req, res) => {
    const body = req.body || {};
    const outcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'CRASHED' =
      body.outcome === 'CRASHED'
        ? 'CRASHED'
        : body.outcome === 'PARTIAL_SUCCESS'
        ? 'PARTIAL_SUCCESS'
        : 'SUCCESS';

    const landingVsFpm = Number(body.landingVsFpm) || -200;
    const luggageLoadedCount = Math.max(0, Math.min(6, Number(body.luggageLoadedCount) || 0));
    const luggageTotalCount = 6;
    const ticketsAccurateCount = Math.max(0, Math.min(8, Number(body.ticketsAccurateCount) || 0));
    const ticketsTotalCount = 8;
    const hazardousCargoIntactCount = Math.max(
      0,
      Math.min(3, Number(body.hazardousCargoIntactCount) || 0)
    );
    const mealsServedCount = Math.max(0, Math.min(8, Number(body.mealsServedCount) || 0));
    const cleanlinessPct = Math.max(0, Math.min(100, Number(body.cleanlinessPct) || 0));
    const incidentsResolvedCount = Math.max(0, Math.min(10, Number(body.incidentsResolvedCount) || 0));
    const airframeHealth = Math.max(0, Math.min(100, Number(body.airframeHealth) ?? 100));
    const passengerSatisfactionPct = Math.max(
      0,
      Math.min(100, Number(body.passengerSatisfactionPct) ?? 80)
    );

    const routeBaseMap: Record<string, number> = {
      route_chaos_island: 1200,
      route_frostpeak: 1850,
      route_volcano: 2600,
    };
    const baseFlightReward =
      outcome === 'CRASHED' ? 150 : routeBaseMap[String(body.routeId)] || 1200;

    const luggageBonus = luggageLoadedCount * 85;
    const ticketAccuracyBonus = ticketsAccurateCount * 70;
    const hazardousCargoBonus = outcome === 'CRASHED' ? 0 : hazardousCargoIntactCount * 410;
    const mealServiceBonus = mealsServedCount * 65;
    const cleanlinessBonus = Math.round(cleanlinessPct * 2.5);
    const incidentHandlingBonus = incidentsResolvedCount * 220;
    const unsecuredPenalty = (luggageTotalCount - luggageLoadedCount) * 110;
    const damagePenalty = Math.round((100 - airframeHealth) * 14);

    const totalCashEarned = Math.max(
      100,
      baseFlightReward +
        luggageBonus +
        ticketAccuracyBonus +
        hazardousCargoBonus +
        mealServiceBonus +
        cleanlinessBonus +
        incidentHandlingBonus -
        unsecuredPenalty -
        damagePenalty
    );
    const xpEarned = Math.round(totalCashEarned * 0.45);
    const starRating =
      outcome === 'CRASHED'
        ? 1.5
        : Number(
            Math.min(
              5,
              Math.max(
                1,
                2.5 + (passengerSatisfactionPct / 100) * 1.5 + (airframeHealth / 100) * 1.0
              )
            ).toFixed(1)
          );

    const newlyUnlocked: string[] = [];
    const grantAch = (id: string) => {
      if (!authoritativeProfile.unlockedAchievements.includes(id)) {
        authoritativeProfile.unlockedAchievements.push(id);
        newlyUnlocked.push(id);
      }
    };

    if (outcome !== 'CRASHED') grantAch('ach_first_flight');
    if (ticketsAccurateCount >= ticketsTotalCount) grantAch('ach_gatekeeper');
    if (luggageLoadedCount >= luggageTotalCount) grantAch('ach_baggage_pro');
    if (hazardousCargoIntactCount >= 3 && outcome !== 'CRASHED') grantAch('ach_hazmat_ace');
    if (cleanlinessPct >= 100) grantAch('ach_spotless');
    if (outcome !== 'CRASHED' && Math.abs(landingVsFpm) <= 250) grantAch('ach_butter_landing');
    if (incidentsResolvedCount >= 1) grantAch('ach_crisis_manager');

    authoritativeProfile.cash += totalCashEarned;
    authoritativeProfile.xp += xpEarned;
    authoritativeProfile.level = Math.floor(authoritativeProfile.xp / 1000) + 1;
    const prevFlights = authoritativeProfile.flightsCompleted;
    authoritativeProfile.flightsCompleted = prevFlights + 1;
    authoritativeProfile.avgRating = Number(
      (
        (authoritativeProfile.avgRating * prevFlights + starRating) /
        authoritativeProfile.flightsCompleted
      ).toFixed(1)
    );

    const report = {
      flightNumber: 'SC-101',
      routeTitle: 'Metro Chaos Intl → Destination',
      outcome,
      summaryReason:
        outcome === 'SUCCESS'
          ? 'Aircraft landed safely on the destination runway and came to a full stop.'
          : outcome === 'PARTIAL_SUCCESS'
          ? 'Rough touchdown recorded with minor airframe stress, but all passengers survived!'
          : 'Hard impact exceeded structural tolerances. Emergency slides deployed.',
      landingVerticalSpeedFpm: Math.round(landingVsFpm),
      baseFlightReward,
      luggageBonus,
      ticketAccuracyBonus,
      hazardousCargoBonus,
      mealServiceBonus,
      cleanlinessBonus,
      incidentHandlingBonus,
      unsecuredPenalty,
      damagePenalty,
      totalCashEarned,
      xpEarned,
      passengerSatisfactionPct: Math.round(passengerSatisfactionPct),
      starRating,
      unlockedAchievements: newlyUnlocked,
    };

    res.json({ profile: authoritativeProfile, report });
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let joinedRoomId: string | null = null;
    let joinedPlayerId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'room:join') {
          const roomId = String(msg.roomId || 'SKY-101').toUpperCase();
          const playerId = String(msg.playerId || `crew_${Date.now()}`);
          joinedRoomId = roomId;
          joinedPlayerId = playerId;

          const room = getOrCreateRoom(roomId);
          // Six-player hard cap, counting live connections only. Do not partially join a full room.
          if (!room.clients.has(ws) && room.clients.size >= 6) {
            ws.send(JSON.stringify({
              type: 'lobby:kicked',
              reason: 'This room is full (maximum 6 players). Ask the host for another room code.',
            }));
            ws.close(1008, 'Room full');
            return;
          }
          if (!room.hostPlayerId) {
            room.hostPlayerId = playerId;
          }
          room.clients.set(ws, playerId);

          const role =
            msg.role === 'COPILOT'
              ? 'COPILOT'
              : msg.role === 'CABIN_CREW'
              ? 'CABIN_CREW'
              : msg.role === 'GROUND_CREW'
              ? 'GROUND_CREW'
              : msg.role === 'BAGGAGE_HANDLER'
              ? 'BAGGAGE_HANDLER'
              : msg.role === 'FUEL_OPERATOR'
              ? 'FUEL_OPERATOR'
              : 'PILOT';

          const initialPeer: RoomPeer = {
            playerId,
            callsign: String(msg.callsign || 'CREW'),
            role,
            mode: 'ON_FOOT',
            localPosition: { x: -7.5, y: 0, z: -9.5 },
            yaw: 0,
            heldLabel: null,
            isHost: room.hostPlayerId === playerId,
          };
          room.peers.set(playerId, initialPeer);

          ws.send(
            JSON.stringify({
              type: 'room:state',
              roomId,
              hostPlayerId: room.hostPlayerId,
              inFlight: room.inFlight,
              peers: Array.from(room.peers.values()),
              sharedActions: room.sharedActions,
            })
          );

          broadcastToRoom(room, { type: 'peer:updated', peer: initialPeer, hostPlayerId: room.hostPlayerId }, ws);
        } else if (msg.type === 'lobby:role' && joinedRoomId && joinedPlayerId) {
          const room = rooms.get(joinedRoomId);
          if (room) {
            const peer = room.peers.get(joinedPlayerId);
            if (peer) {
              peer.role = msg.role;
              broadcastToRoom(room, { type: 'peer:updated', peer, hostPlayerId: room.hostPlayerId });
            }
          }
        } else if (msg.type === 'lobby:start' && joinedRoomId && joinedPlayerId) {
          const room = rooms.get(joinedRoomId);
          if (room && room.hostPlayerId === joinedPlayerId) {
            room.inFlight = true;
            broadcastToRoom(room, { type: 'lobby:started', roomId: joinedRoomId });
          }
        } else if (msg.type === 'lobby:kick' && joinedRoomId && joinedPlayerId) {
          const room = rooms.get(joinedRoomId);
          if (room && room.hostPlayerId === joinedPlayerId && msg.targetPlayerId) {
            const targetId = String(msg.targetPlayerId);
            for (const [cWs, pId] of room.clients.entries()) {
              if (pId === targetId) {
                cWs.send(JSON.stringify({ type: 'lobby:kicked', reason: 'Removed by room host' }));
                cWs.close();
                break;
              }
            }
          }
        } else if (msg.type === 'peer:move' && joinedRoomId) {
          const room = rooms.get(joinedRoomId);
          if (room && msg.peer) {
            msg.peer.isHost = room.hostPlayerId === msg.peer.playerId;
            room.peers.set(msg.peer.playerId, msg.peer);
            broadcastToRoom(room, { type: 'peer:updated', peer: msg.peer, hostPlayerId: room.hostPlayerId }, ws);
          }
        } else if (msg.type === 'vehicle:sync' && joinedRoomId) {
          const room = rooms.get(joinedRoomId);
          if (room) {
            broadcastToRoom(
              room,
              {
                type: 'vehicle:sync',
                playerId: msg.playerId,
                vehicleId: msg.vehicleId,
                position: msg.position,
                yaw: msg.yaw,
                speed: msg.speed,
              },
              ws
            );
          }
        } else if (msg.type === 'game:action' && joinedRoomId) {
          const room = rooms.get(joinedRoomId);
          if (room) {
            const actionRecord = {
              action: String(msg.action),
              refId: msg.refId ? String(msg.refId) : undefined,
              payload: msg.payload,
            };
            room.sharedActions.push(actionRecord);
            if (room.sharedActions.length > 100) room.sharedActions.shift();
            broadcastToRoom(
              room,
              {
                type: 'game:action',
                playerId: msg.playerId,
                ...actionRecord,
              },
              ws
            );
          }
        } else if (msg.type === 'aircraft:sync' && joinedRoomId) {
          const room = rooms.get(joinedRoomId);
          if (room) {
            broadcastToRoom(
              room,
              {
                type: 'aircraft:sync',
                playerId: msg.playerId,
                position: msg.position,
                rotation: msg.rotation,
                telemetry: msg.telemetry,
              },
              ws
            );
          }
        }
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      if (joinedRoomId && joinedPlayerId) {
        const room = rooms.get(joinedRoomId);
        if (room) {
          room.clients.delete(ws);
          room.peers.delete(joinedPlayerId);
          if (room.hostPlayerId === joinedPlayerId) {
            const remaining = Array.from(room.peers.keys());
            room.hostPlayerId = remaining[0] || '';
          }
          broadcastToRoom(room, {
            type: 'peer:left',
            playerId: joinedPlayerId,
            hostPlayerId: room.hostPlayerId,
          });
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Sky Chaos server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
