import type { Report } from "./data";

class DeletedReportError extends Error {}

export interface ReportRemote {
  put(report: Report): Promise<Report | void>;
  list(): Promise<Report[]>;
}

// Read the current state after each request: users may edit while a request is in flight.
export async function syncReports(remote: ReportRemote, read: () => Report[], write: (reports: Report[]) => void) {
  const pending = read().filter((report) => report.isLocalDraft);
  for (const report of pending) {
    try {
      const saved = await remote.put(report);
      write(read().map((current) => {
        if (current.id !== report.id) return current;
        if (JSON.stringify(current) === JSON.stringify(report)) {
          return saved ?? { ...current, isLocalDraft: false, isSynced: true };
        }
        // Keep edits made in flight, while adopting the server's canonical ID.
        return saved ? { ...current, id: saved.id, serverUpdatedAt: saved.serverUpdatedAt } : current;
      }));
    } catch (error) {
      if (!(error instanceof DeletedReportError)) throw error;
      // Continue downloading even when a stale draft targets a deleted record.
      // Its tombstone must reach this device; other unsent drafts stay queued.
      const server = await remote.list();
      const hidden = new Set(server.filter((r) => r.isDeleted || r.isSuperseded).map((r) => r.id));
      const unsent = read().filter((r) => r.isLocalDraft && r.id !== report.id && !hidden.has(r.id));
      const ids = new Set(unsent.map((r) => r.id));
      write([...unsent, ...server.filter((r) => !ids.has(r.id))]);
      throw error;
    }
  }
  const server = await remote.list();
  const hidden = new Set(server.filter((r) => r.isDeleted || r.isSuperseded).map((r) => r.id));
  const unsent = read().filter((report) => report.isLocalDraft && !hidden.has(report.id));
  const ids = new Set(unsent.map((report) => report.id));
  write([...unsent, ...server.filter((report) => !ids.has(report.id))]);
}

type ServerRow = { id: string; payload: Report; updated_at: string; deleted_at?: string | null; superseded_by?: string | null };
export function fromServer(row: ServerRow): Report {
  return { ...row.payload, id: row.id, isLocalDraft: false, isSynced: true,
    isDeleted: Boolean(row.deleted_at), isSuperseded: Boolean(row.superseded_by), serverUpdatedAt: row.updated_at };
}

export function createRemote(url: string, key: string, getToken?: () => Promise<string | undefined>): ReportRemote {
  // Session-only cache: reopening the app always starts with a complete download.
  // list() still returns the complete snapshot so local drafts remain protected by syncReports.
  let cached = new Map<string, Report>();
  let watermark: string | undefined;
  let lastFullSync = 0;
  const overlapMs = 60_000;
  const fullSyncIntervalMs = 15 * 60_000;
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1`;
  async function request(query: string, init: RequestInit = {}) {
    const token = await getToken?.();
    const response = await fetch(`${endpoint}${query}`, {
      ...init,
      headers: { apikey: key, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (error.code === "P0002") throw new DeletedReportError(error.message);
      if (error.code === "PGRST202") throw new Error("サーバーの同期設定がまだ完了していません。管理者に確認してください。");
      throw new Error(error.message || `同期に失敗しました (${response.status})`);
    }
    return response;
  }
  return {
    async put(report) {
      const { isLocalDraft: _draft, isSynced: _synced, isDeleted: _deleted, isSuperseded: _superseded, serverUpdatedAt: _updated, ...payload } = report;
      const response = await request("/rpc/save_report", {
        method: "POST", body: JSON.stringify({ p_report: payload }),
      });
      return fromServer(await response.json() as ServerRow);
    },
    async list() {
      const startedAt = Date.now();
      const full = !watermark || startedAt - lastFullSync >= fullSyncIntervalMs;
      const since = !full && watermark
        ? new Date(Date.parse(watermark) - overlapMs).toISOString() : undefined;
      const next = full ? new Map<string, Report>() : new Map(cached);
      let nextWatermark = full ? undefined : watermark;
      let afterId: string | undefined;
      // Keyset pagination avoids offset shifts when other clients insert records.
      // Timestamp overlap handles equal timestamps and short overlapping transactions;
      // periodic full reconciliation also catches longer transactions and server-side deletions.
      for (;;) {
        const query = new URLSearchParams({ p_limit: "500" });
        if (since) query.set("p_since", since);
        if (afterId !== undefined) query.set("p_after_id", afterId);
        const response = await request(`/rpc/list_reports?${query}`);
        const rows = await response.json() as ServerRow[];
        for (const row of rows) {
          if (!row.updated_at || !Number.isFinite(Date.parse(row.updated_at))) {
            throw new Error("サーバーの更新日時を取得できませんでした");
          }
          next.set(row.id, fromServer(row));
          if (!nextWatermark || Date.parse(row.updated_at) > Date.parse(nextWatermark)) {
            nextWatermark = row.updated_at;
          }
        }
        if (rows.length < 500) break;
        afterId = rows[rows.length - 1].id;
      }
      // Commit only after every page succeeds. Failed downloads retry from the old watermark.
      cached = next;
      watermark = nextWatermark;
      if (full) lastFullSync = startedAt;
      return Array.from(cached.values());
    },
  };
}
