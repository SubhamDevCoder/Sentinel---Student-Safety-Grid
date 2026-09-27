import React, { useState, useEffect } from 'react';
import { ScrewHead } from './ScrewHead.tsx';
import { soundManager } from '../utils/audio.ts';
import { EmergencyAlertPayload, GPSLocationState } from '../types.ts';
import { Send, MapPin, FileText, CheckCheck, Loader2, Phone } from 'lucide-react';

interface ManualIncidentCardProps {
  gpsState: GPSLocationState;
  studentName: string;
  studentPhone: string;
  onUpdateStudentPhone?: (phone: string) => void;
  fetchCoordinates: () => Promise<{ lat: number | null; lng: number | null; accuracy: number | null }>;
  onDispatchAlert: (payload: EmergencyAlertPayload) => Promise<void>;
  isDispatching: boolean;
}

export const ManualIncidentCard: React.FC<ManualIncidentCardProps> = ({
  gpsState,
  studentName,
  studentPhone,
  onUpdateStudentPhone,
  fetchCoordinates,
  onDispatchAlert,
  isDispatching,
}) => {
  const [customLocation, setCustomLocation] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>(studentPhone);
  const [localDispatchSuccess, setLocalDispatchSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setContactPhone(studentPhone);
  }, [studentPhone]);

  const handleSendManualReport = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClickTick();
    setValidationError(null);

    const trimmedLoc = customLocation.trim();
    const trimmedIssue = issueDescription.trim();
    const trimmedPhone = contactPhone.trim().replace(/[^0-9+ ]/g, '');

    if (!trimmedLoc && !trimmedIssue) {
      setValidationError('Please specify either a Location or Issue description');
      return;
    }

    if (trimmedPhone && onUpdateStudentPhone && trimmedPhone !== studentPhone) {
      onUpdateStudentPhone(trimmedPhone);
    }

    // Immediately fetch live GPS silently
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
    } catch {
      // Ignore GPS failure in manual dispatch
    }

    const payload: EmergencyAlertPayload = {
      studentName: studentName || 'GCEK Student',
      studentPhone: trimmedPhone || studentPhone || undefined,
      location: trimmedLoc || (liveLat ? `GPS (${liveLat.toFixed(5)}, ${liveLng?.toFixed(5)})` : 'GCEK Campus'),
      issue: trimmedIssue || 'Manual Incident Report',
      lat: liveLat,
      lng: liveLng,
      timestamp: Date.now(),
      status: 'PENDING',
      accuracyMeters: liveAccuracy,
      dispatchType: 'MANUAL_DISPATCH',
    };

    await onDispatchAlert(payload);

    setLocalDispatchSuccess(true);
    setCustomLocation('');
    setIssueDescription('');

    setTimeout(() => {
      setLocalDispatchSuccess(false);
    }, 4000);
  };

  const handleApplyPreset = (loc: string, issue: string) => {
    soundManager.playClickTick();
    setCustomLocation(loc);
    setIssueDescription(issue);
    setValidationError(null);
  };

  return (
    <div
      id="manual-incident-dispatch-card"
      className="relative neu-card rounded-2xl p-5 mb-6 border border-white/40 overflow-hidden"
    >
      {/* 4 Corner Screws */}
      <div className="absolute top-3 left-3">
        <ScrewHead id="manual-screw-tl" rotation="alt" />
      </div>
      <div className="absolute top-3 right-3">
        <ScrewHead id="manual-screw-tr" rotation="default" />
      </div>
      <div className="absolute bottom-3 left-3">
        <ScrewHead id="manual-screw-bl" rotation="default" />
      </div>
      <div className="absolute bottom-3 right-3">
        <ScrewHead id="manual-screw-br" rotation="alt2" />
      </div>

      {/* Title & Badge */}
      <div className="flex items-center justify-between border-b border-[#d1d9e6] pb-3 mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_6px_#3b82f6]" />
          <h2 className="font-mono text-xs font-bold tracking-wider text-[#2d3436] uppercase">
            MANUAL INCIDENT DISPATCH
          </h2>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#4a5568] px-2 py-0.5 rounded neu-recessed">
          NON-SIREN SILENT FLOW
        </span>
      </div>

      <p className="text-xs text-[#4a5568] mb-4">
        Dispatch security and medical response without sounding the local acoustic siren. Auto-attaches live coordinates and caller identification.
      </p>

      {/* Preset Quick Chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="text-[10px] font-mono text-[#4a5568] py-1 self-center mr-1">
          QUICK TEMPLATES:
        </span>
        <button
          type="button"
          onClick={() => handleApplyPreset('Room 304, APJHR Hostel', 'Medical assistance requested')}
          className="px-2 py-1 rounded-md text-[11px] font-mono neu-button text-[#2d3436] hover:text-[#ff4757] cursor-pointer"
        >
          Room 304 (Medical)
        </button>
        <button
          type="button"
          onClick={() => handleApplyPreset('Near Central Workshop', 'Power / electrical fault spark')}
          className="px-2 py-1 rounded-md text-[11px] font-mono neu-button text-[#2d3436] hover:text-[#ff4757] cursor-pointer"
        >
          Workshop (Electrical)
        </button>
        <button
          type="button"
          onClick={() => handleApplyPreset('Girls Hostel Pathway', 'Suspicious activity observed')}
          className="px-2 py-1 rounded-md text-[11px] font-mono neu-button text-[#2d3436] hover:text-[#ff4757] cursor-pointer"
        >
          Pathway (Suspicious)
        </button>
      </div>

      <form onSubmit={handleSendManualReport} className="space-y-4">
        {/* Recessed Field 1: CUSTOM LOCATION / ROOM NO. */}
        <div>
          <label
            htmlFor="input-custom-location"
            className="block text-xs font-mono font-semibold tracking-wider text-[#4a5568] uppercase mb-1.5 flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-[#2d3436]" />
            1. CUSTOM LOCATION / ROOM NO.
          </label>
          <div className="relative">
            <input
              id="input-custom-location"
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="e.g. Room 304, APJHR Hostel or Near Canteen"
              className="w-full neu-recessed px-3.5 py-3 rounded-xl text-xs font-mono text-[#2d3436] placeholder-[#8c96a8] outline-none border border-transparent focus:border-[#4a5568]/40 transition-colors"
            />
          </div>
        </div>

        {/* Recessed Field 2: ISSUE / PROBLEM DESCRIPTION */}
        <div>
          <label
            htmlFor="textarea-issue-description"
            className="block text-xs font-mono font-semibold tracking-wider text-[#4a5568] uppercase mb-1.5 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[#2d3436]" />
            2. ISSUE / PROBLEM DESCRIPTION
          </label>
          <div className="relative">
            <textarea
              id="textarea-issue-description"
              rows={3}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="e.g. Snake spotted near entrance, Power failure & medical assistance needed"
              className="w-full neu-recessed px-3.5 py-3 rounded-xl text-xs font-mono text-[#2d3436] placeholder-[#8c96a8] outline-none border border-transparent focus:border-[#4a5568]/40 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Recessed Field 3: STUDENT MOBILE NUMBER (FOR EMERGENCY CALLBACK) */}
        <div>
          <label
            htmlFor="input-contact-phone"
            className="block text-xs font-mono font-semibold tracking-wider text-[#4a5568] uppercase mb-1.5 flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-[#ff4757]" />
            3. CALLER MOBILE NUMBER (OPTIONAL / AUTO-FILLED)
          </label>
          <div className="relative">
            <input
              id="input-contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Enter your personal 10-digit mobile number"
              className="w-full neu-recessed px-3.5 py-3 rounded-xl text-xs font-mono text-[#2d3436] placeholder-[#8c96a8] outline-none border border-transparent focus:border-[#4a5568]/40 transition-colors"
            />
          </div>
          <p className="text-[10px] font-mono text-[#8c96a8] mt-1">
            Transmitted to GCEK emergency personnel so they can phone you directly.
          </p>
        </div>

        {validationError && (
          <div className="p-2 rounded-lg neu-recessed text-xs font-mono text-[#ff4757] font-semibold">
            {validationError}
          </div>
        )}

        {localDispatchSuccess && (
          <div className="p-3 rounded-xl neu-recessed text-xs font-mono text-[#10b981] font-semibold flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-[#10b981]" />
            DISPATCH RECORDED & LOGGED DIRECTLY TO SECURITY DESK
          </div>
        )}

        {/* High-Tactile "SEND REPORT MANUALLY" Button */}
        <button
          id="btn-send-report-manually"
          type="submit"
          disabled={isDispatching}
          className="w-full min-h-[48px] py-3.5 px-6 rounded-xl neu-button flex items-center justify-center gap-2.5 text-xs font-mono font-bold tracking-wider text-[#2d3436] hover:text-[#ff4757] uppercase cursor-pointer transition-all disabled:opacity-50"
        >
          {isDispatching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#ff4757]" />
              <span>DISPATCHING PAYLOAD...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-[#ff4757]" />
              <span>SEND REPORT MANUALLY</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
