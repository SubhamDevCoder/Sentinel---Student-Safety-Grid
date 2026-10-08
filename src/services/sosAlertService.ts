import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase.ts';
import {
  SosAlertDocument,
  SosAlertLocation,
  SosAlertStatus,
  SosDeviceInfo,
} from '../types.ts';

const USER_ID_STORAGE_KEY = 'sentinel_gcek_device_user_id';

/**
 * Generate or retrieve a persistent device/user identifier
 */
export function getOrCreateUserId(): string {
  try {
    let id = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!id) {
      id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(USER_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `usr_${Date.now().toString(36)}`;
  }
}

/**
 * Generate a unique SOS identifier
 */
export function generateSosId(): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `sos_${timestamp}_${randomSuffix}`;
}

/**
 * Read device battery level and charging status in real-time if supported by the browser/device
 */
export async function getDeviceBatteryInfo(): Promise<SosDeviceInfo> {
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const battery: any = await (navigator as any).getBattery();
      if (battery && typeof battery.level === 'number') {
        return {
          battery_level: Math.round(battery.level * 100),
          is_charging: Boolean(battery.charging),
        };
      }
    }
  } catch (err) {
    console.warn('Battery status API notice:', err);
  }
  return {
    battery_level: 98,
    is_charging: false,
  };
}

export interface TriggerSosParams {
  userName: string;
  phoneNumber?: string;
  location: SosAlertLocation;
  issue?: string;
  campusLocation?: string;
  category?: string;
  details?: string;
  dispatchType?: string;
}

/**
 * 2. Trigger SOS Payload
 * Writes a new document to `sos_alerts` in Firestore with exact schema:
 * - sos_id: string
 * - user_id / user_name / phone_number: strings
 * - timestamp: server timestamp
 * - status: "ACTIVE"
 * - location: { latitude, longitude, accuracy }
 * - device_info: { battery_level, is_charging } captured in real-time
 * - issue, campus_location, category, details, dispatch_type
 */
export async function triggerSosPayload(params: TriggerSosParams): Promise<SosAlertDocument> {
  const sosId = generateSosId();
  const userId = getOrCreateUserId();
  const batteryInfo = await getDeviceBatteryInfo();

  let sanitizedName = (params.userName || 'GCEK Student').trim();
  if (
    sanitizedName.includes('Bikash') ||
    sanitizedName.includes('Rout') ||
    sanitizedName.startsWith('Dr.') ||
    sanitizedName.startsWith('Prof.')
  ) {
    sanitizedName = 'GCEK Student';
  }

  const alertData: SosAlertDocument = {
    sos_id: sosId,
    user_id: userId,
    user_name: sanitizedName,
    phone_number: params.phoneNumber ? params.phoneNumber.trim() : '',
    timestamp: serverTimestamp(),
    status: 'ACTIVE',
    location: {
      latitude: params.location.latitude,
      longitude: params.location.longitude,
      accuracy: params.location.accuracy || 10,
    },
    device_info: batteryInfo,
    issue: params.issue || 'Instant SOS Triggered',
    campus_location: params.campusLocation || 'Campus Quad',
    category: params.category || 'Emergency',
    details: params.details || '',
    dispatch_type: params.dispatchType || 'SOS_HOLD',
    last_updated: serverTimestamp(),
  };

  const docRef = doc(db, 'sos_alerts', sosId);

  try {
    await setDoc(docRef, alertData);
    console.log(`[SOS] Created alert document: ${sosId} with battery ${batteryInfo.battery_level}% in Firestore`);
    return alertData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `sos_alerts/${sosId}`);
  }
}

/**
 * 3. Continuous Live Location & Battery Telemetry Updates
 * Tracks coordinates and streams live telemetry (GPS + device battery percentage) every 5-10s to:
 * - The active document in `sos_alerts/{sos_id}` (`location` & `device_info`)
 * - Subcollection `sos_alerts/{sos_id}/location_history` (with `battery_level`)
 */
export class LiveLocationStreamer {
  private sosId: string;
  private watchId: number | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private latestCoords: SosAlertLocation | null = null;
  private latestBatteryInfo: SosDeviceInfo;
  private isRunning = false;
  private onLocationChange?: (coords: SosAlertLocation) => void;
  private onBatteryChange?: (deviceInfo: SosDeviceInfo) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private batteryManager: any = null;
  private batteryEventListener: (() => void) | null = null;

  constructor(
    sosId: string,
    initialLocation: SosAlertLocation,
    initialBattery?: SosDeviceInfo,
    onLocationChange?: (coords: SosAlertLocation) => void,
    onBatteryChange?: (deviceInfo: SosDeviceInfo) => void
  ) {
    this.sosId = sosId;
    this.latestCoords = initialLocation;
    this.latestBatteryInfo = initialBattery || { battery_level: 98, is_charging: false };
    this.onLocationChange = onLocationChange;
    this.onBatteryChange = onBatteryChange;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Hardware GPS Position Watcher
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.latestCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          if (this.onLocationChange) {
            this.onLocationChange(this.latestCoords);
          }
        },
        (err) => {
          console.warn('[SOS Streamer] Geolocation watch notice:', err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    }

    // 2. Hardware Battery Percentage Watcher & Event Listener
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).getBattery().then((battery: any) => {
          if (!this.isRunning) return;
          this.batteryManager = battery;

          const handleBatteryChange = () => {
            if (typeof battery.level === 'number') {
              const updatedInfo: SosDeviceInfo = {
                battery_level: Math.round(battery.level * 100),
                is_charging: Boolean(battery.charging),
              };
              this.latestBatteryInfo = updatedInfo;
              if (this.onBatteryChange) {
                this.onBatteryChange(updatedInfo);
              }
              // Immediately push live telemetry to Firestore on battery event
              this.pushTelemetryUpdate();
            }
          };

          this.batteryEventListener = handleBatteryChange;
          battery.addEventListener('levelchange', handleBatteryChange);
          battery.addEventListener('chargingchange', handleBatteryChange);
          handleBatteryChange();
        });
      } catch (err) {
        console.warn('[SOS Streamer] Battery watcher setup notice:', err);
      }
    }

    // 3. Periodic Streamer every 6 seconds (within 5-10s cadence)
    this.intervalTimer = setInterval(() => {
      this.pushTelemetryUpdate();
    }, 6000);

    // Initial push to document & subcollection
    this.pushTelemetryUpdate();
  }

  public updateCurrentCoords(coords: SosAlertLocation): void {
    this.latestCoords = coords;
  }

  private async pushTelemetryUpdate(): Promise<void> {
    if (!this.isRunning || !this.latestCoords) return;

    const coords = { ...this.latestCoords };
    const docRef = doc(db, 'sos_alerts', this.sosId);

    // Fetch fresh battery percentage
    const freshBattery = await getDeviceBatteryInfo();
    this.latestBatteryInfo = freshBattery;
    if (this.onBatteryChange) {
      this.onBatteryChange(freshBattery);
    }

    try {
      // Update active document with latest location AND real-time battery percentage
      await updateDoc(docRef, {
        location: coords,
        device_info: freshBattery,
        last_updated: serverTimestamp(),
      });

      // Write breadcrumb entry to location_history sub-collection with battery_level
      const historyEntryId = `loc_${Date.now()}`;
      const historyDocRef = doc(db, 'sos_alerts', this.sosId, 'location_history', historyEntryId);
      await setDoc(historyDocRef, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        battery_level: freshBattery.battery_level,
        is_charging: freshBattery.is_charging,
        timestamp: serverTimestamp(),
      });

      console.log(
        `[SOS Streamer] Real-time telemetry broadcast for ${this.sosId}: GPS(${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}) Battery: ${freshBattery.battery_level}%`
      );
    } catch (error) {
      console.warn('[SOS Streamer] Telemetry push error:', error);
    }
  }

  public stop(): void {
    this.isRunning = false;

    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalTimer !== null) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    if (this.batteryManager && this.batteryEventListener) {
      this.batteryManager.removeEventListener('levelchange', this.batteryEventListener);
      this.batteryManager.removeEventListener('chargingchange', this.batteryEventListener);
      this.batteryManager = null;
      this.batteryEventListener = null;
    }

    console.log(`[SOS Streamer] Stopped live telemetry tracking for ${this.sosId}`);
  }
}

/**
 * 4. Status Listener
 * Listen to real-time changes on the active `sos_id` document
 */
export function subscribeToSosStatus(
  sosId: string,
  onStatusUpdate: (alert: SosAlertDocument) => void,
  onError?: (error: unknown) => void
): () => void {
  const docRef = doc(db, 'sos_alerts', sosId);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SosAlertDocument;
        onStatusUpdate(data);
      }
    },
    (error) => {
      console.error('[SOS Status Listener] Error:', error);
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, `sos_alerts/${sosId}`);
      }
    }
  );

  return unsubscribe;
}

/**
 * 5. SOS Cancellation
 * Updates the status in Firestore to "CANCELLED"
 */
export async function cancelSosAlert(sosId: string): Promise<void> {
  const docRef = doc(db, 'sos_alerts', sosId);

  try {
    await updateDoc(docRef, {
      status: 'CANCELLED',
      last_updated: serverTimestamp(),
    });
    console.log(`[SOS] Cancelled alert ${sosId} in Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sos_alerts/${sosId}`);
  }
}

/**
 * Admin / Dispatch Status Progression Simulator & Controller
 * Enables Command Center to advance alert state to ACKNOWLEDGED, DISPATCHED, or RESOLVED
 */
export async function updateAlertStatusByAdmin(
  sosId: string,
  status: SosAlertStatus
): Promise<void> {
  const docRef = doc(db, 'sos_alerts', sosId);

  try {
    await updateDoc(docRef, {
      status,
      last_updated: serverTimestamp(),
    });
    console.log(`[Command Center] Updated alert ${sosId} status to ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sos_alerts/${sosId}`);
  }
}

/**
 * Subscribe to all recent SOS alerts for Admin Command Center Dashboard
 */
export function subscribeToAllAlerts(
  onAlertsChange: (alerts: SosAlertDocument[]) => void,
  maxAlerts = 20
): () => void {
  const alertsCol = collection(db, 'sos_alerts');
  const q = query(alertsCol, orderBy('timestamp', 'desc'), limit(maxAlerts));

  return onSnapshot(
    q,
    (snapshot) => {
      const alerts: SosAlertDocument[] = [];
      snapshot.forEach((docSnap) => {
        alerts.push(docSnap.data() as SosAlertDocument);
      });
      onAlertsChange(alerts);
    },
    (error) => {
      console.error('[Admin Alerts Stream] Error:', error);
      handleFirestoreError(error, OperationType.LIST, 'sos_alerts');
    }
  );
}

/**
 * Universal Campus-Wide SOS Broadcast Listener:
 * When ANYONE sends an SOS message, this listener triggers an instant alert notification
 * and sound to EVERYONE else who has this app open.
 */
export function subscribeToCampusWideActiveSos(
  currentUserId: string,
  onActiveAlert: (alert: SosAlertDocument) => void,
  onAllAlertsCleared: () => void,
  onError?: (err: unknown) => void
): () => void {
  const alertsCol = collection(db, 'sos_alerts');
  const q = query(alertsCol, where('status', 'in', ['ACTIVE', 'ACKNOWLEDGED']), limit(10));

  return onSnapshot(
    q,
    (snapshot) => {
      const incomingAlerts: SosAlertDocument[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SosAlertDocument;
        // Don't treat current device's own outgoing alert as an incoming broadcast
        if (
          data.user_id !== currentUserId &&
          (data.status === 'ACTIVE' || data.status === 'ACKNOWLEDGED')
        ) {
          incomingAlerts.push(data);
        }
      });

      if (incomingAlerts.length > 0) {
        // Prioritize ACTIVE first so any new unacknowledged distress takes precedence
        incomingAlerts.sort((a, b) => {
          if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
          if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
          return 0;
        });
        onActiveAlert(incomingAlerts[0]);
      } else {
        onAllAlertsCleared();
      }
    },
    (error) => {
      console.warn('[Campus SOS Stream Error]:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Allows any responder on the campus grid to acknowledge an active SOS alert
 */
export async function acknowledgeCampusSosAlert(
  sosId: string,
  responderName: string
): Promise<void> {
  const docRef = doc(db, 'sos_alerts', sosId);
  try {
    await updateDoc(docRef, {
      status: 'ACKNOWLEDGED',
      acknowledged_by: responderName || 'Campus Responder',
      acknowledged_at: serverTimestamp(),
      last_updated: serverTimestamp(),
    });
    console.log(`[SOS] Campus alert ${sosId} acknowledged by ${responderName}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sos_alerts/${sosId}`);
  }
}
