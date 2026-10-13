import { CrewRole, PeerPlayer, PlayerControlMode } from '../types/game';

export type MultiplayerMessage =
  | {
      type: 'room:state';
      roomId: string;
      peers: PeerPlayer[];
      sharedActions: Array<{ action: string; refId?: string; payload?: unknown }>;
    }
  | {
      type: 'peer:updated';
      peer: PeerPlayer;
    }
  | {
      type: 'peer:left';
      playerId: string;
    }
  | {
      type: 'game:action';
      playerId: string;
      action: string;
      refId?: string;
      payload?: unknown;
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

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitLocal(msg: MultiplayerMessage) {
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
      },
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
