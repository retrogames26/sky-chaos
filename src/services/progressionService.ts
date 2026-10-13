import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { DebriefReport, PlayerProfile } from '../types/game';

const LOCAL_STORAGE_KEY = 'sky_chaos_pilot_profile_v1';

const DEFAULT_PROFILE: PlayerProfile = {
  uid: 'pilot_local_01',
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

class ProgressionService {
  private firebaseApp: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private isFirebaseConfigured = false;

  constructor() {
    this.initFirebaseIfConfigured();
  }

  private initFirebaseIfConfigured() {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (apiKey && projectId && apiKey.length > 5) {
      try {
        this.firebaseApp = initializeApp({
          apiKey,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
          projectId,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
        });
        this.auth = getAuth(this.firebaseApp);
        this.db = getFirestore(this.firebaseApp);
        this.isFirebaseConfigured = true;
      } catch {
        this.isFirebaseConfigured = false;
      }
    }
  }

  public getFirebaseStatusMessage(): { configured: boolean; message: string } {
    if (this.isFirebaseConfigured) {
      return {
        configured: true,
        message: 'Connected to Firebase Auth & Cloud Firestore + Server Reward Validator',
      };
    }
    return {
      configured: false,
      message:
        'Local Development Mode Active (Authoritative Express API + Local Storage). Set VITE_FIREBASE_* in .env to enable Cloud Firestore sync.',
    };
  }

  public async loadProfile(): Promise<PlayerProfile> {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const serverProfile = (await res.json()) as PlayerProfile;
        if (this.isFirebaseConfigured && this.auth && this.db) {
          const cred = await signInAnonymously(this.auth);
          const ref = doc(this.db, 'pilot_profiles', cred.user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const cloudData = snap.data() as PlayerProfile;
            return { ...cloudData, authMode: 'FIREBASE' };
          } else {
            const initialized: PlayerProfile = {
              ...serverProfile,
              uid: cred.user.uid,
              authMode: 'FIREBASE',
            };
            await setDoc(ref, initialized);
            return initialized;
          }
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverProfile));
        return serverProfile;
      }
    } catch {
      // ignore
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as PlayerProfile;
      } catch {
        // ignore
      }
    }
    return { ...DEFAULT_PROFILE };
  }

  public async updateCallsign(callsign: string): Promise<PlayerProfile> {
    const clean = callsign.trim().slice(0, 24) || 'CAPT. CHAOS';
    try {
      const res = await fetch('/api/profile/callsign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign: clean }),
      });
      if (res.ok) {
        const updated = (await res.json()) as PlayerProfile;
        await this.syncToCloudAndLocal(updated);
        return updated;
      }
    } catch {
      // fallback
    }
    const current = await this.loadProfile();
    const updated = { ...current, callsign: clean };
    await this.syncToCloudAndLocal(updated);
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
    try {
      const res = await fetch('/api/flight-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { profile: PlayerProfile; report: DebriefReport };
        await this.syncToCloudAndLocal(data.profile);
        return data;
      }
    } catch {
      // Fallback
    }

    const current = await this.loadProfile();
    const baseFlightReward = payload.outcome === 'CRASHED' ? 150 : 1200;
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

    const updatedProfile: PlayerProfile = {
      ...current,
      cash: current.cash + totalCashEarned,
      xp: newXp,
      level: newLevel,
      flightsCompleted,
      avgRating,
      unlockedAchievements: newAchievements,
    };

    await this.syncToCloudAndLocal(updatedProfile);

    const report: DebriefReport = {
      flightNumber: 'SC-101',
      routeTitle: 'Metro Chaos Intl → Destination',
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

    return { profile: updatedProfile, report };
  }

  public async purchaseUpgrade(upgradeId: string, cost: number): Promise<PlayerProfile> {
    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgradeId }),
      });
      if (res.ok) {
        const updated = (await res.json()) as PlayerProfile;
        await this.syncToCloudAndLocal(updated);
        return updated;
      }
    } catch {
      // fallback
    }

    const current = await this.loadProfile();
    if (current.unlockedUpgrades.includes(upgradeId) || current.cash < cost) {
      return current;
    }
    const updated: PlayerProfile = {
      ...current,
      cash: current.cash - cost,
      unlockedUpgrades: [...current.unlockedUpgrades, upgradeId],
    };
    await this.syncToCloudAndLocal(updated);
    return updated;
  }

  private async syncToCloudAndLocal(profile: PlayerProfile) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    if (this.isFirebaseConfigured && this.db && profile.uid) {
      try {
        await setDoc(doc(this.db, 'pilot_profiles', profile.uid), {
          ...profile,
          authMode: 'FIREBASE',
        });
      } catch {
        // ignore
      }
    }
  }
}

export const progressionService = new ProgressionService();
