import type { ClassroomSession, ObservationRecord, Role } from "./types";
import { seedRecords } from "./seedData";

const KEYS = {
  records: "hxwl06.records.v1",
  activeSession: "hxwl06.session.active.v1",
  history: "hxwl06.sessions.history.v1",
  role: "hxwl06.role.v1",
  studentName: "hxwl06.studentName.v1",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储不可用时仅在当次页面生命周期内生效 */
  }
}

export function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function loadRecords(): ObservationRecord[] {
  const stored = read<ObservationRecord[] | null>(KEYS.records, null);
  if (stored && stored.length > 0) return stored;
  write(KEYS.records, seedRecords);
  return seedRecords;
}

export function saveRecords(records: ObservationRecord[]): void {
  write(KEYS.records, records);
}

export function loadActiveSession(): ClassroomSession | null {
  return read<ClassroomSession | null>(KEYS.activeSession, null);
}

/** 进行中的课堂整体持久化：重开页面后顺序、当前位置、未处理请求都还在 */
export function saveActiveSession(session: ClassroomSession | null): void {
  if (session) write(KEYS.activeSession, session);
  else localStorage.removeItem(KEYS.activeSession);
}

export function loadHistory(): ClassroomSession[] {
  return read<ClassroomSession[]>(KEYS.history, []);
}

export function saveHistory(sessions: ClassroomSession[]): void {
  write(KEYS.history, sessions);
}

export function loadRole(): Role {
  return read<Role>(KEYS.role, "teacher");
}

export function saveRole(role: Role): void {
  write(KEYS.role, role);
}

export function loadStudentName(): string {
  return read<string>(KEYS.studentName, "");
}

export function saveStudentName(name: string): void {
  write(KEYS.studentName, name);
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
