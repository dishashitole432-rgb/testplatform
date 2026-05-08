import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";

export default function AdminTestsPage() {
  const [tests, setTests] = useState([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ title: "", description: "" });
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get("/tests/admin");
    setTests(data);
  };

  useEffect(() => {
    load().catch(() => setStatus("Failed to load tests."));
  }, []);

  const create = async () => {
    if (!form.title.trim()) {
      setStatus("Please enter a test name.");
      return;
    }
    setStatus("");
    const { data } = await api.post("/tests", { title: form.title.trim(), description: form.description.trim() });
    setForm({ title: "", description: "" });
    await load();
    navigate(`/admin/tests/${data._id}`);
  };

  const togglePublish = async (testId, published) => {
    await api.patch(`/tests/${testId}/publish`, { published: !published });
    await load();
  };

  return (
    <div className="page">
      <header className="topBar">
        <div>
          <h2>Admin • Tests</h2>
          <p>Create tests, then open a test to manage questions.</p>
        </div>
        <Link className="linkButton" to="/candidate">
          Candidate view
        </Link>
      </header>

      {status && <p className="statusText">{status}</p>}

      <section className="layoutAdmin">
        <div className="panel">
          <h3>Create New Test</h3>
          <p className="muted">This creates a test shell. Add questions from the Test Editor page.</p>

          <label htmlFor="title">Test Name</label>
          <input
            id="title"
            placeholder="e.g. React Basics • Round 1"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />

          <label htmlFor="desc">Description (optional)</label>
          <textarea
            id="desc"
            placeholder="Short instructions for candidates..."
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />

          <button onClick={create}>Create & Open Editor</button>
        </div>

        <div className="panel">
          <h3>Your Tests</h3>
          {tests.length === 0 && <p className="muted">No tests yet.</p>}
          {tests.map((t) => (
            <div key={t._id} className="testCard">
              <div>
                <strong>{t.title}</strong>
                <p>{t.description || "No description"}</p>
                <small>{t.questions?.length || 0} questions</small>
              </div>
              <div className="stackButtons">
                <Link className="ghostButton linkAsButton" to={`/admin/tests/${t._id}`}>
                  Open Editor
                </Link>
                <button className="ghostButton" onClick={() => togglePublish(t._id, t.published)}>
                  {t.published ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

