import { useState } from "react";
import type { ClassroomSession, ObservationRecord } from "./types";
import { formatTime } from "./storage";

interface SessionHistoryProps {
  sessions: ClassroomSession[];
  recordsById: Map<string, ObservationRecord>;
}

export function SessionHistory({ sessions, recordsById }: SessionHistoryProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <section className="panel history-panel">
        <div className="section-heading">
          <div>
            <p>讲评记录</p>
            <h2>已结束的课堂</h2>
          </div>
        </div>
        <p className="empty-hint">还没有结束过的课堂。</p>
      </section>
    );
  }

  return (
    <section className="panel history-panel">
      <div className="section-heading">
        <div>
          <p>讲评记录</p>
          <h2>已结束的课堂（{sessions.length}）</h2>
        </div>
      </div>

      <div className="history-list">
        {sessions.map((s) => {
          const pendingTotal = s.items.reduce(
            (sum, it) => sum + it.requests.filter((r) => r.status === "pending").length,
            0
          );
          const handledTotal = s.items.reduce(
            (sum, it) => sum + it.requests.filter((r) => r.status === "handled").length,
            0
          );
          const open = openId === s.id;
          return (
            <article key={s.id} className="history-card">
              <button className="history-head" onClick={() => setOpenId(open ? null : s.id)}>
                <div>
                  <strong>{s.name}</strong>
                  <time>
                    {formatTime(s.createdAt)} 开始 · {s.endedAt ? formatTime(s.endedAt) : ""} 结束
                  </time>
                </div>
                <div className="history-stats">
                  <span>{s.items.length} 个样本</span>
                  <span className="ok-chip">已处理 {handledTotal}</span>
                  {pendingTotal > 0 && <span className="warn-chip">未处理 {pendingTotal}</span>}
                  <span className="chev">{open ? "收起 ▲" : "展开 ▼"}</span>
                </div>
              </button>

              {open && (
                <div className="history-body">
                  <p className="end-reason">
                    <strong>结束原因：</strong>
                    {s.endReason}
                  </p>
                  <ol className="history-order">
                    {s.items.map((it, i) => {
                      const r = recordsById.get(it.recordId);
                      return (
                        <li key={`${it.recordId}-${i}`}>
                          <span className="order-no">{String(i + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{r?.name ?? "记录缺失（原记录可能已被更正）"}</strong>
                            <em>{r ? `${r.magnification} · ${r.conclusion}` : ""}</em>
                            {it.requests.map((req) => (
                              <span key={req.id} className={`mini-req ${req.status}`}>
                                {req.status === "pending" ? "未处理" : "已处理"} · {req.student}：
                                {req.reason}
                                {req.note ? `（${req.note}）` : ""}
                              </span>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
