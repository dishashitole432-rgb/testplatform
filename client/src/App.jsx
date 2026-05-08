import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { setToken } from "./api";
import AuthPage from "./pages/AuthPage";
import AdminTestsPage from "./pages/admin/AdminTestsPage";
import AdminTestEditorPage from "./pages/admin/AdminTestEditorPage";
import AdminSubmissionsPage from "./pages/admin/AdminSubmissionsPage";
import CandidateHomePage from "./pages/candidate/CandidateHomePage";
import ExamPage from "./pages/candidate/ExamPage";
import ResultPage from "./pages/candidate/ResultPage";
import { clearAuth, readAuth } from "./utils/authStorage";

export default function App() {
  const boot = readAuth();
  const [token, setAuthToken] = useState(boot.token);
  const [user, setUser] = useState(boot.user);

  useEffect(() => setToken(token), [token]);

  const logout = () => {
    clearAuth();
    setAuthToken("");
    setUser(null);
  };

  if (!user) {
    return (
      <AuthPage
        onAuthed={({ token: t, user: u }) => {
          setAuthToken(t);
          setUser(u);
        }}
      />
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <>
      <div className="appTopStrip">
        <div className="appTopInner">
          <div className="brandMini">Test Platform</div>
          <div className="inlineRow">
            <span className="badge">{user?.role}</span>
            <button className="ghostButton" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to={isAdmin ? "/admin" : "/candidate"} replace />} />

        <Route path="/admin" element={isAdmin ? <AdminTestsPage /> : <Navigate to="/candidate" replace />} />
        <Route path="/admin/tests/:testId" element={isAdmin ? <AdminTestEditorPage /> : <Navigate to="/candidate" replace />} />
        <Route path="/admin/tests/:testId/submissions" element={isAdmin ? <AdminSubmissionsPage /> : <Navigate to="/candidate" replace />} />

        <Route path="/candidate" element={!isAdmin ? <CandidateHomePage /> : <Navigate to="/admin" replace />} />
        <Route path="/candidate/exam/:attemptId" element={!isAdmin ? <ExamPage /> : <Navigate to="/admin" replace />} />
        <Route path="/candidate/result/:attemptId" element={!isAdmin ? <ResultPage /> : <Navigate to="/admin" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
