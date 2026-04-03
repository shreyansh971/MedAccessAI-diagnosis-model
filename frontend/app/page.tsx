// frontend/app/dashboard/page.tsx
/**
 * MedAccess AI — Clinical Dashboard
 *
 * Features:
 *  - Dark-mode, high-contrast clinical aesthetic
 *  - Patient sidebar with scan history
 *  - Drag-and-drop scan uploader with real-time feedback
 *  - SVG Confidence Gauge rendered post-analysis
 *  - TanStack Query for data fetching & caching
 *  - Framer Motion for professional micro-interactions
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  analyzeScan,
  fetchPatients,
  fetchPatientScans,
  queryKeys,
  type AnalysisResponse,
  type Patient,
  type ScanSummary,
} from "@/lib/api";

// ─── Temporary auth token helper (replace with NextAuth session) ──────────────
const TOKEN = typeof window !== "undefined"
  ? localStorage.getItem("token") ?? ""
  : "";

// ─────────────────────────────────────────────────────────────────────────────
// SVG CONFIDENCE GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceGauge({ value, label }: { value: number; label: string }) {
  const radius = 80;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = Math.PI * normalizedRadius; // half-circle
  const progress = value * circumference;
  const isAbnormal = label === "ABNORMAL";

  const color = isAbnormal
    ? value > 0.85 ? "#ef4444" : "#f97316"
    : "#22c55e";

  const startAngle = Math.PI;
  const endAngle = 0;
  const x1 = 100 + normalizedRadius * Math.cos(startAngle);
  const y1 = 100 + normalizedRadius * Math.sin(startAngle);
  const x2 = 100 + normalizedRadius * Math.cos(endAngle);
  const y2 = 100 + normalizedRadius * Math.sin(endAngle);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="200" height="115" viewBox="0 0 200 115">
        {/* Track */}
        <path
          d={`M ${x1} ${y1} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${x2} ${y2}`}
          fill="none"
          stroke="#1e2736"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Fill — animated */}
        <motion.path
          d={`M ${x1} ${y1} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Needle */}
        <motion.circle
          cx={100 + normalizedRadius * Math.cos(Math.PI - Math.PI * value)}
          cy={100 + normalizedRadius * Math.sin(Math.PI - Math.PI * value)}
          r={5}
          fill={color}
          filter="url(#glow)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
        />
        {/* Center text */}
        <motion.text
          x="100" y="85"
          textAnchor="middle"
          fill="white"
          fontSize="24"
          fontWeight="700"
          fontFamily="monospace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {(value * 100).toFixed(1)}%
        </motion.text>
        <text x="100" y="105" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">
          CONFIDENCE
        </text>
      </svg>

      <motion.div
        className={`px-6 py-2 rounded-full text-sm font-bold tracking-widest ${
          isAbnormal
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : "bg-green-500/20 text-green-400 border border-green-500/40"
        }`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.0, type: "spring" }}
      >
        {label}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN UPLOADER
// ─────────────────────────────────────────────────────────────────────────────
function ScanUploader({
  patientId,
  onResult,
}: {
  patientId?: string;
  onResult: (r: AnalysisResponse) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => analyzeScan(file, TOKEN, patientId),
    onSuccess: (data) => onResult(data),
  });

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    mutation.mutate(file);
  }, [mutation]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const status = mutation.isPending
    ? "Analysing …"
    : mutation.isError
    ? "Analysis failed. Retry."
    : mutation.isSuccess
    ? "Analysis complete ✓"
    : "Drop X-ray / CT scan here";

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden
        ${dragOver ? "border-cyan-400 bg-cyan-400/5" : "border-slate-700 bg-slate-900/40"}
        ${preview ? "h-72" : "h-56"}
      `}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !mutation.isPending && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {/* Background image preview */}
      {preview && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${preview})` }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 cursor-pointer">
        {/* Upload icon */}
        <motion.div
          animate={mutation.isPending ? { rotate: 360 } : { rotate: 0 }}
          transition={mutation.isPending ? { repeat: Infinity, duration: 1.5, ease: "linear" } : {}}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {mutation.isPending ? (
              <circle cx="20" cy="20" r="16" stroke="#22d3ee" strokeWidth="3"
                strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
            ) : mutation.isSuccess ? (
              <path d="M10 20l8 8 12-16" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <>
                <rect x="4" y="28" width="32" height="4" rx="2" fill="#334155" />
                <path d="M20 6v18M12 14l8-8 8 8" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
        </motion.div>

        <div className="text-center">
          <p className={`text-sm font-medium ${
            mutation.isError ? "text-red-400" :
            mutation.isSuccess ? "text-green-400" :
            mutation.isPending ? "text-cyan-400" : "text-slate-400"
          }`}>
            {status}
          </p>
          {!preview && (
            <p className="text-xs text-slate-600 mt-1">JPEG · PNG · TIFF — max 25 MB</p>
          )}
        </div>

        {mutation.isPending && (
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cyan-500 rounded-full"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC RESULT CARD
// ─────────────────────────────────────────────────────────────────────────────
function DiagnosticCard({ result }: { result: AnalysisResponse }) {
  const isAbnormal = result.diagnostic_label === "ABNORMAL";

  return (
    <motion.div
      className="bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header bar */}
      <div className={`h-1 w-full ${isAbnormal ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`} />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-semibold text-slate-500 tracking-widest uppercase">
            Diagnostic Result
          </h3>
          <span className="text-xs text-slate-600 font-mono">
            {result.model_version}
          </span>
        </div>

        {/* Gauge */}
        <div className="flex justify-center mb-6">
          <ConfidenceGauge
            value={result.confidence_score}
            label={result.diagnostic_label}
          />
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Scan ID", value: result.scan_id.slice(0, 8) + "…", mono: true },
            { label: "Processing", value: `${result.processing_time_ms.toFixed(0)} ms`, mono: true },
            { label: "Threshold", value: `${(result.threshold_used * 100).toFixed(0)}%`, mono: true },
            {
              label: "Analyzed",
              value: new Date(result.analyzed_at).toLocaleTimeString(),
              mono: false,
            },
          ].map(({ label, value, mono }) => (
            <div key={label} className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-600 mb-1">{label}</p>
              <p className={`text-sm text-slate-200 ${mono ? "font-mono" : "font-medium"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Clinical disclaimer */}
        <p className="text-xs text-slate-700 text-center mt-4 leading-relaxed">
          AI-assisted analysis only. Not a substitute for qualified radiological review.
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
function PatientSidebar({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { data: patients = [], isLoading } = useQuery({
    queryKey: queryKeys.patients(),
    queryFn: () => fetchPatients(TOKEN),
  });

  const { data: scans = [] } = useQuery({
    queryKey: selectedId ? queryKeys.patientScans(selectedId) : [],
    queryFn: () => fetchPatientScans(selectedId!, TOKEN),
    enabled: !!selectedId,
  });

  return (
    <aside className="flex flex-col h-full bg-slate-950 border-r border-slate-800/60 w-72 flex-shrink-0">
      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-1">
          Patient Registry
        </p>
        <p className="text-lg font-semibold text-white">
          {isLoading ? "Loading…" : `${patients.length} Patient${patients.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />
            ))
          : patients.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200
                  ${selectedId === p.id
                    ? "bg-cyan-500/15 border border-cyan-500/30"
                    : "hover:bg-slate-800/60 border border-transparent"
                  }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${selectedId === p.id ? "bg-cyan-500/30 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
                    {p.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{p.display_name}</p>
                    <p className="text-xs text-slate-600 font-mono">{p.mrn}</p>
                  </div>
                  {p.scan_count > 0 && (
                    <span className="ml-auto text-xs bg-slate-800 text-slate-500 rounded-full px-2 py-0.5 flex-shrink-0">
                      {p.scan_count}
                    </span>
                  )}
                </div>
              </motion.button>
            ))
        }
      </div>

      {/* Scan history for selected patient */}
      <AnimatePresence>
        {selectedId && scans.length > 0 && (
          <motion.div
            className="border-t border-slate-800/60 px-3 py-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs font-semibold text-slate-600 tracking-widest uppercase px-1 mb-2">
              Scan History
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {scans.slice(0, 6).map((s) => (
                <div key={s.scan_id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      s.diagnostic_label === "ABNORMAL" ? "bg-red-500" : "bg-green-500"
                    }`} />
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(s.analyzed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs font-bold ${
                    s.diagnostic_label === "ABNORMAL" ? "text-red-400" : "text-green-400"
                  }`}>
                    {(s.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP HEADER BAR
// ─────────────────────────────────────────────────────────────────────────────
function Header({ practitionerName }: { practitionerName: string }) {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="relative w-8 h-8">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#22d3ee" strokeWidth="2" />
            <path d="M10 16h12M16 10v12" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="16" r="4" fill="#22d3ee" fillOpacity="0.2" />
          </svg>
        </div>
        <div>
          <span className="text-base font-bold text-white tracking-tight">MedAccess</span>
          <span className="text-base font-bold text-cyan-400 tracking-tight"> AI</span>
        </div>
        <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full px-2 py-0.5 font-semibold ml-1">
          BETA
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* System status */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className="text-xs text-slate-500">Model online</span>
        </div>

        {/* Practitioner avatar */}
        <div className="flex items-center gap-2 bg-slate-800/60 rounded-full px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-cyan-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-cyan-300">
              {practitionerName[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <span className="text-xs text-slate-300 font-medium">{practitionerName}</span>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const queryClient = useQueryClient();

  const handleAnalysisResult = useCallback((result: AnalysisResponse) => {
    setAnalysisResult(result);
    // Invalidate patient scan history so sidebar refreshes
    if (selectedPatientId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientScans(selectedPatientId) });
    }
  }, [selectedPatientId, queryClient]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {/* ── Ambient background grid ────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <Header practitionerName="Dr. Practitioner" />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <PatientSidebar
          selectedId={selectedPatientId}
          onSelect={setSelectedPatientId}
        />

        {/* ── Main content ────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-8">
          <motion.div
            className="max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Page title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">
                Radiographic Analysis
              </h1>
              <p className="text-sm text-slate-500">
                {selectedPatientId
                  ? "Scan will be linked to the selected patient record."
                  : "Select a patient from the sidebar or upload an anonymous scan."}
              </p>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left — Upload panel */}
              <div className="flex flex-col gap-6">
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
                  <h2 className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">
                    Upload Radiograph
                  </h2>
                  <ScanUploader
                    patientId={selectedPatientId}
                    onResult={handleAnalysisResult}
                  />
                </div>

                {/* Guidelines panel */}
                <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-6">
                  <h2 className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">
                    Imaging Guidelines
                  </h2>
                  <ul className="space-y-3">
                    {[
                      ["Format", "JPEG, PNG, or TIFF — 16-bit supported"],
                      ["Resolution", "Minimum 512 × 512 px recommended"],
                      ["Orientation", "PA (posterior-anterior) preferred for chest"],
                      ["PHI", "EXIF metadata stripped automatically before storage"],
                      ["Max Size", "25 MB per image"],
                    ].map(([k, v]) => (
                      <li key={k} className="flex gap-3 text-sm">
                        <span className="text-slate-600 w-24 flex-shrink-0">{k}</span>
                        <span className="text-slate-300">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right — Results panel */}
              <div>
                <AnimatePresence mode="wait">
                  {analysisResult ? (
                    <DiagnosticCard key={analysisResult.scan_id} result={analysisResult} />
                  ) : (
                    <motion.div
                      key="empty"
                      className="h-full min-h-64 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center gap-4 text-center p-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-30">
                        <rect x="8" y="8" width="32" height="32" rx="6" stroke="#64748b" strokeWidth="2" />
                        <circle cx="24" cy="22" r="6" stroke="#64748b" strokeWidth="2" />
                        <path d="M12 36c2-4 6-6 12-6s10 2 12 6" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <div>
                        <p className="text-slate-600 text-sm font-medium">No analysis yet</p>
                        <p className="text-slate-700 text-xs mt-1">
                          Upload a scan to see the ResNet50 diagnostic result here.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer disclaimer */}
            <div className="mt-8 flex items-center gap-2 text-xs text-slate-700">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#475569" strokeWidth="1.2" />
                <path d="M7 6v4M7 4.5v.5" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              MedAccess AI is a decision-support tool. All findings must be confirmed by a licensed radiologist.
              HIPAA-compliant infrastructure — PHI encrypted at rest and in transit.
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
