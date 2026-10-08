import { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderChassis } from './components/HeaderChassis.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { CentralSosControl } from './components/CentralSosControl.tsx';
import { ManualIncidentCard } from './components/ManualIncidentCard.tsx';
import { HelplineDirectory } from './components/HelplineDirectory.tsx';
import { DispatchConfirmationToast } from './components/DispatchConfirmationToast.tsx';
import { DispatchHistoryDrawer } from './components/DispatchHistoryDrawer.tsx';
import { ActiveSosLiveBanner } from './components/ActiveSosLiveBanner.tsx';
import { AdminCommandCenterModal } from './components/AdminCommandCenterModal.tsx';
import { useGPSLocation } from './hooks/useGPSLocation.ts';
import { transmitEmergencyAlert, getLocalAlertHistory } from './services/dispatch.ts';
import { testConnection } from './services/firebase.ts';
import {
  triggerSosPayload,
  LiveLocationStreamer,
  subscribeToSosStatus,
  cancelSosAlert,
  updateAlertStatusByAdmin,
  subscribeToCampusWideActiveSos,
  acknowledgeCampusSosAlert,
  getOrCreateUserId,
} from './services/sosAlertService.ts';
import { triggerCampusWideSosNotification } from './services/campusNotificationService.ts';
import { IncomingEmergencySosOverlay } from './components/IncomingEmergencySosOverlay.tsx';
import {
  EmergencyAlertPayload,
  AlertDispatchResult,
  SosAlertDocument,
  SosAlertStatus,
} from './types.ts';
import { History, Shield, Zap, ShieldAlert } from 'lucide-react';
import { soundManager } from './utils/audio.ts';

const STUDENT_NAME_STORAGE_KEY = 'sentinel_gcek_student_name';
const STUDENT_PHONE_STORAGE_KEY = 'sentinel_gcek_student_phone';

function getSanitizedInitialName(): string {
  try {
    const stored = localStorage.getItem(STUDENT_NAME_STORAGE_KEY);
    if (
      !stored ||
      stored.includes('Bikash') ||
      stored.includes('Rout') ||
      stored.startsWith('Dr.') ||
      stored.startsWith('Prof.') ||
      stored.includes('Faculty')
    ) {
      localStorage.setItem(STUDENT_NAME_STORAGE_KEY, 'GCEK Student');
      return 'GCEK Student';
    }
    return stored;
  } catch {
    return 'GCEK Student';
  }
}

function getSanitizedInitialPhone(): string {
  try {
    const stored = localStorage.getItem(STUDENT_PHONE_STORAGE_KEY);
    // Remove any dummy/faculty numbers from previous tests so students add their own number
    if (
      !stored ||
      stored.includes('9439112233') ||
      stored.includes('8260885808') ||
      stored.includes('9876543210') ||
      stored.includes('9437122023') ||
      stored.includes('8144063468') ||
      stored.includes('7735107003') ||
      stored.includes('8895012345') ||
      stored.includes('6372528699')
    ) {
      localStorage.removeItem(STUDENT_PHONE_STORAGE_KEY);
      return '';
    }
    return stored;
  } catch {
    return '';
  }
}

export default function App() {
  const { gpsState, fetchCoordinates } = useGPSLocation();
  const [studentName, setStudentName] = useState<string>(getSanitizedInitialName);
  const [studentPhone, setStudentPhone] = useState<string>(getSanitizedInitialPhone);

  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<SosAlertDocument | null>(null);
  const [latestDispatchResult, setLatestDispatchResult] = useState<AlertDispatchResult | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertDispatchResult[]>([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [isAdminCommandCenterOpen, setIsAdminCommandCenterOpen] = useState<boolean>(false);
  const [incomingCampusAlert, setIncomingCampusAlert] = useState<SosAlertDocument | null>(null);
  const [isOverlayMinimized, setIsOverlayMinimized] = useState<boolean>(false);

  const currentUserId = useRef<string>(getOrCreateUserId()).current;
  const locationStreamerRef = useRef<LiveLocationStreamer | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  const campusAlertsUnsubRef = useRef<(() => void) | null>(null);

  // Initialize and verify Firestore connection on app mount
  useEffect(() => {
    testConnection();
    setAlertHistory(getLocalAlertHistory());

    // Universal Campus-Wide SOS Broadcast Listener:
    // When ANYONE gives an SOS message, plays emergency sound and pushes notification to everyone who has this app
    const unsubCampus = subscribeToCampusWideActiveSos(
      currentUserId,
      (newAlert) => {
        // Only notify if not this device's own outgoing active session
        if (newAlert.sos_id !== activeAlert?.sos_id) {
          setIncomingCampusAlert(newAlert);
          if (newAlert.status === 'ACTIVE') {
            setIsOverlayMinimized(false);
            triggerCampusWideSosNotification(newAlert);
          }
        }
      },
      () => {
        setIncomingCampusAlert(null);
        setIsOverlayMinimized(false);
        soundManager.stopEmergencyBroadcastSiren();
      }
    );
    campusAlertsUnsubRef.current = unsubCampus;

    // Clean up any remaining faculty keys or residual mock numbers
    try {
      localStorage.removeItem('sentinel_gcek_faculties_directory');
      localStorage.removeItem('sentinel_gcek_user_role');

      const curName = localStorage.getItem(STUDENT_NAME_STORAGE_KEY);
      if (
        curName &&
        (curName.includes('Bikash') ||
          curName.includes('Rout') ||
          curName.startsWith('Dr.') ||
          curName.startsWith('Prof.') ||
          curName.includes('Faculty'))
      ) {
        localStorage.setItem(STUDENT_NAME_STORAGE_KEY, 'GCEK Student');
        setStudentName('GCEK Student');
      }

      const curPhone = localStorage.getItem(STUDENT_PHONE_STORAGE_KEY);
      if (
        curPhone &&
        (curPhone.includes('9439112233') ||
          curPhone.includes('8260885808') ||
          curPhone.includes('9876543210') ||
          curPhone.includes('9437122023') ||
          curPhone.includes('8144063468') ||
          curPhone.includes('7735107003') ||
          curPhone.includes('8895012345') ||
          curPhone.includes('6372528699'))
      ) {
        localStorage.removeItem(STUDENT_PHONE_STORAGE_KEY);
        setStudentPhone('');
      }
    } catch {
      // ignore
    }

    return () => {
      if (campusAlertsUnsubRef.current) {
        campusAlertsUnsubRef.current();
      }
      soundManager.stopEmergencyBroadcastSiren();
      if (locationStreamerRef.current) {
        locationStreamerRef.current.stop();
      }
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
      }
    };
  }, [activeAlert?.sos_id, currentUserId]);

  const handleUpdateStudentName = (name: string) => {
    const cleanName =
      name.includes('Bikash') || name.startsWith('Dr.') || name.startsWith('Prof.')
        ? 'GCEK Student'
        : name.trim() || 'GCEK Student';
    setStudentName(cleanName);
    try {
      localStorage.setItem(STUDENT_NAME_STORAGE_KEY, cleanName);
    } catch {
      // ignore
    }
  };

  const handleUpdateStudentPhone = (phone: string) => {
    const cleanPhone = phone.trim().replace(/[^0-9+ ]/g, '');
    setStudentPhone(cleanPhone);
    try {
      if (cleanPhone) {
        localStorage.setItem(STUDENT_PHONE_STORAGE_KEY, cleanPhone);
      } else {
        localStorage.removeItem(STUDENT_PHONE_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  /**
   * Primary Emergency Alert Trigger Flow:
   * 1. Generates unique sos_id and writes document to `sos_alerts` in Firestore
   * 2. Starts continuous live location streamer (5-10s cadence)
   * 3. Attaches status listener for ACKNOWLEDGED / DISPATCHED events
   */
  const handleDispatchAlert = useCallback(
    async (payload: EmergencyAlertPayload) => {
      setIsDispatching(true);

      const lat = payload.lat ?? gpsState.lat ?? 19.8876;
      const lng = payload.lng ?? gpsState.lng ?? 83.1234;
      const accuracy = payload.accuracyMeters ?? gpsState.accuracy ?? 10;

      try {
        // Feature 1 & 2: Trigger SOS Payload to Firestore
        const createdAlert = await triggerSosPayload({
          userName: payload.studentName,
          phoneNumber: payload.studentPhone,
          location: {
            latitude: lat,
            longitude: lng,
            accuracy,
          },
          issue: payload.issue,
          campusLocation: payload.location,
          category: payload.category,
          details: payload.details,
          dispatchType: payload.dispatchType,
        });

        setActiveAlert(createdAlert);

        // Clean up any previously running location streamer
        if (locationStreamerRef.current) {
          locationStreamerRef.current.stop();
        }
        if (statusUnsubscribeRef.current) {
          statusUnsubscribeRef.current();
        }

        // Feature 3: Continuous Live Location & Battery Telemetry Updates
        // Starts background service streaming coordinates and battery percentage to Firestore
        const streamer = new LiveLocationStreamer(
          createdAlert.sos_id,
          createdAlert.location,
          createdAlert.device_info,
          (updatedLocation) => {
            setActiveAlert((prev) => (prev ? { ...prev, location: updatedLocation } : null));
          },
          (updatedBattery) => {
            setActiveAlert((prev) => (prev ? { ...prev, device_info: updatedBattery } : null));
          }
        );
        streamer.start();
        locationStreamerRef.current = streamer;

        // Feature 4: Real-time Status Listener
        // Listens to document updates (e.g. ACKNOWLEDGED or DISPATCHED by admin/command center)
        const unsubscribe = subscribeToSosStatus(
          createdAlert.sos_id,
          (liveDoc) => {
            setActiveAlert((prev) => {
              // Trigger loud reassuring alert when Command Center acknowledges or dispatches
              if (
                (liveDoc.status === 'ACKNOWLEDGED' || liveDoc.status === 'DISPATCHED') &&
                prev?.status !== liveDoc.status
              ) {
                soundManager.playHelpOnTheWayAlert();
              } else if (liveDoc.status === 'CANCELLED' && prev?.status !== 'CANCELLED') {
                soundManager.playCancelTone();
                if (locationStreamerRef.current) {
                  locationStreamerRef.current.stop();
                  locationStreamerRef.current = null;
                }
              }
              return liveDoc;
            });
          },
          (err) => {
            console.warn('Real-time SOS status stream warning:', err);
          }
        );
        statusUnsubscribeRef.current = unsubscribe;

        // Play authoritative success chime
        soundManager.playSuccessChime();

        // Local history record
        const result: AlertDispatchResult = {
          success: true,
          firebaseKey: createdAlert.sos_id,
          timestamp: Date.now(),
          payload,
        };
        setLatestDispatchResult(result);
        setAlertHistory((prev) => [result, ...prev.slice(0, 19)]);
      } catch (error) {
        console.error('Firestore SOS dispatch error:', error);
        // Fallback resilience
        const fallbackResult = await transmitEmergencyAlert(payload);
        setLatestDispatchResult(fallbackResult);
        setAlertHistory((prev) => [fallbackResult, ...prev.slice(0, 19)]);
      } finally {
        setIsDispatching(false);
      }
    },
    [gpsState]
  );

  /**
   * SOS Cancellation
   * Updates status in Firestore to "CANCELLED" and terminates live location streaming
   */
  const handleCancelSos = useCallback(async (sosId: string) => {
    setIsCancelling(true);
    try {
      await cancelSosAlert(sosId);
      soundManager.playCancelTone();

      // Terminate background location updates
      if (locationStreamerRef.current) {
        locationStreamerRef.current.stop();
        locationStreamerRef.current = null;
      }

      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
        statusUnsubscribeRef.current = null;
      }

      setActiveAlert((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));

      // Auto dismiss cancelled card after 3.5 seconds
      setTimeout(() => {
        setActiveAlert(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to cancel SOS in Firestore:', err);
    } finally {
      setIsCancelling(false);
    }
  }, []);

  const handleSimulateAdminStatus = useCallback(async (sosId: string, status: SosAlertStatus) => {
    try {
      await updateAlertStatusByAdmin(sosId, status);
    } catch (e) {
      console.error('Simulation error:', e);
    }
  }, []);

  const handleAcknowledgeIncomingAlert = useCallback(
    async (sosId: string, responderName: string) => {
      try {
        await acknowledgeCampusSosAlert(sosId, responderName);
        setIncomingCampusAlert((prev) => (prev ? { ...prev, status: 'ACKNOWLEDGED' } : null));
      } catch (e) {
        console.error('Error acknowledging incoming alert:', e);
      }
    },
    []
  );

  const handleDismissIncomingAlert = useCallback(() => {
    soundManager.stopEmergencyBroadcastSiren();
    setIsOverlayMinimized(true);
  }, []);

  return (
    <main className="min-h-screen bg-[#e0e5ec] chassis-texture text-[#2d3436] p-3 sm:p-5 md:p-8 flex flex-col justify-between relative">
      {/* Universal Campus-Wide Emergency SOS Notification Overlay */}
      {incomingCampusAlert && !isOverlayMinimized && (
        <IncomingEmergencySosOverlay
          alert={incomingCampusAlert}
          currentUserName={studentName}
          onAcknowledge={handleAcknowledgeIncomingAlert}
          onDismiss={handleDismissIncomingAlert}
        />
      )}

      {/* Sticky High-Priority Banner when Dossier is Minimized */}
      {incomingCampusAlert && isOverlayMinimized && (
        <div className="w-full max-w-md md:max-w-xl mx-auto mb-3 bg-red-600 text-white rounded-xl p-3 flex items-center justify-between shadow-lg animate-pulse font-mono text-xs border border-red-400">
          <div className="flex items-center gap-2 truncate pr-2">
            <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="truncate">
              <span className="font-bold uppercase block sm:inline">
                {incomingCampusAlert.status === 'ACKNOWLEDGED'
                  ? 'RESPONDING TO SOS:'
                  : 'ACTIVE SOS DISTRESS:'}
              </span>{' '}
              <span className="truncate">
                {incomingCampusAlert.user_name} — {incomingCampusAlert.issue}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClickTick();
              setIsOverlayMinimized(false);
            }}
            className="px-3 py-1.5 bg-white text-red-600 rounded-lg font-bold text-xs shrink-0 hover:bg-red-50 cursor-pointer shadow"
          >
            VIEW PROBLEM & INFO
          </button>
        </div>
      )}

      <div className="w-full max-w-md md:max-w-xl mx-auto">
        {/* Hardware Header Chassis */}
        <HeaderChassis
          gpsState={gpsState}
          studentName={studentName}
          studentPhone={studentPhone}
          onUpdateStudentName={handleUpdateStudentName}
          onUpdateStudentPhone={handleUpdateStudentPhone}
          onTriggerGPSManualRefresh={fetchCoordinates}
        />

        {/* Mobile PWA Install Card */}
        <PWAInstallButton variant="banner" />

        {/* Active SOS Live Monitoring & Real-time Status Card */}
        <ActiveSosLiveBanner
          activeAlert={activeAlert}
          onCancelSos={handleCancelSos}
          onSimulateAdminStatus={handleSimulateAdminStatus}
          isCancelling={isCancelling}
        />

        {/* Primary Central Hold SOS Control Station */}
        <CentralSosControl
          gpsState={gpsState}
          studentName={studentName}
          studentPhone={studentPhone}
          fetchCoordinates={fetchCoordinates}
          onDispatchAlert={handleDispatchAlert}
          isDispatching={isDispatching}
        />

        {/* Secondary Non-Siren Manual Incident Dispatch Card */}
        <ManualIncidentCard
          gpsState={gpsState}
          studentName={studentName}
          studentPhone={studentPhone}
          onUpdateStudentPhone={handleUpdateStudentPhone}
          fetchCoordinates={fetchCoordinates}
          onDispatchAlert={handleDispatchAlert}
          isDispatching={isDispatching}
        />

        {/* Itemized Comprehensive Emergency Helpline Directory */}
        <HelplineDirectory />

        {/* Hardware Chassis Bottom Plate */}
        <footer
          id="chassis-bottom-plate"
          className="neu-card rounded-2xl p-4 border border-white/50 text-center font-mono text-xs text-[#4a5568] space-y-2 mt-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
            <span className="flex items-center gap-1 font-bold text-[#2d3436]">
              <Shield className="w-3.5 h-3.5 text-[#ff4757]" />
              GCEK SENTINEL v2.5
            </span>

            <span className="flex items-center gap-1 text-[#10b981]">
              <Zap className="w-3 h-3" />
              FIRESTORE REAL-TIME
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClickTick();
                  setIsAdminCommandCenterOpen(true);
                }}
                className="px-2.5 py-1 rounded-md neu-button text-[#ff4757] hover:bg-red-50 font-bold cursor-pointer flex items-center gap-1"
                title="Open Security Command Center Dashboard"
              >
                <ShieldAlert className="w-3 h-3" />
                COMMAND CENTER
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClickTick();
                  setIsHistoryDrawerOpen(true);
                }}
                className="px-2.5 py-1 rounded-md neu-button text-[#2d3436] hover:text-[#ff4757] font-semibold cursor-pointer flex items-center gap-1"
              >
                <History className="w-3 h-3" />
                LOGS ({alertHistory.length})
              </button>
            </div>
          </div>

          <p className="text-[10px] text-[#8c96a8] border-t border-[#d1d9e6] pt-2">
            Government College of Engineering Kalahandi, Bandopala, Bhawanipatna, Odisha 766002
          </p>
        </footer>
      </div>

      {/* Prominent Confirmation Toast upon Alert Broadcast */}
      <DispatchConfirmationToast
        latestResult={latestDispatchResult}
        onDismiss={() => setLatestDispatchResult(null)}
      />

      {/* History Telemetry Drawer */}
      <DispatchHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={alertHistory}
      />

      {/* Admin Command Center Modal */}
      <AdminCommandCenterModal
        isOpen={isAdminCommandCenterOpen}
        onClose={() => setIsAdminCommandCenterOpen(false)}
      />
    </main>
  );
}
