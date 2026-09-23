import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { ClassroomSession, ObservationRecord, ReviewRequest, Role } from "./podium/types";
import {
  formatTime,
  loadActiveSession,
  loadHistory,
  loadRecords,
  loadRole,
  loadStudentName,
  saveActiveSession,
  saveHistory,
  saveRecords,
  saveRole,
  saveStudentName,
  uid,
} from "./podium/storage";
import { RoleSwitch } from "./podium/RoleSwitch";
import { RecordsLibrary } from "./podium/RecordsLibrary";
import { SessionSetup } from "./podium/SessionSetup";
import { Podium } from "./podium/Podium";
import { SessionHistory } from "./podium/SessionHistory";

function App() {
  const [records, setRecords] = useState<ObservationRecord[]>(() => loadRecords());
  const [session, setSession] = useState<ClassroomSession | null>(() => loadActiveSession());
  const [history, setHistory] = useState<ClassroomSession[]>(() => loadHistory());
  const [role, setRole] = useState<Role>(() => loadRole());
  const [studentName, setStudentName] = useState<string>(() => loadStudentName());

  // 重开页面后：课堂顺序、当前位置、未处理请求全部恢复
  useEffect(() => saveRecords(records), [records]);
  useEffect(() => saveActiveSession(session), [session]);
  useEffect(() => saveHistory(history), [history]);
  useEffect(() => saveRole(role), [role]);
  useEffect(() => saveStudentName(studentName), [studentName]);

  const recordsById = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);

  const readOnly = session !== null;

  const addRecord = (data: Omit<ObservationRecord, "id" | "createdAt">) => {
    if (readOnly) return; // 讲评期间记录只读
    setRecords((prev) => [{ ...data, id: uid("rec"), createdAt: Date.now() }, ...prev]);
  };

  const createSession = (next: ClassroomSession) => setSession(next);

  const patchSession = (fn: (s: ClassroomSession) => ClassroomSession) => {
    setSession((prev) => (prev ? fn(prev) : prev));
  };

  const addRequest = (reason: string) => {
    const request: ReviewRequest = {
      id: uid("req"),
      student: studentName.trim(),
      reason,
      createdAt: Date.now(),
      status: "pending",
    };
    patchSession((s) => {
      const items = s.items.map((it, i) =>
        i === s.currentIndex ? { ...it, requests: [...it.requests, request] } : it
      );
      return { ...s, items };
    });
  };

  const resolveRequest = (requestId: string, note: string) => {
    patchSession((s) => {
      const items = s.items.map((it, i) =>
        i === s.currentIndex
          ? {
              ...it,
              requests: it.requests.map((req) =>
                req.id === requestId
                  ? { ...req, status: "handled" as const, handledAt: Date.now(), note }
                  : req
              ),
            }
          : it
      );
      return { ...s, items };
    });
  };

  const goPrev = () => {
    patchSession((s) =>
      s.currentIndex > 0 ? { ...s, currentIndex: s.currentIndex - 1 } : s
    );
  };

  const goNext = () => {
    patchSession((s) => {
      if (s.currentIndex >= s.items.length - 1) return s;
      const pending = s.items[s.currentIndex].requests.some((r) => r.status === "pending");
      if (pending) return s; // 未处理请求没清完，不许切下一条
      return { ...s, currentIndex: s.currentIndex + 1 };
    });
  };

  const jumpBack = (index: number) => {
    patchSession((s) => (index < s.currentIndex ? { ...s, currentIndex: index } : s));
  };

  const endSession = (reason: string) => {
    if (!session || !reason.trim()) return;
    const ended: ClassroomSession = {
      ...session,
      status: "ended",
      endedAt: Date.now(),
      endReason: reason.trim(),
    };
    setHistory((prev) => [ended, ...prev]);
    setSession(null); // 结束后记录恢复可更正；下一次课堂用新内容创建
  };

  const totalRequests = useMemo(() => {
    if (!session) {
      return history.reduce(
        (sum, s) => sum + s.items.reduce((n, it) => n + it.requests.length, 0),
        0
      );
    }
    return session.items.reduce((n, it) => n + it.requests.length, 0);
  }, [session, history]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-06 · port 5106</p>
          <h1>显微镜玻片观察 · 课堂讲评台</h1>
          <p className="subtitle">
            创建一次课堂，从已有观察记录中挑样本并排好展示顺序；投屏时突出当前样本、倍率与结论。
            学生可对当前样本发复看请求，未处理的请求跟着原样本保留，老师处理完才能切下一条。
          </p>
        </div>
        <div className="stack-card">
          <RoleSwitch role={role} onChange={setRole} />
          <span className="hint-text">
            讲评中记录只读；确需更正请结束课堂并填写原因。
          </span>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>观察记录</span>
          <strong>{records.length}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>本次讲评样本</span>
          <strong>{session ? session.items.length : 0}</strong>
          <i className="status-watch" />
        </article>
        <article className="metric-card">
          <span>未处理复看</span>
          <strong>
            {session
              ? session.items.reduce(
                  (n, it) => n + it.requests.filter((r) => r.status === "pending").length,
                  0
                )
              : 0}
          </strong>
          <i className="status-danger" />
        </article>
        <article className="metric-card">
          <span>累计复看请求</span>
          <strong>{totalRequests}</strong>
          <i className="status-ok" />
        </article>
      </section>

      {readOnly && (
        <div className="readonly-strip">
          🔒 课堂「{session!.name}」讲评中（{formatTime(session!.createdAt)} 开始）——全部观察记录只读
        </div>
      )}

      {session ? (
        <Podium
          session={session}
          recordsById={recordsById}
          role={role}
          studentName={studentName}
          onStudentNameChange={setStudentName}
          onAddRequest={addRequest}
          onResolveRequest={resolveRequest}
          onPrev={goPrev}
          onNext={goNext}
          onJumpBack={jumpBack}
          onEnd={endSession}
        />
      ) : (
        <SessionSetup records={records} onCreate={createSession} />
      )}

      <RecordsLibrary records={records} readOnly={readOnly} onAdd={addRecord} />

      <SessionHistory sessions={history} recordsById={recordsById} />
    </main>
  );
}

export default App;
