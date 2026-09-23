import { useMemo, useState } from "react";
import type { ClassroomSession, ObservationRecord } from "./types";

interface SessionSetupProps {
  records: ObservationRecord[];
  onCreate: (session: ClassroomSession) => void;
}

export function SessionSetup({ records, onCreate }: SessionSetupProps) {
  const [name, setName] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");

  const pickedSet = useMemo(() => new Set(pickedIds), [pickedIds]);
  const recordMap = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);

  const available = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return records.filter(
      (r) =>
        !pickedSet.has(r.id) &&
        (!kw || [r.name, r.category, r.magnification, r.conclusion].join(" ").toLowerCase().includes(kw))
    );
  }, [records, pickedSet, keyword]);

  const picked = pickedIds.map((id) => recordMap.get(id)).filter(Boolean) as ObservationRecord[];

  const toggle = (id: string) => {
    if (pickedSet.has(id)) setPickedIds(pickedIds.filter((x) => x !== id));
    else setPickedIds([...pickedIds, id]);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= pickedIds.length) return;
    const next = [...pickedIds];
    [next[index], next[target]] = [next[target], next[index]];
    setPickedIds(next);
  };

  const canCreate = name.trim() && pickedIds.length > 0;

  const create = () => {
    if (!canCreate) return;
    const now = Date.now();
    onCreate({
      id: `ses-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      createdAt: now,
      status: "active",
      currentIndex: 0,
      items: pickedIds.map((recordId) => ({ recordId, addedAt: now, requests: [] })),
    });
  };

  return (
    <section className="panel setup-panel">
      <div className="section-heading">
        <div>
          <p>课堂讲评台</p>
          <h2>创建一次讲评课堂</h2>
        </div>
        <span className="hint-text">从已有记录挑样本、排好展示顺序，投屏后逐条讲评</span>
      </div>

      <div className="setup-grid">
        <div className="setup-col">
          <h3>① 课堂名称</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：9月23日 显微观察期中讲评"
          />

          <h3>② 从已有记录中挑样本（{records.length - pickedIds.length} 条可选）</h3>
          <input
            className="search-box"
            placeholder="搜索样本…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className="pick-list">
            {available.map((r) => (
              <button key={r.id} className="pick-row" onClick={() => toggle(r.id)}>
                <span className="pick-main">
                  <strong>{r.name}</strong>
                  <em>{r.category} · {r.stain} · {r.magnification}</em>
                </span>
                <span className="pick-add">＋ 选取</span>
              </button>
            ))}
            {available.length === 0 && <p className="empty-hint">没有更多可选记录。</p>}
          </div>
        </div>

        <div className="setup-col picked-col">
          <h3>③ 展示顺序（{pickedIds.length} 条）</h3>
          <div className="pick-list">
            {picked.map((r, i) => (
              <div key={r.id} className="order-row">
                <span className="order-no">{String(i + 1).padStart(2, "0")}</span>
                <span className="pick-main">
                  <strong>{r.name}</strong>
                  <em>{r.magnification} · {r.conclusion}</em>
                </span>
                <span className="order-ops">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="上移">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === picked.length - 1} aria-label="下移">↓</button>
                  <button className="remove" onClick={() => toggle(r.id)} aria-label="移除">✕</button>
                </span>
              </div>
            ))}
            {picked.length === 0 && <p className="empty-hint">还没有挑选样本，投屏讲评至少需要 1 条。</p>}
          </div>
          <button className="primary-action big" disabled={!canCreate} onClick={create}>
            开始投屏讲评
          </button>
        </div>
      </div>
    </section>
  );
}
