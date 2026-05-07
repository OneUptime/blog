# How to Create Custom AI Applications with Podman AI Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, Application Development, Python, FastAPI

Description: Learn how to build and deploy custom AI-powered applications using Podman AI Lab as the local inference backend.

---

> Building custom AI applications with Podman AI Lab means you own the entire stack from model to frontend.

While the built-in recipes in Podman AI Lab cover common use cases, many projects require custom AI applications tailored to specific workflows. By using the local inference server as a backend, you can build any AI-powered application while keeping all data on your machine. This guide demonstrates building a custom application from scratch.

---

## Prerequisites

```bash
# Ensure Podman and AI Lab are set up with a downloaded model

podman info --format '{{.Version.Version}}'
podman machine ssh ls /home/user/ai-lab/models/

# Verify a model inference server is running or start one
podman run -d --name ai-backend \
  -p 8080:8000 \
  -v /home/user/ai-lab/models/mistral-7b-instruct-q4_0.gguf:/models/mistral-7b-instruct-q4_0.gguf:ro \
  -e MODEL_PATH=/models/mistral-7b-instruct-q4_0.gguf \
  -e HOST=0.0.0.0 \
  -e PORT=8000 \
  -e LLAMA_ARG_ALIAS=local-model \
  quay.io/ramalama/ramalama-llama-server:latest
```

## Building a Custom FastAPI Application

### Project Structure

```bash
# Create the project directory
mkdir -p ~/ai-app && cd ~/ai-app

# Create the project structure
mkdir -p app

# The final structure will look like:
# ai-app/
# ├── Containerfile
# ├── requirements.txt
# ├── app/
# │   ├── main.py
# │   └── llm_client.py
```

### Create the LLM Client

```bash
cat << 'EOF' > ~/ai-app/app/llm_client.py
"""Client for communicating with the Podman AI Lab inference server."""
import httpx
import os

# Use environment variable for the model endpoint
MODEL_URL = os.getenv("MODEL_ENDPOINT", "http://localhost:8080")
MODEL_NAME = os.getenv("MODEL_NAME", "local-model")

async def generate_response(prompt: str, system_prompt: str = "") -> str:
    """Send a prompt to the local inference server and return the response."""
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{MODEL_URL}/v1/chat/completions",
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1024,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
EOF
```

### Create the FastAPI Application

```bash
cat << 'EOF' > ~/ai-app/app/main.py
"""Custom AI application powered by Podman AI Lab."""
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from app.llm_client import generate_response

app = FastAPI(title="Custom AI App")

class PromptRequest(BaseModel):
    prompt: str
    system_prompt: str = "You are a helpful assistant."

@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve the main page."""
    return """
    <html>
    <head><title>Custom AI App</title></head>
    <body>
        <h1>Custom AI Application</h1>
        <p>Powered by Podman AI Lab</p>
        <form id="chat-form">
            <textarea id="prompt" rows="4" cols="60"
              placeholder="Enter your prompt..."></textarea><br>
            <button type="submit">Generate</button>
        </form>
        <div id="response"></div>
        <script>
        document.getElementById('chat-form').onsubmit = async (e) => {
            e.preventDefault();
            const prompt = document.getElementById('prompt').value;
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({prompt})
            });
            const data = await res.json();
            document.getElementById('response').innerText = data.response;
        };
        </script>
    </body>
    </html>
    """

@app.post("/api/generate")
async def generate(req: PromptRequest):
    """Generate a response from the local AI model."""
    result = await generate_response(req.prompt, req.system_prompt)
    return {"response": result}

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
EOF
```

### Create the Containerfile

```bash
cat << 'EOF' > ~/ai-app/requirements.txt
fastapi==0.109.0
uvicorn==0.27.0
httpx==0.26.0
EOF

cat << 'EOF' > ~/ai-app/Containerfile
# Use a minimal Python base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Expose the application port
EXPOSE 8000

# Run the FastAPI application with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
```

### Build and Run

```bash
# Build the custom application container
podman build -t my-ai-app:latest ~/ai-app/

# Run the application, connecting it to the AI Lab inference server
podman run -d --name my-ai-app \
  -p 8000:8000 \
  -e MODEL_ENDPOINT=http://host.containers.internal:8080 \
  -e MODEL_NAME=local-model \
  my-ai-app:latest

# Verify both containers are running
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test the application
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is Podman?"}' | python3 -m json.tool
```

## Running with Podman Compose

```bash
cat << 'EOF' > ~/ai-app/compose.yaml
# Docker Compose file for the custom AI application stack
services:
  model-server:
    image: quay.io/ramalama/ramalama-llama-server:latest
    ports:
      - "8080:8000"
    volumes:
      - /home/user/ai-lab/models/mistral-7b-instruct-q4_0.gguf:/models/mistral-7b-instruct-q4_0.gguf:ro
    environment:
      - MODEL_PATH=/models/mistral-7b-instruct-q4_0.gguf
      - HOST=0.0.0.0
      - PORT=8000
      - LLAMA_ARG_ALIAS=local-model

  ai-app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - MODEL_ENDPOINT=http://model-server:8000
      - MODEL_NAME=local-model
    depends_on:
      - model-server
EOF

# Launch the entire stack
podman compose -f ~/ai-app/compose.yaml up -d

# Check the status of all services
podman compose -f ~/ai-app/compose.yaml ps
```

## Cleaning Up

```bash
# Stop and remove application containers
podman compose -f ~/ai-app/compose.yaml down

# Or stop individual containers
podman stop my-ai-app ai-backend
podman rm my-ai-app ai-backend
```

## Summary

Building custom AI applications with Podman AI Lab lets you create tailored solutions while keeping all inference local. By treating the AI Lab model server as a standard OpenAI-compatible API backend, you can build applications in any framework. Containerizing your application alongside the model server with Podman Compose makes the entire stack portable and reproducible. This approach gives you full control over both the AI model and the application logic.
