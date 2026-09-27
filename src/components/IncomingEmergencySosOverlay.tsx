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
} from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface IncomingEmergencySosOverlayProps {
  alert: SosAlertDocument;
  currentUserName: string;
  onAcknowledge: (sosId: string, responderName: string) => Promise<void>;
  onDismiss: () => void;
}

export const IncomingEmergencySosOverlay: React.FC<IncomingEmergencySosOverlayProps> = ({
  alert,
  currentUserName,
  onAcknowledge,
  onDismiss,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Start sound on mount, stop on unmount or mute
  useEffect(() => {
    if (!isMuted) {
      soundManager.startEmergencyBroadcastSiren();
    } else {
      soundManager.stopEmergencyBroadcastSiren();
    }

    return () => {
      soundManager.stopEmergencyBroadcastSiren();
    };
  }, [isMuted]);

  // Elapsed timer since alert arrived
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

  const handleAcknowledge = async () => {
    soundManager.playClickTick();
    setIsAcknowledging(true);
    try {
      await onAcknowledge(alert.sos_id, currentUserName || 'Campus Responder');
      soundManager.playSuccessChime();
      soundManager.stopEmergencyBroadcastSiren();
    } finally {
      setIsAcknowledging(false);
    }
  };

  const mapLink = `https://www.google.com/maps/search/?api=1&query=${alert.location.latitude},${alert.location.longitude}`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Campus Emergency SOS Alert"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg neu-card rounded-2xl p-5 sm:p-6 border-2 border-red-500 shadow-[0_0_50px_rgba(255,71,87,0.5)] overflow-hidden">
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

        {/* Pulsing Red Emergency Beacon Strip */}
        <div className="flex items-center justify-between mb-4 border-b border-red-500/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-bold text-red-600 tracking-wider uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-red-600 animate-bounce" />
                CAMPUS EMERGENCY SOS
              </h2>
              <span className="text-[10px] font-mono text-[#4a5568]">
                BROADCAST TO ALL USERS WITH THIS APP
              </span>
            </div>
          </div>

          {/* Sound Mute Toggle & Dismiss */}
          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={() => {
                soundManager.stopEmergencyBroadcastSiren();
                onDismiss();
              }}
              className="p-2 rounded-xl neu-button text-[#4a5568] hover:text-[#2d3436] cursor-pointer"
              title="Dismiss Broadcast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-500 text-white p-3 rounded-xl mb-4 font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between text-xs font-bold uppercase mb-1">
            <span>⚠️ ACTIVE DISTRESS SIGNAL</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Clock className="w-3 h-3" /> {elapsedSeconds}s ago
            </span>
          </div>
          <p className="text-xs leading-relaxed text-red-50">
            A fellow student at GCEK needs immediate assistance. Please review their location and reach out or alert nearby security.
          </p>
        </div>

        {/* Student & Emergency Telemetry Box */}
        <div className="space-y-3 font-mono text-xs mb-5">
          {/* Caller Details & Direct Phone Button */}
          <div className="neu-recessed p-3 rounded-xl flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] text-[#8c96a8] uppercase block">CALLER NAME / ID</span>
              <span className="text-sm font-bold text-[#2d3436]">{alert.user_name || 'GCEK Student'}</span>
            </div>

            {alert.phone_number ? (
              <a
                href={`tel:${alert.phone_number}`}
                onClick={() => soundManager.playClickTick()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>CALL {alert.phone_number}</span>
              </a>
            ) : (
              <span className="text-[11px] text-[#f59e0b] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                No phone registered
              </span>
            )}
          </div>

          {/* Issue & Campus Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="neu-recessed p-2.5 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block">ISSUE</span>
              <span className="font-bold text-red-600 text-xs block truncate">
                {alert.issue || 'Instant SOS Triggered'}
              </span>
            </div>

            <div className="neu-recessed p-2.5 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block">CAMPUS LOCATION</span>
              <span className="font-bold text-[#2d3436] text-xs flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#ff4757] shrink-0" />
                <span className="truncate">{alert.campus_location || 'Campus Quad'}</span>
              </span>
            </div>
          </div>

          {/* Live Coordinates & Battery Level */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="neu-recessed p-2.5 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block">STREAMING GPS</span>
              <span className="font-bold text-[#2d3436] block">
                {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
              </span>
              <span className="text-[10px] text-[#10b981] flex items-center gap-1 mt-0.5">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> ±{alert.location.accuracy?.toFixed(0) ?? 10}m
              </span>
            </div>

            <div className="neu-recessed p-2.5 rounded-xl">
              <span className="text-[10px] text-[#8c96a8] uppercase block">DEVICE BATTERY</span>
              <span className="font-bold text-[#2d3436] flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-[#10b981]" />
                {alert.device_info?.battery_level ?? 98}%
                {alert.device_info?.is_charging && <span className="text-amber-500 font-bold">⚡</span>}
              </span>
              <span className="text-[10px] text-[#4a5568]">Live Telemetry</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-[#d1d9e6]">
          {/* External Google Maps Button */}
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundManager.playClickTick()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl neu-button text-xs font-mono font-bold text-[#2d3436] hover:text-[#ff4757] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>OPEN MAP</span>
          </a>

          {/* Acknowledge Button */}
          <button
            type="button"
            disabled={isAcknowledging || alert.status === 'ACKNOWLEDGED'}
            onClick={handleAcknowledge}
            className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              alert.status === 'ACKNOWLEDGED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md hover:opacity-95'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {alert.status === 'ACKNOWLEDGED'
                ? '✓ SIGNAL ACKNOWLEDGED'
                : isAcknowledging
                ? 'TRANSMITTING ACKNOWLEDGMENT...'
                : 'I AM RESPONDING / HELP ON THE WAY'}
            </span>
          </button>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={() => {
              soundManager.stopEmergencyBroadcastSiren();
              onDismiss();
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl neu-button text-xs font-mono text-[#4a5568] hover:text-[#2d3436] cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
