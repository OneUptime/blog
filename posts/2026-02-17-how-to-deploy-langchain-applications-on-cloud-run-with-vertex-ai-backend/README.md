# How to Deploy LangChain Applications on Cloud Run with Vertex AI Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, LangChain, Vertex AI, Deployment

Description: A complete guide to deploying LangChain applications as production services on Cloud Run with Vertex AI as the language model backend on GCP.

---

Building a LangChain application locally is one thing. Getting it running in production with proper scaling, authentication, and reliability is another. Cloud Run is one of the best options on GCP for this - it gives you a fully managed container runtime that scales to zero when idle and handles traffic spikes automatically. Combined with Vertex AI as the LLM backend, you get a deployment model where you only pay for what you use.

This guide covers everything from containerizing your LangChain app to deploying it on Cloud Run with proper configuration.

## Project Structure

Let us start with a clean project structure for a LangChain API service.

```
langchain-service/
    app/
        __init__.py
        main.py          # FastAPI application
        agent.py          # LangChain agent setup
        config.py         # Configuration management
    Dockerfile
    requirements.txt
    .dockerignore
```

## Building the Application

### Configuration

```python
# app/config.py
import os

class Config:
    """Application configuration loaded from environment variables."""
    PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "your-project-id")
    LOCATION = os.environ.get("GCP_LOCATION", "us-central1")
    MODEL_NAME = os.environ.get("MODEL_NAME", "gemini-1.5-pro")
    TEMPERATURE = float(os.environ.get("TEMPERATURE", "0.2"))
    MAX_TOKENS = int(os.environ.get("MAX_TOKENS", "2048"))
    PORT = int(os.environ.get("PORT", "8080"))
```

### LangChain Agent Setup

```python
# app/agent.py
from langchain_google_vertexai import ChatVertexAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from app.config import Config

def create_chain():
    """Create and return the LangChain chain."""
    # Initialize the Vertex AI model
    llm = ChatVertexAI(
        model_name=Config.MODEL_NAME,
        project=Config.PROJECT_ID,
        location=Config.LOCATION,
        temperature=Config.TEMPERATURE,
        max_output_tokens=Config.MAX_TOKENS,
    )

    # Define the prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant. Provide clear, concise answers."),
        MessagesPlaceholder(variable_name="history", optional=True),
        ("human", "{input}"),
    ])

    # Build the chain
    chain = prompt | llm | StrOutputParser()
    return chain
```

### FastAPI Application

```python
# app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.agent import create_chain
from app.config import Config
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LangChain Service", version="1.0.0")

# Initialize the chain once at startup
chain = None

@app.on_event("startup")
async def startup():
    """Initialize the LangChain chain when the service starts."""
    global chain
    chain = create_chain()
    logger.info("LangChain chain initialized successfully")

class QueryRequest(BaseModel):
    input: str
    history: Optional[List[dict]] = None

class QueryResponse(BaseModel):
    output: str

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Handle incoming queries through the LangChain chain."""
    try:
        result = chain.invoke({
            "input": request.input,
            "history": request.history or [],
        })
        return QueryResponse(output=result)
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail="Failed to process query")

@app.get("/health")
async def health():
    """Health check endpoint for Cloud Run."""
    return {"status": "healthy"}
```

## Containerizing the Application

### Requirements File

```
# requirements.txt
fastapi==0.109.0
uvicorn==0.27.0
langchain==0.1.6
langchain-google-vertexai==0.0.6
langchain-core==0.1.22
google-cloud-aiplatform==1.40.0
pydantic==2.6.0
```

### Dockerfile

```dockerfile
# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Set the port Cloud Run expects
ENV PORT=8080

# Run the application with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
```

### Docker Ignore File

```
# .dockerignore
__pycache__
*.pyc
.git
.env
.venv
README.md
```

## Building and Deploying

### Build and Push the Container

```bash
# Set your project ID
export PROJECT_ID=your-project-id

# Build the container using Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/langchain-service

# Alternatively, build locally and push
docker build -t gcr.io/$PROJECT_ID/langchain-service .
docker push gcr.io/$PROJECT_ID/langchain-service
```

### Deploy to Cloud Run

```bash
# Deploy the service to Cloud Run
gcloud run deploy langchain-service \
    --image gcr.io/$PROJECT_ID/langchain-service \
    --region us-central1 \
    --platform managed \
    --memory 1Gi \
    --cpu 2 \
    --timeout 60 \
    --concurrency 10 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GCP_LOCATION=us-central1" \
    --service-account langchain-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --no-allow-unauthenticated \
    --project $PROJECT_ID
```

## Service Account Setup

Your Cloud Run service needs a service account with Vertex AI permissions.

```bash
# Create a dedicated service account
gcloud iam service-accounts create langchain-sa \
    --display-name="LangChain Service Account" \
    --project=$PROJECT_ID

# Grant Vertex AI user role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:langchain-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

## Testing the Deployed Service

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe langchain-service \
    --region us-central1 \
    --format 'value(status.url)' \
    --project $PROJECT_ID)

# Get an authentication token
TOKEN=$(gcloud auth print-identity-token)

# Send a test query
curl -X POST "$SERVICE_URL/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"input": "What is Google Cloud Run?"}'
```

## Streaming Responses

For a better user experience, implement streaming so the response appears incrementally.

```python
# Add to app/main.py
from fastapi.responses import StreamingResponse
from langchain_google_vertexai import ChatVertexAI
from langchain_core.prompts import ChatPromptTemplate

@app.post("/stream")
async def stream_query(request: QueryRequest):
    """Stream the response token by token."""
    async def generate():
        async for chunk in chain.astream({
            "input": request.input,
            "history": request.history or [],
        }):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")
```

## Cloud Run Configuration Tips

Here are some important configuration choices for LangChain workloads:

**Memory**: LangChain applications with loaded models and document stores can use significant memory. Start with 1Gi and increase if you see OOM errors.

**CPU**: Set at least 2 CPUs. Language model calls are IO-bound (waiting for API responses), but document processing and embedding computation benefit from extra CPU.

**Concurrency**: Set this based on how many simultaneous requests one instance can handle. For LangChain apps calling Vertex AI, 10-20 concurrent requests per instance is reasonable since most time is spent waiting for API responses.

**Timeout**: LLM calls can take 5-30 seconds depending on the model and output length. Set your timeout to at least 60 seconds to avoid premature termination.

**Min instances**: Set to 1 if you need to avoid cold starts. Set to 0 if cost optimization is more important than latency.

```bash
# Production-optimized deployment
gcloud run deploy langchain-service \
    --image gcr.io/$PROJECT_ID/langchain-service \
    --region us-central1 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 120 \
    --concurrency 15 \
    --min-instances 1 \
    --max-instances 20 \
    --cpu-boost \
    --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID" \
    --service-account langchain-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --project $PROJECT_ID
```

## Monitoring and Logging

Cloud Run integrates with Cloud Logging and Cloud Monitoring out of the box. Use structured logging in your application to make logs easier to search.

```python
import json
import logging

class StructuredFormatter(logging.Formatter):
    """Format logs as JSON for Cloud Logging."""
    def format(self, record):
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        return json.dumps(log_entry)

# Apply the structured formatter
handler = logging.StreamHandler()
handler.setFormatter(StructuredFormatter())
logger = logging.getLogger()
logger.addHandler(handler)
```

## Summary

Deploying LangChain on Cloud Run with Vertex AI gives you a scalable, cost-effective production setup. Cloud Run handles the infrastructure - scaling, TLS, load balancing - while Vertex AI provides the model backend. The key decisions are around memory allocation, concurrency settings, and whether to keep warm instances. Start with the configuration in this guide, monitor your metrics for a week, then tune based on actual traffic patterns.
