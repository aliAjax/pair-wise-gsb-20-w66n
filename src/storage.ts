import type {
  ClassroomSession,
  ObservationRecord,
  ReviewRequest,
} from "./types";

const KEYS = {
  records: "hxwl06.records.v1",
  sessions: "hxwl06.sessions.v1",
  requests: "hxwl06.requests.v1",
  activeSessionId: "hxwl06.activeSessionId.v1",
};

export function makeId(prefix: string): string {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const STORE_KEYS = KEYS;

export function loadRecords(): ObservationRecord[] {
  return readJSON<ObservationRecord[]>(KEYS.records, seedRecords);
}
export function saveRecords(records: ObservationRecord[]): void {
  writeJSON(KEYS.records, records);
}

export function loadSessions(): ClassroomSession[] {
  return readJSON<ClassroomSession[]>(KEYS.sessions, []);
}
export function saveSessions(sessions: ClassroomSession[]): void {
  writeJSON(KEYS.sessions, sessions);
}

export function loadRequests(): ReviewRequest[] {
  return readJSON<ReviewRequest[]>(KEYS.requests, []);
}
export function saveRequests(requests: ReviewRequest[]): void {
  writeJSON(KEYS.requests, requests);
}

export function loadActiveSessionId(): string | null {
  return readJSON<string | null>(KEYS.activeSessionId, null);
}
export function saveActiveSessionId(id: string | null): void {
  writeJSON(KEYS.activeSessionId, id);
}

// 预置样本（在原有 3 条示例基础上扩充，供开课时挑选）
export const seedRecords: ObservationRecord[] = [
  {
    id: "rec-seed-1",
    name: "洋葱表皮",
    type: "植物组织",
    stain: "碘液",
    magnification: "400x",
    structure: "细胞壁、细胞核",
    description: "细胞壁清晰，细胞核可见，细胞呈规则长条形紧密排列。",
    conclusion: "碘液染色使细胞核着色加深，质壁无分离，制片合格。",
    createdAt: Date.parse("2026-09-15T09:00:00+08:00"),
  },
  {
    id: "rec-seed-2",
    name: "人血涂片",
    type: "血液涂片",
    stain: "瑞氏染色",
    magnification: "1000x",
    structure: "红细胞、白细胞",
    description: "红细胞分布均匀，无明显堆叠，可见分叶核中性粒细胞。",
    conclusion: "红细胞形态与染色正常，未见异常聚集，可作血型与形态教学片。",
    createdAt: Date.parse("2026-09-15T10:00:00+08:00"),
  },
  {
    id: "rec-seed-3",
    name: "草履虫",
    type: "微生物",
    stain: "活体观察",
    magnification: "200x",
    structure: "纤毛、口沟",
    description: "纤毛运动明显，虫体沿长轴旋转前进，口沟内可见食物颗粒。",
    conclusion: "活体运动活跃，纤毛与口沟结构典型，建议先低倍找虫再换高倍。",
    createdAt: Date.parse("2026-09-16T09:30:00+08:00"),
  },
  {
    id: "rec-seed-4",
    name: "人口腔上皮细胞",
    type: "动物组织",
    stain: "亚甲基蓝",
    magnification: "400x",
    structure: "细胞膜、细胞核",
    description: "细胞呈不规则扁平状，散在分布，细胞核染成深蓝色。",
    conclusion: "细胞膜边界清楚，核质对比明显，未发生细胞重叠堆叠。",
    createdAt: Date.parse("2026-09-16T14:00:00+08:00"),
  },
  {
    id: "rec-seed-5",
    name: "水绵接合生殖",
    type: "植物组织",
    stain: "活体观察",
    magnification: "100x",
    structure: "螺旋带状叶绿体、接合管",
    description: "两条水绵细胞相对形成接合管，部分细胞内可见合子。",
    conclusion: "螺旋带状叶绿体与接合管结构完整，是接合生殖典型材料。",
    createdAt: Date.parse("2026-09-17T09:00:00+08:00"),
  },
  {
    id: "rec-seed-6",
    name: "大肠杆菌涂片",
    type: "微生物",
    stain: "革兰氏染色",
    magnification: "1000x",
    structure: "杆状菌体",
    description: "菌体呈红色短杆状，分散无链状排列，视野内密度适中。",
    conclusion: "革兰氏阴性着色正确，菌体形态均一，染色流程符合要求。",
    createdAt: Date.parse("2026-09-17T15:00:00+08:00"),
  },
  {
    id: "rec-seed-7",
    name: "骨骼肌纵切",
    type: "动物组织",
    stain: "HE染色",
    magnification: "400x",
    structure: "横纹、细胞核",
    description: "肌纤维呈长圆柱状平行排列，明暗相间横纹清晰，多核贴边。",
    conclusion: "横纹与多核特征典型，纵切方向正确，可用于横纹结构讲解。",
    createdAt: Date.parse("2026-09-18T10:00:00+08:00"),
  },
  {
    id: "rec-seed-8",
    name: "蛙蹼毛细血管",
    type: "动物组织",
    stain: "活体观察",
    magnification: "100x",
    structure: "毛细血管网、红细胞",
    description: "毛细血管交织成网，红细胞单行缓慢通过，偶见短暂停顿。",
    conclusion: "血流方向与单行通过现象清楚，蛙蹼固定湿度适宜，活体观察成功。",
    createdAt: Date.parse("2026-09-18T16:00:00+08:00"),
  },
];
