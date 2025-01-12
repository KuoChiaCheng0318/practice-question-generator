import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [tests, setTests] = useState<Array<Schema["Test"]["type"]>>([]);
  const [questions, setQuestions] = useState<Array<Schema["Question"]["type"]>>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState("");
  const [newTestDescription, setNewTestDescription] = useState("");
  const [userAnswer, setUserAnswer] = useState<string>("");

  // Fetch the list of tests
  useEffect(() => {
    client.models.Test.observeQuery().subscribe({
      next: (data) => {
        // Sort tests by createdAt in ascending order (oldest first)
        const sortedTests = [...data.items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
          // Sort questions by createdAt in ascending order (oldest first)
          const sortedQuestions = [...data.items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s Test Management</h1>

      {/* Form to create a test */}
      <div>
        <h2>Create a New Test</h2>
        <input
          type="text"
          placeholder="Test Name"
          value={newTestName}
          onChange={(e) => setNewTestName(e.target.value)}
        />
        <textarea
          placeholder="Test Description"
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
        />
        <button onClick={createTest}>Create Test</button>
      </div>

      {/* Display tests */}
      <h2>Tests</h2>
      <ul>
        {tests.map((test) => (
          <li key={test.id} onClick={() => setSelectedTestId(test.id)}>
            {test.testname} - {test.testdescription || "No description"}
          </li>
        ))}
      </ul>

      {/* Display questions for the selected test */}
      {selectedTestId && (
        <div>
          <h2>Questions for Selected Test</h2>
          <ul>
            {questions.map((question) => (
              <li key={question.id} onClick={() => {
                setSelectedQuestionId(question.id);
                setUserAnswer(""); 
              }}>
                <strong>{question.questioncontent}</strong>
                <p>Answer: {question.correctanswer}</p>
                <p>Explanation: {question.answerexplanation}</p>
                <p>Your Answer: {question.useranswer}</p>
                <p>Score: {question.score !== undefined && question.score !== null ? question.score : "Not graded yet"}</p>
                <p>Feedback: {question.feedback || "No feedback yet"}</p>

                {selectedQuestionId===question.id && (
                  <div>
                    <input
                      type="text"
                      placeholder="Your Answer"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                    />
                    <button onClick={submitAnswer}>Submit Answer</button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Generate a question */}
          <button onClick={generateQuestion}>Generate Question</button>


        </div>
      )}

      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
