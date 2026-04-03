// frontend/types/medical.ts

export type DiagnosticLabel = "NORMAL" | "ABNORMAL";
export type ScanStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
export type PractitionerRole = "RADIOLOGIST" | "ADMIN" | "VIEWER";

export interface Practitioner {
  id: string;
  email: string;
  display_name: string;
  role: PractitionerRole;
}
