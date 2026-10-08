import React, { useState, useEffect } from 'react';
import { SosAlertDocument, SosAlertStatus } from '../types.ts';
import { ScrewHead } from './ScrewHead.tsx';
import {
  ShieldAlert,
  Phone,
  MapPin,
  ExternalLink,
  Battery,
  Radio,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  Send,
  CheckCheck,
  RefreshCw,
  Activity,
  Flame,
  UserX,
  Stethoscope,
} from 'lucide-react';
import {
  subscribeToCommandCenterAlerts,
  updateCommandCenterAlertStatus,
} from '../services/sosAlertService.ts';

interface CommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  responderName: string;
}

export const CommandCenterModal: React.FC<CommandCenterModalProps> = ({
  isOpen,
  onClose,
  responderName,
}) => {
  const [alerts, setAlerts] = useState<SosAlertDocument[]>([]);
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Subscribe to real-time alerts when modal is mounted or open
  useEffect(() => {
    const unsub = subscribeToCommandCenterAlerts((liveAlerts) => {
      setAlerts(liveAlerts);
    });

    const clock = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      unsub();
      clearInterval(clock);
    };
  }, []);

  if (!isOpen) return null;

  const handleUpdateStatus = async (sosId: string, status: SosAlertStatus) => {
    setActionInProgressId(sosId);
    try {
      await updateCommandCenterAlertStatus(sosId, status, responderName || 'Security Command');
    } catch (err) {
      console.error('Error updating status in Command Center:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const activeUnacknowledged = alerts.filter((a) => a.status === 'ACTIVE');
  const displayedAlerts = filter === 'active' ? activeUnacknowledged : alerts;

  const getElapsedString = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    let alertTime = currentTime;
    if (typeof timestamp === 'number') {
      alertTime = timestamp;
    } else if (timestamp.toMillis) {
      alertTime = timestamp.toMillis();
    } else if (timestamp.seconds) {
      alertTime = timestamp.seconds * 1000;
    }
    const diffSec = Math.max(0, Math.floor((currentTime - alertTime) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const min = Math.floor(diffSec / 60);
    return `${min}m ${diffSec % 60}s ago`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Security Command Center"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col neu-card rounded-2xl border-2 border-red-500/80 shadow-[0_0_50px_rgba(255,71,87,0.35)] overflow-hidden">
        {/* Hardware Corner Screws */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <ScrewHead rotation="default" />
        </div>
        <div className="absolute top-3 right-3 pointer-events-none">
          <ScrewHead rotation="alt" />
        </div>
        <div className="absolute bottom-3 left-3 pointer-events-none">
          <ScrewHead rotation="alt2" />
        </div>
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <ScrewHead rotation="default" />
        </div>

        {/* Console Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#d1d9e6] bg-[#d9e0ea]/50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-md">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-black text-[#2d3436] tracking-wider uppercase flex items-center gap-2">
                CAMPUS SECURITY COMMAND CENTER
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  LIVE REAL-TIME
                </span>
              </h2>
              <p className="text-[11px] font-mono text-[#4a5568]">
                Real-time emergency monitoring console • GCEK Campus Grid
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex rounded-lg neu-recessed p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-white font-bold text-[#2d3436] shadow-xs'
                    : 'text-[#4a5568]'
                }`}
              >
                All Active ({alerts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('active')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === 'active'
                    ? 'bg-red-500 text-white font-bold shadow-xs'
                    : 'text-[#4a5568]'
                }`}
              >
                Unacknowledged ({activeUnacknowledged.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl neu-button text-[#4a5568] hover:text-[#2d3436] cursor-pointer"
              title="Close Command Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Incident List View (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {displayedAlerts.length === 0 ? (
            <div className="py-14 text-center neu-recessed rounded-2xl p-6 font-mono">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#2d3436] uppercase tracking-wider mb-1">
                ALL CLEAR • NO ACTIVE CAMPUS EMERGENCIES
              </h3>
              <p className="text-xs text-[#8c96a8] max-w-md mx-auto">
                The Security Command Center is actively listening in real-time. When any student triggers a 1-click SOS, their distress signal and live telemetry will immediately appear here.
              </p>
            </div>
          ) : (
            displayedAlerts.map((alert) => {
              const isUnacknowledged = alert.status === 'ACTIVE';
              const isDispatched = alert.status === 'DISPATCHED';
              const mapLink = `https://www.google.com/maps/search/?api=1&query=${alert.location.latitude},${alert.location.longitude}`;
              const isBusy = actionInProgressId === alert.sos_id;

              return (
                <div
                  key={alert.sos_id}
                  className={`neu-card rounded-2xl p-4 sm:p-5 border transition-all ${
                    isUnacknowledged
                      ? 'border-red-500 shadow-[0_0_20px_rgba(255,71,87,0.25)]'
                      : isDispatched
                      ? 'border-blue-500'
                      : 'border-emerald-500/60'
                  }`}
                >
                  {/* Top Bar of Alert Card */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[#d1d9e6] mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase flex items-center gap-1 ${
                          isUnacknowledged
                            ? 'bg-red-600 text-white animate-pulse'
                            : isDispatched
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isUnacknowledged && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                        {alert.status}
                      </span>
                      <span className="text-[11px] font-mono text-[#8c96a8]">
                        ID: {alert.sos_id.slice(-8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#4a5568]">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-bold">{getElapsedString(alert.timestamp)}</span>
                      {alert.acknowledged_by && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Responded by: {alert.acknowledged_by}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Problem Briefing */}
                  <div className="neu-recessed p-3 rounded-xl mb-3 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                      <span className="text-[10px] font-mono font-bold text-[#8c96a8] uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        REPORTED EMERGENCY ISSUE
                      </span>
                      {alert.category && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                          {alert.category}
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-mono font-bold text-red-600 break-words">
                      {alert.issue || 'Instant SOS Triggered'}
                    </div>
                    {alert.details && alert.details !== alert.issue && (
                      <p className="text-xs font-mono text-[#2d3436] mt-1.5 pt-1.5 border-t border-[#d1d9e6]/60">
                        {alert.details}
                      </p>
                    )}
                  </div>

                  {/* Telemetry & Student Data Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs mb-3.5">
                    {/* Student Caller & Phone */}
                    <div className="neu-recessed p-2.5 rounded-xl">
                      <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                        STUDENT CALLER
                      </span>
                      <span className="font-bold text-[#2d3436] text-sm block truncate">
                        {alert.user_name || 'GCEK Student'}
                      </span>
                      {alert.phone_number ? (
                        <a
                          href={`tel:${alert.phone_number}`}
                          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] shadow-xs hover:bg-emerald-700"
                        >
                          <Phone className="w-3 h-3" />
                          <span>CALL {alert.phone_number}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-amber-700 block mt-1">
                          No phone registered
                        </span>
                      )}
                    </div>

                    {/* Campus Location & GPS */}
                    <div className="neu-recessed p-2.5 rounded-xl">
                      <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                        CAMPUS LOCATION
                      </span>
                      <span className="font-bold text-[#2d3436] text-xs flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{alert.campus_location || 'Campus Quad'}</span>
                      </span>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[#4a5568] truncate">
                          {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                        </span>
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-0.5 shrink-0 font-bold"
                        >
                          MAP <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    {/* Battery & Device */}
                    <div className="neu-recessed p-2.5 rounded-xl">
                      <span className="text-[10px] text-[#8c96a8] uppercase block font-semibold">
                        DEVICE BATTERY
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 font-bold text-[#2d3436]">
                        <Battery
                          className={`w-4 h-4 ${
                            (alert.device_info?.battery_level ?? 98) < 20
                              ? 'text-red-500'
                              : 'text-emerald-600'
                          }`}
                        />
                        <span>{alert.device_info?.battery_level ?? 98}%</span>
                        {alert.device_info?.is_charging && (
                          <span className="text-amber-500 font-bold">⚡</span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                        <Radio className="w-2.5 h-2.5 animate-pulse" /> Live Telemetry ±{alert.location.accuracy?.toFixed(0) ?? 10}m
                      </span>
                    </div>
                  </div>

                  {/* Security Operational Actions */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#d1d9e6]">
                    {alert.status === 'ACTIVE' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(alert.sos_id, 'ACKNOWLEDGED')}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>ACKNOWLEDGE (NOTIFY STUDENT)</span>
                      </button>
                    )}

                    {alert.status === 'ACKNOWLEDGED' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(alert.sos_id, 'DISPATCHED')}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>DISPATCH SECURITY PATROL</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleUpdateStatus(alert.sos_id, 'RESOLVED')}
                      className="py-2 px-4 rounded-xl neu-button text-xs font-mono font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      <span>MARK RESOLVED</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-[#d9e0ea]/40 border-t border-[#d1d9e6] flex items-center justify-between text-[11px] font-mono text-[#8c96a8]">
          <span>GCEK Kalahandi Security Grid</span>
          <span>Logged in as: {responderName || 'Campus Responder'}</span>
        </div>
      </div>
    </div>
  );
};
