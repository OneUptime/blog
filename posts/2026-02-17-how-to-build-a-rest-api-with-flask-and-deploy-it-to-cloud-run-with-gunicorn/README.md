# How to Build a REST API with Flask and Deploy It to Cloud Run with Gunicorn

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Flask, Gunicorn, Python REST API

Description: Learn how to build a production-ready REST API with Flask and Gunicorn, containerize it with Docker, and deploy it to Google Cloud Run with proper configuration.

---

Flask is a solid choice for building REST APIs - it is lightweight, well-documented, and gets out of your way. Cloud Run is a natural deployment target because it handles scaling, TLS, and infrastructure management for you. Add Gunicorn as the production WSGI server and you have a stack that is simple to develop and reliable in production.

This post walks through building a REST API from scratch, setting up Gunicorn correctly, containerizing it, and deploying to Cloud Run.

## Project Setup

Start with the project structure:

```
my-api/
  app/
    __init__.py
    routes.py
    models.py
  requirements.txt
  Dockerfile
  gunicorn.conf.py
  main.py
```

Create the requirements file:

```
# requirements.txt - Production dependencies
Flask==3.1.0
gunicorn==22.0.0
google-cloud-firestore==2.19.0
```

## Building the Flask API

Start with the application factory pattern:

```python
# app/__init__.py - Flask application factory
from flask import Flask

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    app.config['JSON_SORT_KEYS'] = False

    # Register routes
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api/v1')

    # Health check endpoint for Cloud Run
    @app.route('/health')
    def health():
        return {'status': 'healthy'}, 200

    return app
```

Define the routes:

```python
# app/routes.py - API route definitions
from flask import Blueprint, request, jsonify
from app.models import ItemStore

api_bp = Blueprint('api', __name__)
store = ItemStore()

@api_bp.route('/items', methods=['GET'])
def list_items():
    """List all items with optional pagination."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # Cap per_page to prevent abuse
    per_page = min(per_page, 100)

    items, total = store.list_items(page=page, per_page=per_page)

    return jsonify({
        'items': items,
        'page': page,
        'per_page': per_page,
        'total': total,
    }), 200

@api_bp.route('/items', methods=['POST'])
def create_item():
    """Create a new item."""
    data = request.get_json()

    if not data or 'name' not in data:
        return jsonify({'error': 'Name is required'}), 400

    item = store.create_item(data)
    return jsonify(item), 201

@api_bp.route('/items/<item_id>', methods=['GET'])
def get_item(item_id):
    """Get a single item by ID."""
    item = store.get_item(item_id)

    if item is None:
        return jsonify({'error': 'Item not found'}), 404

    return jsonify(item), 200

@api_bp.route('/items/<item_id>', methods=['PUT'])
def update_item(item_id):
    """Update an existing item."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    item = store.update_item(item_id, data)

    if item is None:
        return jsonify({'error': 'Item not found'}), 404

    return jsonify(item), 200

@api_bp.route('/items/<item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete an item."""
    success = store.delete_item(item_id)

    if not success:
        return jsonify({'error': 'Item not found'}), 404

    return '', 204

# Error handlers
@api_bp.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad request'}), 400

@api_bp.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500
```

Create the data model layer:

```python
# app/models.py - Data models backed by Firestore
from google.cloud import firestore
import uuid
from datetime import datetime, timezone

class ItemStore:
    """Item storage backed by Cloud Firestore."""

    def __init__(self):
        # Firestore client uses ADC automatically
        self.db = firestore.Client()
        self.collection = self.db.collection('items')

    def create_item(self, data):
        """Create a new item and return it."""
        item_id = str(uuid.uuid4())
        item = {
            'id': item_id,
            'name': data['name'],
            'description': data.get('description', ''),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }

        self.collection.document(item_id).set(item)
        return item

    def get_item(self, item_id):
        """Get a single item by ID."""
        doc = self.collection.document(item_id).get()
        if doc.exists:
            return doc.to_dict()
        return None

    def list_items(self, page=1, per_page=20):
        """List items with pagination."""
        # Get total count
        total = len(list(self.collection.stream()))

        # Get paginated results
        query = self.collection.order_by('created_at').limit(per_page).offset((page - 1) * per_page)
        items = [doc.to_dict() for doc in query.stream()]

        return items, total

    def update_item(self, item_id, data):
        """Update an existing item."""
        doc_ref = self.collection.document(item_id)
        doc = doc_ref.get()

        if not doc.exists:
            return None

        update_data = {
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }

        # Only update provided fields
        if 'name' in data:
            update_data['name'] = data['name']
        if 'description' in data:
            update_data['description'] = data['description']

        doc_ref.update(update_data)
        return doc_ref.get().to_dict()

    def delete_item(self, item_id):
        """Delete an item. Returns True if deleted, False if not found."""
        doc_ref = self.collection.document(item_id)
        doc = doc_ref.get()

        if not doc.exists:
            return False

        doc_ref.delete()
        return True
```

The entry point:

```python
# main.py - Application entry point
from app import create_app

app = create_app()

if __name__ == '__main__':
    # Only used for local development
    app.run(host='0.0.0.0', port=8080, debug=True)
```

## Configuring Gunicorn

Flask's built-in server is for development only. Gunicorn is the production WSGI server:

```python
# gunicorn.conf.py - Gunicorn configuration for Cloud Run
import multiprocessing
import os

# Bind to the port Cloud Run provides
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker configuration
# Cloud Run containers have 1-2 vCPUs typically
# Use 2 workers per CPU core + 1
workers = int(os.environ.get('GUNICORN_WORKERS', 2 * multiprocessing.cpu_count() + 1))

# Use gthread worker class for handling concurrent requests
worker_class = 'gthread'
threads = int(os.environ.get('GUNICORN_THREADS', 4))

# Timeouts
timeout = 120  # Match Cloud Run's default request timeout
graceful_timeout = 30
keepalive = 2

# Logging
accesslog = '-'  # Log to stdout for Cloud Logging
errorlog = '-'   # Log to stderr for Cloud Logging
loglevel = os.environ.get('LOG_LEVEL', 'info')

# Preload the app for faster worker startup
preload_app = True

# Restart workers after this many requests to prevent memory leaks
max_requests = 1000
max_requests_jitter = 50
```

## Containerizing with Docker

```dockerfile
# Dockerfile - Multi-stage build for production Flask/Gunicorn app
FROM python:3.12-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home appuser

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Switch to non-root user
USER appuser

# Expose the port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Run with Gunicorn using the config file
CMD ["gunicorn", "--config", "gunicorn.conf.py", "main:app"]
```

## Local Testing

Test locally before deploying:

```bash
# Build the Docker image
docker build -t my-api .

# Run locally
docker run -p 8080:8080 \
  -v ~/.config/gcloud:/home/appuser/.config/gcloud \
  -e GOOGLE_CLOUD_PROJECT=my-project \
  my-api

# Test the endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/v1/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "description": "A test item"}'
curl http://localhost:8080/api/v1/items
```

## Deploying to Cloud Run

### Push the Image to Artifact Registry

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create my-api-repo \
  --repository-format=docker \
  --location=us-central1 \
  --project=my-project

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Tag and push the image
docker tag my-api us-central1-docker.pkg.dev/my-project/my-api-repo/my-api:latest
docker push us-central1-docker.pkg.dev/my-project/my-api-repo/my-api:latest
```

### Deploy to Cloud Run

```bash
# Deploy the API to Cloud Run
gcloud run deploy my-api \
  --image=us-central1-docker.pkg.dev/my-project/my-api-repo/my-api:latest \
  --region=us-central1 \
  --platform=managed \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=120s \
  --set-env-vars="GUNICORN_WORKERS=2,GUNICORN_THREADS=4,LOG_LEVEL=info" \
  --allow-unauthenticated \
  --project=my-project
```

### Verify the Deployment

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe my-api \
  --region=us-central1 \
  --project=my-project \
  --format="value(status.url)")

# Test the deployed API
curl "$SERVICE_URL/health"
curl -X POST "$SERVICE_URL/api/v1/items" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Item"}'
curl "$SERVICE_URL/api/v1/items"
```

## Setting Up Continuous Deployment

Use Cloud Build for automated deployments:

```yaml
# cloudbuild.yaml - Cloud Build configuration for automated deployments
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-api-repo/my-api:$COMMIT_SHA', '.']

  # Push the image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-api-repo/my-api:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'my-api'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-api-repo/my-api:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
```

## Summary

Building a REST API with Flask and deploying it to Cloud Run with Gunicorn gives you a production-ready setup with minimal overhead. Flask handles routing and request processing, Gunicorn manages worker processes and concurrency, Docker provides a consistent deployment artifact, and Cloud Run handles scaling and infrastructure. The key configuration points are Gunicorn's worker and thread settings (match them to your Cloud Run CPU allocation), the health check endpoint (Cloud Run uses it for readiness checks), and the PORT environment variable (Cloud Run sets it dynamically).
