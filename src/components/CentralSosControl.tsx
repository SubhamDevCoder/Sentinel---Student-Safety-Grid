import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScrewHead } from './ScrewHead.tsx';
import { GCEK_CAMPUS_LOCATIONS, QUICK_EMERGENCY_ISSUES } from '../data/locations.ts';
import { soundManager } from '../utils/audio.ts';
import { EmergencyAlertPayload, GPSLocationState } from '../types.ts';
import {
  AlertTriangle,
  MapPin,
  Flame,
  Activity,
  UserX,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  Phone,
  User,
} from 'lucide-react';

interface CentralSosControlProps {
  gpsState: GPSLocationState;
  studentName: string;
  studentPhone: string;
  fetchCoordinates: () => Promise<{ lat: number | null; lng: number | null; accuracy: number | null }>;
  onDispatchAlert: (payload: EmergencyAlertPayload) => Promise<void>;
  isDispatching: boolean;
}

export const CentralSosControl: React.FC<CentralSosControlProps> = ({
  gpsState,
  studentName,
  studentPhone,
  fetchCoordinates,
  onDispatchAlert,
  isDispatching,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [customIssueText, setCustomIssueText] = useState<string>('');
  const [fallbackLocation, setFallbackLocation] = useState<string>(GCEK_CAMPUS_LOCATIONS[0]);
  const [useManualLocationOverride, setUseManualLocationOverride] = useState<boolean>(false);

  // Hold progress state (0 to 100)
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [cancelledMessage, setCancelledMessage] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stopSirenFnRef = useRef<(() => void) | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  const HOLD_DURATION_MS = 3000;

  // Clean up siren if unmounted
  useEffect(() => {
    return () => {
      if (stopSirenFnRef.current) {
        stopSirenFnRef.current();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleCancelHold = useCallback(() => {
    if (!isHolding && holdProgress === 0) return;

    if (stopSirenFnRef.current) {
      stopSirenFnRef.current();
      stopSirenFnRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (isHolding && !hasTriggeredRef.current) {
      setCancelledMessage('ABORTED: RELEASED BEFORE 3.0s');
      setTimeout(() => setCancelledMessage(null), 2500);
    }

    setIsHolding(false);
    setHoldProgress(0);
    holdStartTimeRef.current = null;
  }, [isHolding, holdProgress]);

  const handleHoldComplete = useCallback(async () => {
    hasTriggeredRef.current = true;
    setIsHolding(false);
    setHoldProgress(100);

    if (stopSirenFnRef.current) {
      stopSirenFnRef.current();
      stopSirenFnRef.current = null;
    }

    // AUTOMATIC GPS TRANSMISSION:
    // Trigger HTML5 Geolocation with enableHighAccuracy: true
    let liveLat: number | null = gpsState.lat;
    let liveLng: number | null = gpsState.lng;
    let liveAccuracy: number | null = gpsState.accuracy;

    try {
      const coords = await fetchCoordinates();
      if (coords.lat && coords.lng) {
        liveLat = coords.lat;
        liveLng = coords.lng;
        liveAccuracy = coords.accuracy;
      }
    } catch (e) {
      console.warn('Silent live GPS capture timeout, using cached state:', e);
    }

    // Determine final location description
    let resolvedLocation = 'GPS Auto-Detected';
    if (useManualLocationOverride || !liveLat) {
      resolvedLocation = fallbackLocation;
    } else {
      resolvedLocation = `GPS (${liveLat.toFixed(5)}, ${liveLng?.toFixed(5)}) - near ${fallbackLocation}`;
    }

    const finalIssue = customIssueText.trim() || selectedIssue || 'Instant SOS Triggered';

    const payload: EmergencyAlertPayload = {
      studentName: studentName || 'GCEK Student',
      studentPhone: studentPhone ? studentPhone : undefined,
      location: resolvedLocation,
      issue: finalIssue,
      lat: liveLat,
      lng: liveLng,
      timestamp: Date.now(),
      status: 'PENDING',
      accuracyMeters: liveAccuracy,
      dispatchType: 'SOS_HOLD',
    };

    await onDispatchAlert(payload);

    // Reset hold progress after brief confirmation display
    setTimeout(() => {
      setHoldProgress(0);
      hasTriggeredRef.current = false;
    }, 1500);
  }, [
    gpsState,
    studentName,
    useManualLocationOverride,
    fallbackLocation,
    customIssueText,
    selectedIssue,
    fetchCoordinates,
    onDispatchAlert,
  ]);

  const handleStartHold = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      if (isDispatching || hasTriggeredRef.current) return;

      setCancelledMessage(null);
      setIsHolding(true);
      hasTriggeredRef.current = false;
      holdStartTimeRef.current = performance.now();

      // Start Ascending Siren via Web Audio API (if not muted)
      if (!isSoundMuted) {
        stopSirenFnRef.current = soundManager.startAscendingSiren(3.0);
      } else {
        soundManager.playClickTick();
      }

      const tick = (now: number) => {
        if (!holdStartTimeRef.current) return;
        const elapsed = now - holdStartTimeRef.current;
        const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
        setHoldProgress(progress);

        if (elapsed >= HOLD_DURATION_MS) {
          handleHoldComplete();
        } else {
          animFrameRef.current = requestAnimationFrame(tick);
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [isDispatching, isSoundMuted, handleHoldComplete]
  );

  // SVG circular dimensions
  const svgSize = 220;
  const strokeWidth = 10;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (holdProgress / 100) * circumference;
  const remainingSeconds = Math.max(0, (3.0 - (holdProgress / 100) * 3.0)).toFixed(1);

  return (
    <div
      id="central-sos-station"
      className="relative neu-card rounded-2xl p-6 mb-6 border border-white/40"
    >
      {/* 4 Corner Screws */}
      <div className="absolute top-3 left-3">
        <ScrewHead id="sos-screw-tl" rotation="default" />
      </div>
      <div className="absolute top-3 right-3">
        <ScrewHead id="sos-screw-tr" rotation="alt" />
      </div>
      <div className="absolute bottom-3 left-3">
        <ScrewHead id="sos-screw-bl" rotation="alt2" />
      </div>
      <div className="absolute bottom-3 right-3">
        <ScrewHead id="sos-screw-br" rotation="default" />
      </div>

      {/* Header Bar within SOS Unit */}
      <div className="flex items-center justify-between border-b border-[#d1d9e6] pb-3 mb-5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff4757] shadow-[0_0_8px_#ff4757] animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-wider text-[#2d3436] uppercase">
            PRIMARY SOS TRANSMITTER
          </span>
        </div>

        {/* Siren Sound Toggle */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClickTick();
            setIsSoundMuted(!isSoundMuted);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md neu-button text-[11px] font-mono text-[#4a5568] hover:text-[#2d3436]"
          title="Toggle Siren Warning Audio"
        >
          {isSoundMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-[#ff4757]" />
              <span>SIREN MUTED</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#10b981]" />
              <span>SIREN ON</span>
            </>
          )}
        </button>
      </div>

      {/* QUICK ISSUE SELECTION ADJACENT / ABOVE SOS */}
      <div className="mb-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="quick-issue-selector"
            className="text-xs font-mono font-semibold tracking-wider text-[#4a5568] uppercase flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#ff4757]" />
            SPECIFY ISSUE (OPTIONAL BEFORE SOS)
          </label>
          <span className="text-[10px] font-mono text-[#4a5568]">
            Defaults to &quot;Instant SOS Triggered&quot;
          </span>
        </div>

        {/* Preset quick issue buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playClickTick();
              setSelectedIssue(selectedIssue === 'Medical Emergency' ? '' : 'Medical Emergency');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Medical Emergency'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <Activity className="w-4 h-4 text-[#ff4757]" />
            <span className="truncate w-full text-center text-[11px]">Medical</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClickTick();
              setSelectedIssue(selectedIssue === 'Suspicious Activity' ? '' : 'Suspicious Activity');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Suspicious Activity'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <UserX className="w-4 h-4 text-[#e17055]" />
            <span className="truncate w-full text-center text-[11px]">Threat/Suspicious</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClickTick();
              setSelectedIssue(selectedIssue === 'Fire Hazard' ? '' : 'Fire Hazard');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Fire Hazard'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <Flame className="w-4 h-4 text-[#d63031]" />
            <span className="truncate w-full text-center text-[11px]">Fire Hazard</span>
          </button>
        </div>

        {/* Custom brief text override if student wants specific note */}
        <div className="relative">
          <input
            id="quick-issue-selector"
            type="text"
            value={customIssueText}
            onChange={(e) => setCustomIssueText(e.target.value)}
            placeholder="Or type brief note (e.g. Near Canteen, 2nd floor lab)..."
            className="w-full neu-recessed px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#2d3436] placeholder-[#8c96a8] outline-none border border-transparent focus:border-[#ff4757]/40"
          />
        </div>
      </div>

      {/* FAST MANUAL FALLBACK LOCATION DROPDOWN */}
      <div className="mb-6 bg-[#d9e0ea]/60 p-3.5 rounded-xl border border-white/50">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="fallback-location-select"
            className="text-xs font-mono font-semibold tracking-wider text-[#4a5568] uppercase flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-[#ff4757]" />
            CAMPUS FALLBACK LOCATION (IF GPS OFF/INDOORS)
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#2d3436] cursor-pointer">
            <input
              type="checkbox"
              checked={useManualLocationOverride}
              onChange={(e) => setUseManualLocationOverride(e.target.checked)}
              className="accent-[#ff4757] cursor-pointer"
            />
            Force Manual
          </label>
        </div>

        <div className="relative">
          <select
            id="fallback-location-select"
            value={fallbackLocation}
            onChange={(e) => {
              soundManager.playClickTick();
              setFallbackLocation(e.target.value);
            }}
            className="w-full neu-recessed px-3 py-2 rounded-lg text-xs font-mono text-[#2d3436] outline-none cursor-pointer border border-[#babecc]/50"
          >
            {GCEK_CAMPUS_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-[#4a5568]">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#10b981]" />
            GPS Auto-Transmits on complete hold
          </span>
          {gpsState.status === 'locked' && gpsState.lat && (
            <span className="text-[#10b981] font-semibold">
              Live Lock: ±{gpsState.accuracy ?? 10}m
            </span>
          )}
        </div>
      </div>

      {/* CENTRAL HOLD SOS BUTTON WITH NEON CIRCULAR PROGRESS RING */}
      <div className="flex flex-col items-center justify-center my-2 select-none">
        {/* Concentric Well Housing */}
        <div className="relative p-3 rounded-full neu-recessed-deep flex items-center justify-center">
          {/* Circular SVG Progress Ring */}
          <svg
            width={svgSize}
            height={svgSize}
            className="transform -rotate-90 pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 6px rgba(255, 71, 87, 0.45))' }}
          >
            {/* Background Track */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              stroke="#babecc"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray="4 6"
              opacity="0.4"
            />
            {/* Animated Neon Progress Ring */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={radius}
              stroke="#ff4757"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-75 ease-linear"
            />
          </svg>

          {/* Central Touch Dome Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              id="btn-central-sos-hold"
              type="button"
              disabled={isDispatching}
              onMouseDown={handleStartHold}
              onMouseUp={handleCancelHold}
              onMouseLeave={handleCancelHold}
              onTouchStart={handleStartHold}
              onTouchEnd={handleCancelHold}
              onTouchCancel={handleCancelHold}
              className={`w-36 h-36 rounded-full neu-sos-button flex flex-col items-center justify-center cursor-pointer text-white select-none ${
                isHolding ? 'holding' : ''
              } ${isDispatching ? 'opacity-80' : ''}`}
              style={{
                touchAction: 'none',
              }}
              aria-label="Hold for 3 seconds to trigger SOS Emergency"
            >
              <div className="p-1 rounded-full bg-white/20 mb-1 backdrop-blur-xs">
                <AlertTriangle className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
              </div>
              <span className="text-xl font-black tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {isDispatching
                  ? 'SENDING'
                  : isHolding
                  ? `${remainingSeconds}s`
                  : 'HOLD SOS'}
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/90 font-bold mt-0.5">
                {isDispatching ? 'BROADCAST' : isHolding ? 'SIREN ACTIVE' : '3 SECONDS'}
              </span>
            </button>
          </div>
        </div>

        {/* Operational Status Text below button */}
        <div className="mt-4 text-center min-h-[44px] flex flex-col items-center justify-center">
          {cancelledMessage ? (
            <div className="px-3 py-1 rounded-lg neu-recessed text-xs font-mono font-bold text-[#ff4757] animate-bounce">
              {cancelledMessage}
            </div>
          ) : isHolding ? (
            <div className="px-3 py-1 rounded-lg neu-recessed text-xs font-mono font-bold text-[#d63031] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff4757] animate-ping" />
              SIREN SOUNDING • RELEASE CANCELS ({remainingSeconds}s)
            </div>
          ) : isDispatching ? (
            <div className="px-3 py-1 rounded-lg neu-recessed text-xs font-mono font-bold text-[#10b981] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              TRANSMITTING TO SECURITY COMMAND...
            </div>
          ) : (
            <div className="text-xs font-mono text-[#4a5568] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
              PRESS & HOLD FIRMLY FOR 3 SECONDS TO BROADCAST
            </div>
          )}

          {/* Caller Identity Summary Tag */}
          <div className="mt-2.5 px-3 py-1 rounded-md bg-[#d1d9e6]/50 text-[10px] font-mono text-[#4a5568] flex items-center gap-1.5 max-w-full truncate">
            <span className="text-[#8c96a8] uppercase">BROADCAST CALLER:</span>
            <span className="font-bold text-[#2d3436] truncate max-w-[120px]">{studentName}</span>
            {studentPhone ? (
              <span className="text-[#10b981] font-semibold flex items-center gap-0.5">
                <Phone className="w-2.5 h-2.5" />
                {studentPhone}
              </span>
            ) : (
              <span className="text-[#e67e22] font-semibold">(No phone registered - please add your mobile above)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
