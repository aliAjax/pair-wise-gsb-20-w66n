import { useState } from "react";
import type { ObservationRecord } from "../types";
import { makeId } from "../storage";

const RECORD_TYPES = ["植物组织", "动物组织", "微生物", "血液涂片"];

const EMPTY_FORM = {
  name: "",
  type: RECORD_TYPES[0],
  stain: "",
  magnification: "",
  structure: "",
  description: "",
  conclusion: "",
};

type FormState = typeof EMPTY_FORM;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecordPanel({
  records,
  readOnly,
  onSave,
}: {
  records: ObservationRecord[];
  readOnly: boolean;
  onSave: (record: ObservationRecord) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const patch = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startEdit = (record: ObservationRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      type: record.type,
      stain: record.stain,
      magnification: record.magnification,
      structure: record.structure,
      description: record.description,
      conclusion: record.conclusion,
    });
    setError("");
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  };

  const submit = () => {
    if (!form.name.trim()) {
      setError("请填写样本名称");
      return;
    }
    if (!form.magnification.trim()) {
      setError("请填写放大倍数，如 400x");
      return;
    }
    const now = Date.now();
    if (editingId) {
      const original = records.find((r) => r.id === editingId);
      onSave({
        ...(original as ObservationRecord),
        ...form,
        name: form.name.trim(),
        magnification: form.magnification.trim(),
      });
    } else {
      onSave({
        id: makeId("rec"),
        ...form,
        name: form.name.trim(),
        magnification: form.magnification.trim(),
        createdAt: now,
      });
    }
    resetForm();
  };

  return (
    <section className="panel records-library">
      <div className="section-heading">
        <div>
          <p>观察记录库</p>
          <h2>样本记录（{records.length}）</h2>
        </div>
        {!readOnly && !editingId && (
          <button className="primary-action" onClick={() => setForm(EMPTY_FORM)}>
            新增记录
          </button>
        )}
      </div>

      {readOnly && (
        <div className="readonly-banner">
          讲评进行中，记录为只读状态。确需更正请先结束本次课堂并写明原因，下一次课堂使用更正后的新内容。
        </div>
      )}

      <div className="library-layout">
        <div className="record-list">
          {records.map((record) => (
            <article key={record.id} className="record-card">
              <div className="record-index">{record.magnification}</div>
              <div className="record-body">
                <h3>
                  {record.name}
                  <span className="type-chip">{record.type}</span>
                </h3>
                <p>
                  {record.stain} · {record.structure}
                </p>
                <p className="record-desc">{record.description}</p>
                <p className="record-conclusion-line">结论：{record.conclusion}</p>
                <div className="record-meta">
                  <span>{formatTime(record.createdAt)}</span>
                  {!readOnly && (
                    <button
                      className="link-button"
                      onClick={() => startEdit(record)}
                    >
                      更正 / 编辑
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {!readOnly && (
          <div className="record-form">
            <h3>{editingId ? "更正记录" : "新增记录"}</h3>
            <div className="field-grid">
              <label>
                <span>样本名称 *</span>
                <input
                  value={form.name}
                  onChange={(e) => patch("name", e.target.value)}
                  placeholder="填写样本名称"
                />
              </label>
              <label>
                <span>样本类型</span>
                <select
                  value={form.type}
                  onChange={(e) => patch("type", e.target.value)}
                >
                  {RECORD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>染色方式</span>
                <input
                  value={form.stain}
                  onChange={(e) => patch("stain", e.target.value)}
                  placeholder="如 碘液 / HE染色"
                />
              </label>
              <label>
                <span>放大倍数 *</span>
                <input
                  value={form.magnification}
                  onChange={(e) => patch("magnification", e.target.value)}
                  placeholder="如 400x"
                />
              </label>
              <label className="full-span">
                <span>观察结构</span>
                <input
                  value={form.structure}
                  onChange={(e) => patch("structure", e.target.value)}
                  placeholder="如 细胞壁、细胞核"
                />
              </label>
              <label className="full-span">
                <span>视野描述</span>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => patch("description", e.target.value)}
                  placeholder="描述视野所见"
                />
              </label>
              <label className="full-span">
                <span>观察结论</span>
                <textarea
                  rows={2}
                  value={form.conclusion}
                  onChange={(e) => patch("conclusion", e.target.value)}
                  placeholder="讲评时投屏重点展示"
                />
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button className="primary-action" onClick={submit}>
                {editingId ? "保存更正" : "保存记录"}
              </button>
              {editingId && <button onClick={resetForm}>取消</button>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
