export type SosAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED';

export interface SosAlertLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface SosDeviceInfo {
  battery_level: number;
  is_charging?: boolean;
}

export interface SosAlertDocument {
  sos_id: string;
  user_id: string;
  user_name: string;
  phone_number: string;
  timestamp: any;
  status: SosAlertStatus;
  location: SosAlertLocation;
  device_info: SosDeviceInfo;
  issue?: string;
  campus_location?: string;
  category?: string;
  details?: string;
  dispatch_type?: string;
  last_updated?: any;
  target_faculty_phones?: string[];
  acknowledged_by?: string;
  acknowledged_at?: any;
  resolved_by?: string;
}

export interface SosLocationHistoryEntry {
  latitude: number;
  longitude: number;
  accuracy: number;
  battery_level?: number;
  is_charging?: boolean;
  timestamp: any;
}

export interface EmergencyAlertPayload {
  studentName: string;
  location: string;
  issue: string;
  lat: number | null;
  lng: number | null;
  timestamp: number;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  studentPhone?: string;
  accuracyMeters?: number | null;
  dispatchType?: 'SOS_HOLD' | 'MANUAL_DISPATCH' | 'QUICK_PRESET';
  category?: string;
  details?: string;
}

export interface ContactItem {
  id: string;
  title: string;
  name?: string;
  phone: string;
  displayPhone: string;
  category: 'admin' | 'hostel' | 'security' | 'hod';
  timing?: string;
  badge?: string;
}

export type ContactCategory = 'admin' | 'hostel' | 'security' | 'hod';

export interface GPSLocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  status: 'idle' | 'locating' | 'locked' | 'denied' | 'error';
  errorMessage?: string;
  timestamp?: number;
}

export interface AlertDispatchResult {
  success: boolean;
  firebaseKey?: string;
  timestamp: number;
  payload: EmergencyAlertPayload;
  error?: string;
}
