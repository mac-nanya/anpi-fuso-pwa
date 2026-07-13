export type ReporterType = "本人" | "保護者" | "その他" | "";
export type SafetyStatus = "無事" | "軽症" | "重症" | "不明" | "";
export type LocationStatus = "自宅" | "避難所" | "病院" | "学校" | "職場" | "屋外" | "移動中" | "不明" | "その他" | "";
export type CompanionType = "家族" | "知人" | "自立" | "その他" | "";

export type Report = {
  id: string;
  reporterName: string;
  reporterType: ReporterType;
  personName: string;
  guardianName: string;
  personSafety: SafetyStatus;
  personLocation: LocationStatus;
  guardianSafety: SafetyStatus;
  guardianLocation: LocationStatus;
  companionType: CompanionType;
  reportedAt: string;
  sourceRowId: string;
  personComment: string;
  guardianComment: string;
  isLocalDraft?: boolean;
};

export type SummaryRow = {
  label: string;
  count: number;
  names: string[];
};

export const REPORTER_TYPES: ReporterType[] = ["本人", "保護者", "その他"];
export const SAFETY_STATUSES: SafetyStatus[] = ["無事", "軽症", "重症", "不明"];
export const LOCATION_STATUSES: LocationStatus[] = [
  "自宅",
  "避難所",
  "病院",
  "学校",
  "職場",
  "屋外",
  "移動中",
  "不明",
  "その他",
];
export const COMPANION_TYPES: CompanionType[] = ["家族", "知人", "自立", "その他"];

export const sampleReports: Report[] = [
  {
    id: "eI8FVjhTTb-5wX-oJKSsHg",
    reporterName: "松井",
    reporterType: "その他",
    personName: "岡本間次",
    guardianName: "岡本徳美",
    personSafety: "無事",
    personLocation: "自宅",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "知人",
    reportedAt: "2026-03-31T14:12:59.440Z",
    sourceRowId: "eI8FVjhTTb-5wX-oJKSsHg",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "XwU.QCg4SNOxZ6esowqX8w",
    reporterName: "間宮真奈美",
    reporterType: "保護者",
    personName: "間宮涼羽",
    guardianName: "間宮真奈美",
    personSafety: "無事",
    personLocation: "職場",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "家族",
    reportedAt: "2026-03-31T14:13:11.413Z",
    sourceRowId: "XwU.QCg4SNOxZ6esowqX8w",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "DgoOXuFsTMubZU7Xtt5luw",
    reporterName: "なんや",
    reporterType: "その他",
    personName: "ああ",
    guardianName: "かか",
    personSafety: "重症",
    personLocation: "病院",
    guardianSafety: "軽症",
    guardianLocation: "自宅",
    companionType: "その他",
    reportedAt: "2026-04-15T18:29:27.503Z",
    sourceRowId: "DgoOXuFsTMubZU7Xtt5luw",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "ALpFnH8PT52w0oBODjmyNA",
    reporterName: "なんや",
    reporterType: "本人",
    personName: "なんや",
    guardianName: "なんや2",
    personSafety: "軽症",
    personLocation: "学校",
    guardianSafety: "重症",
    guardianLocation: "避難所",
    companionType: "",
    reportedAt: "2026-04-16T09:08:52.863Z",
    sourceRowId: "ALpFnH8PT52w0oBODjmyNA",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "o8j4axSDSFiGHYyZv7nysg",
    reporterName: "岡本徳美",
    reporterType: "保護者",
    personName: "岡本間次",
    guardianName: "岡本徳美",
    personSafety: "無事",
    personLocation: "避難所",
    guardianSafety: "無事",
    guardianLocation: "避難所",
    companionType: "家族",
    reportedAt: "2026-05-02T00:47:36.431Z",
    sourceRowId: "o8j4axSDSFiGHYyZv7nysg",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "s1VEZNPYSyqs4eehaCxZ1Q",
    reporterName: "間宮真奈美",
    reporterType: "保護者",
    personName: "間宮涼羽",
    guardianName: "間宮真奈美",
    personSafety: "無事",
    personLocation: "自宅",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "家族",
    reportedAt: "2026-05-02T20:22:44.443Z",
    sourceRowId: "s1VEZNPYSyqs4eehaCxZ1Q",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "sAJp9jGiQo2WHWTuP-f3RA",
    reporterName: "高木真由美",
    reporterType: "",
    personName: "高木博康",
    guardianName: "高木真由美",
    personSafety: "軽症",
    personLocation: "病院",
    guardianSafety: "",
    guardianLocation: "病院",
    companionType: "家族",
    reportedAt: "2026-05-08T10:24:35.510Z",
    sourceRowId: "sAJp9jGiQo2WHWTuP-f3RA",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "TY0M2uVMSzybPs9MDejbog",
    reporterName: "岩井佐知子",
    reporterType: "保護者",
    personName: "岩井亜純",
    guardianName: "岩井佐知子",
    personSafety: "無事",
    personLocation: "自宅",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "家族",
    reportedAt: "2026-05-08T11:21:26.832Z",
    sourceRowId: "TY0M2uVMSzybPs9MDejbog",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "McXudwqKRk-utkczAEDfUg",
    reporterName: "岩井佐知子",
    reporterType: "保護者",
    personName: "岩井亜純",
    guardianName: "岩井佐知子",
    personSafety: "無事",
    personLocation: "自宅",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "その他",
    reportedAt: "2026-05-08T11:22:26.876Z",
    sourceRowId: "McXudwqKRk-utkczAEDfUg",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "nXlFBoYMTR-b.yFOL-jk2A",
    reporterName: "雨宮ともみ",
    reporterType: "保護者",
    personName: "雨宮辰実",
    guardianName: "雨宮ともみ",
    personSafety: "無事",
    personLocation: "職場",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "",
    reportedAt: "2026-05-08T11:25:33.143Z",
    sourceRowId: "nXlFBoYMTR-b.yFOL-jk2A",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "rKUiOeiJQXiPJFCpUiLPMw",
    reporterName: "千田 あかね",
    reporterType: "保護者",
    personName: "千田 蒼眞",
    guardianName: "千田 あかね",
    personSafety: "無事",
    personLocation: "自宅",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "",
    reportedAt: "2026-05-08T11:25:49.772Z",
    sourceRowId: "rKUiOeiJQXiPJFCpUiLPMw",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "TI79XYMDSP-mK0WDO6vVWw",
    reporterName: "三浦真理子",
    reporterType: "保護者",
    personName: "三浦斗真",
    guardianName: "三浦真理子",
    personSafety: "無事",
    personLocation: "学校",
    guardianSafety: "無事",
    guardianLocation: "職場",
    companionType: "その他",
    reportedAt: "2026-05-08T14:27:44.185Z",
    sourceRowId: "TI79XYMDSP-mK0WDO6vVWw",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "FimixVf3QdyiI4AbVr6HaQ",
    reporterName: "伊佐治 弥生",
    reporterType: "保護者",
    personName: "伊佐治 辰樹",
    guardianName: "伊佐治 弥生",
    personSafety: "不明",
    personLocation: "不明",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "自立",
    reportedAt: "2026-05-09T16:31:02.035Z",
    sourceRowId: "FimixVf3QdyiI4AbVr6HaQ",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "fYAbqfiNSwy06l3iNP6OXA",
    reporterName: "大西惠美子",
    reporterType: "保護者",
    personName: "大西由祐",
    guardianName: "大西惠美子",
    personSafety: "無事",
    personLocation: "移動中",
    guardianSafety: "無事",
    guardianLocation: "移動中",
    companionType: "家族",
    reportedAt: "2026-05-12T19:58:25.605Z",
    sourceRowId: "fYAbqfiNSwy06l3iNP6OXA",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "kLWjLIi5RXiq66cZ1AN7pg",
    reporterName: "宮地桂子",
    reporterType: "本人",
    personName: "宮地良輔",
    guardianName: "宮地桂子",
    personSafety: "",
    personLocation: "",
    guardianSafety: "",
    guardianLocation: "",
    companionType: "家族",
    reportedAt: "2026-05-12T20:58:56.120Z",
    sourceRowId: "kLWjLIi5RXiq66cZ1AN7pg",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "LcbLcRZoRPG2xEII.RoTyQ",
    reporterName: "宮地桂子",
    reporterType: "",
    personName: "宮地良輔",
    guardianName: "宮地桂子",
    personSafety: "",
    personLocation: "",
    guardianSafety: "",
    guardianLocation: "",
    companionType: "家族",
    reportedAt: "2026-05-13T14:10:03.159Z",
    sourceRowId: "LcbLcRZoRPG2xEII.RoTyQ",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "lssyy.xTSNGK6gweYuGvpA",
    reporterName: "岡本徳美",
    reporterType: "保護者",
    personName: "岡本間次",
    guardianName: "岡本徳美",
    personSafety: "",
    personLocation: "職場",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "自立",
    reportedAt: "2026-05-13T15:09:56.220Z",
    sourceRowId: "lssyy.xTSNGK6gweYuGvpA",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "Ex1G2cAcQ3aCEnnVSdP47w",
    reporterName: "岡本さとは",
    reporterType: "その他",
    personName: "岡本間次",
    guardianName: "岡本徳美",
    personSafety: "不明",
    personLocation: "移動中",
    guardianSafety: "不明",
    guardianLocation: "移動中",
    companionType: "家族",
    reportedAt: "2026-05-17T22:39:17.629Z",
    sourceRowId: "Ex1G2cAcQ3aCEnnVSdP47w",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "xMoTizDnRFialKCstnyeDw",
    reporterName: "なんや",
    reporterType: "その他",
    personName: "なんや",
    guardianName: "なんや2",
    personSafety: "無事",
    personLocation: "自宅",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "その他",
    reportedAt: "2026-05-20T12:01:54.245Z",
    sourceRowId: "xMoTizDnRFialKCstnyeDw",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "PAsG2g.yTEOR56uiwtLDIA",
    reporterName: "なんや",
    reporterType: "保護者",
    personName: "なんや",
    guardianName: "なんや2",
    personSafety: "重症",
    personLocation: "病院",
    guardianSafety: "無事",
    guardianLocation: "その他",
    companionType: "自立",
    reportedAt: "2026-05-21T21:28:14.533Z",
    sourceRowId: "PAsG2g.yTEOR56uiwtLDIA",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "edjpfVZhT6OC7PyW.lXEJg",
    reporterName: "なんや",
    reporterType: "保護者",
    personName: "なんや",
    guardianName: "なんや2",
    personSafety: "不明",
    personLocation: "その他",
    guardianSafety: "重症",
    guardianLocation: "不明",
    companionType: "自立",
    reportedAt: "2026-05-21T21:45:04.422Z",
    sourceRowId: "edjpfVZhT6OC7PyW.lXEJg",
    personComment: "",
    guardianComment: "",
  },
  {
    id: "l7jjtRbrSjqy3rHXIa9BOg",
    reporterName: "間宮真奈美",
    reporterType: "保護者",
    personName: "間宮涼羽",
    guardianName: "間宮真奈美",
    personSafety: "不明",
    personLocation: "移動中",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "自立",
    reportedAt: "2026-05-26T19:17:16.533Z",
    sourceRowId: "l7jjtRbrSjqy3rHXIa9BOg",
    personComment: "仕事から歩いて帰ってきてると思います",
    guardianComment: "",
  },
  {
    id: "ElUz7FYaT4iBPiEHbvEwdA",
    reporterName: "岡本徳美",
    reporterType: "保護者",
    personName: "岡本間次",
    guardianName: "岡本徳美",
    personSafety: "軽症",
    personLocation: "職場",
    guardianSafety: "無事",
    guardianLocation: "自宅",
    companionType: "その他",
    reportedAt: "2026-05-26T23:16:19.425Z",
    sourceRowId: "ElUz7FYaT4iBPiEHbvEwdA",
    personComment: "本人、職場にしばらく待機",
    guardianComment: "",
  },
];

export function normalizeName(value: string): string {
  return value.replace(/\s+/g, "").trim().toLocaleLowerCase("ja-JP");
}

export function sortByLatest(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt));
}

export function latestByReporter(reports: Report[]): Report[] {
  const map = new Map<string, Report>();
  for (const report of sortByLatest(reports)) {
    const key = normalizeName(report.reporterName);
    if (key && !map.has(key)) {
      map.set(key, report);
    }
  }
  return Array.from(map.values());
}

export function summarize(
  reports: Report[],
  labelOrder: string[],
  valueSelector: (report: Report) => string,
  nameSelector: (report: Report) => string,
): SummaryRow[] {
  return labelOrder.map((label) => {
    const matches = reports.filter((report) => valueSelector(report) === label);
    return {
      label,
      count: matches.length,
      names: matches.map(nameSelector).filter(Boolean),
    };
  });
}

export function formatDateTime(value: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function makeReportId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
