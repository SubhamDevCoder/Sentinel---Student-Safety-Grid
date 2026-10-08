import React, { useState, useEffect } from 'react';
import { ScrewHead } from './ScrewHead.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { GPSLocationState } from '../types.ts';
import {
  ShieldAlert,
  Radio,
  User,
  Check,
  Edit2,
  Clock,
  Phone,
  X,
  Shield,
  Bell,
  BellRing,
} from 'lucide-react';
import { soundManager } from '../utils/audio.ts';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../services/campusNotificationService.ts';

interface HeaderChassisProps {
  gpsState: GPSLocationState;
  studentName: string;
  studentPhone: string;
  onUpdateStudentName: (name: string) => void;
  onUpdateStudentPhone: (phone: string) => void;
  onTriggerGPSManualRefresh: () => void;
  onOpenCommandCenter?: () => void;
}

export const HeaderChassis: React.FC<HeaderChassisProps> = ({
  gpsState,
  studentName,
  studentPhone,
  onUpdateStudentName,
  onUpdateStudentPhone,
  onTriggerGPSManualRefresh,
  onOpenCommandCenter,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(studentName);
  const [tempPhone, setTempPhone] = useState(studentPhone);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>(() =>
    getNotificationPermission()
  );

  useEffect(() => {
    setTempName(studentName);
  }, [studentName]);

  useEffect(() => {
    setTempPhone(studentPhone);
  }, [studentPhone]);

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClickTick();
    let trimmedName = tempName.trim() || 'GCEK Student';
    if (
      trimmedName.includes('Bikash') ||
      trimmedName.includes('Rout') ||
      trimmedName.startsWith('Dr.') ||
      trimmedName.startsWith('Prof.')
    ) {
      trimmedName = 'GCEK Student';
    }
    const trimmedPhone = tempPhone.trim().replace(/[^0-9+ ]/g, '');
    onUpdateStudentName(trimmedName);
    onUpdateStudentPhone(trimmedPhone);
    setIsEditingProfile(false);
  };

  const handleToggleNotification = async () => {
    soundManager.playClickTick();
    const result = await requestNotificationPermission();
    setNotificationPerm(result);
    if (result === 'granted') {
      soundManager.playSuccessChime();
    }
  };

  return (
    <header
      id="sentinel-header-chassis"
      className="relative neu-card rounded-2xl p-5 mb-5 border border-white/40 overflow-hidden"
    >
      {/* 4 Corner Screws */}
      <div className="absolute top-3 left-3">
        <ScrewHead id="screw-top-left" rotation="default" />
      </div>
      <div className="absolute top-3 right-3">
        <ScrewHead id="screw-top-right" rotation="alt" />
      </div>
      <div className="absolute bottom-3 left-3">
        <ScrewHead id="screw-bottom-left" rotation="alt2" />
      </div>
      <div className="absolute bottom-3 right-3">
        <ScrewHead id="screw-bottom-right" rotation="default" />
      </div>

      {/* Top Vent Slots */}
      <div className="flex justify-center items-center gap-2 mb-3">
        <div className="vent-slot" />
        <div className="vent-slot" />
        <div className="vent-slot" />
        <div className="vent-slot" />
        <div className="vent-slot" />
      </div>

      {/* Institutional Title & Branding */}
      <div className="px-3 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full neu-recessed mb-2">
          <ShieldAlert className="w-4 h-4 text-[#ff4757]" />
          <span className="font-mono text-[11px] font-semibold tracking-wider text-[#4a5568] uppercase">
            GCEK Bhawanipatna
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2d3436]">
          SENTINEL SAFETY GRID
        </h1>
        <p className="text-xs font-mono tracking-widest text-[#4a5568] uppercase mt-0.5">
          Emergency Response & Dispatch System
        </p>
      </div>

      {/* Hardware Telemetry Bar */}
      <div className="mt-4 pt-4 border-t border-[#d1d9e6] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* LED Grid Status */}
        <div
          id="system-status-led"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg neu-recessed"
        >
          <span className="w-2.5 h-2.5 rounded-full led-active animate-pulse" />
          <span className="text-[#2d3436] font-semibold tracking-wide">
            GRID ACTIVE
          </span>
          <span className="text-[10px] text-[#4a5568] border-l border-[#babecc] pl-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {currentTime}
          </span>
        </div>

        {/* GPS Live Telemetry Pill */}
        <button
          id="btn-gps-telemetry-status"
          type="button"
          onClick={() => {
            soundManager.playClickTick();
            onTriggerGPSManualRefresh();
          }}
          title="Click to refresh live GPS lock"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg neu-button cursor-pointer text-left"
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              gpsState.status === 'locked'
                ? 'text-[#10b981]'
                : gpsState.status === 'locating'
                ? 'text-[#f59e0b] animate-spin'
                : 'text-[#ff4757]'
            }`}
          />
          <div>
            <span className="text-[10px] uppercase tracking-wider block text-[#4a5568]">
              Telemetry GPS
            </span>
            <span className="font-bold text-[#2d3436]">
              {gpsState.status === 'locked'
                ? `${gpsState.lat?.toFixed(4)}, ${gpsState.lng?.toFixed(4)}`
                : gpsState.status === 'locating'
                ? 'Acquiring Fix...'
                : gpsState.status === 'denied'
                ? 'GPS Denied (Manual)'
                : 'Standby'}
            </span>
          </div>
        </button>

        {/* Student Identification Tag with Name & Phone */}
        <button
          id="student-identifier-pill"
          type="button"
          onClick={() => {
            soundManager.playClickTick();
            setTempName(studentName);
            setTempPhone(studentPhone);
            setIsEditingProfile(true);
          }}
          className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-3 py-1.5 rounded-lg neu-button cursor-pointer text-left group"
          title="Click to update Caller Name and Mobile Number for emergency callbacks"
        >
          <div className="flex items-center gap-1.5 text-[#4a5568]">
            <User className="w-3.5 h-3.5 text-[#ff4757]" />
            <span className="text-[10px] uppercase tracking-wider">Caller:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="font-semibold text-[#2d3436] truncate max-w-[120px]">
              {studentName}
            </span>

            {studentPhone ? (
              <span className="text-[10px] text-[#10b981] font-mono flex items-center gap-1 bg-white/60 px-1.5 py-0.5 rounded border border-[#10b981]/30">
                <Phone className="w-2.5 h-2.5" />
                <span className="truncate max-w-[90px]">{studentPhone}</span>
              </span>
            ) : (
              <span className="text-[10px] text-[#d63031] font-mono bg-[#ffebee] px-2 py-0.5 rounded border border-[#ff7675]/40 font-bold">
                + Add Mobile Number
              </span>
            )}

            <Edit2 className="w-3 h-3 text-[#8c96a8] group-hover:text-[#2d3436] shrink-0" />
          </div>
        </button>

        {/* Campus SOS Notification Bell Button */}
        <button
          id="btn-alert-notifications"
          type="button"
          onClick={handleToggleNotification}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg neu-button cursor-pointer text-xs font-mono transition-colors ${
            notificationPerm === 'granted'
              ? 'text-[#10b981] hover:text-[#059669]'
              : 'text-[#e67e22] hover:text-[#d35400] animate-pulse'
          }`}
          title={
            notificationPerm === 'granted'
              ? 'Campus Emergency Push Alerts are active'
              : 'Click to enable sound & push notifications for campus emergency SOS alerts'
          }
        >
          {notificationPerm === 'granted' ? (
            <BellRing className="w-3.5 h-3.5 text-[#10b981]" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-[#e67e22]" />
          )}
          <span className="text-[10px] uppercase font-bold">
            {notificationPerm === 'granted' ? 'ALERTS ON' : 'ENABLE ALERTS'}
          </span>
        </button>

        {/* Security Command Center Console Trigger */}
        {onOpenCommandCenter && (
          <button
            id="btn-open-command-center"
            type="button"
            onClick={() => {
              soundManager.playClickTick();
              onOpenCommandCenter();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg neu-button cursor-pointer text-xs font-mono text-red-600 hover:text-red-700 font-bold"
            title="Open Security Command Center Console"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[10px] uppercase font-bold">COMMAND</span>
          </button>
        )}

        {/* Compact PWA Quick Install */}
        <div className="flex items-center">
          <PWAInstallButton variant="compact" />
        </div>
      </div>

      {/* Caller Identification Modal */}
      {isEditingProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Student Caller Profile"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm neu-card rounded-2xl p-5 border border-white/60 shadow-[12px_12px_24px_#babecc,-12px_-12px_24px_#ffffff]">
            {/* Screws */}
            <div className="absolute top-3 left-3">
              <ScrewHead rotation="default" />
            </div>
            <div className="absolute top-3 right-3">
              <ScrewHead rotation="alt" />
            </div>

            <div className="flex items-center justify-between border-b border-[#d1d9e6] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#ff4757]" />
                <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-[#2d3436]">
                  STUDENT CALLER PROFILE
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClickTick();
                  setIsEditingProfile(false);
                }}
                className="p-1 rounded-lg neu-button text-[#4a5568] hover:text-[#2d3436] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#4a5568] mb-1 font-bold">
                  STUDENT NAME / ROLL NO:
                </label>
                <div className="neu-recessed rounded-xl p-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#4a5568] shrink-0" />
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Enter your student name or roll number"
                    className="w-full text-xs font-mono bg-transparent outline-none text-[#2d3436] placeholder:text-[#8c96a8]"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono text-[#4a5568] font-bold">
                    YOUR MOBILE NUMBER:
                  </label>
                  {tempPhone && (
                    <button
                      type="button"
                      onClick={() => setTempPhone('')}
                      className="text-[10px] font-mono text-[#ff4757] hover:underline cursor-pointer"
                    >
                      Clear Number
                    </button>
                  )}
                </div>
                <div className="neu-recessed rounded-xl p-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#ff4757] shrink-0" />
                  <input
                    type="tel"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    placeholder="Enter your personal 10-digit mobile number"
                    className="w-full text-xs font-mono bg-transparent outline-none text-[#2d3436] placeholder:text-[#8c96a8]"
                  />
                </div>
                <p className="text-[10px] font-mono text-[#4a5568] mt-1.5 leading-normal">
                  No random or default numbers are assigned. Please enter your personal mobile number so college security guards and authorities can phone you back directly during an emergency.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClickTick();
                    setIsEditingProfile(false);
                  }}
                  className="px-3 py-2 rounded-xl neu-button text-xs font-mono text-[#4a5568] hover:text-[#2d3436] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-mono font-bold text-xs shadow-[3px_3px_8px_#babecc] hover:opacity-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  SAVE IDENTIFIER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
