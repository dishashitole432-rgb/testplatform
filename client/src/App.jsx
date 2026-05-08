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
  const [testForm, setTestForm] = useState({ title: "", description: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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
    setStatus("");
    setBusy(true);
    try {
      if (mode === "register") await api.post("/auth/register", authForm);
      const { data } = await api.post("/auth/login", { email: authForm.email, password: authForm.password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setAuthToken(data.token);
      setUser(data.user);
    } catch (error) {
      setStatus(error?.response?.data?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setAuthToken("");
    setUser(null);
    setAttempt(null);
    setResult(null);
  };

  const createTest = async () => {
    if (!testForm.title.trim()) {
      setStatus("Please enter test name.");
      return;
    }
    setStatus("");
    await api.post("/tests", { title: testForm.title.trim(), description: testForm.description.trim() });
    setTestForm({ title: "", description: "" });
    await loadData();
  };

  const updateSelectedTest = async () => {
    if (!selectedTestId) return;
    if (!testForm.title.trim()) {
      setStatus("Please enter test name.");
      return;
    }
    setStatus("");
    await api.patch(`/tests/${selectedTestId}`, {
      title: testForm.title.trim(),
      description: testForm.description.trim(),
    });
    await loadData();
    setStatus("Test details updated.");
  };

  const addQuestion = async () => {
    if (!selectedTestId) return;
    if (!questionDraft.prompt.trim()) {
      setStatus("Please add a question statement.");
      return;
    }
    if (questionDraft.options.some((option) => !option.trim())) {
      setStatus("Please fill all four options.");
      return;
    }
    setStatus("");
    await api.post(`/tests/${selectedTestId}/questions`, {
      ...questionDraft,
      prompt: questionDraft.prompt.trim(),
      options: questionDraft.options.map((option) => option.trim()),
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
    setStatus("");
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
  const progressPercent = questionState.totalQuestions
    ? Math.round((questionState.order / questionState.totalQuestions) * 100)
    : 0;

  const selectTestForEdit = (testItem) => {
    setSelectedTestId(testItem._id);
    setTestForm({ title: testItem.title || "", description: testItem.description || "" });
    setStatus("");
  };

  if (!user) {
    return (
      <div className="authWrap">
        <div className="authPanel">
          <h1>Test Platform</h1>
          <p>Manage and take timed MCQ tests with instant scoring.</p>
          {mode === "register" && (
            <>
              <label htmlFor="name">Full Name</label>
              <input id="name" placeholder="e.g. Akash Sharma" value={authForm.name} onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))} />
            </>
          )}
          <label htmlFor="email">Email</label>
          <input id="email" placeholder="you@example.com" value={authForm.email} onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" placeholder="Minimum 6 characters" value={authForm.password} onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))} />
          {mode === "register" && (
            <>
              <label htmlFor="role">Role</label>
              <select id="role" value={authForm.role} onChange={(e) => setAuthForm((p) => ({ ...p, role: e.target.value }))}>
                <option value="candidate">Candidate</option>
                <option value="admin">Admin</option>
              </select>
            </>
          )}
          {status && <p className="statusError">{status}</p>}
          <button disabled={busy} onClick={loginOrRegister}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Register & Login"}
          </button>
          <button className="ghostButton" onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}>
            Switch to {mode === "login" ? "Register" : "Login"}
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin && attempt && questionState.question && !result) {
    return (
      <div className="examShell">
        <header className="examHeader">
          <div>
            <h2>Live Test</h2>
            <p>
              Question {questionState.order} of {questionState.totalQuestions}
            </p>
          </div>
          <div className={`timerBadge ${questionState.remaining < 6 ? "danger" : ""}`}>
            {String(Math.floor(questionState.remaining / 60)).padStart(2, "0")}:
            {String(questionState.remaining % 60).padStart(2, "0")}
          </div>
        </header>
        <div className="progressTrack">
          <div className="progressFill" style={{ width: `${progressPercent}%` }} />
        </div>

        <main className="examCard">
          <h3>{questionState.question.prompt}</h3>
          <div className="optionList">
            {questionState.question.options.map((op, i) => (
              <button
                key={i}
                className={`optionButton ${questionState.selectedOptionIndex === i ? "active" : ""}`}
                onClick={() => setQuestionState((p) => ({ ...p, selectedOptionIndex: i }))}
              >
                <span className="optionIndex">{String.fromCharCode(65 + i)}</span>
                <span>{op}</span>
              </button>
            ))}
          </div>
          <div className="examActions">
            <button onClick={() => saveAnswer(false)}>
              {questionState.order < questionState.totalQuestions ? "Save & Next" : "Save & Submit"}
            </button>
            <button className="ghostButton" onClick={submitAttempt}>
              Submit Test
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topBar">
        <div>
          <h2>Welcome, {user.name}</h2>
          <p>{isAdmin ? "Create structured tests with clear question controls." : "Select a test to begin."}</p>
        </div>
        <div className="inlineRow">
          <span className="badge">{user.role}</span>
          <button className="ghostButton" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      {status && <p className="statusText">{status}</p>}

      {isAdmin ? (
        <section className="layoutAdmin">
          <div className="panel">
            <h3>Create or Edit Test</h3>
            <p className="muted">Use a clear test name so candidates understand what they are attempting.</p>

            <label htmlFor="testTitle">Test Name</label>
            <input
              id="testTitle"
              placeholder="e.g. JavaScript Fundamentals - Level 1"
              value={testForm.title}
              onChange={(e) => setTestForm((p) => ({ ...p, title: e.target.value }))}
            />

            <label htmlFor="testDesc">Description (optional)</label>
            <textarea
              id="testDesc"
              placeholder="Briefly describe this test..."
              value={testForm.description}
              onChange={(e) => setTestForm((p) => ({ ...p, description: e.target.value }))}
            />

            <div className="inlineRow">
              <button onClick={createTest}>Create New Test</button>
              <button className="ghostButton" onClick={updateSelectedTest} disabled={!selectedTestId}>
                Update Selected Test
              </button>
            </div>

            <h4 className="sectionTitle">Your Tests</h4>
            {tests.length === 0 && <p className="muted">No tests yet. Create your first test above.</p>}
            {tests.map((t) => (
              <div key={t._id} className={`testCard ${selectedTestId === t._id ? "selected" : ""}`}>
                <div>
                  <strong>{t.title}</strong>
                  <p>{t.description || "No description"}</p>
                  <small>{t.questions.length} questions</small>
                </div>
                <div className="stackButtons">
                  <button className="ghostButton" onClick={() => selectTestForEdit(t)}>
                    Select
                  </button>
                  <button className="ghostButton" onClick={() => togglePublish(t._id, t.published)}>
                    {t.published ? "Unpublish" : "Publish"}
                  </button>
                  <button className="ghostButton" onClick={() => fetchSubmissions(t._id)}>
                    View Submissions
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Question Builder</h3>
            <p className="muted">
              {currentTest ? (
                <>Adding questions to: <strong>{currentTest.title}</strong></>
              ) : (
                "Select a test first. Then add questions below."
              )}
            </p>

            <label htmlFor="questionPrompt">Question Statement</label>
            <textarea
              id="questionPrompt"
              placeholder="Write the full question..."
              value={questionDraft.prompt}
              onChange={(e) => setQuestionDraft((p) => ({ ...p, prompt: e.target.value }))}
            />

            <label>Options (exactly 4)</label>
            {questionDraft.options.map((op, idx) => (
              <input
                key={idx}
                placeholder={`Option ${idx + 1}`}
                value={op}
                onChange={(e) =>
                  setQuestionDraft((p) => ({ ...p, options: p.options.map((x, i) => (i === idx ? e.target.value : x)) }))
                }
              />
            ))}

            <div className="fieldGrid">
              <div>
                <label htmlFor="correctIndex">Correct Option (0 to 3)</label>
                <input
                  id="correctIndex"
                  type="number"
                  min="0"
                  max="3"
                  value={questionDraft.correctOptionIndex}
                  onChange={(e) => setQuestionDraft((p) => ({ ...p, correctOptionIndex: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="marks">Marks</label>
                <input
                  id="marks"
                  type="number"
                  min="1"
                  value={questionDraft.marks}
                  onChange={(e) => setQuestionDraft((p) => ({ ...p, marks: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="timer">Timer (seconds)</label>
                <input
                  id="timer"
                  type="number"
                  min="5"
                  value={questionDraft.timeLimitSec}
                  onChange={(e) => setQuestionDraft((p) => ({ ...p, timeLimitSec: e.target.value }))}
                />
              </div>
            </div>

            <button onClick={addQuestion} disabled={!selectedTestId}>
              Add Question
            </button>

            {submissions.length > 0 && (
              <div className="submissionList">
                <h4>Submissions</h4>
                {submissions.map((s) => (
                  <div key={s._id} className="submissionRow">
                    <span>{s.userId?.name || "User"}</span>
                    <strong>
                      {s.score}/{s.totalMarks}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="panel">
          <h3>Available Tests</h3>
          <p className="muted">Start a test to enter full-screen exam mode.</p>
          {tests.length === 0 && <p className="muted">No published tests available right now.</p>}
          {tests.map((t) => (
            <div key={t._id} className="testCard">
              <div>
                <strong>{t.title}</strong>
                <p>{t.description || "No description"}</p>
                <small>{t.questions?.length || 0} questions</small>
              </div>
              <button onClick={() => startTest(t._id)}>Start Test</button>
            </div>
          ))}
          {result && (
            <div className="resultPanel">
              <h3>Result</h3>
              <p className="scoreLine">
                Score: {result.score} / {result.totalMarks}
              </p>
              {result.review?.map((r, i) => (
                <div key={i} className="reviewItem">
                  <b>
                    {i + 1}. {r.question}
                  </b>
                  <p>Your answer: {r.selectedOptionIndex !== null ? r.options[r.selectedOptionIndex] : "Not answered"}</p>
                  <p>Correct answer: {r.options[r.correctOptionIndex]}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
