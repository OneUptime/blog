# How to use OpenTelemetry auto-instrumentation with Python applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Observability, Tracing, Auto-instrumentation

Description: Learn how to implement OpenTelemetry auto-instrumentation with Python applications using the opentelemetry-bootstrap command for automatic library detection and instrumentation.

---

Python applications benefit greatly from OpenTelemetry auto-instrumentation, which automatically instruments popular frameworks and libraries without requiring code changes. The Python auto-instrumentation packages detect installed libraries and inject tracing automatically.

## Understanding Python Auto-instrumentation

OpenTelemetry provides a bootstrap mechanism for Python that automatically discovers installed libraries and installs corresponding instrumentation packages. This approach works with Flask, Django, FastAPI, requests, and many other popular libraries.

The bootstrap process scans your Python environment, identifies installed packages, and installs appropriate instrumentation libraries. After bootstrapping, you can run your application with automatic instrumentation enabled.

## Installing Prerequisites

Start by installing the core OpenTelemetry packages. You need the API, SDK, and the bootstrap tool to get started with auto-instrumentation.

```bash
# Install OpenTelemetry core packages
pip install opentelemetry-distro opentelemetry-exporter-otlp

# Bootstrap auto-instrumentation
opentelemetry-bootstrap -a install

# Verify installed instrumentations
pip list | grep opentelemetry-instrumentation
```

The bootstrap command analyzes your environment and installs instrumentation packages for detected libraries. It handles dependencies automatically.

## Flask Application Example

Flask applications work seamlessly with OpenTelemetry auto-instrumentation. The instrumentation automatically creates spans for HTTP requests, database queries, and template rendering.

```python
# app.py - No instrumentation code needed
from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

@app.route('/api/users/<user_id>')
def get_user(user_id):
    # This endpoint is automatically instrumented
    # HTTP request span is created automatically
    user_data = fetch_user_from_db(user_id)
    return jsonify(user_data)

@app.route('/api/orders', methods=['POST'])
def create_order():
    # POST requests are also automatically traced
    order_data = request.get_json()
    result = process_order(order_data)
    return jsonify(result), 201

def fetch_user_from_db(user_id):
    # Database queries are automatically instrumented
    # when using supported libraries
    return {"id": user_id, "name": "John Doe"}

def process_order(order_data):
    # Outbound HTTP calls are automatically traced
    response = requests.post(
        'https://api.payment.com/process',
        json=order_data
    )
    return response.json()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Run the Flask application with auto-instrumentation using the `opentelemetry-instrument` command.

```bash
# Run with auto-instrumentation
opentelemetry-instrument \
    --traces_exporter otlp \
    --metrics_exporter otlp \
    --service_name flask-app \
    --exporter_otlp_endpoint http://localhost:4317 \
    python app.py
```

The instrumentation wrapper starts your application with telemetry collection enabled. It automatically propagates trace context and creates spans.

## Django Application Configuration

Django applications require slightly different setup. The auto-instrumentation works with Django views, middleware, database queries, and template rendering.

```python
# views.py - Standard Django view
from django.http import JsonResponse
from django.views import View
from .models import Product
import requests

class ProductView(View):
    def get(self, request, product_id):
        # Django view automatically creates a span
        # Database ORM queries are also instrumented
        product = Product.objects.get(id=product_id)

        # Serialize product data
        data = {
            'id': product.id,
            'name': product.name,
            'price': str(product.price)
        }
        return JsonResponse(data)

    def post(self, request):
        # POST requests are automatically traced
        product_data = json.loads(request.body)
        product = Product.objects.create(**product_data)
        return JsonResponse({'id': product.id}, status=201)

class InventoryView(View):
    def get(self, request, product_id):
        # External API calls are automatically instrumented
        response = requests.get(
            f'https://api.inventory.com/products/{product_id}'
        )
        return JsonResponse(response.json())
```

Start the Django application with auto-instrumentation using environment variables for configuration.

```bash
# Set environment variables
export OTEL_SERVICE_NAME=django-app
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Run with auto-instrumentation
opentelemetry-instrument python manage.py runserver 0.0.0.0:8000
```

The instrumentation handles Django's request-response cycle, middleware, and ORM queries automatically.

## FastAPI Integration

FastAPI applications get comprehensive auto-instrumentation including async endpoint support. The instrumentation creates spans for routes, dependencies, and background tasks.

```python
# main.py - FastAPI application
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
import asyncio

app = FastAPI()

class OrderRequest(BaseModel):
    product_id: str
    quantity: int
    customer_email: str

@app.get("/products/{product_id}")
async def get_product(product_id: str):
    # Async endpoints are automatically instrumented
    # Trace context propagates through async operations
    async with httpx.AsyncClient() as client:
        # Outbound async HTTP calls are traced
        response = await client.get(
            f"https://api.catalog.com/products/{product_id}"
        )
        return response.json()

@app.post("/orders")
async def create_order(order: OrderRequest, background_tasks: BackgroundTasks):
    # Endpoint span includes the entire request processing
    order_id = await save_order(order)

    # Background tasks are also instrumented
    background_tasks.add_task(send_confirmation_email, order.customer_email)

    return {"order_id": order_id, "status": "created"}

async def save_order(order: OrderRequest):
    # Simulated database operation
    # Real database operations would be auto-instrumented
    await asyncio.sleep(0.1)
    return "ord-12345"

async def send_confirmation_email(email: str):
    # Background task creates its own span
    await asyncio.sleep(0.5)
    print(f"Sent confirmation to {email}")
```

Run FastAPI with auto-instrumentation using uvicorn.

```bash
# Run FastAPI with auto-instrumentation
opentelemetry-instrument \
    --traces_exporter otlp \
    --metrics_exporter otlp \
    --service_name fastapi-app \
    --exporter_otlp_endpoint http://localhost:4317 \
    uvicorn main:app --host 0.0.0.0 --port 8000
```

The instrumentation handles FastAPI's async nature correctly, ensuring trace context propagates through await calls.

## Database Instrumentation

Popular Python database libraries get instrumented automatically. This includes SQLAlchemy, psycopg2, pymongo, and redis-py.

```python
# database.py - SQLAlchemy example
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)
    email = Column(String(120))

# Database connection is automatically instrumented
engine = create_engine('postgresql://user:pass@localhost/mydb')
Session = sessionmaker(bind=engine)

def get_user(user_id):
    session = Session()
    # This query is automatically traced
    # SQL statement, duration, and connection info are captured
    user = session.query(User).filter(User.id == user_id).first()
    session.close()
    return user

def create_user(username, email):
    session = Session()
    # INSERT operations are also automatically instrumented
    user = User(username=username, email=email)
    session.add(user)
    session.commit()
    session.close()
    return user
```

The database instrumentation captures SQL statements, connection details, and query timing without requiring code changes.

## Celery Task Instrumentation

Celery tasks get instrumented automatically when using the Celery instrumentation package. This ensures trace context propagates across asynchronous task boundaries.

```python
# tasks.py - Celery tasks
from celery import Celery
import requests

app = Celery('tasks', broker='redis://localhost:6379/0')

@app.task
def process_payment(order_id, amount):
    # Celery task execution is automatically instrumented
    # Trace context is extracted from message headers
    result = charge_credit_card(order_id, amount)

    if result['success']:
        # Chained tasks maintain trace continuity
        send_receipt.delay(order_id)

    return result

@app.task
def send_receipt(order_id):
    # Outbound HTTP calls in tasks are traced
    response = requests.post(
        'https://api.email.com/send',
        json={'order_id': order_id, 'template': 'receipt'}
    )
    return response.json()

def charge_credit_card(order_id, amount):
    # External payment API call is automatically traced
    response = requests.post(
        'https://api.payment.com/charge',
        json={'order_id': order_id, 'amount': amount}
    )
    return response.json()
```

Run Celery workers with auto-instrumentation to enable distributed tracing.

```bash
# Run Celery worker with instrumentation
opentelemetry-instrument \
    --traces_exporter otlp \
    --service_name celery-worker \
    --exporter_otlp_endpoint http://localhost:4317 \
    celery -A tasks worker --loglevel=info
```

The instrumentation ensures trace context flows from the task producer through the message queue to the worker.

## Configuration via Environment Variables

Configure auto-instrumentation behavior using environment variables. This approach works across different frameworks and deployment environments.

```bash
# Complete configuration example
export OTEL_SERVICE_NAME=python-app
export OTEL_SERVICE_VERSION=1.0.0
export OTEL_DEPLOYMENT_ENVIRONMENT=production

# Exporter configuration
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# Sampling configuration
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1

# Resource attributes
export OTEL_RESOURCE_ATTRIBUTES=environment=prod,team=backend

# Run application
opentelemetry-instrument python app.py
```

These environment variables control every aspect of telemetry collection and export.

## Docker Deployment

Deploy Python applications with auto-instrumentation in Docker containers. Install instrumentation packages in the Dockerfile and configure via environment variables.

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install OpenTelemetry packages
RUN pip install opentelemetry-distro opentelemetry-exporter-otlp

# Bootstrap auto-instrumentation
RUN opentelemetry-bootstrap -a install

# Copy application code
COPY . .

# Run with auto-instrumentation
CMD ["opentelemetry-instrument", "python", "app.py"]
```

Use docker-compose to configure the application with telemetry collection.

```yaml
# docker-compose.yml
version: '3.8'
services:
  python-app:
    build: .
    environment:
      - OTEL_SERVICE_NAME=python-app
      - OTEL_TRACES_EXPORTER=otlp
      - OTEL_METRICS_EXPORTER=otlp
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_RESOURCE_ATTRIBUTES=environment=dev
    ports:
      - "5000:5000"
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yml"]
    volumes:
      - ./otel-collector-config.yml:/etc/otel-collector-config.yml
    ports:
      - "4317:4317"
```

This setup ensures your Python application sends telemetry data to the collector automatically.

## Excluding Libraries

Sometimes you need to exclude specific libraries from auto-instrumentation. This helps reduce overhead or avoid conflicts.

```bash
# Disable specific instrumentations
export OTEL_PYTHON_DISABLED_INSTRUMENTATIONS=urllib3,redis

# Run with exclusions
opentelemetry-instrument python app.py
```

The exclusion list accepts comma-separated instrumentation names. This gives you fine-grained control over what gets instrumented.

## Verifying Instrumentation

After deploying with auto-instrumentation, verify that telemetry data flows correctly. Check application logs for OpenTelemetry initialization messages.

```bash
# Run with debug logging
export OTEL_LOG_LEVEL=debug
opentelemetry-instrument python app.py

# Expected log output shows instrumentation initialization:
# Instrumentation: flask, Version: 1.0.0
# Instrumentation: requests, Version: 1.0.0
# Instrumentation: sqlalchemy, Version: 1.0.0
```

Debug logging helps troubleshoot configuration issues and verify which instrumentations loaded successfully.

OpenTelemetry auto-instrumentation for Python makes it easy to add comprehensive observability to your applications. The bootstrap mechanism and instrumentation wrapper handle most popular frameworks automatically, providing distributed tracing with minimal setup.
