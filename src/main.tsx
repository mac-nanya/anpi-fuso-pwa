import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  COMPANION_TYPES,
  CompanionType,
  formatDateTime,
  latestByReporter,
  LOCATION_STATUSES,
  LocationStatus,
  makeReportId,
  Report,
  REPORTER_TYPES,
  ReporterType,
  SAFETY_STATUSES,
  SafetyStatus,
  sortByLatest,
  summarize,
} from "./data";
import { loadReports, saveReports } from "./storage";
import "./styles.css";

type ViewKey = "input" | "list" | "safety" | "location" | "detail";

type DetailPriority = "person" | "guardian";

type SummaryMode = {
  priority: DetailPriority;
  valueSelector: (report: Report) => string;
  nameSelector: (report: Report) => string;
};

type Draft = {
  reporterName: string;
  reporterType: ReporterType;
  personName: string;
  guardianName: string;
  personSafety: SafetyStatus;
  personLocation: LocationStatus;
  guardianSafety: SafetyStatus;
  guardianLocation: LocationStatus;
  companionType: CompanionType;
  personComment: string;
  guardianComment: string;
};

const emptyDraft: Draft = {
  reporterName: "",
  reporterType: "保護者",
  personName: "",
  guardianName: "",
  personSafety: "",
  personLocation: "",
  guardianSafety: "",
  guardianLocation: "",
  companionType: "",
  personComment: "",
  guardianComment: "",
};

const navItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "input", label: "入力画面", icon: "✎" },
  { key: "list", label: "リスト", icon: "▦" },
  { key: "safety", label: "安否", icon: "♡" },
  { key: "location", label: "現在地", icon: "▤" },
];

function App() {
  const [reports, setReports] = useState<Report[]>(() => loadReports());
  const [view, setView] = useState<ViewKey>("input");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [detailPriority, setDetailPriority] = useState<DetailPriority>("person");
  const [safetyPriority, setSafetyPriority] = useState<DetailPriority>("person");
  const [locationPriority, setLocationPriority] = useState<DetailPriority>("person");

  const latestReports = useMemo(() => latestByReporter(reports), [reports]);
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? latestReports.find((report) => report.id === selectedId),
    [latestReports, reports, selectedId],
  );

  const currentTitle = view === "detail" ? selectedReport?.reporterName ?? "詳細" : navItems.find((item) => item.key === view)?.label ?? "入力画面";

  function persist(nextReports: Report[]) {
    setReports(nextReports);
    saveReports(nextReports);
  }

  function goTo(nextView: ViewKey) {
    setView(nextView);
    if (nextView !== "detail") setSelectedId(null);
    setEditingReportId(null);
    setNotice("");
  }

  function openDetail(report: Report, priority: DetailPriority = "person") {
    setSelectedId(report.id);
    setDetailPriority(priority);
    setView("detail");
    setNotice("");
  }

  function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!draft.reporterName.trim() || !draft.personName.trim()) return;
    const originalReport = editingReportId ? reports.find((report) => report.id === editingReportId) : undefined;
    const report: Report = {
      id: originalReport?.id ?? makeReportId(),
      sourceRowId: originalReport?.sourceRowId ?? "",
      reporterName: draft.reporterName.trim(),
      reporterType: draft.reporterType,
      personName: draft.personName.trim(),
      guardianName: draft.guardianName.trim(),
      personSafety: draft.personSafety,
      personLocation: draft.personLocation,
      guardianSafety: draft.guardianSafety,
      guardianLocation: draft.guardianLocation,
      companionType: draft.companionType,
      personComment: draft.personComment.trim(),
      guardianComment: draft.guardianComment.trim(),
      reportedAt: new Date().toISOString(),
      isLocalDraft: true,
    };
    if (originalReport) {
      persist(reports.map((current) => (current.id === originalReport.id ? report : current)));
      setNotice("修正内容を端末に保存しました。入力者名を直した場合は、一覧と集計にも反映されます。");
    } else {
      persist([report, ...reports]);
      setNotice("入力内容を端末に保存しました。今後のAPI連携ではここからサーバーへ同期します。");
    }
    setDraft(emptyDraft);
    setEditingReportId(null);
    setSelectedId(report.id);
    setView("detail");
  }

  function fillFromReport(report: Report, editMode: boolean) {
    setDraft({
      reporterName: report.reporterName,
      reporterType: report.reporterType,
      personName: report.personName,
      guardianName: report.guardianName,
      personSafety: report.personSafety,
      personLocation: report.personLocation,
      guardianSafety: report.guardianSafety,
      guardianLocation: report.guardianLocation,
      companionType: report.companionType,
      personComment: report.personComment,
      guardianComment: report.guardianComment,
    });
    setEditingReportId(editMode ? report.id : null);
    setView("input");
    setNotice(editMode ? "詳細の内容を修正しています。入力者名も変更できます。" : "前回の回答を入力画面に読み込みました。内容を直して提出できます。");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <button className="brand" onClick={() => goTo("input")} type="button">
            anpi-fuso
          </button>
          <nav className="top-nav" aria-label="主要画面">
            {navItems.map((item) => (
              <button
                className={view === item.key ? "nav-button active" : "nav-button"}
                key={item.key}
                onClick={() => goTo(item.key)}
                type="button"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mobile-title">{currentTitle}</div>
      </header>

      <main className="content">
        {notice ? <div className="notice">{notice}</div> : null}
        {view === "input" ? (
          <InputView
            draft={draft}
            setDraft={setDraft}
            onSubmit={submitReport}
            onList={() => goTo("list")}
            isEditing={Boolean(editingReportId)}
            onCancelEdit={() => {
              setDraft(emptyDraft);
              setEditingReportId(null);
              setNotice("");
            }}
          />
        ) : null}
        {view === "list" ? (
          <ListView reports={latestReports} search={search} setSearch={setSearch} onDetail={openDetail} onInput={() => goTo("input")} />
        ) : null}
        {view === "detail" && selectedReport ? (
          <DetailView report={selectedReport} priority={detailPriority} onBack={() => goTo("list")} onEdit={fillFromReport} />
        ) : null}
        {view === "safety" ? (
          <SummaryView
            title={`${safetyPriority === "person" ? "本人" : "保護者"}の安否`}
            description={`入力者ごとの最新回答から、${safetyPriority === "person" ? "本人" : "保護者"}の安否を集計しています`}
            reports={latestReports}
            rows={summarize(
              latestReports,
              SAFETY_STATUSES,
              (report) => (safetyPriority === "person" ? report.personSafety : report.guardianSafety),
              (report) => (safetyPriority === "person" ? report.personName : report.guardianName),
            )}
            kind="safety"
            mode={{
              priority: safetyPriority,
              valueSelector: (report) => (safetyPriority === "person" ? report.personSafety : report.guardianSafety),
              nameSelector: (report) => (safetyPriority === "person" ? report.personName : report.guardianName),
            }}
            subject={safetyPriority}
            onSubjectChange={setSafetyPriority}
            onBack={() => goTo("list")}
            onDetail={openDetail}
          />
        ) : null}
        {view === "location" ? (
          <SummaryView
            title={`${locationPriority === "person" ? "本人" : "保護者"}の現在地`}
            description={`入力者ごとの最新回答から、${locationPriority === "person" ? "本人" : "保護者"}の現在地を集計しています`}
            reports={latestReports}
            rows={summarize(
              latestReports,
              LOCATION_STATUSES,
              (report) => (locationPriority === "person" ? report.personLocation : report.guardianLocation),
              (report) => (locationPriority === "person" ? report.personName : report.guardianName),
            )}
            kind="location"
            mode={{
              priority: locationPriority,
              valueSelector: (report) => (locationPriority === "person" ? report.personLocation : report.guardianLocation),
              nameSelector: (report) => (locationPriority === "person" ? report.personName : report.guardianName),
            }}
            subject={locationPriority}
            onSubjectChange={setLocationPriority}
            onBack={() => goTo("list")}
            onDetail={openDetail}
          />
        ) : null}
      </main>

      <nav className="bottom-nav" aria-label="主要画面">
        {navItems.map((item) => (
          <button className={view === item.key ? "bottom-button active" : "bottom-button"} key={item.key} onClick={() => goTo(item.key)} type="button">
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function InputView({
  draft,
  setDraft,
  onSubmit,
  onList,
  isEditing,
  onCancelEdit,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  onSubmit: (event: FormEvent) => void;
  onList: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
}) {
  const canSubmit = Boolean(draft.reporterName.trim() && draft.personName.trim());

  return (
    <section className="view">
      <h1>安否情報の入力をお願いします</h1>
      <button className="primary-button wide" onClick={onList} type="button">
        リストをみる
      </button>
      {isEditing ? (
        <div className="edit-banner">
          <strong>内容を修正中です</strong>
          <span>入力者名を含めて修正できます。保存すると元の詳細が置き換わります。</span>
          <button className="secondary-button" onClick={onCancelEdit} type="button">
            修正をやめる
          </button>
        </div>
      ) : null}

      <form className="form" onSubmit={onSubmit}>
        <TextField
          label="入力者名"
          required
          value={draft.reporterName}
          onChange={(reporterName) => setDraft((current) => ({ ...current, reporterName }))}
        />
        <ChoiceGroup
          label="入力者区分"
          required
          options={REPORTER_TYPES}
          value={draft.reporterType}
          onChange={(reporterType) => setDraft((current) => ({ ...current, reporterType: reporterType as ReporterType }))}
        />

        <div className="section-divider" />
        <TextField
          label="本人の名前"
          required
          value={draft.personName}
          onChange={(personName) => setDraft((current) => ({ ...current, personName }))}
        />
        <p className="help-text">名前を入力してください<br />あてはまるものを タッチしてください</p>
        <ChoiceGroup
          label="本人の安否"
          options={SAFETY_STATUSES}
          value={draft.personSafety}
          onChange={(personSafety) => setDraft((current) => ({ ...current, personSafety: personSafety as SafetyStatus }))}
        />
        <ChoiceGroup
          label="本人の現在地"
          options={LOCATION_STATUSES}
          value={draft.personLocation}
          onChange={(personLocation) => setDraft((current) => ({ ...current, personLocation: personLocation as LocationStatus }))}
        />
        <ChoiceGroup
          label="同伴者区分"
          options={COMPANION_TYPES}
          value={draft.companionType}
          onChange={(companionType) => setDraft((current) => ({ ...current, companionType: companionType as CompanionType }))}
        />
        <TextField
          label="本人コメント"
          value={draft.personComment}
          onChange={(personComment) => setDraft((current) => ({ ...current, personComment }))}
          multiline
        />

        <div className="section-divider" />
        <TextField
          label="保護者の名前"
          value={draft.guardianName}
          onChange={(guardianName) => setDraft((current) => ({ ...current, guardianName }))}
        />
        <p className="help-text">名前を入力してください<br />あてはまるものを タッチしてください</p>
        <ChoiceGroup
          label="保護者の安否"
          options={SAFETY_STATUSES}
          value={draft.guardianSafety}
          onChange={(guardianSafety) => setDraft((current) => ({ ...current, guardianSafety: guardianSafety as SafetyStatus }))}
        />
        <ChoiceGroup
          label="保護者の現在地"
          options={LOCATION_STATUSES}
          value={draft.guardianLocation}
          onChange={(guardianLocation) => setDraft((current) => ({ ...current, guardianLocation: guardianLocation as LocationStatus }))}
        />
        <TextField
          label="保護者コメント"
          value={draft.guardianComment}
          onChange={(guardianComment) => setDraft((current) => ({ ...current, guardianComment }))}
          multiline
        />

        <p className="submit-note">※「提出」を押すと端末に保存されます</p>
        <button className="primary-button wide" disabled={!canSubmit} type="submit">
          {isEditing ? "修正を保存" : "提出"}
        </button>
      </form>
    </section>
  );
}

function ListView({
  reports,
  search,
  setSearch,
  onDetail,
  onInput,
}: {
  reports: Report[];
  search: string;
  setSearch: (value: string) => void;
  onDetail: (report: Report) => void;
  onInput: () => void;
}) {
  const filtered = reports.filter((report) => {
    const haystack = [report.reporterName, report.personName, report.guardianName].join(" ").toLocaleLowerCase("ja-JP");
    return haystack.includes(search.toLocaleLowerCase("ja-JP"));
  });

  return (
    <section className="view narrow">
      <p className="intro">入力者名ごとの最新1件を表示しています</p>
      <button className="primary-button wide" onClick={onInput} type="button">
        安否を入力する
      </button>
      <p className="help-text compact">名前をタッチすると、詳細が表示されます</p>
      <input className="search-input" placeholder="検索" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="list">
        {filtered.map((report) => (
          <button className="list-row" key={report.id} onClick={() => onDetail(report)} type="button">
            <span className="list-date">{formatDateTime(report.reportedAt)}</span>
            <strong>本人 ：{report.personName || "未入力"}　保護者：{report.guardianName || "未入力"}</strong>
            <span>入力者：{report.reporterName}</span>
            <span className="chevron">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DetailView({
  report,
  priority,
  onBack,
  onEdit,
}: {
  report: Report;
  priority: DetailPriority;
  onBack: () => void;
  onEdit: (report: Report, editMode: boolean) => void;
}) {
  const personSection = (
    <DetailSection color="pink" title="本人" key="person">
      <DetailGrid
        rows={[
          ["本人名", report.personName],
          ["本人安否", report.personSafety || "未入力"],
          ["本人現在地", report.personLocation || "未入力"],
          ["同伴者区分", report.companionType || "未入力"],
          ["コメント", report.personComment || ""],
        ]}
      />
    </DetailSection>
  );
  const guardianSection = (
    <DetailSection color="green" title="保護者" key="guardian">
      <DetailGrid
        rows={[
          ["保護者名", report.guardianName],
          ["保護者安否", report.guardianSafety || "未入力"],
          ["保護者現在地", report.guardianLocation || "未入力"],
          ["コメント", report.guardianComment || ""],
        ]}
      />
    </DetailSection>
  );
  const orderedSections = priority === "guardian" ? [guardianSection, personSection] : [personSection, guardianSection];

  return (
    <section className="view detail-view">
      <div className="button-pair">
        <button className="primary-button" onClick={onBack} type="button">
          もどる
        </button>
        <button className="secondary-button" onClick={() => onEdit(report, true)} type="button">
          内容を修正する
        </button>
      </div>
      <p className="eyebrow">{report.reporterType || "入力者"}</p>
      <h1>{report.reporterName}</h1>
      <p className="date-muted">{formatDateTime(report.reportedAt)}</p>

      {orderedSections}
      <DetailSection color="yellow" title="入力した人">
        <DetailGrid
          rows={[
            ["入力時刻", formatDateTime(report.reportedAt)],
            ["入力者名", report.reporterName],
            ["入力者区分", report.reporterType || "未入力"],
            ["保存状態", report.isLocalDraft ? "端末保存" : "サンプルデータ"],
          ]}
        />
      </DetailSection>
    </section>
  );
}

function SummaryView({
  title,
  description,
  reports,
  rows,
  kind,
  mode,
  subject,
  onSubjectChange,
  onBack,
  onDetail,
}: {
  title: string;
  description: string;
  reports: Report[];
  rows: Array<{ label: string; count: number; names: string[] }>;
  kind: "safety" | "location";
  mode: SummaryMode;
  subject: DetailPriority;
  onSubjectChange: (subject: DetailPriority) => void;
  onBack: () => void;
  onDetail: (report: Report, priority?: DetailPriority) => void;
}) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const chartMax = Math.max(...rows.map((row) => row.count), 0) + 10;
  const selectedRows = selectedLabel
    ? sortByLatest(reports).filter((report) => mode.valueSelector(report) === selectedLabel)
    : [];
  const selectedTitle = selectedLabel ?? (kind === "safety" ? "状況" : "場所");
  const subjectLabel = subject === "person" ? "本人" : "保護者";

  useEffect(() => {
    setSelectedLabel(null);
  }, [subject, kind]);

  if (selectedLabel) {
    return (
      <section className="view narrow">
        <button className="primary-button wide" onClick={() => setSelectedLabel(null)} type="button">
          もどる
        </button>
        <p className="breadcrumb">
          {subjectLabel}の{kind === "safety" ? "安否" : "現在地"} &gt; {selectedTitle}
        </p>
        <h1>{selectedTitle}</h1>
        <p className="intro small">{selectedRows.length}件の対象者を表示しています</p>
        <div className="target-list standalone">
          {selectedRows.map((report) => (
            <button className="target-row" key={report.id} onClick={() => onDetail(report, mode.priority)} type="button">
              <strong>{mode.nameSelector(report) || "未入力"}</strong>
              <span>入力者：{report.reporterName}</span>
              <span>{formatDateTime(report.reportedAt)}</span>
              <span className="chevron">›</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="view">
      <p className="intro">{description}</p>
      <button className="primary-button wide" onClick={onBack} type="button">
        リストにもどる
      </button>
      <div className="segment-control" aria-label="対象切り替え">
        <button className={subject === "person" ? "selected" : ""} onClick={() => onSubjectChange("person")} type="button">
          本人
        </button>
        <button className={subject === "guardian" ? "selected" : ""} onClick={() => onSubjectChange("guardian")} type="button">
          保護者
        </button>
      </div>
      <p className="intro small">状況、件数、名前を表示しています</p>
      <h1>{title}</h1>
      <div className="summary-table" role="table" aria-label={title}>
        <div className="summary-header" role="row">
          <span>{kind === "safety" ? "状況" : "場所"}</span>
          <span>件数</span>
          <span>名前</span>
        </div>
        {rows.map((row) => (
          <button
            className="summary-row"
            disabled={row.count === 0}
            key={row.label}
            onClick={() => setSelectedLabel(row.label)}
            role="row"
            type="button"
          >
            <strong>{row.label}</strong>
            <span>{row.count}</span>
            <span>{row.names.join(", ")}</span>
          </button>
        ))}
      </div>
      <p className="help-text compact">行をタッチすると、対象者一覧に切り替わります</p>
      <p className="help-text compact">件数別でグラフにしています</p>
      <div className="chart-list">
        {rows.map((row) => (
          <div className="bar-row" key={row.label} aria-label={`${row.label} ${row.count}件`}>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${row.count === 0 ? 0 : (row.count / chartMax) * 100}%` }} />
            </div>
            <span>{row.label}</span>
            <strong>{row.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? <em>必須</em> : null}
      </span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="choice-group">
      <legend>
        {label}
        {required ? <em>必須</em> : null}
      </legend>
      <div className="chips">
        {options.map((option) => (
          <button className={`${value === option ? "chip selected" : "chip"} ${statusClassName(option)}`} key={option} onClick={() => onChange(option)} type="button">
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function statusClassName(option: string) {
  switch (option) {
    case "無事":
      return "status-safe";
    case "軽症":
      return "status-minor";
    case "重症":
      return "status-severe";
    case "不明":
      return "status-unknown";
    default:
      return "";
  }
}

function DetailSection({ title, color, children }: { title: string; color: "pink" | "green" | "yellow"; children: React.ReactNode }) {
  return (
    <section className={`detail-section ${color}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="detail-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || " "}</dd>
        </div>
      ))}
    </dl>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
