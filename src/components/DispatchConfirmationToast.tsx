import React from 'react';
import { AlertDispatchResult } from '../types.ts';
import { ShieldCheck, X, Radio, Clock, MapPin, AlertOctagon, Phone } from 'lucide-react';
import { soundManager } from '../utils/audio.ts';

interface DispatchConfirmationToastProps {
  latestResult: AlertDispatchResult | null;
  onDismiss: () => void;
}

export const DispatchConfirmationToast: React.FC<DispatchConfirmationToastProps> = ({
  latestResult,
  onDismiss,
}) => {
  if (!latestResult) return null;

  const { success, firebaseKey, timestamp, payload, error } = latestResult;
  const timeFormatted = new Date(timestamp).toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <aside
      aria-label="Dispatch Transmission Status"
      className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div
        id="toast-dispatch-confirmation"
        className={`neu-float rounded-2xl p-4 border ${
          success
            ? 'border-[#10b981]/50 bg-[#e0e5ec]'
            : 'border-[#ff4757]/50 bg-[#e0e5ec]'
        } shadow-[10px_10px_25px_rgba(186,190,204,0.9),-10px_-10px_25px_#ffffff]`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl neu-recessed shrink-0 ${
                success ? 'text-[#10b981]' : 'text-[#ff4757]'
              }`}
            >
              {success ? (
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              ) : (
                <AlertOctagon className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    success ? 'bg-[#10b981] animate-ping' : 'bg-[#ff4757]'
                  }`}
                />
                <h4 className="text-xs font-mono font-bold tracking-wide uppercase text-[#2d3436]">
                  {success
                    ? 'EMERGENCY BROADCAST TRANSMITTED TO SECURITY COMMAND CENTER'
                    : 'OFFLINE / LOCAL TRANSMIT LOGGED'}
                </h4>
              </div>

              <p className="text-[11px] font-mono text-[#4a5568] mt-1">
                {success
                  ? `Firebase Firestore SOS Ref: ${firebaseKey || 'ACTIVE'}`
                  : `Network alert notice: ${error || 'Logged to device store'}`}
              </p>

              {/* Data Summary Grid */}
              <div className="mt-2.5 pt-2 border-t border-[#d1d9e6] grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1 text-[#2d3436]">
                  <MapPin className="w-3 h-3 text-[#ff4757] shrink-0" />
                  <span className="truncate">{payload.location}</span>
                </div>

                <div className="flex items-center gap-1 text-[#2d3436]">
                  <Clock className="w-3 h-3 text-[#4a5568] shrink-0" />
                  <span>{timeFormatted}</span>
                </div>

                <div className="flex items-center gap-1 text-[#2d3436] col-span-2">
                  <Radio className="w-3 h-3 text-[#10b981] shrink-0" />
                  <span className="truncate">
                    Caller: {payload.studentName}
                    {payload.studentPhone ? ` (📞 ${payload.studentPhone})` : ''} • Issue: {payload.issue}
                    {payload.lat && payload.lng
                      ? ` [${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)}]`
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClickTick();
              onDismiss();
            }}
            className="p-1 rounded-lg neu-button text-[#4a5568] hover:text-[#2d3436] cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
