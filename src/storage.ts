import { Report, sampleReports } from "./data";

const STORAGE_KEY = "anpi-fuso-reports-v1";

export function loadReports(): Report[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return sampleReports;
  try {
    const parsed = JSON.parse(raw) as Report[];
    return Array.isArray(parsed) ? parsed : sampleReports;
  } catch {
    return sampleReports;
  }
}

export function saveReports(reports: Report[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function resetReports(): Report[] {
  window.localStorage.removeItem(STORAGE_KEY);
  return sampleReports;
}
