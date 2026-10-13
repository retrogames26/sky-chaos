import {
  AchievementDefinition,
  AnnouncementOption,
  CabinMess,
  CargoCrate,
  FlightRoute,
  LuggageItem,
  MealType,
  PassengerData,
  UpgradeDefinition,
} from '../types/game';

export const FLIGHT_ROUTES: FlightRoute[] = [
  {
    id: 'route_chaos_island',
    flightNumber: 'SC-101',
    departureCode: 'KCHA',
    departureName: 'Metro Chaos Intl',
    destinationCode: 'KISL',
    destinationName: 'Sunburn Atoll Regional',
    distanceMeters: 2200,
    baseReward: 1200,
    weatherCondition: 'Clear Skies',
    turbulenceLevel: 'Low',
    unlockedAtLevel: 1,
  },
  {
    id: 'route_frostpeak',
    flightNumber: 'SC-204',
    departureCode: 'KCHA',
    departureName: 'Metro Chaos Intl',
    destinationCode: 'KFRP',
    destinationName: 'Frostpeak Glacier Strip',
    distanceMeters: 2600,
    baseReward: 1850,
    weatherCondition: 'Crosswind & Clouds',
    turbulenceLevel: 'Moderate',
    unlockedAtLevel: 2,
  },
  {
    id: 'route_volcano',
    flightNumber: 'SC-404',
    departureCode: 'KCHA',
    departureName: 'Metro Chaos Intl',
    destinationCode: 'KVOL',
    destinationName: 'Caldera Ridge Airfield',
    distanceMeters: 3000,
    baseReward: 2600,
    weatherCondition: 'Tropical Storm',
    turbulenceLevel: 'Severe',
    unlockedAtLevel: 3,
  },
];

export const ANNOUNCEMENT_OPTIONS: AnnouncementOption[] = [
  {
    id: 'BOARDING_WELCOME',
    title: 'Welcome Aboard & Boarding Complete',
    subtitle:
      '“Ladies and gentlemen, welcome aboard Sky Chaos Airlines! Please stow your carry-ons and ignore the duct tape on the wing.”',
    effectDescription: 'Boosts passenger mood (+10%) and completes pre-flight briefing.',
  },
  {
    id: 'FASTEN_SEATBELTS',
    title: 'Fasten Seatbelts Sign On',
    subtitle:
      '“Cabin crew and passengers, the Captain has illuminated the Fasten Seatbelt sign. Please buckle up immediately.”',
    effectDescription: 'Commands all seated passengers to fasten their seatbelts.',
  },
  {
    id: 'TURBULENCE_WARNING',
    title: 'Turbulence Advisory',
    subtitle:
      '“Folks, we are entering a patch of bumpy air. Hold onto your coffee and stay seated!”',
    effectDescription: 'Prevents passenger panic and reduces tray spills during turbulence.',
  },
  {
    id: 'LANDING_PREP',
    title: 'Prepare Cabin for Landing',
    subtitle:
      '“We are on final approach. Please return tray tables to their upright position and brace for a classic Sky Chaos touchdown.”',
    effectDescription: 'Prepares cabin for final approach and landing.',
  },
];

export const UPGRADE_CATALOG: UpgradeDefinition[] = [
  {
    id: 'upg_cargo_straps',
    name: 'Kevlar Hazmat Containment Straps',
    description: 'Heavy-duty ratcheting cargo nets that reduce hazardous cargo vibration and leak chance by 50%.',
    cost: 1200,
    effectLabel: '-50% Cargo Hazard Risk',
  },
  {
    id: 'upg_turbo_galley',
    name: 'Convection Galley Speed-Ovens',
    description: 'High-wattage catering ovens that prepare passenger meal trays instantly and boost meal happiness.',
    cost: 1500,
    effectLabel: '+25% Meal Satisfaction',
  },
  {
    id: 'upg_yaw_damper',
    name: 'Gyroscopic Turbulence Damper',
    description: 'Active fly-by-wire pitch & roll stabilization that cuts turbulence shake intensity by 45%.',
    cost: 2100,
    effectLabel: '-45% Turbulence Shake',
  },
  {
    id: 'upg_oleo_struts',
    name: 'Titanium Oleo Landing Gear Struts',
    description: 'Reinforced shock-absorbing landing bogies that forgive harder touchdowns up to -850 fpm.',
    cost: 2800,
    effectLabel: '+40% Landing Gear Toughness',
  },
];

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: 'ach_first_flight',
    title: 'Certified Sky Survivor',
    description: 'Complete your first full flight from apron preparation to destination touchdown.',
    rewardXp: 250,
  },
  {
    id: 'ach_gatekeeper',
    title: 'eagle-Eyed Gatekeeper',
    description: 'Inspect every passenger ticket and accurately deny all invalid boarding passes.',
    rewardXp: 300,
  },
  {
    id: 'ach_baggage_pro',
    title: 'Zero Lost Bags',
    description: 'Load and secure all 6 passenger suitcases before departure.',
    rewardXp: 250,
  },
  {
    id: 'ach_hazmat_ace',
    title: 'High-Risk Courier',
    description: 'Load all 3 dangerous cargo crates and land with them intact.',
    rewardXp: 400,
  },
  {
    id: 'ach_spotless',
    title: 'Five-Star Sanitation',
    description: 'Scrub every spill and pick up all cabin trash to reach 100% cabin cleanliness.',
    rewardXp: 200,
  },
  {
    id: 'ach_butter_landing',
    title: 'Butter the Bread',
    description: 'Touch down on the destination runway with a vertical speed gentler than -250 fpm.',
    rewardXp: 500,
  },
  {
    id: 'ach_crisis_manager',
    title: 'Cool Under Pressure',
    description: 'Resolve an in-flight emergency incident before time runs out.',
    rewardXp: 350,
  },
];

const PASSENGER_NAMES = [
  'Arthur Pendelton',
  'Beatrice Vance',
  'Carlos Mendez',
  'Diana Sterling',
  'Eugene Krabsley',
  'Fiona Gallagher',
  'Gordon Ramsay-ish',
  'Hannah Abbott',
];

const OUTFIT_COLORS = [
  0x3b82f6, // blue
  0xec4899, // pink
  0x10b981, // emerald
  0xf59e0b, // amber
  0x8b5cf6, // violet
  0x06b6d4, // cyan
  0xef4444, // red
  0x84cc16, // lime
];

const MEAL_TYPES: MealType[] = ['Chicken', 'Pasta', 'Veggie', 'Coffee'];

export function createInitialScenario(route: FlightRoute): {
  passengers: PassengerData[];
  luggage: LuggageItem[];
  cargo: CargoCrate[];
  messes: CabinMess[];
} {
  const invalidIndices = new Set<number>([2, 6]);
  const seatCols = [
    { col: 0, letter: 'A', x: -1.22 },
    { col: 1, letter: 'B', x: -0.78 },
    { col: 2, letter: 'C', x: 0.78 },
    { col: 3, letter: 'D', x: 1.22 },
  ];

  const passengers: PassengerData[] = PASSENGER_NAMES.map((name, idx) => {
    const row = Math.floor(idx / 2) + 1;
    const colObj = seatCols[idx % 4];
    const zPos = -6.0 + (row - 1) * 2.4;
    const isValid = !invalidIndices.has(idx);

    const invalidReasons = [
      'Ticket destination reads "ATLANTIS UNDERWATER DOME" (Wrong Flight)',
      'Boarding pass written in purple crayon for Flight ZX-999 (Expired 1998)',
    ];

    return {
      id: `pax_${idx + 1}`,
      name,
      seat: `${row}${colObj.letter}`,
      seatRow: row,
      seatCol: colObj.col,
      ticketDestination: isValid ? `${route.destinationName} (${route.destinationCode})` : 'Atlantis Intl (KATL)',
      isTicketValid: isValid,
      invalidityReason: isValid ? undefined : invalidReasons[idx === 2 ? 0 : 1],
      ticketChecked: false,
      ticketDecision: null,
      boarded: true,
      seatbeltFastened: idx % 3 === 0,
      hunger: 55 + (idx * 7) % 35,
      mealOrder: MEAL_TYPES[idx % MEAL_TYPES.length],
      mealServed: false,
      happiness: 82,
      isPanicking: false,
      needsMedicalAid: false,
      outfitColor: OUTFIT_COLORS[idx % OUTFIT_COLORS.length],
      position: { x: colObj.x, y: 1.65, z: zPos },
    };
  });

  const luggageColors = [0xe11d48, 0x2563eb, 0xd97706, 0x059669, 0x7c3aed, 0x0891b2];
  const luggage: LuggageItem[] = luggageColors.map((color, idx) => ({
    id: `bag_${idx + 1}`,
    ownerName: PASSENGER_NAMES[idx],
    color,
    state: 'ON_CART',
    position: {
      x: -5.8 + (idx % 2) * 0.75,
      y: 0.65,
      z: -5.2 + Math.floor(idx / 2) * 0.85,
    },
    velocity: { x: 0, y: 0, z: 0 },
  }));

  const cargo: CargoCrate[] = [
    {
      id: 'cargo_1',
      code: 'HAZ-901',
      label: 'Unstable Isotopic Plasma Cell',
      hazardClass: 'CLASS 7 RADIOACTIVE / VOLATILE',
      riskDescription: 'Emits electromagnetic pulses if unstrapped during turbulence.',
      bonusReward: 450,
      manifestInspected: false,
      state: 'ON_APRON',
      integrity: 100,
      position: { x: -6.2, y: 0.45, z: 3.6 },
    },
    {
      id: 'cargo_2',
      code: 'HAZ-404',
      label: 'Pressurized Carolina Reaper Sauce Vat',
      hazardClass: 'CLASS 8 CORROSIVE CONDIMENT',
      riskDescription: 'High cabin fume hazard if dropped or jostled.',
      bonusReward: 380,
      manifestInspected: false,
      state: 'ON_APRON',
      integrity: 100,
      position: { x: -6.2, y: 0.45, z: 4.8 },
    },
    {
      id: 'cargo_3',
      code: 'HAZ-777',
      label: 'Cryo-Sealed King Durian Crate',
      hazardClass: 'CLASS 6 BIO-OLFACTORY HAZARD',
      riskDescription: 'Triggers severe passenger nausea if containment seal fails.',
      bonusReward: 420,
      manifestInspected: false,
      state: 'ON_APRON',
      integrity: 100,
      position: { x: -6.2, y: 0.45, z: 6.0 },
    },
  ];

  const messes: CabinMess[] = [
    {
      id: 'mess_1',
      type: 'SPILL',
      label: 'Spilled Orange Soda Puddle',
      cleaned: false,
      position: { x: 0.0, y: 1.66, z: -9.8 },
    },
    {
      id: 'mess_2',
      type: 'TRASH',
      label: 'Crumpled Duty-Free Bag & Pretzel Wrappers',
      cleaned: false,
      position: { x: -0.15, y: 1.66, z: -4.8 },
    },
    {
      id: 'mess_3',
      type: 'GOO',
      label: 'Mysterious Green Duty-Free Slime',
      cleaned: false,
      position: { x: 0.12, y: 1.66, z: -0.5 },
    },
    {
      id: 'mess_4',
      type: 'TRASH',
      label: 'Discarded Safety Pamphlets & Cup',
      cleaned: false,
      position: { x: -0.05, y: 1.66, z: 4.2 },
    },
  ];

  return { passengers, luggage, cargo, messes };
}
