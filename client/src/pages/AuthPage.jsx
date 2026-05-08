import { useState } from "react";
import { api, setToken } from "../api";
import { writeAuth } from "../utils/authStorage";

export default function AuthPage({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "candidate" });

  const submit = async () => {
    setBusy(true);
    setStatus("");
    try {
      if (mode === "register") await api.post("/auth/register", form);
      const { data } = await api.post("/auth/login", { email: form.email, password: form.password });
      writeAuth({ token: data.token, user: data.user });
      setToken(data.token);
      onAuthed({ token: data.token, user: data.user });
    } catch (error) {
      setStatus(error?.response?.data?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="authWrap">
      <div className="authPanel">
        <h1>Test Platform</h1>
        <p>Manage and take timed MCQ tests with instant scoring.</p>

        {mode === "register" && (
          <>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              placeholder="e.g. Akash Sharma"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Minimum 6 characters"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
        />

        {mode === "register" && (
          <>
            <label htmlFor="role">Role</label>
            <select id="role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="candidate">Candidate</option>
              <option value="admin">Admin</option>
            </select>
          </>
        )}

        {status && <p className="statusError">{status}</p>}

        <button disabled={busy} onClick={submit}>
          {busy ? "Please wait..." : mode === "login" ? "Login" : "Register & Login"}
        </button>

        <button className="ghostButton" onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}>
          Switch to {mode === "login" ? "Register" : "Login"}
        </button>
      </div>
    </div>
  );
}

