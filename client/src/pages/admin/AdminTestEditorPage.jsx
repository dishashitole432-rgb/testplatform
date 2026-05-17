import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import QuestionImage from "../../components/QuestionImage";

const emptyQuestion = {
  prompt: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  marks: 1,
  timeLimitSec: 30,
  imageUrl: "",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function AdminTestEditorPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [tests, setTests] = useState([]);
  const [testForm, setTestForm] = useState({ title: "", description: "" });
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const imageInputRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const clearImageSelection = () => {
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl("");
    setQuestionForm((p) => ({ ...p, imageUrl: "" }));
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose a JPG, PNG, GIF, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setStatus("Image must be 5 MB or smaller.");
      return;
    }
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setStatus("");
  };

  const uploadQuestionImage = async () => {
    if (!imageFile) return questionForm.imageUrl || "";
    const formData = new FormData();
    formData.append("image", imageFile);
    const { data } = await api.post("/tests/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.imageUrl;
  };

  const buildQuestionPayload = (imageUrl) => ({
    prompt: questionForm.prompt.trim(),
    options: questionForm.options.map((o) => o.trim()),
    correctOptionIndex: Number(questionForm.correctOptionIndex),
    marks: Number(questionForm.marks),
    timeLimitSec: Number(questionForm.timeLimitSec),
    imageUrl: imageUrl || "",
  });

  const resetQuestionForm = () => {
    clearImageSelection();
    setQuestionForm(emptyQuestion);
  };

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
    try {
      const imageUrl = await uploadQuestionImage();
      await api.post(`/tests/${testId}/questions`, buildQuestionPayload(imageUrl));
      resetQuestionForm();
      setStatus("Question added.");
      await load();
    } catch {
      setStatus("Failed to add question. Check the image and try again.");
    }
  };

  const beginEditQuestion = (q) => {
    clearImageSelection();
    setEditingQuestionId(q._id);
    setQuestionForm({
      prompt: q.prompt || "",
      options: q.options || ["", "", "", ""],
      correctOptionIndex: q.correctOptionIndex ?? 0,
      marks: q.marks ?? 1,
      timeLimitSec: q.timeLimitSec ?? 30,
      imageUrl: q.imageUrl || "",
    });
    setStatus("");
  };

  const cancelEdit = () => {
    setEditingQuestionId("");
    resetQuestionForm();
    setStatus("");
  };

  const saveQuestionEdit = async () => {
    if (!editingQuestionId) return;
    if (!questionForm.prompt.trim()) return setStatus("Question statement is required.");
    if (questionForm.options.some((o) => !o.trim())) return setStatus("Fill all four options.");
    try {
      const imageUrl = await uploadQuestionImage();
      await api.patch(`/tests/questions/${editingQuestionId}`, buildQuestionPayload(imageUrl));
      setStatus("Question updated.");
      setEditingQuestionId("");
      resetQuestionForm();
      await load();
    } catch {
      setStatus("Failed to update question. Check the image and try again.");
    }
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
          <Link className="ghostButton linkAsButton" to={`/admin/tests/${testId}/submissions`}>
            Submissions
          </Link>
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

          <label htmlFor="qImage">Question Image (optional)</label>
          <input
            ref={imageInputRef}
            id="qImage"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={onImageSelected}
          />
          <p className="muted imageFieldHint">JPG, PNG, GIF, or WebP · up to 5 MB · candidates can click to zoom.</p>
          {(imagePreviewUrl || questionForm.imageUrl) && (
            <div className="imageUploadPreview">
              <QuestionImage
                imageUrl={imagePreviewUrl || questionForm.imageUrl}
                alt="Question preview"
                compact
              />
              <button type="button" className="ghostButton" onClick={clearImageSelection}>
                Remove image
              </button>
            </div>
          )}

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
                  {q.imageUrl && <QuestionImage imageUrl={q.imageUrl} alt={`Question ${idx + 1}`} compact />}
                  <div className="questionSub">
                    <span>Correct: {String.fromCharCode(65 + (q.correctOptionIndex ?? 0))}</span>
                    <span>Marks: {q.marks}</span>
                    <span>Time: {q.timeLimitSec}s</span>
                    {q.imageUrl && <span>Has image</span>}
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

