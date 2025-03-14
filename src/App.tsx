import { useEffect, useState, useRef } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import Modal from "./Modal"; 
import './App.css'

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [tests, setTests] = useState<Array<Schema["Test"]["type"]>>([]);
  const [questions, setQuestions] = useState<Array<Schema["Question"]["type"]>>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState("");
  const [newTestDescription, setNewTestDescription] = useState("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Fetch the list of tests
  useEffect(() => {
    client.models.Test.observeQuery().subscribe({
      next: (data) => {
        const sortedTests = [...data.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTests(sortedTests);
      },
    });
  }, []);

  // Fetch questions for the selected test
  useEffect(() => {
    if (selectedTestId) {
      client.models.Question.observeQuery(
        { filter: { testId: { eq: selectedTestId } } }
      ).subscribe({
        next: (data) => {
          const sortedQuestions = [...data.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setQuestions(sortedQuestions);
        },
      });
    }
  }, [selectedTestId]);

  // Function to create a test
  const createTest = async () => {
    if (newTestName) {
      try {
        const result = await client.models.Test.create({
          testname: newTestName,
          testdescription: newTestDescription || "",
        });
        if (result.data) {
          setTests([...tests, result.data]);
        }
        setNewTestName("");
        setNewTestDescription("");
        setShowModal(false);
      } catch (error) {
        console.error("Error creating test:", error);
      }
    } else {
      alert("Test name is required");
    }
  };

  // Function to request a generated question from the API
  const generateQuestion = async () => {
    if (!selectedTestId) {
      alert("Please select a test before generating a question.");
      return;
    }

    // Retrieve the selected test's details
    const selectedTest = tests.find((test) => test.id === selectedTestId);
    if (!selectedTest) {
      alert("Selected test not found.");
      return;
    }

    try {
      const response = await fetch("https://knw2kmeyhl.execute-api.us-east-1.amazonaws.com/dev/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testname: selectedTest.testname,
          testdescription: selectedTest.testdescription || "",
        }),
      });
      const data = await response.json();
      const question = await client.models.Question.create({
        questioncontent: data.Question,
        correctanswer: data.Answer,
        answerexplanation: data.Explanation,
        testId: selectedTestId,
      });
      setQuestions((prev) => prev.concat(question.data ? [question.data] : []));
    } catch (error) {
      console.error("Error generating question:", error);
      alert("Failed to generate a question. Please try again.");
    }
  };

  // Function to submit the user's answer and get the score/feedback
  const submitAnswer = async () => {
    if (!selectedQuestionId || !userAnswer) {
      alert("Please select a question and provide an answer.");
      return;
    }

    // Retrieve the selected test's details
    const selectedTest = tests.find((test) => test.id === selectedTestId);
    if (!selectedTest) {
      alert("Selected test not found.");
      return;
    }
    const selectedQuestion = questions.find((question) => question.id === selectedQuestionId);
    // Ensure that we have the selected question and test details
    if (!selectedQuestion) {
      alert("Selected question not found.");
      return;
    }

    // Log values before API request
    // console.log("Test Name: ", selectedTest.testname);
    // console.log("Test Description: ", selectedTest.testdescription);
    // console.log("Question Content: ", selectedQuestion.questioncontent);
    // console.log("Real Answer: ", selectedQuestion.correctanswer);
    // console.log("useranswer: ", userAnswer);

    try {
      const response = await fetch("https://knw2kmeyhl.execute-api.us-east-1.amazonaws.com/dev/score-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testname: selectedTest.testname,
          testdescription: selectedTest.testdescription,
          testquestion: selectedQuestion.questioncontent,
          realanswer: selectedQuestion.correctanswer,
          useranswer: userAnswer,
        }),
      });
      const data = await response.json();

    // Assuming the response contains the feedback and score
    const feedback = data.Feedback;
    const score = parseFloat(data.Score);

    // Update the question with score and feedback
    await client.models.Question.update(
      { id: selectedQuestion.id, 
        useranswer: userAnswer,
        score: score,
        feedback: feedback}
    );

    // Update the local state with the updated score and feedback
    setQuestions((prevQuestions) => 
      prevQuestions.map((question) => 
        question.id === selectedQuestion.id 
          ? { ...question, score, feedback } 
          : question
      )
    );
    } catch (error) {
      console.error("Error scoring answer:", error);
      alert("Failed to submit the answer. Please try again.");
    }
  };

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false); 
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <main>
      <div className="userinfo">
        <div 
          className="user-dropdown" 
          ref={dropdownRef} 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <h2 className="username">{user.username}</h2>
          {showDropdown && (
            <div className="dropdown-menu">
              <button className="signoutbutton" onClick={signOut}>Sign out</button>
            </div>
          )}
        </div> 
      </div>
      <div className="mainpage">
        <div className="tests">
          {/* Display tests */}
          <div className="testlist">
            <ul>
              {tests.map((test) => (
                <li key={test.id} onClick={() => setSelectedTestId(test.id)}
                className={selectedTestId === test.id ? "selected-test" : ""}>
                  {test.testname} - {test.testdescription || "No description"}
                </li>
              ))}
            </ul>
          </div>
          {/* Button to Open Modal */}
          <div className="createtest">
            <div className="testcreatebutton" onClick={() => setShowModal(true)}>+ Create Test</div>
          </div>
        </div>

        {/* Modal for Creating Test */}
        <Modal
          show={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={createTest}
          testName={newTestName}
          setTestName={setNewTestName}
          testDescription={newTestDescription}
          setTestDescription={setNewTestDescription}
        />

        {/* Display questions for the selected test */}
        <div className="questions">
          {selectedTestId && (
            <div className="questionslist">
              <ul>
                {questions.map((question) => (
                  <li key={question.id} onClick={() => {
                    setSelectedQuestionId(question.id);
                    setUserAnswer(""); 
                  }}
                  className={selectedQuestionId === question.id ? "selected-question" : ""}>
                    {question.questioncontent}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Generate a question */}
          <div className="generatequestionbutton" onClick={generateQuestion}>Generate Question</div>
        </div>
        {/* Display selected question details */}
        <div className="questiondetails">
          {selectedTestId && (
            <div className="questiondetails2">
              {/* Show Test Name and Description */}
              <div className="card">
                <h2 className="card-title">
                  {tests.find((test) => test.id === selectedTestId)?.testname || "Untitled Test"}
                </h2>
                <p className="card-description">
                  {tests.find((test) => test.id === selectedTestId)?.testdescription || "No description available"}
                </p>
              </div>
              {selectedQuestionId && (
                <div className="questiondetails3">
                  <h2>{questions.find((q) => q.id === selectedQuestionId)?.questioncontent}</h2>
                  <hr />
                  {questions.find((q) => q.id === selectedQuestionId)?.useranswer && (
                    <div>
                      <strong>Answer: {questions.find((q) => q.id === selectedQuestionId)?.correctanswer}</strong>
                      <p>Explanation: {questions.find((q) => q.id === selectedQuestionId)?.answerexplanation}</p>
                      <br />
                      <p>Your Answer: {questions.find((q) => q.id === selectedQuestionId)?.useranswer}</p>
                      <p>
                        Score:{" "}
                        {questions.find((q) => q.id === selectedQuestionId)?.score !== undefined &&
                        questions.find((q) => q.id === selectedQuestionId)?.score !== null
                          ? questions.find((q) => q.id === selectedQuestionId)?.score
                          : "Not graded yet"}
                      </p>
                      <p>Feedback: {questions.find((q) => q.id === selectedQuestionId)?.feedback || "No feedback yet"}</p>
                    </div>
                  )}
                </div> 
              )}
              <div className="useranswer">
                <textarea
                  className="useranswerinput"
                  placeholder="Your Answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
                <button className="useranswersubmit" onClick={submitAnswer}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
                    <path d="M12 19V5"></path>
                    <path d="M5 12l7-7 7 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
