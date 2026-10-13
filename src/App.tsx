import React, { useEffect, useRef, useState } from 'react';
import {
  AnnouncementOption,
  CrewRole,
  DebriefReport,
  FlightRoute,
  MealType,
  PlayerProfile,
} from './types/game';
import { FLIGHT_ROUTES } from './game/GameCatalog';
import { GameEngine, GameUIStateSnapshot } from './game/GameEngine';
import { FlightHUD } from './components/FlightHUD';
import { ModalsAndMenus } from './components/ModalsAndMenus';
import { progressionService } from './services/progressionService';
import { soundEngine } from './services/SoundEngine';
import { multiplayerClient } from './services/multiplayerClient';

export function App() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [currentRoute, setCurrentRoute] = useState<FlightRoute>(FLIGHT_ROUTES[0]);
  const [profile, setProfile] = useState<PlayerProfile>({
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
  });
  const [uiSnapshot, setUiSnapshot] = useState<GameUIStateSnapshot | null>(null);
  const [activeModal, setActiveModal] = useState<'NONE' | 'BRIEFING' | 'PAUSE'>('NONE');
  const [debriefReport, setDebriefReport] = useState<DebriefReport | null>(null);
  const [volume, setVolume] = useState<number>(0.65);
  const [muted, setMuted] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>('SKY-101');
  const [crewRole, setCrewRole] = useState<CrewRole>('PILOT');

  useEffect(() => {
    progressionService.loadProfile().then((loaded) => {
      setProfile(loaded);
      multiplayerClient.connect('SKY-101', loaded.callsign, 'PILOT');
    });
  }, []);

  useEffect(() => {
    if (!viewportRef.current) return;

    const engine = new GameEngine(
      viewportRef.current,
      currentRoute,
      profile.unlockedUpgrades,
      (snapshot) => {
        setUiSnapshot(snapshot);
      },
      async (outcome) => {
        if (!engineRef.current) return;
        const metrics = engineRef.current.getFlightSummaryMetrics();
        const result = await progressionService.submitFlightResult({
          ...metrics,
          outcome,
        });
        setProfile(result.profile);
        setDebriefReport(result.report);
      }
    );

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleOpenModal = (
    modal: 'MANIFEST' | 'ANNOUNCEMENT' | 'GALLEY' | 'BRIEFING' | 'PAUSE'
  ) => {
    if (!engineRef.current) return;
    if (modal === 'MANIFEST' || modal === 'ANNOUNCEMENT' || modal === 'GALLEY') {
      setActiveModal('NONE');
      engineRef.current.openModal(modal);
    } else {
      engineRef.current.closeModals();
      engineRef.current.releasePointerLock();
      setActiveModal(modal);
    }
  };

  const handleCloseAllModals = () => {
    setActiveModal('NONE');
    engineRef.current?.closeModals();
  };

  const handleSelectRoute = (newRoute: FlightRoute) => {
    setCurrentRoute(newRoute);
    setDebriefReport(null);
    engineRef.current?.resetScenario(newRoute);
  };

  const handlePurchaseUpgrade = async (upgradeId: string, cost: number) => {
    const updated = await progressionService.purchaseUpgrade(upgradeId, cost);
    setProfile(updated);
    soundEngine.playTaskSuccess();
  };

  const handleUpdateCallsign = async (callsign: string) => {
    const updated = await progressionService.updateCallsign(callsign);
    setProfile(updated);
    multiplayerClient.connect(roomCode, updated.callsign, crewRole);
    soundEngine.playTaskSuccess();
  };

  const handleJoinMultiplayerRoom = (room: string, role: CrewRole) => {
    setRoomCode(room);
    setCrewRole(role);
    multiplayerClient.connect(room, profile.callsign, role);
    soundEngine.playTaskSuccess();
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    soundEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  const handleGoogleSignIn = async () => {
    try {
      const updated = await progressionService.signInGoogle();
      setProfile(updated);
      soundEngine.playTaskSuccess();
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await progressionService.signOut();
      const local = progressionService.getLocalProfile();
      setProfile(local);
      soundEngine.playPaChime();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 select-none">
      <div
        ref={viewportRef}
        className="h-full w-full cursor-crosshair"
        aria-label="Sky Chaos 3D Airport and Aircraft Viewport"
      />

      {uiSnapshot && (
        <FlightHUD
          ui={uiSnapshot}
          route={currentRoute}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenModal={handleOpenModal}
          onQuickDoorAndEngines={() => engineRef.current?.quickCloseDoorAndStartEngines()}
          onQuickLineupRunway={() => engineRef.current?.quickLineupOnRunway()}
          onExitPilotSeat={() => engineRef.current?.exitPilotSeat()}
          onResetScenario={() => {
            setDebriefReport(null);
            engineRef.current?.resetScenario(currentRoute);
          }}
          onRequestPointerLock={() => engineRef.current?.requestPointerLock()}
        />
      )}

      {uiSnapshot && (
        <ModalsAndMenus
          ui={uiSnapshot}
          route={currentRoute}
          profile={profile}
          firebaseStatus={progressionService.getFirebaseStatusMessage()}
          activeModal={activeModal}
          debriefReport={debriefReport}
          volume={volume}
          muted={muted}
          roomCode={roomCode}
          crewRole={crewRole}
          onCloseAllModals={handleCloseAllModals}
          onTicketDecision={(paxId, decision) =>
            engineRef.current?.submitTicketDecision(paxId, decision)
          }
          onPrepareMeal={(meal: MealType) => engineRef.current?.prepareMealInGalley(meal)}
          onMakeAnnouncement={(id: AnnouncementOption['id']) =>
            engineRef.current?.makeAnnouncement(id)
          }
          onSelectRoute={handleSelectRoute}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          onUpdateCallsign={handleUpdateCallsign}
          onJoinMultiplayerRoom={handleJoinMultiplayerRoom}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onDismissDebrief={() => {
            setDebriefReport(null);
            engineRef.current?.resetScenario(currentRoute);
          }}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
        />
      )}
    </main>
  );
}

export default App;
