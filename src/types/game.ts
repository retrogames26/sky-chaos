export type PlayerControlMode =
  | 'ON_FOOT'
  | 'IN_COCKPIT'
  | 'DRIVING_TUG'
  | 'DRIVING_FUEL_TRUCK'
  | 'SKYDIVING';

export type FlightPhase =
  | 'PREFLIGHT'
  | 'TAXI'
  | 'TAKEOFF'
  | 'CRUISE'
  | 'APPROACH'
  | 'LANDING'
  | 'FLIGHT_COMPLETE'
  | 'FLIGHT_FAILED';

export type CrewRole =
  | 'PILOT'
  | 'COPILOT'
  | 'CABIN_CREW'
  | 'GROUND_CREW'
  | 'BAGGAGE_HANDLER'
  | 'FUEL_OPERATOR';

export interface LobbyMember {
  playerId: string;
  callsign: string;
  role: CrewRole;
  isHost: boolean;
  isReady: boolean;
  connectedAt: number;
}

export type MealType = 'Chicken' | 'Pasta' | 'Veggie' | 'Coffee';

export interface FlightRoute {
  id: string;
  flightNumber: string;
  departureCode: string;
  departureName: string;
  destinationCode: string;
  destinationName: string;
  distanceMeters: number;
  baseReward: number;
  weatherCondition: 'Clear Skies' | 'Crosswind & Clouds' | 'Tropical Storm';
  turbulenceLevel: 'Low' | 'Moderate' | 'Severe';
  unlockedAtLevel: number;
}

export interface PassengerData {
  id: string;
  name: string;
  seat: string;
  seatRow: number;
  seatCol: number; // 0: A, 1: B, 2: C, 3: D
  ticketDestination: string;
  isTicketValid: boolean;
  invalidityReason?: string;
  ticketChecked: boolean;
  ticketDecision: 'APPROVED' | 'DENIED' | null;
  boarded: boolean;
  seatbeltFastened: boolean;
  hunger: number; // 0-100
  mealOrder: MealType;
  mealServed: boolean;
  happiness: number; // 0-100
  isPanicking: boolean;
  needsMedicalAid: boolean;
  outfitColor: number;
  position: { x: number; y: number; z: number };
}

export interface LuggageItem {
  id: string;
  ownerName: string;
  color: number;
  state: 'ON_CART' | 'HELD' | 'STOWED_CABIN' | 'STOWED_CARGO' | 'LOOSE_CABIN';
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export interface CargoCrate {
  id: string;
  code: string;
  label: string;
  hazardClass: string;
  riskDescription: string;
  bonusReward: number;
  manifestInspected: boolean;
  state: 'ON_APRON' | 'HELD' | 'SECURED_HOLD' | 'LEAKING';
  integrity: number; // 0-100
  position: { x: number; y: number; z: number };
}

export interface CabinMess {
  id: string;
  type: 'SPILL' | 'TRASH' | 'GOO';
  label: string;
  cleaned: boolean;
  position: { x: number; y: number; z: number };
}

export type IncidentType =
  | 'GALLEY_SMOKE'
  | 'PRESSURE_ALERT'
  | 'PANIC_PASSENGER'
  | 'CARGO_LEAK'
  | 'ENGINE_VIBRATION';

export interface ActiveIncident {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  actionPrompt: string;
  targetPosition: { x: number; y: number; z: number }; // local to aircraft
  timerSeconds: number;
  maxSeconds: number;
  resolved: boolean;
}

export interface AircraftTelemetry {
  airspeedKts: number;
  altitudeFt: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  verticalSpeedFpm: number;
  throttlePct: number;
  fuelPct: number;
  gearDown: boolean;
  flapsDeg: 0 | 15 | 30;
  brakesOn: boolean;
  parkingBrake: boolean;
  spoilersExtended: boolean;
  reverseThrust: boolean;
  cabinDoorClosed: boolean;
  cargoDoorClosed: boolean;
  enginesRunning: boolean;
  airframeHealth: number; // 0-100
  distanceToDestMeters: number;
  lateralOffsetMeters: number;
  onGround: boolean;
  inTurbulence: boolean;
  cameraView: 'COCKPIT' | 'CABIN' | 'CHASE' | 'ORBIT';
  autopilotHold: boolean;
  navLights: boolean;
  beaconLights: boolean;
  strobeLights: boolean;
  landingLights: boolean;
  cabinLights: boolean;
  radioFreq: string;
}

export interface SkydivingState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  parachuteDeployed: boolean;
  landed: boolean;
  landingReport?: string;
}

export interface HeldObjectInfo {
  kind: 'LUGGAGE' | 'CARGO' | 'MEAL' | 'CLEANER' | 'EXTINGUISHER' | 'PARACHUTE';
  id: string;
  label: string;
  mealType?: MealType;
}

export interface InteractionTarget {
  id: string;
  type:
    | 'BOARD_STAIRS'
    | 'CABIN_DOOR'
    | 'CARGO_DOOR'
    | 'PILOT_SEAT'
    | 'PASSENGER'
    | 'LUGGAGE'
    | 'OVERHEAD_BIN'
    | 'CARGO_HOLD_SLOT'
    | 'HAZARD_CARGO'
    | 'MANIFEST_BOARD'
    | 'GALLEY_PREP'
    | 'CABIN_MESS'
    | 'PA_SYSTEM'
    | 'INCIDENT_FIX'
    | 'ENGINE_START_SWITCH'
    | 'DRIVE_TUG'
    | 'FUEL_TRUCK'
    | 'TOW_LUGGAGE'
    | 'PARACHUTE_LOCKER'
    | 'EMERGENCY_EXIT'
    | 'COCKPIT_CONTROLS';
  prompt: string;
  subPrompt?: string;
  distance: number;
  refId?: string;
}

export interface AnnouncementOption {
  id: 'BOARDING_WELCOME' | 'FASTEN_SEATBELTS' | 'TURBULENCE_WARNING' | 'LANDING_PREP';
  title: string;
  subtitle: string;
  effectDescription: string;
}

export interface PreflightChecklistState {
  luggageLoadedCount: number;
  luggageTotalCount: number;
  ticketsCheckedCount: number;
  ticketsTotalCount: number;
  hazardousCargoSecuredCount: number;
  hazardousCargoTotalCount: number;
  manifestInspected: boolean;
  mealsPreparedCount: number;
  mealsServedCount: number;
  mealsTotalOrders: number;
  cleanlinessPct: number;
  announcementsMade: string[];
  seatbeltsFastenedCount: number;
  validSeatedPassengersCount: number;
  cabinDoorClosed: boolean;
  cargoDoorClosed: boolean;
  safetyChecksComplete: boolean;
}

export interface DebriefReport {
  flightNumber: string;
  routeTitle: string;
  outcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'CRASHED';
  summaryReason: string;
  landingVerticalSpeedFpm: number;
  baseFlightReward: number;
  luggageBonus: number;
  ticketAccuracyBonus: number;
  hazardousCargoBonus: number;
  mealServiceBonus: number;
  cleanlinessBonus: number;
  incidentHandlingBonus: number;
  unsecuredPenalty: number;
  damagePenalty: number;
  totalCashEarned: number;
  xpEarned: number;
  passengerSatisfactionPct: number;
  starRating: number;
  unlockedAchievements: string[];
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  effectLabel: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
}

export interface PlayerProfile {
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

export interface PeerPlayer {
  playerId: string;
  callsign: string;
  role: CrewRole;
  mode: PlayerControlMode;
  localPosition: { x: number; y: number; z: number };
  yaw: number;
  heldLabel: string | null;
}
