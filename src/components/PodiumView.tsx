import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClassroomSession,
  ObservationRecord,
  ReviewRequest,
  SessionEndKind,
} from "../types";

const STATUS_LABEL: Record<ReviewRequest["status"], string> = {
  pending: "待处理",
  accepted: "已复看",
  rejected: "已驳回",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RequestPanel({
  requests,
  onCreate,
  onHandle,
}: {
  requests: ReviewRequest[];
  onCreate: (studentName: string, note: string) => void;
  onHandle: (requestId: string, status: "accepted" | "rejected") => void;
}) {
  const [studentName, setStudentName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!studentName.trim()) {
      setError("请填写学生姓名/学号");
      return;
    }
    onCreate(studentName.trim(), note.trim());
    setStudentName("");
    setNote("");
    setError("");
  };

  const sorted = [...requests].sort((a, b) => a.createdAt - b.createdAt);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="request-panel">
      <div className="request-heading">
        <h3>复看请求</h3>
        {pendingCount > 0 && <span className="pending-badge">{pendingCount} 待处理</span>}
      </div>

      <div className="request-form">
        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="学生姓名 / 学号"
        />
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="想复看的结构或疑问（可不填）"
        />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-action" onClick={submit}>
          对当前样本发起复看
        </button>
      </div>

      <ul className="request-list">
        {sorted.map((req) => (
          <li key={req.id} className={"request-item status-" + req.status}>
            <div className="request-main">
              <strong>{req.studentName}</strong>
              <span className="request-time">{formatTime(req.createdAt)}</span>
              {req.note && <p>{req.note}</p>}
            </div>
            {req.status === "pending" ? (
              <div className="request-actions">
                <button
                  className="accept-btn"
                  onClick={() => onHandle(req.id, "accepted")}
                >
                  复看
                </button>
                <button onClick={() => onHandle(req.id, "rejected")}>
                  驳回
                </button>
              </div>
            ) : (
              <span className={"request-status status-" + req.status}>
                {STATUS_LABEL[req.status]}
              </span>
            )}
          </li>
        ))}
        {sorted.length === 0 && (
          <p className="empty-hint">当前样本暂无复看请求。</p>
        )}
      </ul>
    </div>
  );
}

function EndDialog({
  onCancel,
  onEnd,
}: {
  onCancel: () => void;
  onEnd: (kind: SessionEndKind, reason: string) => void;
}) {
  const [kind, setKind] = useState<SessionEndKind>("normal");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const confirm = () => {
    if (kind === "correction" && !reason.trim()) {
      setError("结束以更正记录时，必须写明更正原因");
      return;
    }
    onEnd(kind, reason.trim());
  };

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>结束本次讲评课堂</h2>
        <label className="radio-row">
          <input
            type="radio"
            name="endkind"
            checked={kind === "normal"}
            onChange={() => {
              setKind("normal");
              setError("");
            }}
          />
          <span>正常结束讲评（记录保持原样）</span>
        </label>
        <label className="radio-row">
          <input
            type="radio"
            name="endkind"
            checked={kind === "correction"}
            onChange={() => setKind("correction")}
          />
          <span>结束并更正记录（讲评将停止，下一次课堂使用更正后的新内容）</span>
        </label>
        {kind === "correction" && (
          <label className="dialog-reason">
            <span>更正原因 *</span>
            <textarea
              rows={3}
              autoFocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              placeholder="说明哪条记录的哪个字段有误、为什么需要更正"
            />
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button className="primary-action" onClick={confirm}>
            确认结束
          </button>
          <button onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  );
}

export function PodiumView({
  session,
  records,
  requests,
  onMove,
  onJump,
  onCreateRequest,
  onHandleRequest,
  onEnd,
}: {
  session: ClassroomSession;
  records: ObservationRecord[];
  requests: ReviewRequest[];
  onMove: (delta: number) => void;
  onJump: (index: number) => void;
  onCreateRequest: (studentName: string, note: string) => void;
  onHandleRequest: (requestId: string, status: "accepted" | "rejected") => void;
  onEnd: (kind: SessionEndKind, reason: string) => void;
}) {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [blockHint, setBlockHint] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const hintTimer = useRef<number | null>(null);

  const currentEntry = session.queue[session.currentIndex];
  const current = records.find((r) => r.id === currentEntry?.recordId);
  const currentRequests = requests.filter(
    (r) => r.recordId === currentEntry?.recordId
  );
  const pendingCount = currentRequests.filter((r) => r.status === "pending").length;
  const isLast = session.currentIndex === session.queue.length - 1;

  const flashBlock = useCallback((msg: string) => {
    setBlockHint(msg);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setBlockHint(""), 3200);
  }, []);

  const guardedMove = useCallback(
    (delta: number) => {
      const target = session.currentIndex + delta;
      if (target < 0 || target >= session.queue.length) return;
      if (pendingCount > 0) {
        flashBlock(
          `当前样本还有 ${pendingCount} 条复看请求未处理，请先处理（复看/驳回）后再切换。`
        );
        return;
      }
      onMove(delta);
    },
    [session.currentIndex, session.queue.length, pendingCount, flashBlock, onMove]
  );

  const guardedJump = useCallback(
    (index: number) => {
      if (index === session.currentIndex) return;
      if (pendingCount > 0) {
        flashBlock("请先处理当前样本的未处理复看请求，再跳转到其他样本。");
        return;
      }
      onJump(index);
    },
    [session.currentIndex, pendingCount, flashBlock, onJump]
  );

  // 键盘：← → 切换样本；F 切换投屏全屏
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "ArrowRight") guardedMove(1);
      if (e.key === "ArrowLeft") guardedMove(-1);
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [guardedMove]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  };

  if (!current) {
    return (
      <section className="panel">
        <p className="form-error">
          队列中的样本记录已不存在，请结束本次课堂后用现有记录重新开课。
        </p>
        <button className="primary-action" onClick={() => setShowEndDialog(true)}>
          结束课堂
        </button>
        {showEndDialog && (
          <EndDialog onCancel={() => setShowEndDialog(false)} onEnd={onEnd} />
        )}
      </section>
    );
  }

  return (
    <section className="podium" ref={stageRef}>
      <div className="podium-topbar">
        <div className="podium-title">
          <span className="live-dot" />
          <div>
            <h2>{session.name}</h2>
            <p>
              第 {session.currentIndex + 1} / {session.queue.length} 条 ·
              讲评期间记录只读
            </p>
          </div>
        </div>
        <div className="podium-top-actions">
          <button onClick={toggleFullscreen}>投屏全屏（F）</button>
          <button className="danger-outline" onClick={() => setShowEndDialog(true)}>
            结束课堂
          </button>
        </div>
      </div>

      {blockHint && <div className="block-hint">{blockHint}</div>}

      <div className="podium-grid">
        <div className="stage-card">
          <div className="stage-progress">
            {session.queue.map((entry, i) => (
              <span
                key={entry.recordId}
                className={
                  "progress-dot" +
                  (i === session.currentIndex ? " current" : "") +
                  (i < session.currentIndex ? " passed" : "")
                }
              />
            ))}
          </div>

          <div className="stage-sample">
            <span className="stage-type">{current.type} · {current.stain}</span>
            <h1 className="stage-name">{current.name}</h1>

            <div className="stage-magnification">
              <span className="mag-label">放大倍数</span>
              <strong>{current.magnification}</strong>
            </div>

            <div className="stage-field">
              <span>观察结构</span>
              <p>{current.structure}</p>
            </div>
            <div className="stage-field">
              <span>视野描述</span>
              <p>{current.description}</p>
            </div>
            <div className="stage-conclusion">
              <span>观察结论</span>
              <p>{current.conclusion}</p>
            </div>
          </div>

          <div className="stage-controls">
            <button
              onClick={() => guardedMove(-1)}
              disabled={session.currentIndex === 0}
            >
              ← 上一条
            </button>
            <div className="stage-center-hint">
              {pendingCount > 0 ? (
                <span className="must-handle">
                  有 {pendingCount} 条复看请求未处理，处理后才能切到下一条
                </span>
              ) : (
                <span className="ready-hint">
                  {isLast ? "已是最后一条" : "键盘 ← → 可切换样本"}
                </span>
              )}
            </div>
            {isLast ? (
              <button
                className="primary-action"
                onClick={() => setShowEndDialog(true)}
              >
                完成讲评
              </button>
            ) : (
              <button
                className="primary-action"
                onClick={() => guardedMove(1)}
              >
                下一条 →
              </button>
            )}
          </div>
        </div>

        <aside className="podium-side">
          <div className="queue-panel">
            <h3>讲评队列</h3>
            <ol className="queue-list">
              {session.queue.map((entry, i) => {
                const record = records.find((r) => r.id === entry.recordId);
                if (!record) return null;
                const reqs = requests.filter(
                  (r) => r.recordId === entry.recordId
                );
                const pend = reqs.filter((r) => r.status === "pending").length;
                return (
                  <li
                    key={entry.recordId}
                    className={
                      "queue-item" +
                      (i === session.currentIndex ? " current" : "") +
                      (i < session.currentIndex ? " passed" : "")
                    }
                    onClick={() => guardedJump(i)}
                  >
                    <span className="queue-num">{i + 1}</span>
                    <div className="queue-info">
                      <strong>{record.name}</strong>
                      <span>{record.magnification}</span>
                    </div>
                    {pend > 0 && (
                      <span className="queue-pending" title="未处理复看请求跟随该样本保留">
                        {pend} 待处理
                      </span>
                    )}
                    {i === session.currentIndex && (
                      <span className="queue-now">讲评中</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {current && (
            <RequestPanel
              requests={currentRequests}
              onCreate={onCreateRequest}
              onHandle={onHandleRequest}
            />
          )}
        </aside>
      </div>

      {showEndDialog && (
        <EndDialog onCancel={() => setShowEndDialog(false)} onEnd={onEnd} />
      )}
    </section>
  );
}
