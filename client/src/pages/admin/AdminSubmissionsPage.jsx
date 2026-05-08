import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";

export default function AdminSubmissionsPage() {
  const { testId } = useParams();
  const [tests, setTests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    const [testsRes, subsRes] = await Promise.all([api.get("/tests/admin"), api.get(`/tests/${testId}/submissions`)]);
    setTests(testsRes.data);
    setSubmissions(subsRes.data);
  };

  useEffect(() => {
    load().catch(() => setStatus("Failed to load submissions."));
  }, [testId]);

  const test = useMemo(() => tests.find((t) => t._id === testId), [tests, testId]);

  return (
    <div className="page">
      <header className="topBar">
        <div>
          <h2>Submissions{test ? ` • ${test.title}` : ""}</h2>
          <p>Student records for this test (submitted attempts).</p>
        </div>
        <div className="inlineRow">
          <Link className="linkButton" to={`/admin/tests/${testId}`}>
            Back to Editor
          </Link>
          <Link className="ghostButton linkAsButton" to="/admin">
            All Tests
          </Link>
        </div>
      </header>

      {status && <p className="statusText">{status}</p>}

      <section className="panel">
        <h3>Submitted Attempts ({submissions.length})</h3>

        {submissions.length === 0 ? (
          <p className="muted">No submissions yet.</p>
        ) : (
          <div className="recordsTable">
            <div className="recordsHeader">
              <span>Student</span>
              <span>Email</span>
              <span>Marks</span>
              <span>Submitted</span>
            </div>
            {submissions.map((s) => (
              <div key={s._id} className="recordsRow">
                <span>{s.userId?.name || "Unknown"}</span>
                <span className="mono">{s.userId?.email || "-"}</span>
                <span className="scorePill">
                  {s.score}/{s.totalMarks}
                </span>
                <span>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "-"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

