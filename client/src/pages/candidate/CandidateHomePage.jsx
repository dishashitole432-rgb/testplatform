import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";

export default function CandidateHomePage() {
  const [tests, setTests] = useState([]);
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get("/tests/available/list");
    setTests(data);
  };

  useEffect(() => {
    load().catch(() => setStatus("Failed to load tests."));
  }, []);

  const start = async (testId) => {
    const { data } = await api.post(`/attempts/start/${testId}`);
    navigate(`/candidate/exam/${data._id}`);
  };

  return (
    <div className="page">
      <header className="topBar">
        <div>
          <h2>Candidate • Tests</h2>
          <p>Select a test to enter full-screen exam mode.</p>
        </div>
        <Link className="linkButton" to="/admin">
          Admin view
        </Link>
      </header>

      {status && <p className="statusText">{status}</p>}

      <section className="panel">
        <h3>Available Tests</h3>
        {tests.length === 0 && <p className="muted">No published tests available right now.</p>}
        {tests.map((t) => (
          <div key={t._id} className="testCard">
            <div>
              <strong>{t.title}</strong>
              <p>{t.description || "No description"}</p>
              <small>{t.questions?.length || 0} questions</small>
            </div>
            <button onClick={() => start(t._id)}>Start Test</button>
          </div>
        ))}
      </section>
    </div>
  );
}

