# How to Configure OpenAI API Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenAI, API, LLM, Python, AI Integration

Description: Learn how to integrate the OpenAI API into your applications, from basic completions to advanced patterns like function calling, streaming, and production best practices.

---

The OpenAI API provides access to powerful language models like GPT-4. Integrating it into your applications enables features like chat interfaces, content generation, code assistance, and data extraction. This guide covers everything from basic usage to production-ready patterns.

## Getting Started

Install the OpenAI Python library:

```bash
pip install openai
```

Set up your API key:

```python
import os
from openai import OpenAI

# Set API key via environment variable (recommended)
os.environ["OPENAI_API_KEY"] = "your-api-key"

# Or pass directly to client
client = OpenAI(api_key="your-api-key")

# Using environment variable (cleanest)
client = OpenAI()  # Automatically uses OPENAI_API_KEY
```

## Basic Chat Completions

```python
from openai import OpenAI

client = OpenAI()

# Simple completion
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain Kubernetes in simple terms."}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)

# Access usage information
print(f"Prompt tokens: {response.usage.prompt_tokens}")
print(f"Completion tokens: {response.usage.completion_tokens}")
print(f"Total tokens: {response.usage.total_tokens}")
```

## Conversation History

Maintain context across multiple turns:

```python
from openai import OpenAI

client = OpenAI()

class Conversation:
    def __init__(self, system_prompt: str = "You are a helpful assistant."):
        self.messages = [{"role": "system", "content": system_prompt}]

    def chat(self, user_message: str) -> str:
        # Add user message
        self.messages.append({"role": "user", "content": user_message})

        # Get response
        response = client.chat.completions.create(
            model="gpt-4",
            messages=self.messages,
            temperature=0.7
        )

        assistant_message = response.choices[0].message.content

        # Add assistant response to history
        self.messages.append({"role": "assistant", "content": assistant_message})

        return assistant_message

    def reset(self):
        """Clear conversation history but keep system prompt."""
        self.messages = [self.messages[0]]

# Usage
conv = Conversation("You are a DevOps expert assistant.")

print(conv.chat("What is Docker?"))
print(conv.chat("How is it different from VMs?"))  # Remembers context
print(conv.chat("Can you give me an example Dockerfile?"))
```

## Streaming Responses

Stream tokens as they are generated:

```python
from openai import OpenAI

client = OpenAI()

def stream_response(prompt: str):
    """Stream the response token by token."""
    stream = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )

    full_response = ""
    for chunk in stream:
        if chunk.choices[0].delta.content:
            token = chunk.choices[0].delta.content
            print(token, end="", flush=True)
            full_response += token

    print()  # Final newline
    return full_response

# Usage
response = stream_response("Write a haiku about Kubernetes.")
```

## Function Calling

Let the model call functions to interact with external systems:

```python
from openai import OpenAI
import json

client = OpenAI()

# Define available functions
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_server_status",
            "description": "Get the current status of a server by hostname",
            "parameters": {
                "type": "object",
                "properties": {
                    "hostname": {
                        "type": "string",
                        "description": "The hostname or IP of the server"
                    }
                },
                "required": ["hostname"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "restart_service",
            "description": "Restart a service on a server",
            "parameters": {
                "type": "object",
                "properties": {
                    "hostname": {
                        "type": "string",
                        "description": "The server hostname"
                    },
                    "service_name": {
                        "type": "string",
                        "description": "Name of the service to restart"
                    }
                },
                "required": ["hostname", "service_name"]
            }
        }
    }
]

# Implement the actual functions
def get_server_status(hostname: str) -> dict:
    """Simulated server status check."""
    return {
        "hostname": hostname,
        "status": "running",
        "cpu_usage": 45.2,
        "memory_usage": 62.8,
        "uptime": "15 days"
    }

def restart_service(hostname: str, service_name: str) -> dict:
    """Simulated service restart."""
    return {
        "success": True,
        "message": f"Service {service_name} restarted on {hostname}"
    }

def process_tool_call(tool_name: str, arguments: dict) -> str:
    """Route tool calls to appropriate functions."""
    if tool_name == "get_server_status":
        result = get_server_status(**arguments)
    elif tool_name == "restart_service":
        result = restart_service(**arguments)
    else:
        result = {"error": f"Unknown function: {tool_name}"}
    return json.dumps(result)

def chat_with_tools(user_message: str):
    """Handle a conversation that may involve tool calls."""
    messages = [{"role": "user", "content": user_message}]

    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    assistant_message = response.choices[0].message

    # Check if the model wants to call a function
    if assistant_message.tool_calls:
        messages.append(assistant_message)

        # Process each tool call
        for tool_call in assistant_message.tool_calls:
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            # Execute the function
            result = process_tool_call(function_name, arguments)

            # Add function result to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })

        # Get final response with function results
        final_response = client.chat.completions.create(
            model="gpt-4",
            messages=messages
        )
        return final_response.choices[0].message.content

    return assistant_message.content

# Usage
print(chat_with_tools("What is the status of server web-prod-01?"))
print(chat_with_tools("The nginx service on web-prod-01 seems stuck. Can you restart it?"))
```

## Structured Output with JSON Mode

Force the model to output valid JSON:

```python
from openai import OpenAI
import json

client = OpenAI()

def extract_structured_data(text: str) -> dict:
    """Extract structured data from unstructured text."""
    response = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[
            {
                "role": "system",
                "content": """Extract the following information from the text and return as JSON:
                - name: string
                - email: string or null
                - company: string or null
                - role: string or null
                - sentiment: positive, negative, or neutral"""
            },
            {"role": "user", "content": text}
        ],
        response_format={"type": "json_object"},
        temperature=0
    )

    return json.loads(response.choices[0].message.content)

# Usage
text = """
Hi, I'm Sarah Chen from TechCorp. I've been using your monitoring tool for
about 6 months now and I'm really impressed with the alerting features.
As a senior SRE, I appreciate how easy it is to set up custom dashboards.
You can reach me at sarah.chen@techcorp.com if you have any questions.
"""

data = extract_structured_data(text)
print(json.dumps(data, indent=2))
```

## Vision Capabilities

Analyze images with GPT-4 Vision:

```python
from openai import OpenAI
import base64

client = OpenAI()

def analyze_image(image_path: str, prompt: str) -> str:
    """Analyze an image with GPT-4 Vision."""
    # Read and encode image
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{image_data}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        max_tokens=1000
    )

    return response.choices[0].message.content

# Analyze from URL
def analyze_image_url(url: str, prompt: str) -> str:
    """Analyze an image from URL."""
    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": url}}
                ]
            }
        ],
        max_tokens=1000
    )
    return response.choices[0].message.content

# Usage
description = analyze_image(
    "dashboard_screenshot.png",
    "Describe any anomalies or issues visible in this monitoring dashboard."
)
print(description)
```

## Embeddings

Generate embeddings for semantic search:

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

def get_embedding(text: str, model: str = "text-embedding-3-small") -> list:
    """Generate embedding for a single text."""
    response = client.embeddings.create(
        model=model,
        input=text
    )
    return response.data[0].embedding

def get_embeddings(texts: list, model: str = "text-embedding-3-small") -> list:
    """Generate embeddings for multiple texts."""
    response = client.embeddings.create(
        model=model,
        input=texts
    )
    return [item.embedding for item in response.data]

def cosine_similarity(a: list, b: list) -> float:
    """Calculate cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Build a simple semantic search
documents = [
    "How to configure Kubernetes probes for health checks",
    "Setting up alerting rules in Prometheus",
    "Understanding Docker container networking",
    "Best practices for log aggregation"
]

# Generate embeddings for all documents
doc_embeddings = get_embeddings(documents)

# Search
query = "How do I check if my pod is healthy?"
query_embedding = get_embedding(query)

# Find most similar
similarities = [cosine_similarity(query_embedding, doc_emb) for doc_emb in doc_embeddings]
best_idx = np.argmax(similarities)

print(f"Query: {query}")
print(f"Best match: {documents[best_idx]}")
print(f"Similarity: {similarities[best_idx]:.4f}")
```

## Error Handling and Retries

Build resilient API calls:

```python
from openai import OpenAI, RateLimitError, APIError
import time
from functools import wraps

client = OpenAI()

def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator for retrying API calls with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except RateLimitError as e:
                    last_exception = e
                    delay = base_delay * (2 ** attempt)
                    print(f"Rate limited. Retrying in {delay}s...")
                    time.sleep(delay)
                except APIError as e:
                    if e.status_code >= 500:
                        last_exception = e
                        delay = base_delay * (2 ** attempt)
                        print(f"Server error. Retrying in {delay}s...")
                        time.sleep(delay)
                    else:
                        raise

            raise last_exception

        return wrapper
    return decorator

@retry_with_backoff(max_retries=3)
def safe_completion(prompt: str) -> str:
    """Make a completion request with automatic retries."""
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        timeout=30.0
    )
    return response.choices[0].message.content

# Usage
try:
    result = safe_completion("Hello!")
    print(result)
except Exception as e:
    print(f"Failed after retries: {e}")
```

## Production Best Practices

Build a production-ready client:

```python
from openai import OpenAI
from typing import Optional
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenAIClient:
    """Production-ready OpenAI client with logging and monitoring."""

    def __init__(self, api_key: Optional[str] = None):
        self.client = OpenAI(api_key=api_key)
        self.total_tokens = 0
        self.total_requests = 0

    def complete(
        self,
        messages: list,
        model: str = "gpt-4",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: float = 30.0
    ) -> str:
        """Make a completion request with monitoring."""
        start_time = time.time()

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout
            )

            # Track usage
            self.total_tokens += response.usage.total_tokens
            self.total_requests += 1

            # Log metrics
            duration = time.time() - start_time
            logger.info(
                f"OpenAI request completed",
                extra={
                    "model": model,
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "duration_ms": duration * 1000,
                    "finish_reason": response.choices[0].finish_reason
                }
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"OpenAI request failed: {e}")
            raise

    def get_stats(self) -> dict:
        """Get usage statistics."""
        return {
            "total_requests": self.total_requests,
            "total_tokens": self.total_tokens,
            "avg_tokens_per_request": (
                self.total_tokens / self.total_requests
                if self.total_requests > 0 else 0
            )
        }

# Usage
openai_client = OpenAIClient()

response = openai_client.complete([
    {"role": "user", "content": "Hello!"}
])
print(response)
print(openai_client.get_stats())
```

---

The OpenAI API is straightforward to integrate but requires attention to error handling, rate limits, and cost management in production. Start with simple completions, then add function calling and structured outputs as your application matures. Always monitor token usage to avoid unexpected costs.
