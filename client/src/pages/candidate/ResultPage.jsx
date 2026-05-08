import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";

export default function ResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get(`/attempts/${attemptId}/result`)
      .then(({ data }) => setResult(data))
      .catch(() => setStatus("Failed to load result."));
  }, [attemptId]);

  return (
    <div className="page">
      <header className="topBar">
        <div>
          <h2>Result</h2>
          <p>Score and answer review.</p>
        </div>
        <Link className="linkButton" to="/candidate">
          Back to Tests
        </Link>
      </header>

      {status && <p className="statusText">{status}</p>}

      <section className="panel">
        {!result ? (
          <p>Loading…</p>
        ) : (
          <>
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
          </>
        )}
      </section>
    </div>
  );
}

