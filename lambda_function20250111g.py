import json
import boto3
import openai
import os

# Lambda function handler
def lambda_handler(event, context):
    
    # Access the OpenAI API key stored in environment variables
    openai_api_key = os.environ['OPENAI_API_KEY']
    
    # Initialize OpenAI API with the key from environment variable
    openai.api_key = openai_api_key
    
    try:
        # Parse the incoming request
        body = json.loads(event['body'])
        path = event['resource']  # Use resource path to differentiate requests

        if "/generate-question" in path:
            # **Handle Generate Question Request**
            testname = body.get('testname')
            testdescription = body.get('testdescription')

            if not testname or not testdescription:
                return format_response(400, {"error": "testname and testdescription are required"})

            # Call OpenAI API to generate the question
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[ 
                    {
                        "role": "system",
                        "content": f"Generate a question of test: {testname}, test description: {testdescription}. Respond with this format: {{ 'Question': '<question>', 'Answer': '<answer>', 'Explanation': '<explanation>' }}."
                    }
                ]
            )

            generated_text = response['choices'][0]['message']['content'].strip()
            # return format_response(200, {"Generated Question": generated_text})
            print(f"Raw OpenAI response: {generated_text}")

            try:
                # Parse the generated text into JSON
                parsed_content = json.loads(generated_text.replace("'", "\""))  # Replace single quotes with double quotes to ensure valid JSON

                # Ensure the parsed content contains the expected fields
                question = parsed_content.get('Question', '')
                answer = parsed_content.get('Answer', '')
                explanation = parsed_content.get('Explanation', '')

                if question and answer and explanation:
                    return format_response(200, {
                        "Question": question,
                        "Answer": answer,
                        "Explanation": explanation
                    })
                else:
                    # If any of the fields are missing, return an error
                    return format_response(500, {"error": "Incomplete response from OpenAI", "raw_response": generated_text})
            except json.JSONDecodeError:
                # Handle invalid JSON
                return format_response(500, {"error": "Invalid response format from OpenAI", "raw_response": generated_text})

        elif "/score-answer" in path:
            # **Handle Score Answer Request**
            testname = body.get('testname')
            testdescription = body.get('testdescription')
            testquestion = body.get('testquestion')
            realanswer = body.get('realanswer')
            useranswer = body.get('useranswer')

            if not all([testname, testdescription, testquestion, realanswer, useranswer]):
                return format_response(400, {"error": "All fields (testname, testdescription, testquestion, realanswer, useranswer) are required"})

            # Call OpenAI API to score the answer
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[ 
                    {
                        "role": "system",
                        "content":
                        f"Here is the Test name: {testname}\n"
                        f"and test desciption: {testdescription}\n"
                        f"Evaluate the user's answer for the following question:\n"
                        f"Question: {testquestion}\n"
                        f"Correct Answer: {realanswer}\n"
                        f"User Answer: {useranswer}\n"
                        f"Provide a score out of 100 with a brief explanation. Respond in this format: {{ 'Score': '<score>', 'Feedback': '<feedback>' }}."
                    }
                ]
            )

            scored_text = response['choices'][0]['message']['content'].strip()
            #return format_response(200, {"Score": scored_text})
            print(f"Raw OpenAI response: {scored_text}")

            try:
                # Parse the generated text into JSON
                parsed_content = json.loads(scored_text.replace("'", "\""))  # Replace single quotes with double quotes to ensure valid JSON

                # Ensure the parsed content contains the expected fields
                score = parsed_content.get('Score', '')
                feedback = parsed_content.get('Feedback', '')

                if score and feedback:
                    return format_response(200, {
                        "Score": score,
                        "Feedback": feedback
                    })
                else:
                    # If any of the fields are missing, return an error
                    return format_response(500, {"error": "Incomplete response from OpenAI", "raw_response": scored_text})
            except json.JSONDecodeError:
                # Handle invalid JSON
                return format_response(500, {"error": "Invalid response format from OpenAI", "raw_response": scored_text})

        else:
            return format_response(404, {"error": "Invalid endpoint"})

    except Exception as e:
        print(f"Unexpected error: {e}")
        return format_response(500, {"error": f"An unexpected error occurred: {str(e)}"})


# Helper function to format API Gateway response
def format_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }
