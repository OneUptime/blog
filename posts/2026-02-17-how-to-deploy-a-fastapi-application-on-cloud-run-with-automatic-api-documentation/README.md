# How to Deploy a FastAPI Application on Cloud Run with Automatic API Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, FastAPI, Python, API Documentation, Google Cloud

Description: Learn how to deploy a FastAPI application to Google Cloud Run with automatic OpenAPI documentation, proper containerization, and production configuration.

---

FastAPI has become the go-to framework for building Python APIs, largely because it generates interactive API documentation automatically. You define your endpoints with type hints, and FastAPI produces a full OpenAPI spec with a Swagger UI and ReDoc interface. Cloud Run is a natural fit for hosting it - serverless, auto-scaling, and zero infrastructure management.

This guide takes you from a FastAPI application to a production deployment on Cloud Run, with the documentation endpoints working correctly.

## Setting Up the FastAPI Application

Let me start with a practical FastAPI application. This is not a hello-world example - it has multiple endpoints, request validation, database models, and proper error handling:

```python
# main.py - FastAPI application with automatic documentation
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import os

# Create the FastAPI app with metadata for documentation
app = FastAPI(
    title="Task Management API",
    description="A task management API built with FastAPI and deployed on Cloud Run.",
    version="1.0.0",
    docs_url="/docs",         # Swagger UI
    redoc_url="/redoc",       # ReDoc alternative
    openapi_url="/openapi.json",  # OpenAPI spec
)

# Pydantic models for request/response validation
class TaskCreate(BaseModel):
    """Schema for creating a new task."""
    title: str = Field(..., min_length=1, max_length=200, description="The task title")
    description: Optional[str] = Field(None, max_length=1000, description="Detailed task description")
    priority: int = Field(default=1, ge=1, le=5, description="Priority from 1 (low) to 5 (high)")
    due_date: Optional[datetime] = Field(None, description="Optional due date")

class Task(BaseModel):
    """Schema for a task response."""
    id: int
    title: str
    description: Optional[str]
    priority: int
    completed: bool
    created_at: datetime
    due_date: Optional[datetime]

class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: Optional[int] = Field(None, ge=1, le=5)
    completed: Optional[bool] = None
    due_date: Optional[datetime] = None

# In-memory storage for demo purposes (use a database in production)
tasks_db: dict[int, dict] = {}
next_id = 1

@app.get("/", tags=["Health"])
def root():
    """Health check endpoint. Returns the API status and version."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.post("/tasks", response_model=Task, status_code=201, tags=["Tasks"])
def create_task(task: TaskCreate):
    """
    Create a new task.

    - **title**: Required. The task title (1-200 characters).
    - **description**: Optional detailed description.
    - **priority**: Priority level from 1 (lowest) to 5 (highest). Defaults to 1.
    - **due_date**: Optional due date in ISO 8601 format.
    """
    global next_id
    task_data = {
        "id": next_id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "completed": False,
        "created_at": datetime.utcnow(),
        "due_date": task.due_date,
    }
    tasks_db[next_id] = task_data
    next_id += 1
    return task_data

@app.get("/tasks", response_model=list[Task], tags=["Tasks"])
def list_tasks(
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    priority: Optional[int] = Query(None, ge=1, le=5, description="Filter by priority level"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of tasks to return"),
    offset: int = Query(0, ge=0, description="Number of tasks to skip"),
):
    """
    List all tasks with optional filtering and pagination.

    Supports filtering by completion status and priority level.
    Results are paginated with configurable limit and offset.
    """
    results = list(tasks_db.values())

    if completed is not None:
        results = [t for t in results if t["completed"] == completed]
    if priority is not None:
        results = [t for t in results if t["priority"] == priority]

    return results[offset:offset + limit]

@app.get("/tasks/{task_id}", response_model=Task, tags=["Tasks"])
def get_task(task_id: int):
    """Get a specific task by its ID. Returns 404 if the task does not exist."""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return tasks_db[task_id]

@app.patch("/tasks/{task_id}", response_model=Task, tags=["Tasks"])
def update_task(task_id: int, update: TaskUpdate):
    """
    Update a task partially. Only provided fields will be updated.
    Returns 404 if the task does not exist.
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    task = tasks_db[task_id]
    update_data = update.model_dump(exclude_unset=True)
    task.update(update_data)
    return task

@app.delete("/tasks/{task_id}", status_code=204, tags=["Tasks"])
def delete_task(task_id: int):
    """Delete a task by its ID. Returns 404 if the task does not exist."""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    del tasks_db[task_id]
```

## Creating the Dockerfile

FastAPI needs an ASGI server. Uvicorn is the standard choice:

```dockerfile
# Dockerfile for FastAPI application
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN adduser --disabled-password --no-create-home appuser
USER appuser

# Cloud Run sets the PORT environment variable
# Uvicorn reads it to determine which port to bind to
ENV PORT=8080

# Run with uvicorn - use 0.0.0.0 to accept external connections
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1
```

The requirements file:

```text
# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
```

A few notes on the Dockerfile:

- Single worker is usually correct for Cloud Run. Cloud Run scales by adding instances, not by adding workers within an instance.
- `--host 0.0.0.0` is required so the server accepts connections from Cloud Run's routing layer.
- Running as a non-root user is a security best practice.

## Adding a .dockerignore

```text
# .dockerignore
__pycache__
*.pyc
.git
.env
.venv
*.md
.mypy_cache
.pytest_cache
tests/
```

## Testing Locally

Build and run locally to verify everything works:

```bash
# Build the Docker image
docker build -t fastapi-app .

# Run it locally
docker run -p 8080:8080 -e PORT=8080 fastapi-app
```

Open these URLs in your browser:
- `http://localhost:8080/docs` - Swagger UI documentation
- `http://localhost:8080/redoc` - ReDoc documentation
- `http://localhost:8080/openapi.json` - Raw OpenAPI spec
- `http://localhost:8080/` - Health check

The Swagger UI lets you try out API calls directly from the browser. Every endpoint, parameter, and response schema is documented automatically from your type hints and docstrings.

## Deploying to Cloud Run

### Push the Image

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create apis \
  --repository-format=docker \
  --location=us-central1

# Build and push with Cloud Build
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$(gcloud config get-value project)/apis/task-api:latest
```

### Deploy

```bash
# Deploy to Cloud Run
gcloud run deploy task-api \
  --image=us-central1-docker.pkg.dev/$(gcloud config get-value project)/apis/task-api:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80
```

After deployment, Cloud Run outputs the service URL. The documentation is at:
- `https://task-api-xxxxx-uc.a.run.app/docs`
- `https://task-api-xxxxx-uc.a.run.app/redoc`

## Configuring the OpenAPI Root Path

When Cloud Run is behind a load balancer or API gateway with a path prefix, the documentation URLs break because FastAPI does not know about the prefix. Fix this with the `root_path` setting:

```python
# main.py - Configure root_path for load balancer compatibility
import os

# Cloud Run sets this when behind a load balancer
root_path = os.environ.get("ROOT_PATH", "")

app = FastAPI(
    title="Task Management API",
    version="1.0.0",
    root_path=root_path,
)
```

Set the environment variable during deployment if needed:

```bash
# Deploy with a root path for load balancer prefix
gcloud run deploy task-api \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/apis/task-api:latest \
  --region=us-central1 \
  --set-env-vars="ROOT_PATH=/api/v1"
```

## Production Configuration

### CORS

If your API is called from a web browser on a different domain, configure CORS:

```python
# Add CORS middleware for browser-based API access
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Disabling Docs in Production

You might want to disable the interactive documentation in production for security:

```python
# Disable docs in production
import os

docs_url = "/docs" if os.environ.get("ENABLE_DOCS", "true") == "true" else None
redoc_url = "/redoc" if os.environ.get("ENABLE_DOCS", "true") == "true" else None

app = FastAPI(
    title="Task Management API",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
)
```

### Structured Logging

Cloud Run works well with structured JSON logs:

```python
# logging_config.py - Structured logging for Cloud Run
import logging
import json
import sys

class CloudRunHandler(logging.StreamHandler):
    """Format logs as JSON for Cloud Logging."""
    def emit(self, record):
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        if record.exc_info:
            log_entry["exception"] = self.format(record)
        print(json.dumps(log_entry), file=sys.stderr)

# Configure logging
logger = logging.getLogger("task_api")
logger.setLevel(logging.INFO)
logger.addHandler(CloudRunHandler())
```

## Adding Database Support

For a real application, replace the in-memory storage with Cloud SQL:

```python
# database.py - Cloud SQL connection for FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Deploy with Cloud SQL:

```bash
# Deploy with Cloud SQL connection and database URL secret
gcloud run deploy task-api \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/apis/task-api:latest \
  --region=us-central1 \
  --add-cloudsql-instances=MY_PROJECT:us-central1:mydb \
  --set-secrets="DATABASE_URL=db-url:latest"
```

## Continuous Deployment

Set up automatic deployments with Cloud Build:

```yaml
# cloudbuild.yaml
steps:
  - name: "gcr.io/cloud-builders/docker"
    args: ["build", "-t", "us-central1-docker.pkg.dev/$PROJECT_ID/apis/task-api:$COMMIT_SHA", "."]

  - name: "gcr.io/cloud-builders/docker"
    args: ["push", "us-central1-docker.pkg.dev/$PROJECT_ID/apis/task-api:$COMMIT_SHA"]

  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - "run"
      - "deploy"
      - "task-api"
      - "--image=us-central1-docker.pkg.dev/$PROJECT_ID/apis/task-api:$COMMIT_SHA"
      - "--region=us-central1"
```

## Summary

FastAPI and Cloud Run are a strong combination for building and hosting APIs. FastAPI gives you automatic OpenAPI documentation, request validation, and great performance out of the box. Cloud Run gives you serverless hosting with automatic scaling. The deployment is straightforward - containerize with uvicorn, push to Artifact Registry, deploy to Cloud Run - and the documentation endpoints work immediately. For production, consider disabling public docs, adding CORS, switching to a real database, and setting up CI/CD for automated deployments.
