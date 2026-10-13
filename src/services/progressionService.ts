import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  loginWithGoogle,
  logoutUser,
  onAuthStateChanged,
  OperationType,
  testFirestoreConnection,
  User,
} from './firebase';
import { DebriefReport, PlayerProfile } from '../types/game';
import { FLIGHT_ROUTES } from '../game/GameCatalog';

const LOCAL_STORAGE_KEY = 'sky_chaos_pilot_profile_v1';

function profileStorageKey(uid?: string): string {
  return uid ? `${LOCAL_STORAGE_KEY}_${uid}` : LOCAL_STORAGE_KEY;
}

const DEFAULT_PROFILE: PlayerProfile = {
  uid: 'pilot_guest_01',
  callsign: 'CAPT. MAVERICK-ISH',
  cash: 1500,
  xp: 0,
  level: 1,
  flightsCompleted: 0,
  avgRating: 5.0,
  unlockedUpgrades: [],
  unlockedAchievements: [],
  authMode: 'FIREBASE',
};

class ProgressionService {
  private currentUser: User | null = null;
  private isConnected = false;
  private authReady: Promise<void>;

  constructor() {
    // Register auth immediately. Waiting for a Firestore network probe first
    // could leave the app loading a guest profile before Firebase restores the
    // signed-in session, then overwrite that player's cloud career.
    this.authReady = new Promise<void>((resolve) => {
      let firstAuthState = true;
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        try {
          if (user) await this.syncProfileForUser(user);
        } catch (error) {
          console.error('Could not restore pilot profile from Firestore:', error);
        } finally {
          if (firstAuthState) {
            firstAuthState = false;
            resolve();
          }
        }
      });
    });

    // Status is informational; it must not block authentication or profile loading.
    void testFirestoreConnection()
      .then((connected) => {
        this.isConnected = connected;
      })
      .catch(() => {
        this.isConnected = false;
      });
  }

  public getFirebaseStatusMessage(): { configured: boolean; message: string; userEmail?: string } {
    if (this.currentUser) {
      return {
        configured: true,
        message: this.isConnected
          ? `Signed in as ${this.currentUser.displayName || this.currentUser.email}. Firestore connection check passed.`
          : `Signed in as ${this.currentUser.displayName || this.currentUser.email}, but Firestore connectivity could not be confirmed.`,
        userEmail: this.currentUser.email || undefined,
      };
    }
    return {
      configured: true,
      message: this.isConnected
        ? 'Cloud Firestore connection check passed. Sign in with Google to sync pilot career across devices.'
        : 'Firebase is configured, but the Firestore connection check could not be confirmed. Guest progress is saved in this browser.',
    };
  }

  public async signInGoogle(): Promise<PlayerProfile> {
    const user = await loginWithGoogle();
    this.currentUser = user;
    return await this.syncProfileForUser(user);
  }

  public async signOut(): Promise<void> {
    await logoutUser();
    this.currentUser = null;
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  private async syncProfileForUser(user: User): Promise<PlayerProfile> {
    const docPath = `pilot_profiles/${user.uid}`;
    try {
      const snap = await getDoc(doc(db, 'pilot_profiles', user.uid));
      if (snap.exists()) {
        const cloudData = snap.data() as PlayerProfile;
        const profile: PlayerProfile = {
          ...cloudData,
          uid: user.uid,
          authMode: 'FIREBASE',
        };
        localStorage.setItem(profileStorageKey(user.uid), JSON.stringify(profile));
        return profile;
      } else {
        const currentLocal = this.getLocalProfile();
        const initialProfile: PlayerProfile = {
          ...currentLocal,
          uid: user.uid,
          callsign: user.displayName?.toUpperCase().slice(0, 20) || currentLocal.callsign,
          authMode: 'FIREBASE',
        };
        await setDoc(doc(db, 'pilot_profiles', user.uid), initialProfile);
        localStorage.setItem(profileStorageKey(user.uid), JSON.stringify(initialProfile));
        return initialProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
  }

  public getLocalProfile(): PlayerProfile {
    const raw = localStorage.getItem(profileStorageKey());
    if (raw) {
      try {
        return JSON.parse(raw) as PlayerProfile;
      } catch {
        // ignore
      }
    }
    return { ...DEFAULT_PROFILE };
  }

  public async loadProfile(): Promise<PlayerProfile> {
    await this.authReady;
    if (this.currentUser) {
      const docPath = `pilot_profiles/${this.currentUser.uid}`;
      try {
        const snap = await getDoc(doc(db, 'pilot_profiles', this.currentUser.uid));
        if (snap.exists()) {
          const cloudData = snap.data() as PlayerProfile;
          const profile = { ...cloudData, uid: this.currentUser.uid, authMode: 'FIREBASE' as const };
          localStorage.setItem(profileStorageKey(this.currentUser?.uid), JSON.stringify(profile));
          return profile;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, docPath);
      }
    }

    // Guest progression is browser-local. The server's legacy /api/profile
    // endpoint stores one global profile and would overwrite one player's
    // career with another player's data on shared deployments.
    return this.getLocalProfile();
  }

  public async updateCallsign(callsign: string): Promise<PlayerProfile> {
    const clean = callsign.trim().slice(0, 24) || 'CAPT. CHAOS';
    const current = await this.loadProfile();
    const updated = { ...current, callsign: clean };

    await this.saveProfile(updated);
    return updated;
  }

  public async submitFlightResult(payload: {
    routeId: string;
    outcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'CRASHED';
    landingVsFpm: number;
    luggageLoadedCount: number;
    luggageTotalCount: number;
    ticketsAccurateCount: number;
    ticketsTotalCount: number;
    hazardousCargoIntactCount: number;
    mealsServedCount: number;
    mealsTotalOrders: number;
    cleanlinessPct: number;
    incidentsResolvedCount: number;
    airframeHealth: number;
    passengerSatisfactionPct: number;
  }): Promise<{ profile: PlayerProfile; report: DebriefReport }> {
    let profile: PlayerProfile | null = null;
    let report: DebriefReport | null = null;

    // Compute rewards against the active player's profile below. The legacy
    // /api/flight-complete endpoint mutates a single process-wide profile,
    // which incorrectly merges guest careers across all players.
    if (!profile || !report) {
      const current = await this.loadProfile();
      const selectedRoute = FLIGHT_ROUTES.find((route) => route.id === payload.routeId);
      const baseFlightReward =
        payload.outcome === 'CRASHED' ? 150 : selectedRoute?.baseReward ?? 1200;
      const luggageBonus = payload.luggageLoadedCount * 85;
      const ticketAccuracyBonus = payload.ticketsAccurateCount * 70;
      const hazardousCargoBonus =
        payload.outcome === 'CRASHED' ? 0 : payload.hazardousCargoIntactCount * 410;
      const mealServiceBonus = payload.mealsServedCount * 65;
      const cleanlinessBonus = Math.round(payload.cleanlinessPct * 2.5);
      const incidentHandlingBonus = payload.incidentsResolvedCount * 220;
      const unsecuredPenalty = (payload.luggageTotalCount - payload.luggageLoadedCount) * 110;
      const damagePenalty = Math.round((100 - payload.airframeHealth) * 14);

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
        payload.outcome === 'CRASHED'
          ? 1.5
          : Number(
              Math.min(
                5,
                Math.max(
                  1,
                  2.5 +
                    (payload.passengerSatisfactionPct / 100) * 1.5 +
                    (payload.airframeHealth / 100) * 1.0
                )
              ).toFixed(1)
            );

      const newAchievements = [...current.unlockedAchievements];
      const newlyUnlocked: string[] = [];
      const grantAch = (id: string) => {
        if (!newAchievements.includes(id)) {
          newAchievements.push(id);
          newlyUnlocked.push(id);
        }
      };

      if (payload.outcome !== 'CRASHED') grantAch('ach_first_flight');
      if (payload.ticketsAccurateCount >= payload.ticketsTotalCount) grantAch('ach_gatekeeper');
      if (payload.luggageLoadedCount >= payload.luggageTotalCount) grantAch('ach_baggage_pro');
      if (payload.hazardousCargoIntactCount >= 3 && payload.outcome !== 'CRASHED')
        grantAch('ach_hazmat_ace');
      if (payload.cleanlinessPct >= 100) grantAch('ach_spotless');
      if (payload.outcome !== 'CRASHED' && Math.abs(payload.landingVsFpm) <= 250)
        grantAch('ach_butter_landing');
      if (payload.incidentsResolvedCount >= 1) grantAch('ach_crisis_manager');

      const newXp = current.xp + xpEarned;
      const newLevel = Math.floor(newXp / 1000) + 1;
      const flightsCompleted = current.flightsCompleted + 1;
      const avgRating = Number(
        ((current.avgRating * current.flightsCompleted + starRating) / flightsCompleted).toFixed(1)
      );

      profile = {
        ...current,
        cash: current.cash + totalCashEarned,
        xp: newXp,
        level: newLevel,
        flightsCompleted,
        avgRating,
        unlockedAchievements: newAchievements,
      };

      report = {
        flightNumber: selectedRoute?.flightNumber ?? 'SC-101',
        routeTitle: selectedRoute
          ? `${selectedRoute.departureName} → ${selectedRoute.destinationName}`
          : 'Metro Chaos Intl → Destination',
        outcome: payload.outcome,
        summaryReason:
          payload.outcome === 'SUCCESS'
            ? 'Aircraft landed safely on the destination runway and came to a full stop.'
            : payload.outcome === 'PARTIAL_SUCCESS'
            ? 'Rough touchdown recorded with minor airframe stress, but all passengers survived!'
            : 'Hard impact exceeded structural tolerances. Emergency slides deployed.',
        landingVerticalSpeedFpm: Math.round(payload.landingVsFpm),
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
        passengerSatisfactionPct: Math.round(payload.passengerSatisfactionPct),
        starRating,
        unlockedAchievements: newlyUnlocked,
      };
    }

    await this.saveProfile(profile);

    // Record Debrief Report to Firestore if user is authenticated
    if (this.currentUser) {
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const docPath = `flight_reports/${reportId}`;
      try {
        await setDoc(doc(db, 'flight_reports', reportId), {
          reportId,
          userId: this.currentUser.uid,
          routeId: payload.routeId,
          routeName: report.routeTitle.slice(0, 100),
          passengersServed: 12,
          passengerRating: report.starRating,
          cashEarned: report.totalCashEarned,
          xpEarned: report.xpEarned,
          hazardsPrevented: payload.incidentsResolvedCount,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, docPath);
      }
    }

    return { profile, report };
  }

  public async purchaseUpgrade(upgradeId: string, cost: number): Promise<PlayerProfile> {
    // Upgrade purchases must be applied to the current player's profile,
    // not the server's legacy shared profile.
    const current = await this.loadProfile();
    if (current.unlockedUpgrades.includes(upgradeId) || current.cash < cost) {
      return current;
    }
    const updated: PlayerProfile = {
      ...current,
      cash: current.cash - cost,
      unlockedUpgrades: [...current.unlockedUpgrades, upgradeId],
    };
    await this.saveProfile(updated);
    return updated;
  }

  private async saveProfile(profile: PlayerProfile) {
    localStorage.setItem(profileStorageKey(this.currentUser?.uid), JSON.stringify(profile));

    if (this.currentUser) {
      const docPath = `pilot_profiles/${this.currentUser.uid}`;
      try {
        await setDoc(doc(db, 'pilot_profiles', this.currentUser.uid), {
          uid: this.currentUser.uid,
          callsign: profile.callsign,
          cash: profile.cash,
          xp: profile.xp,
          level: profile.level,
          flightsCompleted: profile.flightsCompleted,
          avgRating: profile.avgRating,
          unlockedUpgrades: profile.unlockedUpgrades,
          unlockedAchievements: profile.unlockedAchievements,
          updatedAt: new Date().toISOString(),
          authMode: 'FIREBASE',
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    }
  }
}

export const progressionService = new ProgressionService();
