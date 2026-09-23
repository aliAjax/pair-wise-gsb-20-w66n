import { useEffect, useMemo, useState } from "react";
import type { ClassroomSession, ObservationRecord, Role } from "./types";
import { formatTime } from "./storage";

interface PodiumProps {
  session: ClassroomSession;
  recordsById: Map<string, ObservationRecord>;
  role: Role;
  studentName: string;
  onStudentNameChange: (name: string) => void;
  onAddRequest: (reason: string) => void;
  onResolveRequest: (requestId: string, note: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpBack: (index: number) => void;
  onEnd: (reason: string) => void;
}

const END_REASON_PRESETS = [
  "记录结论有误，需更正后下次重讲",
  "倍率/染色信息登记错误，需核实",
  "课堂时间结束",
  "设备故障暂停讲评",
];

export function Podium({
  session,
  recordsById,
  role,
  studentName,
  onStudentNameChange,
  onAddRequest,
  onResolveRequest,
  onPrev,
  onNext,
  onJumpBack,
  onEnd,
}: PodiumProps) {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [draftReason, setDraftReason] = useState("");
  const [requestText, setRequestText] = useState("");
  const [flash, setFlash] = useState(false);

  const item = session.items[session.currentIndex];
  const record = item ? recordsById.get(item.recordId) : undefined;

  const pending = useMemo(
    () => (item ? item.requests.filter((r) => r.status === "pending") : []),
    [item]
  );
  const handled = useMemo(
    () => (item ? item.requests.filter((r) => r.status === "handled") : []),
    [item]
  );
  const blocked = pending.length > 0;

  // 切到有新请求的样本时给一次视觉提示
  useEffect(() => {
    if (pending.length > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(t);
    }
  }, [session.currentIndex, pending.length]);

  // 教师端：方向键翻页（输入时不拦截）
  useEffect(() => {
    if (role !== "teacher") return;
    const onKey = (e: KeyboardEvent) => {
      if (showEndDialog) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" && !blocked && session.currentIndex < session.items.length - 1) onNext();
      if (e.key === "ArrowLeft" && session.currentIndex > 0) onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [role, blocked, session.currentIndex, session.items.length, onNext, onPrev, showEndDialog]);

  const isLast = session.currentIndex === session.items.length - 1;
  const totalPending = session.items.reduce(
    (sum, it) => sum + it.requests.filter((r) => r.status === "pending").length,
    0
  );

  const submitRequest = () => {
    if (!studentName.trim() || !requestText.trim()) return;
    onStudentNameChange(studentName.trim());
    onAddRequest(requestText.trim());
    setRequestText("");
  };

  const confirmEnd = () => {
    if (!draftReason.trim()) return;
    onEnd(draftReason.trim());
    setShowEndDialog(false);
    setDraftReason("");
  };

  if (!record) {
    return (
      <section className="panel">
        <p className="empty-hint">当前样本的原记录已不存在，无法投屏，请结束本次课堂后用新内容重建。</p>
        {role === "teacher" && (
          <button className="danger-action" onClick={() => setShowEndDialog(true)}>
            结束本次课堂
          </button>
        )}
      </section>
    );
  }

  return (
    <section className={`podium ${flash ? "flash" : ""}`}>
      <div className="podium-topbar panel">
        <div>
          <p className="live-dot">● 讲评进行中</p>
          <h2>{session.name}</h2>
        </div>
        <div className="topbar-meta">
          <span>
            第 <strong>{session.currentIndex + 1}</strong> / {session.items.length} 条
          </span>
          <span className={totalPending > 0 ? "pending-pill" : ""}>
            待处理复看 {totalPending}
          </span>
          {role === "teacher" ? (
            <button className="danger-action" onClick={() => setShowEndDialog(true)}>
              结束课堂
            </button>
          ) : (
            <span className="role-note">学生视角 · 进度由教师控制</span>
          )}
        </div>
      </div>

      {/* 展示顺序：当前样本突出，未处理请求跟着原样本挂着 */}
      <div className="order-strip panel">
        {session.items.map((it, i) => {
          const r = recordsById.get(it.recordId);
          const count = it.requests.filter((x) => x.status === "pending").length;
          const state =
            i === session.currentIndex ? "current" : i < session.currentIndex ? "done" : "upcoming";
          return (
            <button
              key={`${it.recordId}-${i}`}
              className={`strip-item ${state}`}
              disabled={i >= session.currentIndex}
              onClick={() => onJumpBack(i)}
              title={i < session.currentIndex ? "回看该样本" : i === session.currentIndex ? "当前投屏" : "未讲评"}
            >
              <span className="strip-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="strip-name">{r?.name ?? "记录缺失"}</span>
              <span className="strip-mag">{r?.magnification}</span>
              {count > 0 && <span className="strip-badge">{count} 待复看</span>}
              {state === "done" && count === 0 && <span className="strip-tick">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="stage-grid">
        {/* 投屏主画面：突出当前样本、倍率、结论 */}
        <article className="stage-card panel">
          <div className="stage-index">样本 {session.currentIndex + 1}</div>
          <div className="stage-tags">
            <em className="tag">{record.category}</em>
            <em className="tag stain">{record.stain}</em>
          </div>
          <h2 className="stage-name">{record.name}</h2>
          <div className="stage-magnification">
            <span>放大倍数</span>
            <strong>{record.magnification}</strong>
          </div>
          <div className="stage-block">
            <span>观察结构</span>
            <p>{record.structure}</p>
          </div>
          <div className="stage-block">
            <span>视野描述</span>
            <p>{record.description}</p>
          </div>
          <div className="stage-conclusion">
            <span>结论</span>
            <p>{record.conclusion}</p>
          </div>

          <div className="stage-nav">
            <button
              onClick={onPrev}
              disabled={session.currentIndex === 0 || role === "student"}
            >
              ← 上一条
            </button>
            {role === "teacher" && blocked && (
              <span className="block-warning">
                ⚠ 本样本有 {pending.length} 条复看请求未处理，处理后才能切到下一条；
                请求会一直跟着本样本保留
              </span>
            )}
            {role === "student" && (
              <span className="block-warning info">投屏中，请等待教师讲评；可在右侧发复看请求</span>
            )}
            <button
              className="primary-action"
              onClick={onNext}
              disabled={role === "student" || blocked || isLast}
              title={isLast ? "已是最后一条" : blocked ? "先处理当前样本的复看请求" : "下一条（→）"}
            >
              {isLast ? "已是最后一条" : "下一条 →"}
            </button>
          </div>
        </article>

        {/* 复看请求侧栏：始终挂在当前（原）样本下 */}
        <aside className="request-panel panel">
          <h3>
            复看请求
            <small>跟着「{record.name}」保留</small>
          </h3>

          {role === "student" && (
            <div className="request-form">
              <input
                placeholder="你的姓名"
                value={studentName}
                onChange={(e) => onStudentNameChange(e.target.value)}
              />
              <textarea
                placeholder="想请老师复看的内容，如：没看清保卫细胞的开闭"
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                rows={3}
              />
              <button
                className="primary-action"
                disabled={!studentName.trim() || !requestText.trim()}
                onClick={submitRequest}
              >
                发送复看请求
              </button>
              <p className="hint-text">请求挂在当前样本上，老师切下一条前必须先处理。</p>
            </div>
          )}

          <div className="request-list">
            {pending.map((req) => (
              <div key={req.id} className="request-card pending">
                <header>
                  <strong>{req.student}</strong>
                  <time>{formatTime(req.createdAt)}</time>
                </header>
                <p>{req.reason}</p>
                {role === "teacher" ? (
                  <ResolveBox onResolve={(note) => onResolveRequest(req.id, note)} />
                ) : (
                  <span className="status-chip">等待老师处理</span>
                )}
              </div>
            ))}
            {handled.map((req) => (
              <div key={req.id} className="request-card handled">
                <header>
                  <strong>{req.student}</strong>
                  <time>
                    {formatTime(req.createdAt)} · {req.handledAt ? formatTime(req.handledAt) : ""} 已处理
                  </time>
                </header>
                <p>{req.reason}</p>
                {req.note && <p className="resolve-note">老师处理：{req.note}</p>}
              </div>
            ))}
            {item.requests.length === 0 && (
              <p className="empty-hint">本样本还没有复看请求。</p>
            )}
          </div>
        </aside>
      </div>

      {showEndDialog && (
        <div className="modal-mask" onClick={() => setShowEndDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>结束本次课堂</h3>
            <p className="hint-text">
              讲评期间记录只读。确需更正记录时，请在此说明原因；结束后记录解除只读，下一次课堂请用更正后的新内容创建。
              {totalPending > 0 && <b className="warn-text">当前仍有 {totalPending} 条未处理请求，将随本次课堂存档。</b>}
            </p>
            <div className="preset-row">
              {END_REASON_PRESETS.map((p) => (
                <button key={p} onClick={() => setDraftReason(p)}>
                  {p}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              placeholder="必须填写结束/更正原因 *"
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
            />
            <div className="form-actions">
              <button className="danger-action" disabled={!draftReason.trim()} onClick={confirmEnd}>
                确认结束并写原因
              </button>
              <button onClick={() => setShowEndDialog(false)}>继续讲评</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ResolveBox({ onResolve }: { onResolve: (note: string) => void }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="resolve-btn" onClick={() => setOpen(true)}>
        处理这条请求（处理后才能下一条）
      </button>
    );
  }

  return (
    <div className="resolve-box">
      <textarea
        rows={2}
        placeholder="处理说明，如：已切回 400x 重新演示气孔开闭"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="form-actions">
        <button className="primary-action" onClick={() => onResolve(note.trim() || "已现场复看处理")}>
          确认已处理
        </button>
        <button onClick={() => setOpen(false)}>取消</button>
      </div>
    </div>
  );
}
