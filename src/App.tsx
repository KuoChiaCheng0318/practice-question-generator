import { useEffect, useState } from "react";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [tests, setTests] = useState<Array<Schema["Test"]["type"]>>([]);
  const [questions, setQuestions] = useState<Array<Schema["Question"]["type"]>>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState("");
  const [newTestDescription, setNewTestDescription] = useState("");
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");

  // Fetch the list of tests
  useEffect(() => {
    client.models.Test.observeQuery().subscribe({
      next: (data) => setTests([...data.items]),
    });
  }, []);

  // Fetch questions for the selected test
  useEffect(() => {
    if (selectedTestId) {
      client.models.Question.observeQuery(
        { filter: { testId: { eq: selectedTestId } } } // Only fetch questions related to the selected test
      ).subscribe({
        next: (data) => setQuestions([...data.items]),
      });
    }
  }, [selectedTestId]);

 // Function to create a test
 const createTest = async () => {
  if (newTestName) {
    try {
      const result = await client.models.Test.create({
        testname: newTestName,
        testdescription: newTestDescription || "", // Optional description
      });
      if (result.data) {
        setTests([...tests, result.data]);
      } else {
        console.error("Error creating test: result is null");
      }
      setNewTestName("");  // Reset input fields
      setNewTestDescription("");
    } catch (error) {
      console.error("Error creating test:", error);
    }
  } else {
    alert("Test name is required");
  }
};

  // Function to create a question for a selected test
  const createQuestion = async () => {
    if (selectedTestId && newQuestionContent && newCorrectAnswer) {
      try {
        await client.models.Question.create({
          questioncontent: newQuestionContent,
          correctanswer: newCorrectAnswer,
          testId: selectedTestId,  // Associate question with the selected test
        });
        setNewQuestionContent("");  // Reset input field
        setNewCorrectAnswer("");
      } catch (error) {
        console.error("Error creating question:", error);
      }
    } else {
      alert("All fields are required to create a question");
    }
  };

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s Test Management</h1>

      {/* Form to create a new test */}
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

      {/* List of created tests */}
      <h2>Created Tests</h2>
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
          <h2>Questions for {tests.find((test) => test.id === selectedTestId)?.testname}</h2>
          <ul>
            {questions.map((question) => (
              <li key={question.id}>
                <strong>{question.questioncontent}</strong><br />
                Correct Answer: {question.correctanswer}<br />
                {/* Optionally display other fields like score, feedback, etc. */}
                <em>{question.feedback || "No feedback"}</em>
              </li>
            ))}
          </ul>

          {/* Form to create a question for the selected test */}
          <h3>Create a Question for Test</h3>
          <input
            type="text"
            placeholder="Question Content"
            value={newQuestionContent}
            onChange={(e) => setNewQuestionContent(e.target.value)}
          />
          <input
            type="text"
            placeholder="Correct Answer"
            value={newCorrectAnswer}
            onChange={(e) => setNewCorrectAnswer(e.target.value)}
          />
          <button onClick={createQuestion}>Create Question</button>
        </div>
      )}

      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
