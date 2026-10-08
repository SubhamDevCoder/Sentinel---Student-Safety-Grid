import React, { useState, useCallback } from 'react';
import { ScrewHead } from './ScrewHead.tsx';
import { GCEK_CAMPUS_LOCATIONS } from '../data/locations.ts';
import { EmergencyAlertPayload, GPSLocationState } from '../types.ts';
import {
  AlertTriangle,
  MapPin,
  Flame,
  Activity,
  UserX,
  Radio,
  CheckCircle2,
  Phone,
  User,
  ShieldAlert,
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
  const [justDispatched, setJustDispatched] = useState<boolean>(false);

  /**
   * One-Click Instant Emergency SOS Trigger:
   * Dispatches immediately on a single tap with zero delay and completely silent.
   */
  const handleSingleClickSos = useCallback(async () => {
    if (isDispatching) return;

    // Automatic GPS capture with high accuracy
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

    const resolvedCategory = selectedIssue || 'Instant SOS';
    const finalIssue = customIssueText.trim()
      ? (selectedIssue ? `${selectedIssue}: ${customIssueText.trim()}` : customIssueText.trim())
      : (selectedIssue || 'Instant SOS Triggered');

    const payload: EmergencyAlertPayload = {
      studentName: studentName || 'GCEK Student',
      studentPhone: studentPhone ? studentPhone : undefined,
      location: resolvedLocation,
      issue: finalIssue,
      category: resolvedCategory,
      details: customIssueText.trim(),
      lat: liveLat,
      lng: liveLng,
      timestamp: Date.now(),
      status: 'PENDING',
      accuracyMeters: liveAccuracy,
      dispatchType: 'ONE_CLICK_SOS',
    };

    await onDispatchAlert(payload);

    setJustDispatched(true);
    setTimeout(() => {
      setJustDispatched(false);
    }, 3000);
  }, [
    isDispatching,
    gpsState,
    studentName,
    studentPhone,
    useManualLocationOverride,
    fallbackLocation,
    customIssueText,
    selectedIssue,
    fetchCoordinates,
    onDispatchAlert,
  ]);

  return (
    <div
      id="central-sos-station"
      className="relative neu-card rounded-2xl p-6 mb-6 border border-white/40"
    >
      {/* 4 Corner Hardware Screws */}
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

        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          INSTANT 1-CLICK DISPATCH
        </span>
      </div>

      {/* QUICK ISSUE SELECTION ADJACENT / ABOVE SOS */}
      <div className="mb-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="quick-issue-selector"
            className="text-xs font-mono font-semibold tracking-wider text-[#4a5568] uppercase flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#ff4757]" />
            WHAT IS THE PROBLEM? (OPTIONAL)
          </label>
          <span className="text-[10px] font-mono text-[#4a5568]">
            Sends directly to Command Center
          </span>
        </div>

        {/* Preset quick issue buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSelectedIssue(selectedIssue === 'Medical Emergency' ? '' : 'Medical Emergency')}
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
            onClick={() => setSelectedIssue(selectedIssue === 'Physical Threat / Ragging' ? '' : 'Physical Threat / Ragging')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Physical Threat / Ragging'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <UserX className="w-4 h-4 text-[#e17055]" />
            <span className="truncate w-full text-center text-[11px]">Threat/Ragging</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIssue(selectedIssue === 'Accident on Campus Road' ? '' : 'Accident on Campus Road')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Accident on Campus Road'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-[#f39c12]" />
            <span className="truncate w-full text-center text-[11px]">Road Accident</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIssue(selectedIssue === 'Fire Hazard' ? '' : 'Fire Hazard')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Fire Hazard'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <Flame className="w-4 h-4 text-[#d63031]" />
            <span className="truncate w-full text-center text-[11px]">Fire Hazard</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIssue(selectedIssue === 'Suspicious Activity' ? '' : 'Suspicious Activity')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Suspicious Activity'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <User className="w-4 h-4 text-[#8e44ad]" />
            <span className="truncate w-full text-center text-[11px]">Suspicious</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIssue(selectedIssue === 'Facility / Hazard' ? '' : 'Facility / Hazard')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedIssue === 'Facility / Hazard'
                ? 'neu-pressed text-[#ff4757] font-semibold'
                : 'neu-button text-[#2d3436]'
            }`}
          >
            <Radio className="w-4 h-4 text-[#2980b9]" />
            <span className="truncate w-full text-center text-[11px]">Facility</span>
          </button>
        </div>

        {/* Custom brief text override if student wants specific note */}
        <div className="relative">
          <input
            id="quick-issue-selector"
            type="text"
            value={customIssueText}
            onChange={(e) => setCustomIssueText(e.target.value)}
            placeholder="Type specific problem (e.g. fallen from stairs, breathing trouble, lab 204)..."
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
            onChange={(e) => setFallbackLocation(e.target.value)}
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
            Auto-GPS included with single click
          </span>
          {gpsState.status === 'locked' && gpsState.lat && (
            <span className="text-[#10b981] font-semibold">
              Live Lock: ±{gpsState.accuracy ?? 10}m
            </span>
          )}
        </div>
      </div>

      {/* INSTANT 1-CLICK CENTRAL SOS BUTTON */}
      <div className="flex flex-col items-center justify-center my-4 select-none">
        {/* Concentric Well Housing */}
        <div className="relative p-4 rounded-full neu-recessed-deep flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.18)]">
          {/* Central 1-Click Touch Dome Button */}
          <button
            id="btn-central-sos-click"
            type="button"
            disabled={isDispatching}
            onClick={handleSingleClickSos}
            className={`w-40 h-40 sm:w-44 sm:h-44 rounded-full neu-sos-button flex flex-col items-center justify-center cursor-pointer text-white select-none transition-transform active:scale-95 shadow-[0_8px_24px_rgba(255,71,87,0.5)] ${
              isDispatching ? 'opacity-85 animate-pulse' : 'hover:scale-[1.02]'
            }`}
            aria-label="Click once to trigger instant SOS Emergency notification to Command Center"
          >
            <div className="p-1.5 rounded-full bg-white/20 mb-1.5 backdrop-blur-xs">
              <ShieldAlert className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>
            <span className="text-2xl sm:text-3xl font-black tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {isDispatching ? 'SENDING' : 'SOS'}
            </span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-white/95 font-bold mt-1 bg-black/20 px-2.5 py-0.5 rounded-full">
              {isDispatching ? 'TRANSMITTING' : 'CLICK ONCE'}
            </span>
          </button>
        </div>

        {/* Operational Status Text below button */}
        <div className="mt-4 text-center min-h-[44px] flex flex-col items-center justify-center">
          {justDispatched ? (
            <div className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-white" />
              SOS DISPATCHED TO COMMAND CENTER
            </div>
          ) : isDispatching ? (
            <div className="px-3.5 py-1.5 rounded-xl neu-recessed text-xs font-mono font-bold text-[#10b981] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" />
              TRANSMITTING TO COMMAND CENTER...
            </div>
          ) : (
            <div className="text-xs font-mono text-[#4a5568] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
              SINGLE CLICK TRIGGERS SILENT SOS TO COMMAND CENTER
            </div>
          )}

          {/* Caller Identity Summary Tag */}
          <div className="mt-2.5 px-3 py-1 rounded-md bg-[#d1d9e6]/50 text-[10px] font-mono text-[#4a5568] flex items-center gap-1.5 max-w-full truncate">
            <span className="text-[#8c96a8] uppercase">CALLER:</span>
            <span className="font-bold text-[#2d3436] truncate max-w-[120px]">{studentName}</span>
            {studentPhone ? (
              <span className="text-[#10b981] font-semibold flex items-center gap-0.5">
                <Phone className="w-2.5 h-2.5" />
                {studentPhone}
              </span>
            ) : (
              <span className="text-[#e67e22] font-semibold">(No phone registered - add mobile above)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
