# How to Instrument a Python Application with OpenTelemetry and Export Traces to Cloud Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, OpenTelemetry, Python, Distributed Tracing

Description: Step-by-step instructions for adding OpenTelemetry instrumentation to a Python application and exporting trace data to Google Cloud Trace for performance monitoring.

---

If you are running Python services on Google Cloud and trying to understand where requests spend their time, you need distributed tracing. Cloud Trace is Google's managed tracing backend, and OpenTelemetry is the vendor-neutral instrumentation framework that has become the industry standard. Together, they give you detailed visibility into request flows without locking you into a proprietary SDK.

Let me show you how to set this up for a Python application, whether you are using Flask, FastAPI, Django, or just plain Python.

## Step 1: Install the Required Packages

You need the OpenTelemetry SDK, the Cloud Trace exporter, and auto-instrumentation packages for the frameworks you use.

```bash
# Install core OpenTelemetry packages and the Cloud Trace exporter
pip install opentelemetry-sdk \
  opentelemetry-api \
  opentelemetry-exporter-gcp-trace \
  opentelemetry-resourcedetector-gcp

# Install auto-instrumentation for Flask (replace with your framework)
pip install opentelemetry-instrumentation-flask \
  opentelemetry-instrumentation-requests \
  opentelemetry-instrumentation-sqlalchemy
```

For FastAPI, use `opentelemetry-instrumentation-fastapi` instead of the Flask package.

## Step 2: Configure the Tracer Provider

Create a tracing module that configures OpenTelemetry with the Cloud Trace exporter. This should be initialized before your application starts handling requests.

```python
# tracing.py - OpenTelemetry configuration for Cloud Trace
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.resourcedetector.gcp_resource_detector import GoogleCloudResourceDetector
from opentelemetry.semconv.resource import ResourceAttributes


def configure_tracing(service_name="my-python-service", service_version="1.0.0"):
    """Set up OpenTelemetry with Cloud Trace exporter."""

    # Define resource attributes that identify this service
    resource = Resource.create({
        ResourceAttributes.SERVICE_NAME: service_name,
        ResourceAttributes.SERVICE_VERSION: service_version,
    })

    # Detect GCP-specific resource attributes (project, zone, etc.)
    # This only works when running on GCP
    try:
        gcp_resource = GoogleCloudResourceDetector().detect()
        resource = resource.merge(gcp_resource)
    except Exception:
        pass  # Not running on GCP, skip detection

    # Create the tracer provider with the resource info
    provider = TracerProvider(resource=resource)

    # Set up the Cloud Trace exporter with batch processing
    exporter = CloudTraceSpanExporter()
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)

    # Register the provider globally
    trace.set_tracer_provider(provider)

    return provider
```

## Step 3: Instrument a Flask Application

Here is a complete Flask application with tracing configured. The key is to call `configure_tracing()` before creating the Flask app.

```python
# app.py - Flask application with OpenTelemetry tracing
from tracing import configure_tracing

# Initialize tracing before importing Flask
provider = configure_tracing(service_name="flask-api")

from flask import Flask, jsonify, request
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry import trace
import requests

app = Flask(__name__)

# Auto-instrument Flask to create spans for incoming requests
FlaskInstrumentor().instrument_app(app)

# Auto-instrument the requests library for outgoing HTTP calls
RequestsInstrumentor().instrument()

# Get a tracer for creating custom spans
tracer = trace.get_tracer(__name__)


@app.route("/api/users/<user_id>")
def get_user(user_id):
    """Fetch user data - automatically traced by Flask instrumentation."""

    # This custom span tracks the business logic separately
    with tracer.start_as_current_span("fetch_user_data") as span:
        span.set_attribute("user.id", user_id)

        # This outgoing call is automatically traced by requests instrumentation
        response = requests.get(f"http://user-service:5001/users/{user_id}")

        if response.status_code == 200:
            return jsonify(response.json())
        else:
            span.set_attribute("error", True)
            return jsonify({"error": "User not found"}), 404


@app.route("/api/orders")
def list_orders():
    """List orders with database query tracing."""

    with tracer.start_as_current_span("list_orders") as span:
        page = request.args.get("page", 1, type=int)
        span.set_attribute("pagination.page", page)

        # Simulate a database call with its own span
        with tracer.start_as_current_span("db.query") as db_span:
            db_span.set_attribute("db.system", "postgresql")
            db_span.set_attribute("db.statement", "SELECT * FROM orders LIMIT 20 OFFSET ?")
            orders = fetch_orders_from_db(page)

        span.set_attribute("orders.count", len(orders))
        return jsonify(orders)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

## Step 4: Instrument a FastAPI Application

If you are using FastAPI instead of Flask, the setup is similar but uses the FastAPI instrumentor.

```python
# main.py - FastAPI application with OpenTelemetry tracing
from tracing import configure_tracing

# Initialize tracing before creating the app
provider = configure_tracing(service_name="fastapi-api")

from fastapi import FastAPI, HTTPException
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry import trace
import httpx

app = FastAPI()

# Auto-instrument FastAPI
FastAPIInstrumentor.instrument_app(app)
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    """Fetch product details with custom span attributes."""

    with tracer.start_as_current_span("get_product") as span:
        span.set_attribute("product.id", product_id)

        # Use httpx for async HTTP calls
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://product-service:5002/products/{product_id}"
            )

        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Product not found")

        return response.json()
```

## Step 5: Add Custom Spans for Business Logic

Auto-instrumentation handles HTTP boundaries, but you should add custom spans for important business operations.

```python
# services/payment.py - Payment processing with detailed tracing
from opentelemetry import trace

tracer = trace.get_tracer("payment-service")


def process_payment(order_id, amount, currency):
    """Process a payment with spans for each step."""

    # Parent span for the entire payment flow
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("payment.amount", amount)
        span.set_attribute("payment.currency", currency)

        # Step 1: Validate the payment details
        with tracer.start_as_current_span("validate_payment") as validate_span:
            is_valid = validate_payment_details(order_id, amount)
            validate_span.set_attribute("validation.passed", is_valid)
            if not is_valid:
                span.set_status(trace.StatusCode.ERROR, "Payment validation failed")
                raise ValueError("Invalid payment details")

        # Step 2: Charge the payment provider
        with tracer.start_as_current_span("charge_provider") as charge_span:
            charge_span.set_attribute("provider", "stripe")
            try:
                result = charge_stripe(amount, currency)
                charge_span.set_attribute("charge.id", result["charge_id"])
            except Exception as e:
                charge_span.record_exception(e)
                charge_span.set_status(trace.StatusCode.ERROR, str(e))
                raise

        # Step 3: Update the order status
        with tracer.start_as_current_span("update_order_status"):
            update_order(order_id, status="paid", charge_id=result["charge_id"])

        span.set_attribute("payment.success", True)
        return result
```

## Step 6: Instrument Database Queries

If you are using SQLAlchemy, the auto-instrumentation package captures database queries automatically.

```python
# database.py - SQLAlchemy with automatic trace instrumentation
from sqlalchemy import create_engine
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Create the database engine
engine = create_engine("postgresql://user:pass@localhost:5432/mydb")

# Instrument SQLAlchemy - this traces all queries automatically
SQLAlchemyInstrumentor().instrument(engine=engine)
```

Every query executed through this engine will now appear as a span in your traces, including the SQL statement, execution time, and database metadata.

## Step 7: Deploy to Cloud Run

Here is a Dockerfile and Cloud Run deployment that sets up tracing correctly.

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run sets PORT automatically
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "app:app"]
```

Deploy with the right permissions.

```bash
# Build and deploy to Cloud Run
gcloud run deploy my-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated

# Make sure the Cloud Run service account has trace permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtrace.agent"
```

## Viewing Traces in Cloud Console

After deploying and sending some requests, go to **Trace > Trace Explorer** in the Cloud Console. You will see:

- A latency distribution chart showing request timing
- A list of recent traces with their total duration
- When you click on a trace, a waterfall view showing every span and how they relate to each other

Look for spans that take disproportionately long. Those are your performance bottlenecks.

## Wrapping Up

OpenTelemetry with Cloud Trace gives your Python applications production-grade distributed tracing. Start with auto-instrumentation for HTTP and database layers, add custom spans for important business logic, and deploy with the right IAM permissions. The initial setup takes about 30 minutes, and the debugging time it saves during your next performance investigation will be worth every minute.
