import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./admin";
import { formatDateTime, type Report } from "./data";
import { fromServer } from "./sync";

export function AdminControls({ onAdminChange, onRestore, busy }: {
  onAdminChange: (admin: boolean) => void;
  onRestore: (report: Report) => Promise<void>;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [trash, setTrash] = useState<Report[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const authVersion = useRef(0);

  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      authVersion.current++;
      setUser(session?.user ?? null);
      setAdmin(false);
      onAdminChange(false);
      setTrash([]);
      setShowTrash(false);
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [onAdminChange]);

  useEffect(() => {
    if (!user || !supabase) return;
    let cancelled = false;
    void supabase.rpc("is_report_admin").then(({ data, error }) => {
      if (cancelled) return;
      const allowed = !error && data === true;
      setAdmin(allowed);
      onAdminChange(allowed);
      setMessage(error ? "管理者設定を確認できません。Supabaseの設定と通信を確認してください。"
        : allowed ? "管理者としてログインしました。" : "このアカウントには管理者権限がありません。");
    });
    return () => { cancelled = true; };
  }, [user, onAdminChange]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setWorking(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error("ログインできません。メールアドレスとパスワード、通信状態を確認してください。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ログインできませんでした。"); }
    finally { setPassword(""); setWorking(false); }
  }

  async function logout() {
    if (!supabase) return;
    setWorking(true);
    // Remove admin UI immediately, even if the sign-out request fails.
    authVersion.current++;
    setAdmin(false); onAdminChange(false); setTrash([]); setShowTrash(false);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setUser(null); setMessage("ログアウトしました。");
    } catch { setMessage("ログアウトを完了できません。もう一度ログアウトするか、この画面を再読み込みしてください。"); }
    finally { setWorking(false); }
  }

  async function loadTrash() {
    if (!supabase) return;
    const version = authVersion.current;
    const reports: Report[] = [];
    let after: string | undefined;
    for (;;) {
      const { data, error } = await supabase.rpc("list_deleted_reports", { p_after_id: after, p_limit: 500 });
      if (error) throw new Error("ごみ箱を取得できません。ログイン状態と通信を確認してください。");
      reports.push(...data.map(fromServer));
      if (data.length < 500) break;
      after = data[data.length - 1].id;
    }
    if (version !== authVersion.current) return;
    setTrash(reports); setShowTrash(true);
  }

  async function openTrash() {
    setWorking(true); setMessage("");
    try { await loadTrash(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "取得できませんでした。"); }
    finally { setWorking(false); }
  }

  async function restore(report: Report) {
    if (!window.confirm(`「${report.reporterName}」の回答（${formatDateTime(report.reportedAt)}）を復元しますか？`)) return;
    setWorking(true); setMessage("");
    try { await onRestore(report); await loadTrash(); setMessage("回答を復元しました。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "復元できませんでした。"); }
    finally { setWorking(false); }
  }

  if (!supabase) return null;
  return <section className="admin-panel" aria-label="管理者メニュー">
    <button type="button" className="admin-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {admin ? "管理者メニュー" : "管理者ログイン"}
    </button>
    {expanded && <div className="admin-content">
      {!user ? <form onSubmit={login} className="admin-login">
        <label className="field">メールアドレス<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="field">パスワード<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="secondary-button" disabled={working} type="submit">{working ? "ログイン中…" : "ログイン"}</button>
        <p className="intro small">管理者用です。通常の入力・修正にはログイン不要です。</p>
      </form> : <>
        <p>{user.email}</p>
        <div className="admin-actions">
          {admin && <button className="secondary-button" type="button" disabled={working || busy} onClick={() => void openTrash()}>ごみ箱を表示・更新</button>}
          <button className="secondary-button" type="button" disabled={working || busy} onClick={() => void logout()}>ログアウト</button>
        </div>
      </>}
      {message && <p role="status">{message}</p>}
      {admin && showTrash && <div className="admin-trash">
        <h2>ごみ箱</h2>
        {trash.length === 0 && <p>削除済みの回答はありません。</p>}
        {trash.map(report => <div className="trash-row" key={report.id}>
          <div><strong>{report.reporterName}</strong><br /><span>報告日時：{formatDateTime(report.reportedAt)}</span><br /><span>本人：{report.personName} ／ 保護者：{report.guardianName}</span></div>
          <button className="secondary-button" type="button" disabled={working || busy} onClick={() => void restore(report)}>復元</button>
        </div>)}
      </div>}
    </div>}
  </section>;
}
