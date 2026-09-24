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
    if (init.method === "POST") return new Response(null, { status: 201 });
    const rows = url.includes("offset=0") ? Array.from({ length: 500 }, (_, i) => ({ id: String(i), payload: draft })) : [];
    return Response.json(rows);
  });
  const remote = createRemote("https://example.supabase.co/", "sb_publishable_test");
  await remote.put(draft);
  assert.equal(JSON.parse(requests[0].init.body).payload.isLocalDraft, undefined);
  assert.equal(requests[0].init.headers.apikey, "sb_publishable_test");
  assert.equal((await remote.list()).length, 500);
  assert.match(requests[2].url, /offset=500/);
  globalThis.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(remote.put(draft), /403/);
});
