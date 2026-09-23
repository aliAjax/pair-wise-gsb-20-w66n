import type { Role } from "./types";

export function RoleSwitch({ role, onChange }: { role: Role; onChange: (role: Role) => void }) {
  return (
    <div className="role-switch" role="group" aria-label="当前身份">
      <span className="role-label">当前身份</span>
      <button
        className={role === "teacher" ? "active" : ""}
        onClick={() => onChange("teacher")}
      >
        教师（讲评台）
      </button>
      <button
        className={role === "student" ? "active" : ""}
        onClick={() => onChange("student")}
      >
        学生（发复看）
      </button>
    </div>
  );
}
