# How to Get Started with the Gemini API in Vertex AI Using Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Python, Generative AI

Description: A beginner-friendly guide to getting started with the Gemini API in Vertex AI using Python, covering setup, text generation, and chat.

---

Gemini is Google's family of large language models, and Vertex AI is the platform that lets you use them in your applications. If you have been wanting to add generative AI capabilities to your projects - text generation, summarization, question answering, or conversation - the Gemini API on Vertex AI is one of the most straightforward ways to do it. In this guide, I will walk you through everything from initial setup to making your first API calls.

## Prerequisites

You need a GCP project with billing enabled and the Vertex AI API turned on. You also need Python 3.10 or later.

Install the required packages:

```bash
# Install the Google Gen AI SDK

pip install google-genai
```

Make sure you are authenticated with Google Cloud:

```bash
# Authenticate with your GCP account
gcloud auth application-default login

# Set your project
gcloud config set project your-project-id
```

## Your First Gemini API Call

Let us start with the simplest possible example - generating text from a prompt:

```python
# first_call.py
# Basic text generation with Gemini on Vertex AI

from google import genai

# Initialize the client with your project and region
client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

# Generate a response
response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents='Explain what a load balancer does in simple terms.',
)

# Print the generated text
print(response.text)
```

That is it. A few lines of code and you have a working generative AI application.

## Choosing the Right Model

Vertex AI offers several Gemini model variants:

- **gemini-2.5-pro** - Most capable model, best for complex tasks like reasoning, coding, and analysis
- **gemini-2.5-flash** - Faster and cheaper, good for a wide range of general-purpose tasks
- **gemini-2.5-flash-lite** - Lowest cost and lowest latency, good for high-throughput simpler tasks like classification and extraction

For most use cases, start with `gemini-2.5-flash` and upgrade to `gemini-2.5-pro` if you need more capability.

```python
# Use the flash model for faster, cheaper responses
from google import genai

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents='Summarize the benefits of cloud computing in 3 bullet points.',
)
print(response.text)
```

## Configuring Generation Parameters

You can control the model's behavior with generation parameters:

```python
# generation_params.py
# Configure how the model generates text

from google import genai
from google.genai import types

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

# Configure generation parameters
config = types.GenerateContentConfig(
    # Controls randomness - lower means more deterministic
    temperature=0.7,
    # Maximum number of tokens in the response
    max_output_tokens=1024,
    # Nucleus sampling - limits token selection to top-p probability mass
    top_p=0.9,
    # Limits selection to top-k most likely tokens
    top_k=40,
)

response = client.models.generate_content(
    model='gemini-2.5-pro',
    contents='Write a Python function that validates an email address.',
    config=config,
)

print(response.text)
```

Temperature is the most important parameter. Set it low (0.1-0.3) for factual or deterministic tasks, and higher (0.7-1.0) for creative tasks.

## Building a Chat Conversation

Gemini supports multi-turn conversations where the model remembers previous messages:

```python
# chat.py
# Multi-turn chat conversation with Gemini

from google import genai

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

# Start a chat session
chat = client.chats.create(model='gemini-2.5-pro')

# First message
response = chat.send_message('I am building a web application with Flask. Can you help me set up error handling?')
print(f"Gemini: {response.text}\n")

# Follow-up message - the model remembers the context
response = chat.send_message('How do I add custom error pages for 404 and 500 errors?')
print(f"Gemini: {response.text}\n")

# Another follow-up
response = chat.send_message('Can you also show me how to log these errors to Cloud Logging?')
print(f"Gemini: {response.text}\n")
```

## Using System Instructions

System instructions tell the model how to behave across all interactions. They are useful for setting the tone, role, or constraints:

```python
# system_instructions.py
# Use system instructions to shape the model's behavior

from google import genai
from google.genai import types

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

config = types.GenerateContentConfig(
    system_instruction=[
        'You are a senior DevOps engineer with 10 years of experience on Google Cloud Platform.',
        'Always provide practical, production-ready advice.',
        'Include relevant CLI commands when applicable.',
        'Keep explanations concise but thorough.',
    ],
)

response = client.models.generate_content(
    model='gemini-2.5-pro',
    contents='How should I set up CI/CD for a microservices application on GKE?',
    config=config,
)
print(response.text)
```

## Streaming Responses

For better user experience, especially with longer responses, use streaming to get tokens as they are generated:

```python
# streaming.py
# Stream the response for real-time output

from google import genai

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

# Generate with streaming enabled
responses = client.models.generate_content_stream(
    model='gemini-2.5-pro',
    contents='Write a detailed guide on setting up monitoring for a Kubernetes cluster.',
)

# Print each chunk as it arrives
for response in responses:
    print(response.text, end='', flush=True)

print()  # Final newline
```

## Handling Safety Settings

Gemini includes safety filters. You can adjust them if your use case requires it:

```python
# safety_settings.py
# Configure safety settings for content generation

from google import genai
from google.genai import types

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

# Customize safety settings
config = types.GenerateContentConfig(
    safety_settings=[
        types.SafetySetting(
            category='HARM_CATEGORY_HARASSMENT',
            threshold='BLOCK_MEDIUM_AND_ABOVE',
        ),
        types.SafetySetting(
            category='HARM_CATEGORY_HATE_SPEECH',
            threshold='BLOCK_MEDIUM_AND_ABOVE',
        ),
        types.SafetySetting(
            category='HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold='BLOCK_MEDIUM_AND_ABOVE',
        ),
        types.SafetySetting(
            category='HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold='BLOCK_MEDIUM_AND_ABOVE',
        ),
    ],
)

response = client.models.generate_content(
    model='gemini-2.5-pro',
    contents='Your prompt here',
    config=config,
)

# Check if the response was blocked
if response.candidates and response.text:
    print(response.text)
else:
    print("Response was blocked by safety filters")
```

## Counting Tokens

To estimate costs and stay within limits, count tokens before sending:

```python
# count_tokens.py
# Count tokens in your prompt before sending

from google import genai

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

prompt = 'Explain the difference between Kubernetes Deployments and StatefulSets.'

# Count tokens in the input
token_count = client.models.count_tokens(
    model='gemini-2.5-pro',
    contents=prompt,
)
print(f"Input tokens: {token_count.total_tokens}")

# Then generate the response
response = client.models.generate_content(
    model='gemini-2.5-pro',
    contents=prompt,
)
print(f"Response: {response.text}")
print(f"Usage metadata: {response.usage_metadata}")
```

## Error Handling

Production applications need proper error handling:

```python
# error_handling.py
# Robust error handling for Gemini API calls

from google import genai
from google.genai import errors
import time

client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

def generate_with_retry(prompt, max_retries=3):
    """Generate content with retry logic for transient errors."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt,
            )

            # Check if we got a valid response
            if response.candidates and response.text:
                return response.text
            else:
                print(f"No candidates in response, attempt {attempt + 1}")
                continue

        except errors.APIError as e:
            if e.code == 429:
                # Rate limit hit - back off and retry
                wait_time = 2 ** attempt
                print(f"Rate limited, waiting {wait_time} seconds...")
                time.sleep(wait_time)
            elif e.code in (500, 503, 504):
                # Service temporarily unavailable or internal server error
                wait_time = 5 * (attempt + 1)
                print(f"Server error, waiting {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise

        except Exception as e:
            print(f"Unexpected error: {e}")
            raise

    raise Exception("Max retries exceeded")

# Usage
result = generate_with_retry('What are the best practices for GCS bucket security?')
print(result)
```

## Building a Simple API Wrapper

Here is a Flask-based API that wraps the Gemini API:

```python
# api_wrapper.py
# Simple Flask API wrapping the Gemini API

from flask import Flask, request, jsonify
from google import genai
from google.genai import types

app = Flask(__name__)

# Initialize once at startup
client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1',
)

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text from a prompt."""
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt')
    temperature = data.get('temperature', 0.7)

    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=2048,
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=config,
        )
        return jsonify({
            'text': response.text,
            'tokens': response.usage_metadata.total_token_count,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Wrapping Up

The Gemini API on Vertex AI gives you access to powerful generative AI models through a clean Python SDK. The basics are simple - initialize a client and generate content. From there, you can add chat conversations, system instructions, streaming, and safety settings to build more sophisticated applications. Start with the flash model for speed and cost, upgrade to pro when you need more capability, and always add proper error handling for production use.
