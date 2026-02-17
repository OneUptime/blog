# How to Build an Asynchronous FastAPI Service That Reads and Writes to Firestore on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, FastAPI, Firestore, Cloud Run, Python

Description: Build a fully asynchronous FastAPI service that performs read and write operations on Firestore using the async client and deploy it to Cloud Run.

---

FastAPI's async capabilities pair nicely with Firestore's async client. When your API endpoint needs to read from or write to Firestore, doing it asynchronously means your server can handle other requests while waiting for the database response. This matters when you are running on Cloud Run where each container instance handles multiple concurrent requests. In this post, I will build a complete async FastAPI service with Firestore and deploy it to Cloud Run.

## Why Async Matters for Firestore Operations

Firestore operations involve network round trips to Google's servers. A typical read takes 10-50ms. If you handle those synchronously, your server thread is blocked during that time. With async, the event loop can process other requests while waiting for Firestore responses. On Cloud Run, this means each container instance can handle more concurrent requests, which saves money and improves throughput.

## Project Setup

Install the required packages.

```bash
# Install FastAPI, Uvicorn, and the Firestore async client
pip install fastapi uvicorn google-cloud-firestore
```

## The Firestore Async Client

The Firestore library includes an async client that works with Python's asyncio.

```python
# database.py - Firestore async client setup
from google.cloud.firestore_v1 import AsyncClient
import os

# Module-level client - reused across requests
_db = None

def get_db() -> AsyncClient:
    """Get or create the async Firestore client."""
    global _db
    if _db is None:
        project = os.environ.get("GCP_PROJECT")
        _db = AsyncClient(project=project)
    return _db
```

## Building the FastAPI Application

Here is the complete application with CRUD endpoints for a task management API.

```python
# main.py - Async FastAPI application with Firestore
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from google.cloud.firestore_v1 import AsyncClient, SERVER_TIMESTAMP
from contextlib import asynccontextmanager
import uuid
import os

# Module-level async Firestore client
db: Optional[AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup the Firestore client."""
    global db
    project = os.environ.get("GCP_PROJECT")
    db = AsyncClient(project=project)
    yield
    # Close the client on shutdown
    db = None

app = FastAPI(
    title="Task Manager API",
    description="Async task management backed by Firestore",
    lifespan=lifespan,
)

# Pydantic models for request/response validation
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    assigned_to: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    status: Optional[str] = Field(None, pattern="^(open|in_progress|done|cancelled)$")
    assigned_to: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    priority: str
    status: str
    assigned_to: Optional[str]
    tags: List[str]
    created_at: Optional[str]
    updated_at: Optional[str]
```

## Creating Documents Asynchronously

The create endpoint writes a new task document to Firestore using the async client.

```python
@app.post("/tasks", response_model=TaskResponse, status_code=201)
async def create_task(task: TaskCreate):
    """Create a new task in Firestore."""
    task_id = str(uuid.uuid4())

    # Build the document data
    task_data = {
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "status": "open",
        "assigned_to": task.assigned_to,
        "tags": task.tags,
        "created_at": SERVER_TIMESTAMP,
        "updated_at": SERVER_TIMESTAMP,
    }

    # Write to Firestore asynchronously - the await lets other requests proceed
    await db.collection("tasks").document(task_id).set(task_data)

    # Read back the document to get server-generated timestamps
    doc = await db.collection("tasks").document(task_id).get()
    data = doc.to_dict()

    return TaskResponse(
        id=task_id,
        title=data["title"],
        description=data["description"],
        priority=data["priority"],
        status=data["status"],
        assigned_to=data.get("assigned_to"),
        tags=data.get("tags", []),
        created_at=str(data.get("created_at", "")),
        updated_at=str(data.get("updated_at", "")),
    )
```

## Reading Documents Asynchronously

Read operations are where async really pays off since they involve waiting for network responses.

```python
@app.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """Fetch a single task by ID."""
    # Async read from Firestore
    doc = await db.collection("tasks").document(task_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    data = doc.to_dict()
    return TaskResponse(
        id=doc.id,
        title=data["title"],
        description=data["description"],
        priority=data["priority"],
        status=data["status"],
        assigned_to=data.get("assigned_to"),
        tags=data.get("tags", []),
        created_at=str(data.get("created_at", "")),
        updated_at=str(data.get("updated_at", "")),
    )

@app.get("/tasks", response_model=List[TaskResponse])
async def list_tasks(
    status: Optional[str] = Query(None, pattern="^(open|in_progress|done|cancelled)$"),
    priority: Optional[str] = Query(None, pattern="^(low|medium|high|critical)$"),
    assigned_to: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
):
    """List tasks with optional filters."""
    query = db.collection("tasks")

    # Apply filters based on query parameters
    if status:
        query = query.where("status", "==", status)
    if priority:
        query = query.where("priority", "==", priority)
    if assigned_to:
        query = query.where("assigned_to", "==", assigned_to)

    # Order by creation date and limit results
    query = query.order_by("created_at", direction="DESCENDING").limit(limit)

    # Stream results asynchronously
    tasks = []
    async for doc in query.stream():
        data = doc.to_dict()
        tasks.append(TaskResponse(
            id=doc.id,
            title=data["title"],
            description=data["description"],
            priority=data["priority"],
            status=data["status"],
            assigned_to=data.get("assigned_to"),
            tags=data.get("tags", []),
            created_at=str(data.get("created_at", "")),
            updated_at=str(data.get("updated_at", "")),
        ))

    return tasks
```

## Updating and Deleting Asynchronously

Updates and deletes follow the same async pattern.

```python
@app.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, update: TaskUpdate):
    """Update specific fields of a task."""
    doc_ref = db.collection("tasks").document(task_id)

    # Check if the task exists
    doc = await doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    # Build update dict with only provided fields
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = SERVER_TIMESTAMP

    # Perform the async update
    await doc_ref.update(update_data)

    # Read the updated document
    updated_doc = await doc_ref.get()
    data = updated_doc.to_dict()

    return TaskResponse(
        id=task_id,
        title=data["title"],
        description=data["description"],
        priority=data["priority"],
        status=data["status"],
        assigned_to=data.get("assigned_to"),
        tags=data.get("tags", []),
        created_at=str(data.get("created_at", "")),
        updated_at=str(data.get("updated_at", "")),
    )

@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str):
    """Delete a task."""
    doc_ref = db.collection("tasks").document(task_id)

    # Verify the task exists before deleting
    doc = await doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    await doc_ref.delete()
```

## Async Batch Operations

When you need to read or write multiple documents, use async gather for parallelism.

```python
import asyncio

@app.post("/tasks/batch", response_model=List[TaskResponse], status_code=201)
async def create_tasks_batch(tasks: List[TaskCreate]):
    """Create multiple tasks in parallel."""
    if len(tasks) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 tasks per batch")

    # Create all tasks concurrently using asyncio.gather
    async def create_single_task(task_data):
        task_id = str(uuid.uuid4())
        doc_data = {
            "title": task_data.title,
            "description": task_data.description,
            "priority": task_data.priority,
            "status": "open",
            "assigned_to": task_data.assigned_to,
            "tags": task_data.tags,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        }
        await db.collection("tasks").document(task_id).set(doc_data)
        return task_id

    # Run all creates concurrently
    task_ids = await asyncio.gather(
        *[create_single_task(task) for task in tasks]
    )

    # Read all created documents concurrently
    docs = await asyncio.gather(
        *[db.collection("tasks").document(tid).get() for tid in task_ids]
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        results.append(TaskResponse(
            id=doc.id,
            title=data["title"],
            description=data["description"],
            priority=data["priority"],
            status=data["status"],
            assigned_to=data.get("assigned_to"),
            tags=data.get("tags", []),
            created_at=str(data.get("created_at", "")),
            updated_at=str(data.get("updated_at", "")),
        ))

    return results
```

## Dockerfile and Deployment

Package the application and deploy to Cloud Run.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Use a single uvicorn worker - Cloud Run handles scaling via container instances
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
```

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/my-project/task-api

gcloud run deploy task-api \
    --image gcr.io/my-project/task-api \
    --region us-central1 \
    --set-env-vars "GCP_PROJECT=my-project" \
    --memory 512Mi \
    --max-instances 10 \
    --allow-unauthenticated
```

## Monitoring Your API

An async API with Firestore has several things that can go wrong: connection timeouts, quota limits, and slow queries. OneUptime (https://oneuptime.com) can monitor your Cloud Run endpoints, track response times, and alert you when latency increases or errors spike so you can investigate before users are significantly affected.

## Summary

Building an async FastAPI service with Firestore on Cloud Run is a solid pattern for building scalable APIs. The async Firestore client lets your server handle multiple requests concurrently without blocking on database I/O. Use `asyncio.gather` for batch operations, keep a single Firestore client instance across requests, and let Cloud Run handle scaling through container instances. This combination gives you a fast, scalable API with minimal infrastructure management.
