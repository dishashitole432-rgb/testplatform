import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import QuestionImage from "../../components/QuestionImage";

export default function ExamPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [questionState, setQuestionState] = useState({
    question: null,
    totalQuestions: 0,
    order: 1,
    selectedOptionIndex: null,
    remaining: 0,
  });

  const progressPercent = useMemo(() => {
    if (!questionState.totalQuestions) return 0;
    return Math.round((questionState.order / questionState.totalQuestions) * 100);
  }, [questionState.order, questionState.totalQuestions]);

  const loadQuestion = async (order) => {
    const { data } = await api.get(`/attempts/${attemptId}/question/${order}`);
    setQuestionState({
      question: data.question,
      totalQuestions: data.totalQuestions,
      order,
      selectedOptionIndex: null,
      remaining: data.question.timeLimitSec,
    });
  };

  useEffect(() => {
    loadQuestion(1).catch(() => setStatus("Failed to load question."));
  }, [attemptId]);

  useEffect(() => {
    if (!questionState.question) return;
    if (questionState.remaining <= 0) {
      saveAnswer(true).catch(() => {});
      return;
    }
    const id = setTimeout(() => setQuestionState((p) => ({ ...p, remaining: p.remaining - 1 })), 1000);
    return () => clearTimeout(id);
  }, [questionState.question?._id, questionState.remaining]);

  const saveAnswer = async (timedOut = false) => {
    if (!questionState.question) return;
    await api.post(`/attempts/${attemptId}/answer`, {
      questionId: questionState.question._id,
      selectedOptionIndex: questionState.selectedOptionIndex,
      timeSpentSec: questionState.question.timeLimitSec - questionState.remaining,
      timedOut,
    });

    if (questionState.order < questionState.totalQuestions) {
      await loadQuestion(questionState.order + 1);
    } else {
      await submit();
    }
  };

  const submit = async () => {
    await api.post(`/attempts/${attemptId}/submit`);
    navigate(`/candidate/result/${attemptId}`);
  };

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

      {status && <p className="statusText">{status}</p>}

      <main className="examCard">
        {!questionState.question ? (
          <p>Loading…</p>
        ) : (
          <>
            <h3>{questionState.question.prompt}</h3>
            {questionState.question.imageUrl && (
              <QuestionImage imageUrl={questionState.question.imageUrl} alt={`Question ${questionState.order}`} />
            )}
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
              <button className="ghostButton" onClick={submit}>
                Submit Test
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

