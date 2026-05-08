import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";

const emptyQuestion = {
  prompt: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  marks: 1,
  timeLimitSec: 30,
};

export default function AdminTestEditorPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [tests, setTests] = useState([]);
  const [testForm, setTestForm] = useState({ title: "", description: "" });
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState("");

  const load = async () => {
    const { data } = await api.get("/tests/admin");
    setTests(data);
  };

  useEffect(() => {
    load().catch(() => setStatus("Failed to load test."));
  }, [testId]);

  const currentTest = useMemo(() => tests.find((t) => t._id === testId), [tests, testId]);

  useEffect(() => {
    if (!currentTest) return;
    setTestForm({ title: currentTest.title || "", description: currentTest.description || "" });
  }, [currentTest?._id]);

  const saveTestDetails = async () => {
    if (!testForm.title.trim()) {
      setStatus("Test name is required.");
      return;
    }
    await api.patch(`/tests/${testId}`, { title: testForm.title.trim(), description: testForm.description.trim() });
    setStatus("Saved test details.");
    await load();
  };

  const addQuestion = async () => {
    if (!questionForm.prompt.trim()) return setStatus("Question statement is required.");
    if (questionForm.options.some((o) => !o.trim())) return setStatus("Fill all four options.");
    await api.post(`/tests/${testId}/questions`, {
      prompt: questionForm.prompt.trim(),
      options: questionForm.options.map((o) => o.trim()),
      correctOptionIndex: Number(questionForm.correctOptionIndex),
      marks: Number(questionForm.marks),
      timeLimitSec: Number(questionForm.timeLimitSec),
    });
    setQuestionForm(emptyQuestion);
    setStatus("Question added.");
    await load();
  };

  const beginEditQuestion = (q) => {
    setEditingQuestionId(q._id);
    setQuestionForm({
      prompt: q.prompt || "",
      options: q.options || ["", "", "", ""],
      correctOptionIndex: q.correctOptionIndex ?? 0,
      marks: q.marks ?? 1,
      timeLimitSec: q.timeLimitSec ?? 30,
    });
    setStatus("");
  };

  const cancelEdit = () => {
    setEditingQuestionId("");
    setQuestionForm(emptyQuestion);
    setStatus("");
  };

  const saveQuestionEdit = async () => {
    if (!editingQuestionId) return;
    if (!questionForm.prompt.trim()) return setStatus("Question statement is required.");
    if (questionForm.options.some((o) => !o.trim())) return setStatus("Fill all four options.");
    await api.patch(`/tests/questions/${editingQuestionId}`, {
      prompt: questionForm.prompt.trim(),
      options: questionForm.options.map((o) => o.trim()),
      correctOptionIndex: Number(questionForm.correctOptionIndex),
      marks: Number(questionForm.marks),
      timeLimitSec: Number(questionForm.timeLimitSec),
    });
    setStatus("Question updated.");
    setEditingQuestionId("");
    setQuestionForm(emptyQuestion);
    await load();
  };

  const deleteQuestion = async (questionId) => {
    await api.delete(`/tests/questions/${questionId}`);
    setStatus("Question deleted.");
    if (editingQuestionId === questionId) cancelEdit();
    await load();
  };

  const togglePublish = async () => {
    await api.patch(`/tests/${testId}/publish`, { published: !currentTest?.published });
    await load();
  };

  if (!currentTest) {
    return (
      <div className="page">
        <header className="topBar">
          <div>
            <h2>Test Editor</h2>
            <p>Loading…</p>
          </div>
          <Link className="linkButton" to="/admin">
            Back
          </Link>
        </header>
        {status && <p className="statusText">{status}</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topBar">
        <div>
          <h2>Editor • {currentTest.title}</h2>
          <p>View all questions, edit, delete, and add new questions.</p>
        </div>
        <div className="inlineRow">
          <button className="ghostButton" onClick={() => navigate("/admin")}>
            Back to Tests
          </button>
          <button className="ghostButton" onClick={togglePublish}>
            {currentTest.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </header>

      {status && <p className="statusText">{status}</p>}

      <section className="layoutAdmin">
        <div className="panel">
          <h3>Test Details</h3>
          <label htmlFor="title">Test Name</label>
          <input id="title" value={testForm.title} onChange={(e) => setTestForm((p) => ({ ...p, title: e.target.value }))} />
          <label htmlFor="desc">Description</label>
          <textarea id="desc" value={testForm.description} onChange={(e) => setTestForm((p) => ({ ...p, description: e.target.value }))} />
          <button onClick={saveTestDetails}>Save Details</button>

          <div className="divider" />

          <h3>{editingQuestionId ? "Edit Question" : "Add Question"}</h3>
          <label htmlFor="q">Question Statement</label>
          <textarea id="q" value={questionForm.prompt} onChange={(e) => setQuestionForm((p) => ({ ...p, prompt: e.target.value }))} />

          <label>Options</label>
          {questionForm.options.map((op, idx) => (
            <input
              key={idx}
              placeholder={`Option ${idx + 1}`}
              value={op}
              onChange={(e) => setQuestionForm((p) => ({ ...p, options: p.options.map((x, i) => (i === idx ? e.target.value : x)) }))}
            />
          ))}

          <div className="fieldGrid">
            <div>
              <label htmlFor="correct">Correct Option (0 to 3)</label>
              <input
                id="correct"
                type="number"
                min="0"
                max="3"
                value={questionForm.correctOptionIndex}
                onChange={(e) => setQuestionForm((p) => ({ ...p, correctOptionIndex: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="marks">Marks</label>
              <input id="marks" type="number" min="1" value={questionForm.marks} onChange={(e) => setQuestionForm((p) => ({ ...p, marks: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="timer">Timer (seconds)</label>
              <input id="timer" type="number" min="5" value={questionForm.timeLimitSec} onChange={(e) => setQuestionForm((p) => ({ ...p, timeLimitSec: e.target.value }))} />
            </div>
          </div>

          {editingQuestionId ? (
            <div className="inlineRow">
              <button onClick={saveQuestionEdit}>Save Changes</button>
              <button className="ghostButton" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={addQuestion}>Add Question</button>
          )}
        </div>

        <div className="panel">
          <h3>All Questions ({currentTest.questions?.length || 0})</h3>
          {(!currentTest.questions || currentTest.questions.length === 0) && <p className="muted">No questions yet. Add your first question on the left.</p>}

          <div className="questionTable">
            {currentTest.questions?.map((q, idx) => (
              <div key={q._id} className="questionRow">
                <div className="questionMeta">
                  <div className="questionTitle">
                    <span className="qNum">Q{idx + 1}</span>
                    <strong>{q.prompt}</strong>
                  </div>
                  <div className="questionSub">
                    <span>Correct: {String.fromCharCode(65 + (q.correctOptionIndex ?? 0))}</span>
                    <span>Marks: {q.marks}</span>
                    <span>Time: {q.timeLimitSec}s</span>
                  </div>
                </div>
                <div className="questionActions">
                  <button className="ghostButton" onClick={() => beginEditQuestion(q)}>
                    Edit
                  </button>
                  <button className="dangerButton" onClick={() => deleteQuestion(q._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

