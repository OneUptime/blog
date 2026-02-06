# How to Trace Starlette Applications with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Starlette, Python, ASGI, Tracing, Web Framework

Description: Learn how to implement distributed tracing in Starlette ASGI applications using OpenTelemetry for complete observability of your async Python web services.

Starlette is a lightweight ASGI framework for building high-performance async web services in Python. When you're running Starlette applications in production, understanding request flow, latency patterns, and error propagation becomes critical. OpenTelemetry provides automatic instrumentation for Starlette that captures HTTP requests, middleware execution, and route handling with minimal configuration.

## Why Trace Starlette Applications

Starlette applications often serve as API backends, microservices, or foundation layers for frameworks like FastAPI. These services typically:

- Handle thousands of concurrent async requests
- Interact with databases, cache layers, and external APIs
- Process WebSocket connections and streaming responses
- Execute complex middleware chains

Without proper tracing, debugging performance issues in async code becomes nearly impossible. OpenTelemetry's automatic instrumentation captures the complete execution flow, including async context switches, making it straightforward to identify bottlenecks.

## Installation and Dependencies

```bash
# Install Starlette and OpenTelemetry packages
pip install starlette uvicorn
pip install opentelemetry-api opentelemetry-sdk
pip install opentelemetry-instrumentation-starlette
pip install opentelemetry-exporter-otlp
```

The `opentelemetry-instrumentation-starlette` package provides automatic instrumentation that hooks into Starlette's ASGI lifecycle. The OTLP exporter sends traces to your observability backend.

## Basic Starlette Application with Tracing

Here's a complete example showing how to instrument a Starlette application:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.starlette import StarletteInstrumentor

from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
import uvicorn

# Configure OpenTelemetry with service identification
resource = Resource(attributes={
    SERVICE_NAME: "starlette-api-service"
})

# Set up the tracer provider with OTLP export
provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:4317",
    insecure=True
)
processor = BatchSpanProcessor(otlp_exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Create a basic route handler
async def homepage(request):
    return JSONResponse({"message": "Hello World"})

async def user_detail(request):
    user_id = request.path_params['user_id']
    # Simulate database lookup
    user_data = {"id": user_id, "name": f"User {user_id}"}
    return JSONResponse(user_data)

# Define application routes
routes = [
    Route("/", homepage),
    Route("/users/{user_id}", user_detail),
]

# Create Starlette application
app = Starlette(routes=routes)

# Apply automatic instrumentation
StarletteInstrumentor().instrument_app(app)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

When you run this application and make requests, OpenTelemetry automatically creates spans for each HTTP request with details like HTTP method, URL, status code, and execution time.

## Tracing Middleware Execution

Starlette's middleware system is powerful for cross-cutting concerns like authentication, rate limiting, and request logging. OpenTelemetry captures middleware execution as child spans:

```python
from starlette.middleware.base import BaseHTTPMiddleware
import asyncio

# Custom middleware that adds processing time
class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Get the current span to add custom attributes
        span = trace.get_current_span()
        span.set_attribute("middleware.name", "TimingMiddleware")

        start_time = asyncio.get_event_loop().time()
        response = await call_next(request)
        process_time = asyncio.get_event_loop().time() - start_time

        # Add timing as a span attribute
        span.set_attribute("middleware.process_time", process_time)
        response.headers["X-Process-Time"] = str(process_time)

        return response

# Add middleware to the application
app.add_middleware(TimingMiddleware)
```

Each middleware creates a child span under the main request span, showing you exactly where time is spent in the middleware chain.

## Custom Span Creation for Business Logic

While automatic instrumentation handles HTTP request tracing, you'll want custom spans for business logic:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

async def process_order(request):
    order_data = await request.json()

    # Create a custom span for order validation
    with tracer.start_as_current_span("validate_order") as span:
        span.set_attribute("order.id", order_data.get("id"))
        span.set_attribute("order.items_count", len(order_data.get("items", [])))

        # Validation logic here
        if not order_data.get("customer_id"):
            span.set_attribute("validation.error", "missing_customer_id")
            span.set_status(trace.Status(trace.StatusCode.ERROR))
            return JSONResponse({"error": "Customer ID required"}, status_code=400)

    # Create another span for order processing
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("payment.method", order_data.get("payment_method"))
        # Payment processing logic
        await asyncio.sleep(0.1)  # Simulate payment API call

    return JSONResponse({"status": "success", "order_id": order_data.get("id")})
```

This creates a hierarchical trace showing the request flow through validation and payment processing stages.

## Tracing Database Queries

Starlette applications often use async database libraries. Here's how to trace database operations:

```python
from databases import Database
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Instrument SQLAlchemy for database tracing
SQLAlchemyInstrumentor().instrument()

database = Database("postgresql://user:password@localhost/dbname")

async def get_products(request):
    # Database query will be automatically traced
    query = "SELECT * FROM products WHERE category = :category"
    category = request.query_params.get("category", "electronics")

    with tracer.start_as_current_span("fetch_products") as span:
        span.set_attribute("db.query.category", category)
        results = await database.fetch_all(query=query, values={"category": category})
        span.set_attribute("db.result.count", len(results))

    return JSONResponse([dict(row) for row in results])
```

The SQLAlchemy instrumentation automatically creates child spans for each database query, showing query text, parameters, and execution time.

## WebSocket Tracing

Starlette supports WebSocket connections. Tracing these requires manual span management:

```python
from starlette.websockets import WebSocket
from starlette.endpoints import WebSocketEndpoint

class ChatEndpoint(WebSocketEndpoint):
    encoding = "json"

    async def on_connect(self, websocket: WebSocket):
        await websocket.accept()

        # Create a span for the WebSocket connection
        with tracer.start_as_current_span("websocket.connect") as span:
            span.set_attribute("websocket.client", str(websocket.client))

    async def on_receive(self, websocket: WebSocket, data: dict):
        # Create a span for each message received
        with tracer.start_as_current_span("websocket.message") as span:
            span.set_attribute("message.type", data.get("type"))

            # Process message and broadcast
            response = {"echo": data}
            await websocket.send_json(response)

    async def on_disconnect(self, websocket: WebSocket, close_code: int):
        with tracer.start_as_current_span("websocket.disconnect") as span:
            span.set_attribute("websocket.close_code", close_code)

# Add WebSocket route
routes.append(Route("/ws", ChatEndpoint))
```

## Error Tracking and Exception Handling

OpenTelemetry automatically records exceptions in spans, but you can enhance error tracking:

```python
from starlette.exceptions import HTTPException

async def risky_operation(request):
    operation_id = request.path_params.get("operation_id")

    with tracer.start_as_current_span("risky_operation") as span:
        span.set_attribute("operation.id", operation_id)

        try:
            # Simulate an operation that might fail
            if operation_id == "error":
                raise ValueError("Invalid operation ID")

            result = {"status": "completed"}
            return JSONResponse(result)

        except ValueError as e:
            # Record exception in the span
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))

            # Raise HTTP exception
            raise HTTPException(status_code=400, detail=str(e))
```

## Trace Context Propagation

When your Starlette service calls other services, propagate trace context:

```python
import httpx
from opentelemetry.propagate import inject

async def call_downstream_service(request):
    with tracer.start_as_current_span("call_user_service") as span:
        headers = {}
        # Inject trace context into headers
        inject(headers)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "http://user-service/api/users/123",
                headers=headers
            )

        span.set_attribute("downstream.status_code", response.status_code)
        return JSONResponse(response.json())
```

## Trace Visualization Flow

Here's how traces flow through a Starlette application:

```mermaid
graph TD
    A[HTTP Request] --> B[Starlette Middleware Chain]
    B --> C[Authentication Middleware]
    C --> D[Timing Middleware]
    D --> E[Route Handler]
    E --> F[Custom Business Logic Span]
    F --> G[Database Query Span]
    G --> H[External API Call Span]
    H --> I[Response Generation]
    I --> J[Middleware Response Processing]
    J --> K[HTTP Response]
```

## Performance Considerations

Automatic instrumentation adds minimal overhead to Starlette applications:

- Span creation: ~10-50 microseconds per span
- Async context propagation: negligible overhead
- Batch export: non-blocking background operation

For high-throughput services, configure sampling:

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Sample 10% of traces
sampler = TraceIdRatioBased(0.1)
provider = TracerProvider(resource=resource, sampler=sampler)
```

## Production Configuration

For production deployments, use environment variables for configuration:

```python
import os

otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
service_name = os.getenv("OTEL_SERVICE_NAME", "starlette-api")

resource = Resource(attributes={
    SERVICE_NAME: service_name,
    "deployment.environment": os.getenv("ENVIRONMENT", "production"),
    "service.version": os.getenv("VERSION", "1.0.0"),
})
```

OpenTelemetry's Starlette instrumentation provides comprehensive visibility into your async Python web services. The automatic instrumentation handles the HTTP layer while custom spans let you trace business logic and external dependencies. This combination gives you complete observability for debugging performance issues and understanding system behavior in production.
