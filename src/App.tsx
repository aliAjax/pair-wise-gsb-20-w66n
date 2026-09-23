import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type {
  ClassroomSession,
  ObservationRecord,
  ReviewRequest,
  SessionEndKind,
} from "./types";
import {
  loadActiveSessionId,
  loadRecords,
  loadRequests,
  loadSessions,
  makeId,
  saveActiveSessionId,
  saveRecords,
  saveRequests,
  saveSessions,
} from "./storage";
import { RecordPanel } from "./components/RecordPanel";
import { SetupView } from "./components/SetupView";
import { PodiumView } from "./components/PodiumView";

const project = {
  id: "hxwl-06",
  port: 5106,
  title: "显微镜玻片观察 · 课堂讲评台",
  subtitle: "挑样本、排顺序，投屏逐条讲评；学生复看请求随原样本保留，顺序与请求重开页面不丢失。",
  stack: "React + Vite + TypeScript + CSS（localStorage 持久化）",
};

function App() {
  const [records, setRecords] = useState<ObservationRecord[]>(loadRecords);
  const [sessions, setSessions] = useState<ClassroomSession[]>(loadSessions);
  const [requests, setRequests] = useState<ReviewRequest[]>(loadRequests);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    loadActiveSessionId
  );

  useEffect(() => saveRecords(records), [records]);
  useEffect(() => saveSessions(sessions), [sessions]);
  useEffect(() => saveRequests(requests), [requests]);
  useEffect(() => saveActiveSessionId(activeSessionId), [activeSessionId]);

  // 重开页面后，恢复未结束的课堂（顺序、当前位置、未处理请求一并保留）
  const activeSession = useMemo(
    () =>
      sessions.find(
        (s) => s.id === activeSessionId && s.status === "active"
      ) ?? null,
    [sessions, activeSessionId]
  );

  const pendingTotal = useMemo(
    () =>
      activeSession
        ? requests.filter(
            (r) =>
              r.sessionId === activeSession.id && r.status === "pending"
          ).length
        : 0,
    [requests, activeSession]
  );

  const queuedCount = activeSession?.queue.length ?? 0;
  const reviewedCount = activeSession ? activeSession.currentIndex : 0;
  const endedCount = sessions.filter((s) => s.status === "ended").length;

  // ---- 记录库 ----
  const saveRecord = (record: ObservationRecord) => {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === record.id);
      return exists
        ? prev.map((r) => (r.id === record.id ? record : r))
        : [...prev, record];
    });
  };

  // ---- 开课 ----
  const createSession = (name: string, orderedRecordIds: string[]) => {
    const session: ClassroomSession = {
      id: makeId("ses"),
      name,
      createdAt: Date.now(),
      status: "active",
      currentIndex: 0,
      queue: orderedRecordIds.map((recordId) => ({ recordId })),
    };
    setSessions((prev) => [...prev, session]);
    setActiveSessionId(session.id);
  };

  // ---- 讲评导航 ----
  const updateActiveSession = (
    patch: Partial<ClassroomSession>
  ) => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, ...patch } : s
      )
    );
  };

  const moveTo = (delta: number) => {
    if (!activeSession) return;
    const target = activeSession.currentIndex + delta;
    if (target < 0 || target >= activeSession.queue.length) return;
    updateActiveSession({ currentIndex: target });
  };

  const jumpTo = (index: number) => {
    if (!activeSession) return;
    if (index < 0 || index >= activeSession.queue.length) return;
    updateActiveSession({ currentIndex: index });
  };

  // ---- 复看请求：跟随原样本（recordId）保留 ----
  const createRequest = (studentName: string, note: string) => {
    if (!activeSession) return;
    const entry = activeSession.queue[activeSession.currentIndex];
    const req: ReviewRequest = {
      id: makeId("req"),
      sessionId: activeSession.id,
      recordId: entry.recordId,
      studentName,
      note,
      createdAt: Date.now(),
      status: "pending",
    };
    setRequests((prev) => [...prev, req]);
  };

  const handleRequest = (
    requestId: string,
    status: "accepted" | "rejected"
  ) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status, handledAt: Date.now() }
          : r
      )
    );
  };

  // ---- 结束课堂 ----
  const endSession = (kind: SessionEndKind, reason: string) => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              status: "ended",
              endedAt: Date.now(),
              endKind: kind,
              endReason: reason || undefined,
            }
          : s
      )
    );
    // 未处理请求不删除：已按 recordId 持久化，历史课堂中仍跟随原样本可查
    setActiveSessionId(null);
  };

  const metrics = [
    { label: "记录样本数", value: String(records.length) },
    { label: "本次已讲评", value: activeSession ? `${reviewedCount}/${queuedCount}` : "—" },
    { label: "未处理复看请求", value: activeSession ? String(pendingTotal) : "—" },
    { label: "历史课堂", value: String(endedCount) },
  ];
  const statusColors = ["status-ok", "status-watch", "status-danger"];

  return (
    <main className={"app-shell" + (activeSession ? " in-session" : "")}>
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
          {activeSession && (
            <span className="session-pill">
              讲评进行中：{activeSession.name} · 记录只读
            </span>
          )}
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric, index) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <i className={statusColors[index % statusColors.length]} />
          </article>
        ))}
      </section>

      {activeSession ? (
        <PodiumView
          session={activeSession}
          records={records}
          requests={requests.filter((r) => r.sessionId === activeSession.id)}
          onMove={moveTo}
          onJump={jumpTo}
          onCreateRequest={createRequest}
          onHandleRequest={handleRequest}
          onEnd={endSession}
        />
      ) : (
        <SetupView
          records={records}
          sessions={sessions}
          onCreate={createSession}
        />
      )}

      <RecordPanel
        records={records}
        readOnly={Boolean(activeSession)}
        onSave={saveRecord}
      />

      <footer className="app-footer">
        课堂顺序、讲评位置与复看请求保存在本机浏览器，重开页面自动恢复；讲评结束后记录库解除只读。
      </footer>
    </main>
  );
}

export default App;
