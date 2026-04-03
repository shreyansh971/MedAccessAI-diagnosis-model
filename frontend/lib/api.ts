// frontend/lib/api.ts
/**
 * MedAccess AI — Analysis API Service
 *
 * Centralised data-fetching layer using the Fetch API.
 * All functions are consumed by TanStack Query hooks for caching,
 * background refetching, and optimistic updates.
 */

import { DiagnosticLabel, ScanStatus } from "@/types/medical";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors backend Pydantic schemas)
// ─────────────────────────────────────────────────────────────────────────────
export interface AnalysisResponse {
  scan_id: string;
  patient_id: string | null;
  confidence_score: number;
  diagnostic_label: DiagnosticLabel;
  threshold_used: number;
  processing_time_ms: number;
  image_key: string;
  analyzed_at: string;       // ISO 8601
  model_version: string;
}

export interface Patient {
  id: string;
  mrn: string;
  display_name: string;
  date_of_birth: string;
  sex: "M" | "F" | "O" | "U";
  notes?: string;
  created_at: string;
  scan_count: number;
}

export interface ScanSummary {
  scan_id: string;
  diagnostic_label: DiagnosticLabel;
  confidence_score: number;
  analyzed_at: string;
  status: ScanStatus;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base client
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public code?: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Unknown error", body.code);
  }

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────
export async function loginPractitioner(
  username: string,
  password: string
): Promise<TokenResponse> {
  const form = new FormData();
  form.append("username", username);
  form.append("password", password);
  return request<TokenResponse>("/v1/auth/token", { method: "POST", body: form });
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzeScan(
  file: File,
  token: string,
  patientId?: string
): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  if (patientId) form.append("patient_id", patientId);

  return request<AnalysisResponse>("/v1/analyze", {
    method: "POST",
    body: form,
    token,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPatients(token: string): Promise<Patient[]> {
  return request<Patient[]>("/v1/patients", { token });
}

export async function fetchPatient(id: string, token: string): Promise<Patient> {
  return request<Patient>(`/v1/patients/${id}`, { token });
}

export async function createPatient(
  data: Omit<Patient, "id" | "created_at" | "scan_count">,
  token: string
): Promise<Patient> {
  return request<Patient>("/v1/patients", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
    token,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Scan history
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPatientScans(
  patientId: string,
  token: string
): Promise<ScanSummary[]> {
  return request<ScanSummary[]>(`/v1/patients/${patientId}/scans`, { token });
}

export async function fetchScan(
  scanId: string,
  token: string
): Promise<AnalysisResponse> {
  return request<AnalysisResponse>(`/v1/scans/${scanId}`, { token });
}

// ─────────────────────────────────────────────────────────────────────────────
// TanStack Query key factory (prevents key typos across the app)
// ─────────────────────────────────────────────────────────────────────────────
export const queryKeys = {
  patients:     ()                     => ["patients"]             as const,
  patient:      (id: string)           => ["patients", id]         as const,
  patientScans: (id: string)           => ["patients", id, "scans"] as const,
  scan:         (id: string)           => ["scans", id]            as const,
} as const;

export { ApiError };
