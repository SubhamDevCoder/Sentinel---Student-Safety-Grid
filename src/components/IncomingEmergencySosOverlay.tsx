import React, { useState, useEffect } from 'react';
import { SosAlertDocument } from '../types.ts';
import { ScrewHead } from './ScrewHead.tsx';
import {
  ShieldAlert,
  Phone,
  MapPin,
  ExternalLink,
  Volume2,
  VolumeX,
  Battery,
  Radio,
  Clock,
  CheckCircle,
  X,
  Navigation,
  Copy,
  Check,
  AlertTriangle,
  Activity,
  Flame,
  UserX,
  Stethoscope,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface IncomingEmergencySosOverlayProps {
  alert: SosAlertDocument;
  currentUserName: string;
  onAcknowledge: (sosId: string, responderName: string) => Promise<void>;
  onDismiss: () => void;
}

function getEmergencyProtocol(issueText: string, categoryText?: string) {
  const text = `${issueText} ${categoryText || ''}`.toLowerCase();
  if (
    text.includes('medic') ||
    text.includes('breath') ||
    text.includes('unconscious') ||
    text.includes('bleed') ||
    text.includes('heart') ||
    text.includes('asthma') ||
    text.includes('injury')
  ) {
    return {
      category: 'Medical Emergency',
      color: 'bg-red-500/15 text-red-700 border-red-500/40',
      icon: Stethoscope,
      protocol:
        'Keep patient calm. Do not move if spinal or neck trauma is suspected. Check airway and breathing. If bleeding, apply firm pressure with a clean cloth. Call Campus Dispensary or Ambulance (108).',
      emergencyPhone: '108',
      emergencyLabel: 'Ambulance (108)',
    };
  }
  if (
    text.includes('threat') ||
    text.includes('ragging') ||
    text.includes('fight') ||
    text.includes('harass') ||
    text.includes('bully')
  ) {
    return {
      category: 'Physical Threat / Ragging',
      color: 'bg-amber-500/15 text-amber-800 border-amber-500/40',
      icon: UserX,
      protocol:
        'Do NOT confront aggressors alone. Approach location in a group of 3+ students or guards. Alert Hostel Warden, Anti-Ragging Squad, and Proctor immediately.',
      emergencyPhone: '9439112233',
      emergencyLabel: 'Campus Security (+91 9439112233)',
    };
  }
  if (text.includes('fire') || text.includes('smoke') || text.includes('burn')) {
    return {
      category: 'Fire Hazard',
      color: 'bg-orange-500/15 text-orange-700 border-orange-500/40',
      icon: Flame,
      protocol:
        'Sound the building alarm. Evacuate through designated emergency stairs—NEVER use lifts. Guide nearby students toward the Open Sports Ground Assembly Point.',
      emergencyPhone: '101',
      emergencyLabel: 'Fire Services (101)',
    };
  }
  if (
    text.includes('accident') ||
    text.includes('bike') ||
    text.includes('crash') ||
    text.includes('fall')
  ) {
    return {
      category: 'Road / Campus Accident',
      color: 'bg-yellow-500/15 text-yellow-800 border-yellow-500/40',
      icon: AlertTriangle,
      protocol:
        'Divert ongoing vehicular traffic around the scene. Check responsiveness. Do not forcefully remove two-wheeler helmet if neck injury is suspected. Call 108.',
      emergencyPhone: '108',
      emergencyLabel: 'Ambulance (108)',
    };
  }
  if (
    text.includes('suspicious') ||
    text.includes('stranger') ||
    text.includes('theft') ||
    text.includes('intruder')
  ) {
    return {
      category: 'Suspicious Activity',
      color: 'bg-purple-500/15 text-purple-700 border-purple-500/40',
      icon: Activity,
      protocol:
        'Maintain a safe distance. Note physical appearance and direction of movement. Notify Main Gate 1 Security checkpoint to seal campus exits.',
      emergencyPhone: '9439112233',
      emergencyLabel: 'Main Gate Security (+91 9439112233)',
    };
  }
  return {
    category: 'Urgent Campus Distress',
    color: 'bg-rose-500/15 text-rose-700 border-rose-500/40',
    icon: ShieldAlert,
    protocol:
      'Contact the student directly via phone to assess safety status. Proceed directly to the reported campus landmark or GPS coordinates with assistance.',
    emergencyPhone: '9439112233',
    emergencyLabel: 'Campus Security (+91 9439112233)',
  };
}

export const IncomingEmergencySosOverlay: React.FC<IncomingEmergencySosOverlayProps> = ({
  alert,
  currentUserName,
  onAcknowledge,
  onDismiss,
}) => {
  const isInitiallyAcknowledged = alert.status === 'ACKNOWLEDGED';
  const [isMuted, setIsMuted] = useState(isInitiallyAcknowledged);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  // Default to showing full dossier if already acknowledged, or when user acknowledges
  const [showFullDossier, setShowFullDossier] = useState(isInitiallyAcknowledged);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showBackupContacts, setShowBackupContacts] = useState(false);

  // Siren audio handling
  useEffect(() => {
    // Only play siren if alert is ACTIVE and not muted
    if (!isMuted && alert.status === 'ACTIVE') {
      soundManager.startEmergencyBroadcastSiren();
    } else {
      soundManager.stopEmergencyBroadcastSiren();
    }

    return () => {
      soundManager.stopEmergencyBroadcastSiren();
    };
  }, [isMuted, alert.status]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMute = () => {
    soundManager.playClickTick();
    setIsMuted((prev) => !prev);
  };

  /**
   * Primary Acknowledgment Workflow:
   * 1. Updates Firestore status to ACKNOWLEDGED with responder's name and timestamp
   * 2. Immediately reveals the full problem and all emergency information
   * 3. Stops siren and plays success chime
   */
  const handleAcknowledgeAndShowDetails = async () => {
    soundManager.playClickTick();
    setIsAcknowledging(true);
    try {
      if (alert.status !== 'ACKNOWLEDGED') {
        await onAcknowledge(alert.sos_id, currentUserName || 'Campus Responder');
      }
      soundManager.playSuccessChime();
      soundManager.stopEmergencyBroadcastSiren();
      setIsMuted(true);
      setShowFullDossier(true);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const navLink = `https://www.google.com/maps/dir/?api=1&destination=${alert.location.latitude},${alert.location.longitude}`;
  const searchMapLink = `https://www.google.com/maps/search/?api=1&query=${alert.location.latitude},${alert.location.longitude}`;

  const protocolData = getEmergencyProtocol(alert.issue || '', alert.category);
  const CategoryIcon = protocolData.icon;

  const handleCopySummary = () => {
    soundManager.playClickTick();
    const summaryText = `🚨 GCEK CAMPUS SOS INCIDENT DOSSIER
Caller: ${alert.user_name || 'GCEK Student'}
Mobile: ${alert.phone_number || 'Not provided'}
PROBLEM: ${alert.issue || 'Emergency'}
Category: ${alert.category || protocolData.category}
Location: ${alert.campus_location || 'Campus Quad'}
GPS: ${alert.location.latitude.toFixed(5)}, ${alert.location.longitude.toFixed(5)} (±${alert.location.accuracy?.toFixed(0) ?? 10}m)
Navigation: ${navLink}
Device Battery: ${alert.device_info?.battery_level ?? 98}%
Status: ${alert.status} (Acknowledged by ${alert.acknowledged_by || currentUserName})`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText).then(() => {
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 2500);
      });
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Campus Emergency SOS Alert"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl my-auto neu-card rounded-2xl p-4 sm:p-6 border-2 border-red-500 shadow-[0_0_50px_rgba(255,71,87,0.55)] overflow-hidden">
        {/* Hardware Corner Screws */}
        <div className="absolute top-3 left-3">
          <ScrewHead rotation="default" />
        </div>
        <div className="absolute top-3 right-3">
          <ScrewHead rotation="alt" />
        </div>
        <div className="absolute bottom-3 left-3">
          <ScrewHead rotation="alt2" />
        </div>
        <div className="absolute bottom-3 right-3">
          <ScrewHead rotation="default" />
        </div>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-3 border-b border-red-500/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-4 w-4">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  alert.status === 'ACKNOWLEDGED' ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-4 w-4 ${
                  alert.status === 'ACKNOWLEDGED' ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-bold text-red-600 tracking-wider uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                {alert.status === 'ACKNOWLEDGED'
                  ? 'SOS ACKNOWLEDGED — RESPONSE IN PROGRESS'
                  : 'CAMPUS EMERGENCY SOS BROADCAST'}
              </h2>
              <span className="text-[10px] font-mono text-[#4a5568]">
                {alert.status === 'ACKNOWLEDGED'
                  ? `Acknowledged by ${alert.acknowledged_by || currentUserName} • Help On The Way`
                  : 'Broadcast to everyone with this app'}
              </span>
            </div>
          </div>

          {/* Sound Mute Toggle & Dismiss */}
          <div className="flex items-center gap-1.5">
            {alert.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={toggleMute}
                className={`p-2 rounded-xl neu-button text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  isMuted ? 'text-[#8c96a8]' : 'text-red-600 animate-pulse'
                }`}
                title={isMuted ? 'Unmute Siren' : 'Mute Siren'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isMuted ? 'UNMUTE' : 'MUTE'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundManager.stopEmergencyBroadcastSiren();
                onDismiss();
              }}
              className="p-2 rounded-xl neu-button text-[#4a5568] hover:text-[#2d3436] cursor-pointer"
              title="Close / Minimize to Top Banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Callout Banner */}
        <div
          className={`p-3 rounded-xl mb-4 font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] ${
            alert.status === 'ACKNOWLEDGED'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'
              : 'bg-gradient-to-r from-red-600 to-rose-700 text-white'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase mb-1">
            <span className="flex items-center gap-1.5">
              {alert.status === 'ACKNOWLEDGED' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-200" />
                  HELP TRANSMITTED TO STUDENT
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse" />
                  ACTIVE STUDENT DISTRESS SIGNAL
                </>
              )}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-white/90">
              <Clock className="w-3.5 h-3.5" /> {elapsedSeconds}s ago
            </span>
          </div>
          <p className="text-xs leading-relaxed text-white/95">
            {alert.status === 'ACKNOWLEDGED'
              ? `You or a fellow campus responder acknowledged this distress call. The student's screen is now updating with "HELP IS ON THE WAY!". Review the complete problem and information below.`
              : `A fellow GCEK student needs immediate help. Tap "ACKNOWLEDGE & VIEW DETAILS" below to notify the student that help is coming and see all problem information.`}
          </p>
        </div>

        {/* PRIMARY PROBLEM CARD (WHAT IS THE PROBLEM) */}
        <div className="neu-recessed p-3.5 rounded-xl border-l-4 border-l-red-500 mb-3.5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[10px] font-mono font-bold text-[#8c96a8] uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              WHAT IS THE PROBLEM?
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${protocolData.color}`}
            >
              <CategoryIcon className="w-3 h-3" />
              {alert.category || protocolData.category}
            </span>
          </div>

          {/* Main Problem Statement */}
          <div className="text-base sm:text-lg font-bold font-mono text-red-600 leading-snug break-words">
            {alert.issue || 'Instant Emergency SOS'}
          </div>

          {/* Additional details if provided by the user */}
          {alert.details && alert.details !== alert.issue && (
            <div className="bg-white/60 p-2.5 rounded-lg border border-[#d1d9e6] text-xs font-mono text-[#2d3436]">
              <span className="text-[10px] text-[#8c96a8] font-bold block mb-0.5 uppercase">
                Additional Problem Details:
              </span>
              <p className="leading-relaxed">{alert.details}</p>
            </div>
          )}

          {/* Protocol & First-Aid Instruction */}
          <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30 text-[11px] font-mono text-amber-900 leading-normal">
            <span className="font-bold block mb-0.5 text-amber-800">
              RECOMMENDED IMMEDIATE PROTOCOL:
            </span>
            {protocolData.protocol}
          </div>
        </div>

        {/* Primary Acknowledge Button Bar (if not yet acknowledged) */}
        {alert.status !== 'ACKNOWLEDGED' && (
          <div className="mb-4">
            <button
              type="button"
              disabled={isAcknowledging}
              onClick={handleAcknowledgeAndShowDetails}
              className="w-full py-3.5 px-5 rounded-xl font-mono font-bold text-sm bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
            >
              <CheckCircle className="w-5 h-5 animate-pulse text-amber-200" />
              <span>
                {isAcknowledging
                  ? 'TRANSMITTING ACKNOWLEDGMENT...'
                  : '👉 CLICK TO ACKNOWLEDGE & VIEW ALL INFORMATION'}
              </span>
            </button>
          </div>
        )}

        {/* FULL EMERGENCY INFORMATION DOSSIER (Visible when acknowledged or toggled) */}
        <div className="space-y-3 font-mono text-xs mb-4">
          {/* Section: Student / Caller Telemetry */}
          <div className="neu-recessed p-3 rounded-xl flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                STUDENT CALLER / ROLL NUMBER
              </span>
              <span className="text-sm font-bold text-[#2d3436]">
                {alert.user_name || 'GCEK Student'}
              </span>
              {alert.dispatch_type && (
                <span className="text-[10px] text-[#8c96a8] block">
                  Trigger: {alert.dispatch_type}
                </span>
              )}
            </div>

            {/* One-click Call Button */}
            {alert.phone_number ? (
              <a
                href={`tel:${alert.phone_number}`}
                onClick={() => soundManager.playClickTick()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>CALL {alert.phone_number} NOW</span>
              </a>
            ) : (
              <div className="text-right">
                <span className="text-[11px] text-[#f59e0b] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 block font-semibold">
                  No mobile registered
                </span>
                <span className="text-[10px] text-[#8c96a8] block mt-0.5">
                  Locate student in person
                </span>
              </div>
            )}
          </div>

          {/* Section: Exact Location & GPS Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="neu-recessed p-3 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                CAMPUS LANDMARK / BUILDING
              </span>
              <span className="font-bold text-[#2d3436] text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="w-4 h-4 text-[#ff4757] shrink-0" />
                <span className="break-words">{alert.campus_location || 'Campus Quad'}</span>
              </span>
            </div>

            <div className="neu-recessed p-3 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                REAL-TIME GPS COORDINATES
              </span>
              <span className="font-bold text-[#2d3436] text-xs block mt-0.5">
                {alert.location.latitude.toFixed(5)}, {alert.location.longitude.toFixed(5)}
              </span>
              <span className="text-[10px] text-[#10b981] flex items-center gap-1 mt-0.5">
                <Radio className="w-3 h-3 animate-pulse" /> ±{alert.location.accuracy?.toFixed(0) ?? 10}m
                Accuracy Radius
              </span>
            </div>
          </div>

          {/* Section: Device Telemetry & Battery */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="neu-recessed p-2.5 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                STUDENT DEVICE BATTERY
              </span>
              <span className="font-bold text-[#2d3436] flex items-center gap-1 mt-0.5">
                <Battery
                  className={`w-4 h-4 ${
                    (alert.device_info?.battery_level ?? 98) < 20
                      ? 'text-red-500'
                      : 'text-[#10b981]'
                  }`}
                />
                <span>{alert.device_info?.battery_level ?? 98}%</span>
                {alert.device_info?.is_charging && (
                  <span className="text-amber-500 font-bold" title="Device is plugged in">
                    ⚡ (Charging)
                  </span>
                )}
              </span>
              {(alert.device_info?.battery_level ?? 98) < 20 && (
                <span className="text-[10px] text-red-600 block mt-0.5 font-bold">
                  ⚠️ Low Battery: Call quickly!
                </span>
              )}
            </div>

            <div className="neu-recessed p-2.5 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                RESPONSE STATUS
              </span>
              <span
                className={`font-bold flex items-center gap-1 mt-0.5 ${
                  alert.status === 'ACKNOWLEDGED' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {alert.status === 'ACKNOWLEDGED' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ACKNOWLEDGED</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                    <span>BROADCAST ACTIVE</span>
                  </>
                )}
              </span>
              {alert.acknowledged_by && (
                <span className="text-[10px] text-[#4a5568] block truncate">
                  By: {alert.acknowledged_by}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Navigation, Sharing, Backup Numbers */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#d1d9e6]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Google Maps Turn-By-Turn Route */}
            <a
              href={navLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => soundManager.playClickTick()}
              className="py-2.5 px-3 rounded-xl neu-button text-xs font-mono font-bold text-[#2d3436] hover:text-[#ff4757] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
              <span>GET DIRECTIONS (MAPS)</span>
            </a>

            {/* Copy Summary for Sharing */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="py-2.5 px-3 rounded-xl neu-button text-xs font-mono font-bold text-[#2d3436] hover:text-[#10b981] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#4a5568]" />
                  <span>COPY ALL INCIDENT INFO</span>
                </>
              )}
            </button>
          </div>

          {/* Expandable Emergency Backup Contacts */}
          <div className="neu-recessed p-2 rounded-xl">
            <button
              type="button"
              onClick={() => {
                soundManager.playClickTick();
                setShowBackupContacts((prev) => !prev);
              }}
              className="w-full flex items-center justify-between text-[11px] font-mono text-[#4a5568] font-bold p-1 cursor-pointer hover:text-[#2d3436]"
            >
              <span>ONE-TOUCH CAMPUS BACKUP AUTHORITIES</span>
              {showBackupContacts ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showBackupContacts && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-[#d1d9e6]">
                <a
                  href="tel:9439112233"
                  className="p-2 rounded-lg bg-white/70 text-[11px] font-mono font-bold text-[#2d3436] flex items-center gap-1.5 hover:bg-white"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Main Gate (9439112233)</span>
                </a>
                <a
                  href="tel:108"
                  className="p-2 rounded-lg bg-white/70 text-[11px] font-mono font-bold text-[#2d3436] flex items-center gap-1.5 hover:bg-white"
                >
                  <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Ambulance (108)</span>
                </a>
                <a
                  href="tel:112"
                  className="p-2 rounded-lg bg-white/70 text-[11px] font-mono font-bold text-[#2d3436] flex items-center gap-1.5 hover:bg-white"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Police (112)</span>
                </a>
              </div>
            )}
          </div>

          {/* Dismiss / Minimize Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-[#8c96a8]">
              Alert ID: {alert.sos_id}
            </span>

            <button
              type="button"
              onClick={() => {
                soundManager.stopEmergencyBroadcastSiren();
                onDismiss();
              }}
              className="px-4 py-2 rounded-xl neu-button text-xs font-mono font-semibold text-[#4a5568] hover:text-[#2d3436] cursor-pointer"
            >
              MINIMIZE DOSSIER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
