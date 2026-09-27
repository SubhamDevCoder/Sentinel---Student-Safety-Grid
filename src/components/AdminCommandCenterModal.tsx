import React, { useState, useEffect } from 'react';
import {
  subscribeToAllAlerts,
  updateAlertStatusByAdmin,
} from '../services/sosAlertService.ts';
import { SosAlertDocument, SosAlertStatus } from '../types.ts';
import {
  ShieldAlert,
  X,
  Phone,
  Radio,
  Battery,
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface AdminCommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCommandCenterModal: React.FC<AdminCommandCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [alerts, setAlerts] = useState<SosAlertDocument[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToAllAlerts((liveAlerts) => {
      setAlerts(liveAlerts);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (sosId: string, status: SosAlertStatus) => {
    soundManager.playClickTick();
    setUpdatingId(sosId);
    try {
      await updateAlertStatusByAdmin(sosId, status);
      if (status === 'ACKNOWLEDGED' || status === 'DISPATCHED') {
        soundManager.playSuccessChime();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ACTIVE') return a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED' || a.status === 'DISPATCHED';
    if (filter === 'RESOLVED') return a.status === 'RESOLVED' || a.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#e0e5ec] rounded-2xl neu-card p-5 max-h-[90vh] flex flex-col border border-white/60 shadow-2xl animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#d1d9e6]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl neu-recessed text-[#ff4757]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-sm text-[#2d3436] uppercase tracking-wider flex items-center gap-1.5">
                CAMPUS SECURITY COMMAND DASHBOARD
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              </h3>
              <p className="text-[11px] font-mono text-[#4a5568]">
                Real-time Firestore stream connected to <code>sos_alerts</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="neu-button p-2 rounded-xl text-[#4a5568] hover:text-[#ff4757] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between my-3 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`px-3 py-1 text-xs font-mono rounded-lg cursor-pointer transition-all ${
                  filter === mode ? 'neu-pressed font-bold text-[#ff4757]' : 'neu-button text-[#4a5568]'
                }`}
              >
                {mode} ({alerts.filter((a) => {
                  if (mode === 'ACTIVE') return a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED' || a.status === 'DISPATCHED';
                  if (mode === 'RESOLVED') return a.status === 'RESOLVED' || a.status === 'CANCELLED';
                  return true;
                }).length})
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-[#8c96a8] flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin text-[#10b981]" />
            Streaming Live Updates
          </span>
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-[#8c96a8] font-mono text-xs">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#10b981]/60" />
              No emergency alerts found in <code>sos_alerts</code> matching filter.
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isPending = alert.status === 'ACTIVE';
              const isDispatched = alert.status === 'DISPATCHED';
              const isAck = alert.status === 'ACKNOWLEDGED';

              return (
                <div
                  key={alert.sos_id}
                  className={`neu-card p-3.5 rounded-xl border transition-all ${
                    isPending
                      ? 'border-[#ff4757]/80 bg-red-50/20'
                      : isDispatched
                      ? 'border-[#10b981]/70 bg-emerald-50/20'
                      : 'border-white/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#2d3436]">
                          {alert.user_name}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            alert.status === 'ACTIVE'
                              ? 'bg-[#ff4757] text-white animate-pulse'
                              : alert.status === 'DISPATCHED'
                              ? 'bg-[#10b981] text-white'
                              : alert.status === 'ACKNOWLEDGED'
                              ? 'bg-emerald-600 text-white'
                              : alert.status === 'RESOLVED'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-400 text-white'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8c96a8] block">
                        ID: {alert.sos_id}
                      </span>
                    </div>

                    {alert.phone_number && (
                      <a
                        href={`tel:${alert.phone_number}`}
                        className="neu-button px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-[#10b981] flex items-center gap-1 hover:text-[#059669]"
                      >
                        <Phone className="w-3 h-3" />
                        Call {alert.phone_number}
                      </a>
                    )}
                  </div>

                  {/* Telemetry row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono my-2 neu-recessed p-2 rounded-lg">
                    <div>
                      <span className="text-[9px] text-[#8c96a8] block uppercase">Reason</span>
                      <span className="font-bold text-[#2d3436] truncate block">{alert.issue || 'Instant SOS'}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-[#8c96a8] block uppercase">Live Coordinates</span>
                      <span className="font-bold text-[#2d3436] block truncate">
                        {alert.location?.latitude?.toFixed(4)}, {alert.location?.longitude?.toFixed(4)}
                      </span>
                      <span className="text-[9px] text-[#10b981] flex items-center gap-0.5">
                        <Radio className="w-2.5 h-2.5 animate-pulse" /> ±{alert.location?.accuracy?.toFixed(0) ?? 10}m
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-[#8c96a8] block uppercase">Device Battery</span>
                      <span className="font-bold text-[#2d3436] flex items-center gap-1">
                        <Battery className="w-3 h-3 text-[#10b981]" />
                        <span>{alert.device_info?.battery_level ?? 95}%</span>
                        {alert.device_info?.is_charging && (
                          <span className="text-[9px] text-amber-500 font-bold" title="Charging">⚡</span>
                        )}
                      </span>
                      <span className="text-[9px] text-[#10b981] flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                        Live broadcast
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-[#8c96a8] block uppercase">Location Area</span>
                      <span className="font-bold text-[#e17055] truncate flex items-center gap-1 block">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {alert.campus_location || 'Campus'}
                      </span>
                    </div>
                  </div>

                  {/* Dispatch Actions (Admin controls to change status) */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#d1d9e6] flex-wrap gap-2">
                    <span className="text-[10px] font-mono text-[#8c96a8] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Live Stream Active
                    </span>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {alert.status !== 'ACKNOWLEDGED' && alert.status !== 'DISPATCHED' && alert.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          disabled={updatingId === alert.sos_id}
                          onClick={() => handleUpdateStatus(alert.sos_id, 'ACKNOWLEDGED')}
                          className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}

                      {alert.status !== 'DISPATCHED' && alert.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          disabled={updatingId === alert.sos_id}
                          onClick={() => handleUpdateStatus(alert.sos_id, 'DISPATCHED')}
                          className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-[#10b981] hover:bg-[#059669] text-white cursor-pointer flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3" />
                          Dispatch QRT
                        </button>
                      )}

                      {alert.status !== 'RESOLVED' && alert.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          disabled={updatingId === alert.sos_id}
                          onClick={() => handleUpdateStatus(alert.sos_id, 'RESOLVED')}
                          className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#d1d9e6] flex items-center justify-between text-[11px] font-mono text-[#8c96a8]">
          <span>GCEK Control Dispatch Telemetry • Firestore Backend</span>
          <button
            type="button"
            onClick={onClose}
            className="neu-button px-3 py-1 rounded-lg text-[#2d3436] font-semibold cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
