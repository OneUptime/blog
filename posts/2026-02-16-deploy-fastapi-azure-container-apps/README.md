# How to Deploy a FastAPI Application to Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, FastAPI, Python, Container Apps, Docker, Serverless, Deployment

Description: Learn how to containerize a FastAPI application and deploy it to Azure Container Apps with auto-scaling and ingress configuration.

---

Azure Container Apps is a serverless container platform. You bring a container image, tell it how to scale, and Azure runs it without you managing any infrastructure. For FastAPI applications, this is a great fit because you get automatic scaling (including scale to zero), built-in HTTPS, and revision management. No need to manage Kubernetes clusters or virtual machines.

In this post, I will walk through building a FastAPI app, containerizing it with Docker, and deploying it to Azure Container Apps.

## Building the FastAPI Application

Let me start with a FastAPI app that has a few endpoints. This example is a simple bookstore API.

```python
# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

app = FastAPI(
    title="Bookstore API",
    description="A simple bookstore API deployed on Azure Container Apps",
    version="1.0.0"
)

# In-memory storage
books = {}


class BookCreate(BaseModel):
    """Schema for creating a new book."""
    title: str
    author: str
    isbn: str
    price: float
    genre: Optional[str] = None


class BookUpdate(BaseModel):
    """Schema for updating an existing book."""
    title: Optional[str] = None
    author: Optional[str] = None
    price: Optional[float] = None
    genre: Optional[str] = None


class Book(BookCreate):
    """Full book model with generated fields."""
    id: str
    created_at: str


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "service": "Bookstore API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    """Health check for container orchestration."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/books", response_model=list[Book])
def list_books(genre: Optional[str] = None):
    """List all books, optionally filtered by genre."""
    if genre:
        return [b for b in books.values() if b.get("genre") == genre]
    return list(books.values())


@app.get("/api/books/{book_id}")
def get_book(book_id: str):
    """Get a single book by ID."""
    if book_id not in books:
        raise HTTPException(status_code=404, detail="Book not found")
    return books[book_id]


@app.post("/api/books", status_code=201)
def create_book(book: BookCreate):
    """Create a new book entry."""
    book_id = str(uuid.uuid4())[:8]
    book_data = book.model_dump()
    book_data["id"] = book_id
    book_data["created_at"] = datetime.utcnow().isoformat()
    books[book_id] = book_data
    return book_data


@app.put("/api/books/{book_id}")
def update_book(book_id: str, updates: BookUpdate):
    """Update a book's details."""
    if book_id not in books:
        raise HTTPException(status_code=404, detail="Book not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        books[book_id][field] = value

    return books[book_id]


@app.delete("/api/books/{book_id}", status_code=204)
def delete_book(book_id: str):
    """Remove a book from the store."""
    if book_id not in books:
        raise HTTPException(status_code=404, detail="Book not found")
    del books[book_id]
```

## Creating the Dockerfile

Container Apps runs Docker containers, so you need a Dockerfile. Here is one optimized for FastAPI with Uvicorn.

```dockerfile
# Dockerfile
# Use a slim Python image to keep the container small
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install dependencies without caching pip packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port Uvicorn will listen on
EXPOSE 8000

# Run FastAPI with Uvicorn
# --host 0.0.0.0 makes it accessible from outside the container
# --workers 2 handles concurrent requests
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

And the requirements.txt.

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
```

## Testing Locally with Docker

Build and run the container locally to make sure everything works before deploying.

```bash
# Build the Docker image
docker build -t bookstore-api .

# Run it locally
docker run -p 8000:8000 bookstore-api

# Test it
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/books \
    -H "Content-Type: application/json" \
    -d '{"title": "The Pragmatic Programmer", "author": "David Thomas", "isbn": "978-0135957059", "price": 49.99}'
```

## Setting Up Azure Resources

You need a few things: a resource group, a Container Apps environment, and a container registry to store your image.

```bash
# Install the Container Apps CLI extension if you do not have it
az extension add --name containerapp --upgrade

# Create a resource group
az group create --name fastapi-rg --location eastus

# Create an Azure Container Registry
az acr create \
    --name myfastapiregistry \
    --resource-group fastapi-rg \
    --sku Basic \
    --admin-enabled true

# Create a Container Apps environment
az containerapp env create \
    --name fastapi-env \
    --resource-group fastapi-rg \
    --location eastus
```

## Pushing the Image to Azure Container Registry

```bash
# Log in to the container registry
az acr login --name myfastapiregistry

# Tag the image for ACR
docker tag bookstore-api myfastapiregistry.azurecr.io/bookstore-api:v1

# Push the image
docker push myfastapiregistry.azurecr.io/bookstore-api:v1
```

Alternatively, you can build directly in ACR without Docker on your machine.

```bash
# Build the image in Azure Container Registry (no local Docker needed)
az acr build \
    --registry myfastapiregistry \
    --image bookstore-api:v1 \
    .
```

## Deploying to Container Apps

Now create the Container App using the image from your registry.

```bash
# Get ACR credentials
ACR_PASSWORD=$(az acr credential show \
    --name myfastapiregistry \
    --query "passwords[0].value" -o tsv)

# Create the Container App
az containerapp create \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --environment fastapi-env \
    --image myfastapiregistry.azurecr.io/bookstore-api:v1 \
    --registry-server myfastapiregistry.azurecr.io \
    --registry-username myfastapiregistry \
    --registry-password $ACR_PASSWORD \
    --target-port 8000 \
    --ingress external \
    --min-replicas 0 \
    --max-replicas 5 \
    --cpu 0.5 \
    --memory 1.0Gi

# Get the application URL
az containerapp show \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --query "properties.configuration.ingress.fqdn" -o tsv
```

The key flags here:
- `--ingress external` makes the app publicly accessible via HTTPS
- `--target-port 8000` matches the port Uvicorn listens on
- `--min-replicas 0` enables scale to zero (saves money when idle)
- `--max-replicas 5` caps the number of instances during high load

## Configuring Auto-Scaling

The default scaling rule is based on concurrent HTTP requests. You can customize this.

```bash
# Scale based on HTTP concurrency (scale up when requests per instance exceed 10)
az containerapp update \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --scale-rule-name http-scaling \
    --scale-rule-type http \
    --scale-rule-http-concurrency 10 \
    --min-replicas 1 \
    --max-replicas 10
```

```mermaid
graph LR
    A[Incoming Requests] --> B{Requests per Instance > 10?}
    B -->|Yes| C[Scale Up - Add Instance]
    B -->|No| D{Requests per Instance < 5?}
    D -->|Yes| E[Scale Down - Remove Instance]
    D -->|No| F[Maintain Current Scale]
```

## Environment Variables and Secrets

Container Apps supports both plain environment variables and secrets.

```bash
# Set environment variables
az containerapp update \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --set-env-vars \
    "APP_ENV=production" \
    "LOG_LEVEL=info" \
    "DATABASE_URL=secretref:db-url"

# Create a secret
az containerapp secret set \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --secrets "db-url=postgresql://user:pass@host:5432/db"
```

## Deploying New Revisions

When you update your code, push a new image and create a new revision.

```bash
# Build and push the updated image
az acr build \
    --registry myfastapiregistry \
    --image bookstore-api:v2 \
    .

# Update the Container App to use the new image
az containerapp update \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --image myfastapiregistry.azurecr.io/bookstore-api:v2
```

Container Apps keeps old revisions around, so you can roll back quickly if something goes wrong.

```bash
# List all revisions
az containerapp revision list \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --output table

# Activate an old revision for rollback
az containerapp revision activate \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --revision bookstore-api--v1
```

## Viewing Logs

```bash
# View recent logs
az containerapp logs show \
    --name bookstore-api \
    --resource-group fastapi-rg \
    --follow
```

## Wrapping Up

Azure Container Apps is a solid platform for FastAPI applications. You get the flexibility of containers without the overhead of managing Kubernetes. The auto-scaling - especially scale to zero - makes it cost-effective for APIs with variable traffic. The deployment workflow is straightforward: build your image, push it to a registry, and tell Container Apps to use it. Combined with FastAPI's built-in OpenAPI documentation (available at `/docs`), you end up with a well-documented, automatically scaling API with minimal infrastructure management.
