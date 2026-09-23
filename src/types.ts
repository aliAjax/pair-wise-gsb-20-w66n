// 观察记录：记录库中的一条玻片观察样本
export interface ObservationRecord {
  id: string;
  name: string; // 样本名称
  type: string; // 样本类型
  stain: string; // 染色方式
  magnification: string; // 放大倍数，如 400x
  structure: string; // 观察结构
  description: string; // 视野描述
  conclusion: string; // 观察结论
  createdAt: number;
}

// 复看请求：学生针对「当前样本」发起，按 recordId 跟随原样本保留
export type RequestStatus = "pending" | "accepted" | "rejected";

export interface ReviewRequest {
  id: string;
  sessionId: string;
  recordId: string; // 原样本：请求始终跟着它
  studentName: string;
  note: string;
  createdAt: number;
  status: RequestStatus; // 未处理 / 已复看 / 已驳回
  handledAt?: number;
}

// 讲评队列：顺序在开课时确定并持久化
export interface QueueEntry {
  recordId: string;
}

export type SessionEndKind = "normal" | "correction";

export interface ClassroomSession {
  id: string;
  name: string;
  createdAt: number;
  status: "active" | "ended";
  currentIndex: number; // 当前样本在队列中的位置
  queue: QueueEntry[];
  endedAt?: number;
  endKind?: SessionEndKind;
  endReason?: string; // 因记录需要更正而结束时填写的原因
}
