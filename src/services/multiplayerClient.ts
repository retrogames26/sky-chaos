import { CrewRole, PeerPlayer, PlayerControlMode } from '../types/game';

export type MultiplayerMessage =
  | {
      type: 'room:state';
      roomId: string;
      hostPlayerId: string;
      inFlight: boolean;
      peers: PeerPlayer[];
      sharedActions: Array<{ action: string; refId?: string; payload?: unknown }>;
    }
  | {
      type: 'peer:updated';
      peer: PeerPlayer;
      hostPlayerId?: string;
    }
  | {
      type: 'peer:left';
      playerId: string;
      hostPlayerId?: string;
    }
  | {
      type: 'lobby:started';
      roomId: string;
    }
  | {
      type: 'lobby:kicked';
      reason: string;
    }
  | {
      type: 'game:action';
      playerId: string;
      action: string;
      refId?: string;
      payload?: unknown;
    }
  | {
      type: 'vehicle:sync';
      playerId: string;
      vehicleId: string;
      position: { x: number; y: number; z: number };
      yaw: number;
      speed: number;
    }
  | {
      type: 'aircraft:sync';
      playerId: string;
      position: { x: number; y: number; z: number };
      rotation: { pitch: number; yaw: number; roll: number };
      telemetry: {
        airspeedKts: number;
        altitudeFt: number;
        throttlePct: number;
        gearDown: boolean;
        flapsDeg: 0 | 15 | 30;
        enginesRunning: boolean;
        phase: string;
      };
    };

type Listener = (msg: MultiplayerMessage) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private playerId: string = `crew_${Math.random().toString(36).slice(2, 8)}`;
  private roomId: string = 'SKY-101';
  private callsign: string = 'CAPT. MAVERICK';
  private role: CrewRole = 'PILOT';
  private hostPlayerId: string = '';
  private connected: boolean = false;
  private reconnectTimer: number | null = null;

  public getPlayerId(): string {
    return this.playerId;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public getRole(): CrewRole {
    return this.role;
  }

  public getHostPlayerId(): string {
    return this.hostPlayerId;
  }

  public isHost(): boolean {
    return this.hostPlayerId === this.playerId || !this.hostPlayerId;
  }

  public getInviteLink(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(this.roomId)}`;
  }

  public generateRoomCode(): string {
    const prefixes = ['SKY', 'AIR', 'CHAOS', 'JET', 'FLIGHT'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${p}-${num}`;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitLocal(msg: MultiplayerMessage) {
    if (msg.type === 'room:state') {
      this.hostPlayerId = msg.hostPlayerId;
    } else if (msg.type === 'peer:updated' && msg.hostPlayerId) {
      this.hostPlayerId = msg.hostPlayerId;
    } else if (msg.type === 'peer:left' && msg.hostPlayerId) {
      this.hostPlayerId = msg.hostPlayerId;
    }
    this.listeners.forEach((fn) => fn(msg));
  }

  public connect(roomId: string, callsign: string, role: CrewRole) {
    this.roomId = roomId.trim().toUpperCase() || 'SKY-101';
    this.callsign = callsign;
    this.role = role;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.connected = true;
        this.sendRaw({
          type: 'room:join',
          roomId: this.roomId,
          playerId: this.playerId,
          callsign: this.callsign,
          role: this.role,
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as MultiplayerMessage;
          this.emitLocal(data);
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        this.connected = false;
        if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => {
          if (!this.connected) {
            this.connect(this.roomId, this.callsign, this.role);
          }
        }, 3500);
      };

      socket.onerror = () => {
        this.connected = false;
      };
    } catch {
      this.connected = false;
    }
  }

  public setRole(role: CrewRole) {
    this.role = role;
    if (!this.connected) return;
    this.sendRaw({
      type: 'lobby:role',
      roomId: this.roomId,
      playerId: this.playerId,
      role,
    });
  }

  public startFlight() {
    if (!this.connected) return;
    this.sendRaw({
      type: 'lobby:start',
      roomId: this.roomId,
      playerId: this.playerId,
    });
  }

  public kickPlayer(targetPlayerId: string) {
    if (!this.connected) return;
    this.sendRaw({
      type: 'lobby:kick',
      roomId: this.roomId,
      playerId: this.playerId,
      targetPlayerId,
    });
  }

  public sendPlayerTransform(
    localPosition: { x: number; y: number; z: number },
    yaw: number,
    mode: PlayerControlMode,
    heldLabel: string | null
  ) {
    if (!this.connected) return;
    this.sendRaw({
      type: 'peer:move',
      roomId: this.roomId,
      peer: {
        playerId: this.playerId,
        callsign: this.callsign,
        role: this.role,
        mode,
        localPosition,
        yaw,
        heldLabel,
        isHost: this.isHost(),
      },
    });
  }

  public sendVehicleSync(
    vehicleId: string,
    position: { x: number; y: number; z: number },
    yaw: number,
    speed: number
  ) {
    if (!this.connected) return;
    this.sendRaw({
      type: 'vehicle:sync',
      roomId: this.roomId,
      playerId: this.playerId,
      vehicleId,
      position,
      yaw,
      speed,
    });
  }

  public sendGameAction(action: string, refId?: string, payload?: unknown) {
    if (!this.connected) return;
    this.sendRaw({
      type: 'game:action',
      roomId: this.roomId,
      playerId: this.playerId,
      action,
      refId,
      payload,
    });
  }

  public sendAircraftSync(
    position: { x: number; y: number; z: number },
    rotation: { pitch: number; yaw: number; roll: number },
    telemetry: {
      airspeedKts: number;
      altitudeFt: number;
      throttlePct: number;
      gearDown: boolean;
      flapsDeg: 0 | 15 | 30;
      enginesRunning: boolean;
      phase: string;
    }
  ) {
    if (!this.connected) return;
    this.sendRaw({
      type: 'aircraft:sync',
      roomId: this.roomId,
      playerId: this.playerId,
      position,
      rotation,
      telemetry,
    });
  }

  private sendRaw(obj: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }
}

export const multiplayerClient = new MultiplayerClient();
