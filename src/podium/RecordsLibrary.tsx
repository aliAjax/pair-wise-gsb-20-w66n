import { useMemo, useState } from "react";
import type { ObservationRecord } from "./types";
import { CATEGORIES, FIELD_LABELS } from "./seedData";

interface RecordsLibraryProps {
  records: ObservationRecord[];
  /** 讲评进行中记录只读 */
  readOnly: boolean;
  onAdd: (record: Omit<ObservationRecord, "id" | "createdAt">) => void;
}

const emptyForm = {
  name: "",
  category: CATEGORIES[0],
  stain: "",
  magnification: "",
  structure: "",
  description: "",
  conclusion: "",
};

export function RecordsLibrary({ records, readOnly, onAdd }: RecordsLibraryProps) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const kw = keyword.trim();
    return records.filter((r) => {
      const matchType = category === "全部" || r.category === category;
      const matchKw =
        !kw ||
        [r.name, r.stain, r.magnification, r.structure, r.description, r.conclusion]
          .join(" ")
          .toLowerCase()
          .includes(kw.toLowerCase());
      return matchType && matchKw;
    });
  }, [records, keyword, category]);

  const canSubmit = form.name.trim() && form.magnification.trim() && form.conclusion.trim();

  const submit = () => {
    if (!canSubmit) return;
    onAdd({
      name: form.name.trim(),
      category: form.category,
      stain: form.stain.trim() || "未注明",
      magnification: form.magnification.trim(),
      structure: form.structure.trim() || "—",
      description: form.description.trim() || "—",
      conclusion: form.conclusion.trim(),
    });
    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <section className="panel records-panel">
      <div className="section-heading">
        <div>
          <p>记录库</p>
          <h2>已有观察记录（{records.length}）</h2>
        </div>
        {!readOnly && (
          <button className="primary-action" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "收起录入区" : "新增记录"}
          </button>
        )}
      </div>

      {readOnly && (
        <div className="lock-banner">
          🔒 讲评进行中，记录只读。确需更正请先结束本次课堂并填写原因，下一次课堂使用更正后的新内容。
        </div>
      )}

      {!readOnly && showForm && (
        <div className="entry-form">
          <h3>录入观察记录</h3>
          <div className="field-grid">
            <label>
              <span>{FIELD_LABELS.name} *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：黑根霉"
              />
            </label>
            <label>
              <span>{FIELD_LABELS.category}</span>
              <input
                list="category-options"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <datalist id="category-options">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label>
              <span>{FIELD_LABELS.stain}</span>
              <input
                value={form.stain}
                onChange={(e) => setForm({ ...form, stain: e.target.value })}
                placeholder="如：碘液"
              />
            </label>
            <label>
              <span>{FIELD_LABELS.magnification} *</span>
              <input
                value={form.magnification}
                onChange={(e) => setForm({ ...form, magnification: e.target.value })}
                placeholder="如：400x"
              />
            </label>
            <label>
              <span>{FIELD_LABELS.structure}</span>
              <input
                value={form.structure}
                onChange={(e) => setForm({ ...form, structure: e.target.value })}
                placeholder="如：细胞壁、细胞核"
              />
            </label>
            <label>
              <span>{FIELD_LABELS.description}</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="视野下的客观描述"
              />
            </label>
            <label className="span-2">
              <span>{FIELD_LABELS.conclusion} *</span>
              <input
                value={form.conclusion}
                onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
                placeholder="讲评时投屏展示的结论"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-action" disabled={!canSubmit} onClick={submit}>
              保存到记录库
            </button>
            <button onClick={() => setShowForm(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="library-filters">
        <input
          className="search-box"
          placeholder="搜索样本、结构、染色、结论…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className="chips muted compact">
          {["全部", ...CATEGORIES].map((c) => (
            <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="record-list">
        {filtered.map((record) => (
          <article key={record.id} className="record-card">
            <div className="record-index">
              <span>{record.magnification}</span>
            </div>
            <div>
              <h3>
                {record.name}
                <em className="tag">{record.category}</em>
                <em className="tag stain">{record.stain}</em>
              </h3>
              <p className="record-line">观察结构：{record.structure}</p>
              <p className="record-line">{record.description}</p>
              <p className="record-conclusion">结论：{record.conclusion}</p>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="empty-hint">没有匹配的记录。</p>}
      </div>
    </section>
  );
}
