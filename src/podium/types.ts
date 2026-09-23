/** 一条显微镜玻片观察记录（讲评期间只读） */
export interface ObservationRecord {
  id: string;
  /** 样本名称 */
  name: string;
  /** 样本类型 */
  category: string;
  /** 染色方式 */
  stain: string;
  /** 放大倍数，如 400x */
  magnification: string;
  /** 观察结构 */
  structure: string;
  /** 视野描述 */
  description: string;
  /** 结论（讲评投屏时重点展示） */
  conclusion: string;
  createdAt: number;
}

/** 学生针对某条样本发出的复看请求 */
export interface ReviewRequest {
  id: string;
  student: string;
  reason: string;
  createdAt: number;
  status: "pending" | "handled";
  handledAt?: number;
  /** 教师处理时填写的说明 */
  note?: string;
}

/** 课堂讲评队列中的一个样本位（请求始终挂在原样本位上） */
export interface SessionItem {
  recordId: string;
  addedAt: number;
  requests: ReviewRequest[];
}

/** 一次讲评课堂 */
export interface ClassroomSession {
  id: string;
  name: string;
  createdAt: number;
  status: "active" | "ended";
  /** 当前投屏样本在 items 中的位置 */
  currentIndex: number;
  /** 按展示顺序排好的样本 */
  items: SessionItem[];
  endedAt?: number;
  /** 结束原因（因记录需更正而结束时必须填写） */
  endReason?: string;
}

export type Role = "teacher" | "student";
