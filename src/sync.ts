import type { Report } from "./data";

export interface ReportRemote {
  put(report: Report): Promise<void>;
  list(): Promise<Report[]>;
}

// Read the current state after each request: users may edit while a request is in flight.
export async function syncReports(remote: ReportRemote, read: () => Report[], write: (reports: Report[]) => void) {
  const pending = read().filter((report) => report.isLocalDraft);
  for (const report of pending) {
    await remote.put(report);
    write(read().map((current) => current.id === report.id && JSON.stringify(current) === JSON.stringify(report)
      ? { ...current, isLocalDraft: false, isSynced: true } : current));
  }
  const server = await remote.list();
  const unsent = read().filter((report) => report.isLocalDraft);
  const ids = new Set(unsent.map((report) => report.id));
  write([...unsent, ...server.filter((report) => !ids.has(report.id))]);
}

export function createRemote(url: string, key: string): ReportRemote {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/reports`;
  async function request(query: string, init: RequestInit = {}) {
    const response = await fetch(`${endpoint}${query}`, {
      ...init,
      headers: { apikey: key, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`同期に失敗しました (${response.status})`);
    return response;
  }
  return {
    async put(report) {
      const { isLocalDraft: _draft, isSynced: _synced, ...payload } = report;
      await request("?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: report.id, payload }),
      });
    },
    async list() {
      const reports: Report[] = [];
      // Paginate explicitly to avoid Supabase's default row limit.
      for (let offset = 0; ; offset += 500) {
        const response = await request(`?select=id,payload&order=id&limit=500&offset=${offset}`);
        const rows = await response.json() as Array<{ id: string; payload: Report }>;
        reports.push(...rows.map((row) => ({ ...row.payload, id: row.id, isLocalDraft: false, isSynced: true })));
        if (rows.length < 500) return reports;
      }
    },
  };
}
