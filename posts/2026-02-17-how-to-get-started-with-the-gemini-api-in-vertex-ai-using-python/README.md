# How to Get Started with the Gemini API in Vertex AI Using Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Python, Generative AI

Description: A beginner-friendly guide to getting started with the Gemini API in Vertex AI using Python, covering setup, text generation, and chat.

---

Gemini is Google's family of large language models, and Vertex AI is the platform that lets you use them in your applications. If you have been wanting to add generative AI capabilities to your projects - text generation, summarization, question answering, or conversation - the Gemini API on Vertex AI is one of the most straightforward ways to do it. In this guide, I will walk you through everything from initial setup to making your first API calls.

## Prerequisites

You need a GCP project with billing enabled and the Vertex AI API turned on. You also need Python 3.8 or later.

Install the required packages:

```bash
# Install the Vertex AI SDK with Generative AI support
pip install google-cloud-aiplatform
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

import vertexai
from vertexai.generative_models import GenerativeModel

# Initialize Vertex AI with your project and region
vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Load the Gemini model
model = GenerativeModel('gemini-1.5-pro')

# Generate a response
response = model.generate_content('Explain what a load balancer does in simple terms.')

# Print the generated text
print(response.text)
```

That is it. A few lines of code and you have a working generative AI application.

## Choosing the Right Model

Vertex AI offers several Gemini model variants:

- **gemini-1.5-pro** - Most capable model, best for complex tasks like reasoning, coding, and analysis
- **gemini-1.5-flash** - Faster and cheaper, good for simpler tasks like classification and extraction
- **gemini-1.0-pro** - Previous generation, still available for existing applications

For most use cases, start with `gemini-1.5-flash` and upgrade to `gemini-1.5-pro` if you need more capability.

```python
# Use the flash model for faster, cheaper responses
model = GenerativeModel('gemini-1.5-flash')
response = model.generate_content('Summarize the benefits of cloud computing in 3 bullet points.')
print(response.text)
```

## Configuring Generation Parameters

You can control the model's behavior with generation parameters:

```python
# generation_params.py
# Configure how the model generates text

from vertexai.generative_models import GenerativeModel, GenerationConfig

model = GenerativeModel('gemini-1.5-pro')

# Configure generation parameters
config = GenerationConfig(
    # Controls randomness - lower means more deterministic
    temperature=0.7,
    # Maximum number of tokens in the response
    max_output_tokens=1024,
    # Nucleus sampling - limits token selection to top-p probability mass
    top_p=0.9,
    # Limits selection to top-k most likely tokens
    top_k=40,
)

response = model.generate_content(
    'Write a Python function that validates an email address.',
    generation_config=config,
)

print(response.text)
```

Temperature is the most important parameter. Set it low (0.1-0.3) for factual or deterministic tasks, and higher (0.7-1.0) for creative tasks.

## Building a Chat Conversation

Gemini supports multi-turn conversations where the model remembers previous messages:

```python
# chat.py
# Multi-turn chat conversation with Gemini

from vertexai.generative_models import GenerativeModel

model = GenerativeModel('gemini-1.5-pro')

# Start a chat session
chat = model.start_chat()

# First message
response = chat.send_message('I am building a web application with Flask. Can you help me set up error handling?')
print(f"Gemini: {response.text}\n")

# Follow-up message - the model remembers the context
response = chat.send_message('How do I add custom error pages for 404 and 500 errors?')
print(f"Gemini: {response.text}\n")

# Another follow-up
response = chat.send_message('Can you also show me how to log these errors to Cloud Logging?')
print(f"Gemini: {response.text}\n")

# View the conversation history
print(f"Total messages in conversation: {len(chat.history)}")
```

## Using System Instructions

System instructions tell the model how to behave across all interactions. They are useful for setting the tone, role, or constraints:

```python
# system_instructions.py
# Use system instructions to shape the model's behavior

from vertexai.generative_models import GenerativeModel

# Define the model with system instructions
model = GenerativeModel(
    'gemini-1.5-pro',
    system_instruction=[
        'You are a senior DevOps engineer with 10 years of experience on Google Cloud Platform.',
        'Always provide practical, production-ready advice.',
        'Include relevant CLI commands when applicable.',
        'Keep explanations concise but thorough.',
    ],
)

response = model.generate_content('How should I set up CI/CD for a microservices application on GKE?')
print(response.text)
```

## Streaming Responses

For better user experience, especially with longer responses, use streaming to get tokens as they are generated:

```python
# streaming.py
# Stream the response for real-time output

from vertexai.generative_models import GenerativeModel

model = GenerativeModel('gemini-1.5-pro')

# Generate with streaming enabled
responses = model.generate_content(
    'Write a detailed guide on setting up monitoring for a Kubernetes cluster.',
    stream=True,
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

from vertexai.generative_models import GenerativeModel, HarmCategory, HarmBlockThreshold

model = GenerativeModel('gemini-1.5-pro')

# Customize safety settings
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
}

response = model.generate_content(
    'Your prompt here',
    safety_settings=safety_settings,
)

# Check if the response was blocked
if response.candidates:
    print(response.text)
else:
    print("Response was blocked by safety filters")
```

## Counting Tokens

To estimate costs and stay within limits, count tokens before sending:

```python
# count_tokens.py
# Count tokens in your prompt before sending

from vertexai.generative_models import GenerativeModel

model = GenerativeModel('gemini-1.5-pro')

prompt = 'Explain the difference between Kubernetes Deployments and StatefulSets.'

# Count tokens in the input
token_count = model.count_tokens(prompt)
print(f"Input tokens: {token_count.total_tokens}")

# Then generate the response
response = model.generate_content(prompt)
print(f"Response: {response.text}")
print(f"Usage metadata: {response.usage_metadata}")
```

## Error Handling

Production applications need proper error handling:

```python
# error_handling.py
# Robust error handling for Gemini API calls

from vertexai.generative_models import GenerativeModel
from google.api_core import exceptions
import time

model = GenerativeModel('gemini-1.5-pro')

def generate_with_retry(prompt, max_retries=3):
    """Generate content with retry logic for transient errors."""
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)

            # Check if we got a valid response
            if response.candidates:
                return response.text
            else:
                print(f"No candidates in response, attempt {attempt + 1}")
                continue

        except exceptions.ResourceExhausted:
            # Rate limit hit - back off and retry
            wait_time = 2 ** attempt
            print(f"Rate limited, waiting {wait_time} seconds...")
            time.sleep(wait_time)

        except exceptions.ServiceUnavailable:
            # Service temporarily unavailable
            wait_time = 5 * (attempt + 1)
            print(f"Service unavailable, waiting {wait_time} seconds...")
            time.sleep(wait_time)

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
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

app = Flask(__name__)

# Initialize once at startup
vertexai.init(project='your-project-id', location='us-central1')
model = GenerativeModel('gemini-1.5-flash')

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text from a prompt."""
    data = request.json
    prompt = data.get('prompt')
    temperature = data.get('temperature', 0.7)

    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400

    config = GenerationConfig(
        temperature=temperature,
        max_output_tokens=2048,
    )

    try:
        response = model.generate_content(prompt, generation_config=config)
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

The Gemini API on Vertex AI gives you access to powerful generative AI models through a clean Python SDK. The basics are simple - initialize, load a model, generate content. From there, you can add chat conversations, system instructions, streaming, and safety settings to build more sophisticated applications. Start with the flash model for speed and cost, upgrade to pro when you need more capability, and always add proper error handling for production use.
