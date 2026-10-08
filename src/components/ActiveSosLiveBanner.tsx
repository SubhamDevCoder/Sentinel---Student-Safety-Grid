import React, { useState } from 'react';
import { SosAlertDocument } from '../types.ts';
import {
  Radio,
  XCircle,
  Battery,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface ActiveSosLiveBannerProps {
  activeAlert: SosAlertDocument | null;
  onCancelSos: (sosId: string) => Promise<void>;
  isCancelling: boolean;
}

export const ActiveSosLiveBanner: React.FC<ActiveSosLiveBannerProps> = ({
  activeAlert,
  onCancelSos,
  isCancelling,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  if (!activeAlert) return null;

  const { status, sos_id, location, device_info, user_name, phone_number, issue } = activeAlert;
  const isHelpOnTheWay = status === 'ACKNOWLEDGED' || status === 'DISPATCHED';
  const isResolved = status === 'RESOLVED';
  const isCancelled = status === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="mb-6 neu-card p-4 rounded-2xl border border-gray-300 bg-[#e0e5ec] text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-gray-600">
          <CheckCircle2 className="w-4 h-4 text-gray-500" />
          <span>EMERGENCY SOS {sos_id} HAS BEEN CANCELLED</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="active-sos-live-monitor"
      className={`mb-6 rounded-2xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden shadow-lg ${
        isHelpOnTheWay
          ? 'bg-gradient-to-br from-[#10b981]/15 via-[#e0e5ec] to-[#10b981]/10 border-[#10b981]/50'
          : isResolved
          ? 'bg-gradient-to-br from-blue-500/15 via-[#e0e5ec] to-blue-500/10 border-blue-500/50'
          : 'bg-gradient-to-br from-[#ff4757]/15 via-[#e0e5ec] to-[#ff4757]/10 border-[#ff4757]/60'
      }`}
    >
      {/* Top Beacon Status Indicator */}
      <div className="flex items-center justify-between border-b border-[#d1d9e6] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3.5 w-3.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isHelpOnTheWay ? 'bg-[#10b981]' : isResolved ? 'bg-blue-500' : 'bg-[#ff4757]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                isHelpOnTheWay ? 'bg-[#10b981]' : isResolved ? 'bg-blue-500' : 'bg-[#ff4757]'
              }`}
            />
          </span>
          <span className="text-xs font-mono font-extrabold tracking-wider uppercase text-[#2d3436]">
            {isHelpOnTheWay ? 'HELP IS ON THE WAY!' : isResolved ? 'INCIDENT RESOLVED' : 'LIVE SOS ACTIVE'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
              status === 'DISPATCHED'
                ? 'bg-[#10b981] text-white animate-pulse'
                : status === 'ACKNOWLEDGED'
                ? 'bg-emerald-600 text-white'
                : status === 'RESOLVED'
                ? 'bg-blue-600 text-white'
                : 'bg-[#ff4757] text-white animate-pulse'
            }`}
          >
            {status}
          </span>
          <span className="text-[10px] font-mono text-[#4a5568]">ID: {sos_id.slice(-6)}</span>
        </div>
      </div>

      {/* Prominent Help is on the Way Banner (Requirement 4) */}
      {isHelpOnTheWay && (
        <div className="mb-3 p-3 rounded-xl bg-[#10b981] text-white shadow-md flex items-center gap-3">
          <div className="p-2 rounded-full bg-white/20">
            <ShieldCheck className="w-6 h-6 text-white animate-bounce" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm tracking-wide">
              {status === 'DISPATCHED' ? 'RESCUE TEAM DISPATCHED!' : 'HELP IS ON THE WAY!'}
            </h4>
            <p className="text-[11px] text-white/90">
              Campus responders have acknowledged your signal. Help is on the way! Stay in place or move to a safe spot.
            </p>
          </div>
        </div>
      )}

      {/* Real-time telemetry grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono">
        <div className="neu-recessed p-2 rounded-lg">
          <span className="text-[10px] text-[#8c96a8] block">STUDENT</span>
          <span className="font-bold text-[#2d3436] truncate block">{user_name}</span>
          {phone_number && (
            <span className="text-[10px] text-[#10b981] flex items-center gap-1 mt-0.5">
              <Phone className="w-2.5 h-2.5" />
              {phone_number}
            </span>
          )}
        </div>

        <div className="neu-recessed p-2 rounded-lg">
          <span className="text-[10px] text-[#8c96a8] block">STREAMING GPS</span>
          <span className="font-bold text-[#2d3436] block truncate">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </span>
          <span className="text-[10px] text-[#10b981] flex items-center gap-1 mt-0.5">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> ±{location.accuracy.toFixed(0)}m
          </span>
        </div>

        <div className="neu-recessed p-2 rounded-lg">
          <span className="text-[10px] text-[#8c96a8] block">DEVICE BATTERY</span>
          <span className="font-bold text-[#2d3436] flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-[#10b981]" />
            <span>{device_info?.battery_level ?? 98}%</span>
            {device_info?.is_charging && (
              <span className="text-[10px] text-amber-500 font-bold" title="Device is Charging">⚡</span>
            )}
          </span>
          <span className="text-[10px] text-[#10b981] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
            Live Telemetry
          </span>
        </div>

        <div className="neu-recessed p-2 rounded-lg">
          <span className="text-[10px] text-[#8c96a8] block">ALERT REASON</span>
          <span className="font-bold text-[#2d3436] truncate block">{issue || 'Instant SOS'}</span>
          <span className="text-[10px] text-[#e17055] flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-2.5 h-2.5" /> {activeAlert.campus_location || 'Campus'}
          </span>
        </div>
      </div>

      {/* SOS Cancellation Action (Requirement 5) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#d1d9e6]">
        {showCancelConfirm ? (
          <div className="flex items-center gap-2 w-full justify-between bg-red-100 p-2 rounded-xl">
            <span className="text-xs font-mono font-bold text-red-700">Confirm cancellation of SOS?</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-2.5 py-1 text-xs rounded bg-gray-200 text-gray-700 font-mono hover:bg-gray-300 cursor-pointer"
              >
                No, Keep SOS
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={async () => {
                  soundManager.playClickTick();
                  await onCancelSos(sos_id);
                  setShowCancelConfirm(false);
                }}
                className="px-3 py-1 text-xs rounded bg-[#ff4757] text-white font-mono font-bold hover:bg-red-600 cursor-pointer flex items-center gap-1"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel SOS'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="neu-button px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-[#ff4757] hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>CANCEL SOS BROADCAST</span>
          </button>
        )}
      </div>
    </div>
  );
};
