import { type ClientSchema, a, defineData } from "@aws-amplify/backend";


const schema = a.schema({
  // Define the "Question" model
  Question: a.model({
    questioncontent: a.string().required(), // Question text
    correctanswer: a.string(), // Correct answer
    answerexplanation: a.string(), // Explanation of the answer
    useranswer: a.string(), // User answer
    score: a.float(),
    feedback: a.string(),
    testId: a.id(), // Foreign key to the Test table
    test: a.belongsTo("Test", "testId")
  }),

  // Define the "Test" model
  Test: a.model({
      testname: a.string().required(), // Name of the test
      testdescription: a.string(), // Description of the test
      questions: a.hasMany("Question","testId"), // Relationship to Question model
      }),

  
}).authorization((allow) => [
  allow.owner(), // Only the owner can create/read/update/delete
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    
  },
});
