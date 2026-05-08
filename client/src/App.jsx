import { useEffect, useMemo, useState } from "react";
import { api, setToken } from "./api";

const emptyQuestion = { prompt: "", options: ["", "", "", ""], correctOptionIndex: 0, marks: 1, timeLimitSec: 30 };

export default function App() {
  const [token, setAuthToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "candidate" });
  const [mode, setMode] = useState("login");
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [questionDraft, setQuestionDraft] = useState(emptyQuestion);
  const [attempt, setAttempt] = useState(null);
  const [questionState, setQuestionState] = useState({ question: null, totalQuestions: 0, order: 1, selectedOptionIndex: null, remaining: 0 });
  const [result, setResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => setToken(token), [token]);
  const isAdmin = user?.role === "admin";

  const loadData = async () => {
    if (!token) return;
    if (isAdmin) {
      const { data } = await api.get("/tests/admin");
      setTests(data);
    } else {
      const { data } = await api.get("/tests/available/list");
      setTests(data);
    }
  };

  useEffect(() => {
    loadData().catch(() => {});
  }, [token, isAdmin]);

  useEffect(() => {
    if (!questionState.question || result) return;
    if (questionState.remaining <= 0) {
      saveAnswer(true).catch(() => {});
      return;
    }
    const id = setTimeout(() => setQuestionState((prev) => ({ ...prev, remaining: prev.remaining - 1 })), 1000);
    return () => clearTimeout(id);
  }, [questionState, result]);

  const loginOrRegister = async () => {
    if (mode === "register") await api.post("/auth/register", authForm);
    const { data } = await api.post("/auth/login", { email: authForm.email, password: authForm.password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setAuthToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.clear();
    setAuthToken("");
    setUser(null);
    setAttempt(null);
    setResult(null);
  };

  const createTest = async () => {
    await api.post("/tests", { title: `New Test ${Date.now()}`, description: "MCQ test" });
    await loadData();
  };

  const addQuestion = async () => {
    if (!selectedTestId) return;
    await api.post(`/tests/${selectedTestId}/questions`, {
      ...questionDraft,
      correctOptionIndex: Number(questionDraft.correctOptionIndex),
      marks: Number(questionDraft.marks),
      timeLimitSec: Number(questionDraft.timeLimitSec),
    });
    setQuestionDraft(emptyQuestion);
    await loadData();
  };

  const togglePublish = async (testId, published) => {
    await api.patch(`/tests/${testId}/publish`, { published: !published });
    await loadData();
  };

  const startTest = async (testId) => {
    const { data } = await api.post(`/attempts/start/${testId}`);
    setAttempt(data);
    setResult(null);
    await loadQuestion(data._id, 1);
  };

  const loadQuestion = async (attemptId, order) => {
    const { data } = await api.get(`/attempts/${attemptId}/question/${order}`);
    setQuestionState({
      question: data.question,
      totalQuestions: data.totalQuestions,
      order,
      selectedOptionIndex: null,
      remaining: data.question.timeLimitSec,
    });
  };

  const saveAnswer = async (timedOut = false) => {
    if (!attempt || !questionState.question) return;
    await api.post(`/attempts/${attempt._id}/answer`, {
      questionId: questionState.question._id,
      selectedOptionIndex: questionState.selectedOptionIndex,
      timeSpentSec: questionState.question.timeLimitSec - questionState.remaining,
      timedOut,
    });
    if (questionState.order < questionState.totalQuestions) {
      await loadQuestion(attempt._id, questionState.order + 1);
    } else {
      await submitAttempt();
    }
  };

  const submitAttempt = async () => {
    const submitData = await api.post(`/attempts/${attempt._id}/submit`);
    const resultData = await api.get(`/attempts/${attempt._id}/result`);
    setResult({ ...submitData.data, ...resultData.data });
  };

  const fetchSubmissions = async (testId) => {
    const { data } = await api.get(`/tests/${testId}/submissions`);
    setSubmissions(data);
  };

  const currentTest = useMemo(() => tests.find((t) => t._id === selectedTestId), [tests, selectedTestId]);

  if (!user) {
    return (
      <div className="page auth">
        <div className="card">
          <h1>Online Test Platform</h1>
          <p>Create and attempt timed MCQ tests.</p>
          {mode === "register" && <input placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))} />}
          <input placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))} />
          <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))} />
          {mode === "register" && (
            <select value={authForm.role} onChange={(e) => setAuthForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="candidate">Candidate</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <button onClick={loginOrRegister}>{mode === "login" ? "Login" : "Register & Login"}</button>
          <button className="ghost" onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}>
            Switch to {mode === "login" ? "Register" : "Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header>
        <h2>Welcome, {user.name}</h2>
        <div className="row">
          <span className="badge">{user.role}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {isAdmin ? (
        <section className="grid2">
          <div className="card">
            <h3>Admin Panel</h3>
            <button onClick={createTest}>Create Test</button>
            {tests.map((t) => (
              <div key={t._id} className="testRow">
                <div>
                  <b>{t.title}</b>
                  <p>{t.questions.length} questions</p>
                </div>
                <div className="row">
                  <button onClick={() => setSelectedTestId(t._id)}>Edit</button>
                  <button className="ghost" onClick={() => togglePublish(t._id, t.published)}>{t.published ? "Unpublish" : "Publish"}</button>
                  <button className="ghost" onClick={() => fetchSubmissions(t._id)}>Submissions</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Question Builder</h3>
            <p>Selected: {currentTest?.title || "None"}</p>
            <input placeholder="Question" value={questionDraft.prompt} onChange={(e) => setQuestionDraft((p) => ({ ...p, prompt: e.target.value }))} />
            {questionDraft.options.map((op, idx) => (
              <input key={idx} placeholder={`Option ${idx + 1}`} value={op} onChange={(e) => setQuestionDraft((p) => ({ ...p, options: p.options.map((x, i) => (i === idx ? e.target.value : x)) }))} />
            ))}
            <div className="row">
              <input type="number" min="0" max="3" value={questionDraft.correctOptionIndex} onChange={(e) => setQuestionDraft((p) => ({ ...p, correctOptionIndex: e.target.value }))} />
              <input type="number" min="1" value={questionDraft.marks} onChange={(e) => setQuestionDraft((p) => ({ ...p, marks: e.target.value }))} />
              <input type="number" min="5" value={questionDraft.timeLimitSec} onChange={(e) => setQuestionDraft((p) => ({ ...p, timeLimitSec: e.target.value }))} />
            </div>
            <button onClick={addQuestion}>Add Question</button>
            {submissions.length > 0 && (
              <div>
                <h4>Submissions</h4>
                {submissions.map((s) => (
                  <p key={s._id}>{s.userId?.name || "User"} - {s.score}/{s.totalMarks}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="grid2">
          <div className="card">
            <h3>Available Tests</h3>
            {tests.map((t) => (
              <div key={t._id} className="testRow">
                <div>
                  <b>{t.title}</b>
                  <p>{t.description}</p>
                </div>
                <button onClick={() => startTest(t._id)}>Start</button>
              </div>
            ))}
          </div>

          <div className="card">
            {result ? (
              <>
                <h3>Result</h3>
                <p>Score: {result.score} / {result.totalMarks}</p>
                {result.review?.map((r, i) => (
                  <div key={i} className="reviewItem">
                    <b>{i + 1}. {r.question}</b>
                    <p>Your answer: {r.selectedOptionIndex !== null ? r.options[r.selectedOptionIndex] : "Not answered"}</p>
                    <p>Correct: {r.options[r.correctOptionIndex]}</p>
                  </div>
                ))}
              </>
            ) : questionState.question ? (
              <>
                <h3>Question {questionState.order}/{questionState.totalQuestions}</h3>
                <p className={questionState.remaining < 6 ? "warning" : ""}>Time Left: {questionState.remaining}s</p>
                <p>{questionState.question.prompt}</p>
                <div className="options">
                  {questionState.question.options.map((op, i) => (
                    <button key={i} className={questionState.selectedOptionIndex === i ? "selected" : "ghost"} onClick={() => setQuestionState((p) => ({ ...p, selectedOptionIndex: i }))}>
                      {op}
                    </button>
                  ))}
                </div>
                <button onClick={() => saveAnswer(false)}>Save & Next</button>
                <button className="ghost" onClick={submitAttempt}>Submit Test</button>
              </>
            ) : (
              <p>Select a test to start your attempt.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
