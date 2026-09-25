import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(new URL("../src/sync.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { syncReports, createRemote } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const draft = { id: "one", reporterName: "テスト", personName: "本人", isLocalDraft: true };

test("failed upload retains queue and retry uses same ID", async () => {
  let state = [{ ...draft }];
  const ids = [];
  const remote = { put: async (r) => { ids.push(r.id); throw Error("offline"); }, list: async () => [] };
  await assert.rejects(syncReports(remote, () => state, (next) => { state = next; }));
  assert.equal(state[0].isLocalDraft, true);
  remote.put = async (r) => { ids.push(r.id); };
  remote.list = async () => [{ ...draft, isLocalDraft: false, isSynced: true }];
  await syncReports(remote, () => state, (next) => { state = next; });
  assert.deepEqual(ids, ["one", "one"]);
  assert.equal(state.length, 1);
  assert.equal(state[0].isLocalDraft, false);
});
test("edit during upload survives acknowledgement and download", async () => {
  let state = [{ ...draft }];
  await syncReports({ put: async () => { state = [{ ...draft, personName: "修正後" }]; },
    list: async () => [{ ...draft, isLocalDraft: false }] }, () => state, (next) => { state = next; });
  assert.equal(state[0].personName, "修正後");
  assert.equal(state[0].isLocalDraft, true);
});
test("partial success clears only acknowledged records", async () => {
  let state = [{ ...draft }, { ...draft, id: "two" }];
  await assert.rejects(syncReports({ put: async (r) => { if (r.id === "two") throw Error("timeout"); }, list: async () => [] },
    () => state, (next) => { state = next; }));
  assert.equal(state[0].isLocalDraft, false);
  assert.equal(state[1].isLocalDraft, true);
});
test("samples and cached records are never uploaded", async () => {
  let state = [{ id: "sample" }, { id: "cached", isSynced: true }];
  await syncReports({ put: async () => assert.fail("unexpected upload"), list: async () => [{ id: "remote" }] },
    () => state, (next) => { state = next; });
  assert.deepEqual(state, [{ id: "remote" }]);
});
test("download failure retains cache and new edits", async () => {
  let state = [{ id: "cached", isSynced: true }];
  await assert.rejects(syncReports({ put: async () => {}, list: async () => {
    state.push({ ...draft }); throw Error("offline");
  } }, () => state, (next) => { state = next; }));
  assert.equal(state.length, 2);
  assert.equal(state[1].isLocalDraft, true);
});
test("REST strips local flags, paginates and rejects errors", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url, init });
    if (init.method === "POST") return Response.json({ id: draft.id, payload: draft, updated_at: "2026-09-25T00:00:00Z" });
    const rows = !new URL(url).searchParams.has("p_after_id") ? Array.from({ length: 500 }, (_, i) => ({ id: String(i).padStart(3, "0"), payload: draft, updated_at: "2026-09-25T00:00:00.123456Z" })) : [];
    return Response.json(rows);
  });
  const remote = createRemote("https://example.supabase.co/", "sb_publishable_test");
  await remote.put(draft);
  assert.equal(JSON.parse(requests[0].init.body).p_report.isLocalDraft, undefined);
  assert.equal(requests[0].init.headers.apikey, "sb_publishable_test");
  assert.equal((await remote.list()).length, 500);
  assert.equal(new URL(requests[2].url).searchParams.get("p_after_id"), "499");
  globalThis.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(remote.put(draft), /403/);
});

const row = (id, updated_at, personName = id) => ({ id, updated_at, payload: { ...draft, id, personName } });
const t0 = "2026-09-25T00:00:00.123456Z";
const t1 = "2026-09-25T00:02:00.654321Z";

test("delta merges edits and additions, retains unchanged rows, and overlaps the timestamp boundary", async (t) => {
  const queries = [];
  const batches = [[row("old", "2026-09-24T00:00:00Z"), row("one", t0)],
    [row("one", t1, "更新"), row("two", t0)], []];
  t.mock.method(globalThis, "fetch", async (url) => {
    queries.push(new URL(url).searchParams);
    return Response.json(batches.shift());
  });
  const remote = createRemote("https://example.test", "key");
  assert.equal((await remote.list()).length, 2);
  const result = await remote.list();
  assert.equal(result.length, 3);
  assert.equal(result.find((r) => r.id === "one").personName, "更新");
  assert.equal(result.find((r) => r.id === "old").isSynced, true);
  assert.deepEqual(await remote.list(), result);
  assert.equal(queries[0].has("p_since"), false);
  assert.equal(queries[1].get("p_since"), "2026-09-24T23:59:00.123Z");
  assert.equal(queries[2].get("p_since"), "2026-09-25T00:01:00.654Z");
});

test("failure on a later page does not advance watermark or partially change cache", async (t) => {
  let step = 0;
  const queries = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    queries.push(new URL(url).searchParams);
    step++;
    if (step === 1) return Response.json([row("one", t0)]);
    if (step === 2) return Response.json(Array.from({ length: 500 }, (_, i) => row(`x${String(i).padStart(3, "0")}`, t1)));
    if (step === 3) return new Response(null, { status: 503 });
    return Response.json([]);
  });
  const remote = createRemote("https://example.test", "key");
  const original = await remote.list();
  await assert.rejects(remote.list(), /503/);
  assert.deepEqual(await remote.list(), original);
  assert.equal(queries[1].get("p_since"), queries[3].get("p_since"));
  assert.equal(queries[3].has("p_after_id"), false);
});

test("periodic full reconciliation catches late transactions and server deletions; reopening starts fresh", async (t) => {
  let now = Date.parse("2026-09-25T01:00:00Z");
  t.mock.method(Date, "now", () => now);
  const queries = [];
  const batches = [[row("deleted", t1)], [], [row("late", t0)], [row("late", t0)]];
  t.mock.method(globalThis, "fetch", async (url) => {
    queries.push(new URL(url).searchParams);
    return Response.json(batches.shift());
  });
  const remote = createRemote("https://example.test", "key");
  await remote.list();
  now += 30_000;
  assert.equal((await remote.list())[0].id, "deleted");
  assert.equal(queries[1].has("p_since"), true);
  now += 15 * 60_000;
  assert.deepEqual((await remote.list()).map((r) => r.id), ["late"]);
  assert.equal(queries[2].has("p_since"), false);
  await createRemote("https://example.test", "key").list();
  assert.equal(queries[3].has("p_since"), false);
});

test("empty initial database discovers its first report on the next sync", async (t) => {
  const batches = [[], [row("one", t0)]];
  t.mock.method(globalThis, "fetch", async () => Response.json(batches.shift()));
  const remote = createRemote("https://example.test", "key");
  assert.deepEqual(await remote.list(), []);
  assert.equal((await remote.list())[0].id, "one");
});

test("local save failure can retry without losing already downloaded changes", async (t) => {
  const batches = [[row("one", t0)], [row("two", t1)], []];
  t.mock.method(globalThis, "fetch", async () => Response.json(batches.shift()));
  const remote = createRemote("https://example.test", "key");
  let state = [];
  const read = () => state;
  const write = (next) => { state = next; };
  await syncReports(remote, read, write);
  await assert.rejects(syncReports(remote, read, () => { throw Error("storage full"); }));
  assert.equal(state.length, 1);
  await syncReports(remote, read, write);
  assert.deepEqual(state.map((r) => r.id), ["one", "two"]);
});

test("local edit made during delta download is preserved over the server version", async (t) => {
  let state = [];
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    if (calls === 2) state = [{ ...draft, personName: "編集中" }];
    return Response.json([row("one", calls === 1 ? t0 : t1, "サーバー")]);
  });
  const remote = createRemote("https://example.test", "key");
  await syncReports(remote, () => state, (next) => { state = next; });
  await syncReports(remote, () => state, (next) => { state = next; });
  assert.equal(state[0].personName, "編集中");
  assert.equal(state[0].isLocalDraft, true);
});

test("invalid update timestamp fails without advancing the successful download", async (t) => {
  const batches = [[row("one", t0)], [row("bad", "invalid")], []];
  t.mock.method(globalThis, "fetch", async () => Response.json(batches.shift()));
  const remote = createRemote("https://example.test", "key");
  const original = await remote.list();
  await assert.rejects(remote.list(), /更新日時/);
  assert.deepEqual(await remote.list(), original);
});

test("server canonical ID is adopted without losing a concurrent local edit", async () => {
  let state = [{ ...draft, id: "new-device" }];
  const remote = {
    put: async () => {
      state = [{ ...state[0], personName: "編集中" }];
      return { ...draft, id: "canonical", isLocalDraft: false, isSynced: true, serverUpdatedAt: t1 };
    },
    list: async () => [{ ...draft, id: "canonical", isLocalDraft: false }],
  };
  await syncReports(remote, () => state, next => { state = next; });
  assert.equal(state.length, 1);
  assert.equal(state[0].id, "canonical");
  assert.equal(state[0].personName, "編集中");
  assert.equal(state[0].isLocalDraft, true);
});

test("a deletion tombstone removes an edit made while downloading", async () => {
  let state = [{ ...draft, isLocalDraft: false }];
  await syncReports({ put: async () => assert.fail("no upload expected"), list: async () => {
    state = [{ ...draft, personName: "古い編集" }];
    return [{ id: "one", reporterName: "", isDeleted: true, isLocalDraft: false, isSynced: true }];
  } }, () => state, next => { state = next; });
  assert.equal(state[0].isDeleted, true);
  assert.equal(state[0].isLocalDraft, false);
});

test("deleted-name rejection clears only the rejected draft and downloads tombstones", async (t) => {
  let state = [{ ...draft, id: "new-device" }, { ...draft, id: "unrelated" }];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (init.method === "POST") return Response.json({ code: "P0002", message: "削除済みです" }, { status: 400 });
    return Response.json([{ ...row("canonical", t1), deleted_at: t1 }]);
  });
  const remote = createRemote("https://example.test", "key");
  await assert.rejects(syncReports(remote, () => state, next => { state = next; }), /削除済み/);
  assert.equal(state.some(r => r.id === "new-device"), false);
  assert.equal(state.find(r => r.id === "unrelated").isLocalDraft, true);
  assert.equal(state.find(r => r.id === "canonical").isDeleted, true);
});

test("token changes are used on the next request and local metadata is never uploaded", async (t) => {
  let token = "first-token";
  const requests = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    requests.push(init);
    return Response.json(row("one", t0));
  });
  const remote = createRemote("https://example.test", "key", async () => token);
  await remote.put({ ...draft, isDeleted: true, isSuperseded: true, serverUpdatedAt: t0 });
  token = undefined;
  await remote.put(draft);
  assert.equal(requests[0].headers.Authorization, "Bearer first-token");
  assert.equal(requests[1].headers.Authorization, undefined);
  const sent = JSON.parse(requests[0].body).p_report;
  for (const field of ["isDeleted", "isSuperseded", "serverUpdatedAt", "isLocalDraft", "isSynced"]) assert.equal(sent[field], undefined);
});
