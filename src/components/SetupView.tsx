import { useMemo, useState } from "react";
import type { ClassroomSession, ObservationRecord } from "../types";

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SetupView({
  records,
  sessions,
  onCreate,
}: {
  records: ObservationRecord[];
  sessions: ClassroomSession[];
  onCreate: (name: string, orderedRecordIds: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("全部");
  const [error, setError] = useState("");

  const types = useMemo(
    () => ["全部", ...Array.from(new Set(records.map((r) => r.type)))],
    [records]
  );
  const visibleRecords =
    typeFilter === "全部"
      ? records
      : records.filter((r) => r.type === typeFilter);

  const endedSessions = sessions
    .filter((s) => s.status === "ended")
    .sort((a, b) => (b.endedAt ?? b.createdAt) - (a.endedAt ?? a.createdAt));

  const togglePick = (id: string) => {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError("");
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= picked.length) return;
    setPicked((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const applyHistory = (session: ClassroomSession) => {
    const liveIds = session.queue
      .map((q) => q.recordId)
      .filter((id) => records.some((r) => r.id === id));
    setName(session.name + "（续）");
    setPicked(liveIds);
    setError("");
  };

  const submit = () => {
    if (!name.trim()) {
      setError("请填写本次课堂名称");
      return;
    }
    if (picked.length === 0) {
      setError("请至少挑选 1 条样本记录");
      return;
    }
    onCreate(name.trim(), picked);
  };

  return (
    <section className="panel setup-view">
      <div className="section-heading">
        <div>
          <p>新建讲评课堂</p>
          <h2>从已有记录中挑样本并排好展示顺序</h2>
        </div>
        <button className="primary-action" onClick={submit}>
          开始讲评（{picked.length} 条）
        </button>
      </div>

      <div className="setup-grid">
        <div>
          <label className="setup-name">
            <span>课堂名称 *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 第3周实验课 · 制片讲评"
            />
          </label>

          <div className="chips muted filter-chips">
            {types.map((t) => (
              <button
                key={t}
                className={typeFilter === t ? "chip-active" : ""}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="record-list pick-list">
            {visibleRecords.map((record) => {
              const order = picked.indexOf(record.id);
              const checked = order >= 0;
              return (
                <article
                  key={record.id}
                  className={
                    "record-card pick-card" + (checked ? " picked" : "")
                  }
                  onClick={() => togglePick(record.id)}
                >
                  <div className="pick-box">
                    {checked ? (
                      <span className="pick-order">{order + 1}</span>
                    ) : (
                      <span className="pick-empty">＋</span>
                    )}
                  </div>
                  <div className="record-body">
                    <h3>
                      {record.name}
                      <span className="type-chip">{record.type}</span>
                    </h3>
                    <p>
                      {record.magnification} · {record.stain} ·{" "}
                      {record.structure}
                    </p>
                    <p className="record-conclusion-line">
                      结论：{record.conclusion}
                    </p>
                  </div>
                </article>
              );
            })}
            {visibleRecords.length === 0 && (
              <p className="empty-hint">该类型下暂无记录。</p>
            )}
          </div>
        </div>

        <aside className="order-panel">
          <h3>展示顺序（{picked.length}）</h3>
          <p className="order-hint">用 ↑ ↓ 调整，投屏时按此顺序逐条讲评。</p>
          {picked.length === 0 ? (
            <p className="empty-hint">点击左侧记录进行挑选。</p>
          ) : (
            <ol className="order-list">
              {picked.map((id, index) => {
                const record = records.find((r) => r.id === id);
                if (!record) return null;
                return (
                  <li key={id}>
                    <span className="order-num">{index + 1}</span>
                    <div>
                      <strong>{record.name}</strong>
                      <span>{record.magnification}</span>
                    </div>
                    <span className="order-buttons">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          move(index, -1);
                        }}
                        disabled={index === 0}
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          move(index, 1);
                        }}
                        disabled={index === picked.length - 1}
                        title="下移"
                      >
                        ↓
                      </button>
                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePick(id);
                        }}
                        title="移除"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {error && <p className="form-error">{error}</p>}

          {endedSessions.length > 0 && (
            <div className="history-reuse">
              <h3>复用历史课堂顺序</h3>
              <ul>
                {endedSessions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.name}</strong>
                      <span>
                        {s.queue.length} 条 ·{" "}
                        {s.endedAt ? formatDateTime(s.endedAt) : ""} 结束
                        {s.endKind === "correction" && " · 因更正记录"}
                      </span>
                    </div>
                    <button onClick={() => applyHistory(s)}>用此顺序</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
