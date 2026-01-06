# How to Implement Distributed Tracing in Python Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, OpenTelemetry, Distributed Tracing, Microservices, gRPC, Celery, Context Propagation, Observability

Description: A practical guide to implementing distributed tracing across Python microservices. Learn context propagation patterns for HTTP, gRPC, and Celery, ensuring traces flow seamlessly across service boundaries.

---

> In a microservices architecture, a single user request can touch dozens of services. Without distributed tracing, debugging becomes a nightmare of correlating timestamps across logs. This guide shows you how to implement proper context propagation in Python so traces flow seamlessly across your entire system.

Distributed tracing connects the dots between services, showing you exactly how a request flows through your architecture. The key is context propagation - ensuring each service passes trace context to the next.

---

## Understanding Context Propagation

Context propagation is how trace information flows between services. When Service A calls Service B, it must pass:

- **Trace ID**: Unique identifier for the entire request flow
- **Span ID**: Identifier for the current operation
- **Trace flags**: Sampling decisions and other metadata

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Service A  │────▶│  Service B  │────▶│  Service C  │
│  Span: abc  │     │  Span: def  │     │  Span: ghi  │
│  Trace: 123 │     │  Trace: 123 │     │  Trace: 123 │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      └───────────────────┴───────────────────┘
                    Same Trace ID
```

---

## Base Setup

First, let's set up a shared OpenTelemetry configuration:

```python
# telemetry.py
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

def init_telemetry(service_name: str):
    """Initialize OpenTelemetry with OTLP exporter"""

    # Create resource with service information
    resource = Resource.create({
        "service.name": service_name,
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),
    })

    # Create tracer provider
    provider = TracerProvider(resource=resource)

    # Configure OTLP exporter
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp/v1/traces"),
        headers={"x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")}
    )

    # Add span processor
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    # Set the tracer provider
    trace.set_tracer_provider(provider)

    # Configure propagators (W3C Trace Context + B3 for compatibility)
    propagator = CompositePropagator([
        TraceContextTextMapPropagator(),
        B3MultiFormat()
    ])
    set_global_textmap(propagator)

    return trace.get_tracer(service_name)

def get_tracer(name: str):
    """Get a tracer for the given module"""
    return trace.get_tracer(name)
```

---

## HTTP Context Propagation

### Outgoing Requests with `requests`

```python
# http_client.py
import requests
from opentelemetry import trace
from opentelemetry.propagate import inject
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)

def make_traced_request(method: str, url: str, **kwargs):
    """Make an HTTP request with trace context propagation"""

    with tracer.start_as_current_span(
        f"HTTP {method} {url}",
        kind=SpanKind.CLIENT
    ) as span:
        # Set span attributes
        span.set_attribute("http.method", method)
        span.set_attribute("http.url", url)

        # Inject trace context into headers
        headers = kwargs.pop("headers", {})
        inject(headers)

        try:
            response = requests.request(method, url, headers=headers, **kwargs)

            span.set_attribute("http.status_code", response.status_code)

            if response.status_code >= 400:
                span.set_status(trace.Status(
                    trace.StatusCode.ERROR,
                    f"HTTP {response.status_code}"
                ))

            return response

        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise


class TracedHTTPClient:
    """HTTP client with automatic trace propagation"""

    def __init__(self, base_url: str, service_name: str = None):
        self.base_url = base_url.rstrip('/')
        self.service_name = service_name
        self.session = requests.Session()

    def _make_request(self, method: str, path: str, **kwargs):
        url = f"{self.base_url}{path}"

        span_name = f"{method} {self.service_name or self.base_url}{path}"

        with tracer.start_as_current_span(span_name, kind=SpanKind.CLIENT) as span:
            span.set_attribute("http.method", method)
            span.set_attribute("http.url", url)
            span.set_attribute("peer.service", self.service_name or "unknown")

            headers = kwargs.pop("headers", {})
            inject(headers)

            response = self.session.request(method, url, headers=headers, **kwargs)

            span.set_attribute("http.status_code", response.status_code)

            return response

    def get(self, path: str, **kwargs):
        return self._make_request("GET", path, **kwargs)

    def post(self, path: str, **kwargs):
        return self._make_request("POST", path, **kwargs)

    def put(self, path: str, **kwargs):
        return self._make_request("PUT", path, **kwargs)

    def delete(self, path: str, **kwargs):
        return self._make_request("DELETE", path, **kwargs)
```

### Outgoing Requests with `httpx` (Async)

```python
# async_http_client.py
import httpx
from opentelemetry import trace
from opentelemetry.propagate import inject
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)

class AsyncTracedClient:
    """Async HTTP client with trace propagation"""

    def __init__(self, base_url: str = None):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url)

    async def request(self, method: str, url: str, **kwargs):
        with tracer.start_as_current_span(
            f"HTTP {method}",
            kind=SpanKind.CLIENT
        ) as span:
            span.set_attribute("http.method", method)
            span.set_attribute("http.url", url)

            headers = kwargs.pop("headers", {})
            inject(headers)

            response = await self.client.request(method, url, headers=headers, **kwargs)

            span.set_attribute("http.status_code", response.status_code)

            return response

    async def get(self, url: str, **kwargs):
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs):
        return await self.request("POST", url, **kwargs)

    async def close(self):
        await self.client.aclose()


# Usage in FastAPI
from fastapi import FastAPI

app = FastAPI()
http_client = AsyncTracedClient()

@app.get("/api/aggregate")
async def aggregate_data():
    with tracer.start_as_current_span("aggregate_data"):
        # These calls will have trace context propagated
        users = await http_client.get("http://user-service/api/users")
        orders = await http_client.get("http://order-service/api/orders")

        return {
            "users": users.json(),
            "orders": orders.json()
        }
```

### Incoming Requests - Flask

```python
# flask_server.py
from flask import Flask, request, g
from opentelemetry import trace
from opentelemetry.propagate import extract
from opentelemetry.trace import SpanKind
from functools import wraps

tracer = trace.get_tracer(__name__)

def trace_request():
    """Decorator to trace incoming requests with context extraction"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Extract trace context from incoming headers
            context = extract(request.headers)

            with tracer.start_as_current_span(
                f"{request.method} {request.path}",
                context=context,
                kind=SpanKind.SERVER
            ) as span:
                span.set_attribute("http.method", request.method)
                span.set_attribute("http.url", request.url)
                span.set_attribute("http.route", request.path)

                try:
                    result = f(*args, **kwargs)
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                    raise

        return wrapper
    return decorator


app = Flask(__name__)

@app.route("/api/users/<user_id>")
@trace_request()
def get_user(user_id):
    with tracer.start_as_current_span("fetch_user_from_db") as span:
        span.set_attribute("user.id", user_id)
        user = fetch_user(user_id)
        return {"user": user}
```

### Incoming Requests - FastAPI

```python
# fastapi_server.py
from fastapi import FastAPI, Request
from opentelemetry import trace
from opentelemetry.propagate import extract
from opentelemetry.trace import SpanKind
from starlette.middleware.base import BaseHTTPMiddleware

tracer = trace.get_tracer(__name__)

class TraceContextMiddleware(BaseHTTPMiddleware):
    """Middleware to extract and continue traces from incoming requests"""

    async def dispatch(self, request: Request, call_next):
        # Extract context from incoming headers
        context = extract(dict(request.headers))

        with tracer.start_as_current_span(
            f"{request.method} {request.url.path}",
            context=context,
            kind=SpanKind.SERVER
        ) as span:
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", str(request.url))
            span.set_attribute("http.route", request.url.path)

            # Add request ID if present
            request_id = request.headers.get("X-Request-ID")
            if request_id:
                span.set_attribute("request.id", request_id)

            response = await call_next(request)

            span.set_attribute("http.status_code", response.status_code)

            return response


app = FastAPI()
app.add_middleware(TraceContextMiddleware)

@app.get("/api/process")
async def process_request():
    # This is already within a traced context from middleware
    with tracer.start_as_current_span("business_logic"):
        result = await do_processing()
        return result
```

---

## gRPC Context Propagation

### gRPC Server

```python
# grpc_server.py
import grpc
from concurrent import futures
from opentelemetry import trace
from opentelemetry.propagate import extract
from opentelemetry.trace import SpanKind

# Import your generated protobuf files
import user_pb2
import user_pb2_grpc

tracer = trace.get_tracer(__name__)

def extract_context_from_metadata(context):
    """Extract trace context from gRPC metadata"""
    metadata = dict(context.invocation_metadata())
    return extract(metadata)

class TracedUserServicer(user_pb2_grpc.UserServiceServicer):
    """gRPC servicer with trace context extraction"""

    def GetUser(self, request, context):
        # Extract trace context from gRPC metadata
        parent_context = extract_context_from_metadata(context)

        with tracer.start_as_current_span(
            "grpc.user.GetUser",
            context=parent_context,
            kind=SpanKind.SERVER
        ) as span:
            span.set_attribute("rpc.system", "grpc")
            span.set_attribute("rpc.service", "UserService")
            span.set_attribute("rpc.method", "GetUser")
            span.set_attribute("user.id", request.user_id)

            try:
                user = self._fetch_user(request.user_id)

                return user_pb2.UserResponse(
                    user_id=user["id"],
                    name=user["name"],
                    email=user["email"]
                )
            except Exception as e:
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                context.set_code(grpc.StatusCode.INTERNAL)
                context.set_details(str(e))
                raise

    def _fetch_user(self, user_id: str):
        with tracer.start_as_current_span("db.fetch_user") as span:
            span.set_attribute("db.operation", "SELECT")
            span.set_attribute("db.table", "users")
            # Simulate database fetch
            return {"id": user_id, "name": "John Doe", "email": "john@example.com"}


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_pb2_grpc.add_UserServiceServicer_to_server(
        TracedUserServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    from telemetry import init_telemetry
    init_telemetry("user-service")
    serve()
```

### gRPC Client

```python
# grpc_client.py
import grpc
from opentelemetry import trace
from opentelemetry.propagate import inject
from opentelemetry.trace import SpanKind

# Import your generated protobuf files
import user_pb2
import user_pb2_grpc

tracer = trace.get_tracer(__name__)

class TracedUserClient:
    """gRPC client with trace context injection"""

    def __init__(self, host: str = "localhost:50051"):
        self.channel = grpc.insecure_channel(host)
        self.stub = user_pb2_grpc.UserServiceStub(self.channel)

    def get_user(self, user_id: str):
        with tracer.start_as_current_span(
            "grpc.user.GetUser",
            kind=SpanKind.CLIENT
        ) as span:
            span.set_attribute("rpc.system", "grpc")
            span.set_attribute("rpc.service", "UserService")
            span.set_attribute("rpc.method", "GetUser")
            span.set_attribute("user.id", user_id)

            # Inject trace context into metadata
            metadata = []
            carrier = {}
            inject(carrier)

            for key, value in carrier.items():
                metadata.append((key, value))

            try:
                response = self.stub.GetUser(
                    user_pb2.GetUserRequest(user_id=user_id),
                    metadata=metadata
                )

                span.set_attribute("rpc.status_code", "OK")

                return {
                    "id": response.user_id,
                    "name": response.name,
                    "email": response.email
                }

            except grpc.RpcError as e:
                span.record_exception(e)
                span.set_attribute("rpc.status_code", e.code().name)
                span.set_status(trace.Status(
                    trace.StatusCode.ERROR,
                    e.details()
                ))
                raise


# Usage
client = TracedUserClient("user-service:50051")
user = client.get_user("user-123")
```

---

## Celery Context Propagation

Celery tasks are a common source of broken traces. Here's how to propagate context properly:

### Celery Configuration

```python
# celery_app.py
from celery import Celery
from opentelemetry import trace
from opentelemetry.propagate import inject, extract
from opentelemetry.trace import SpanKind
from functools import wraps
import json

from telemetry import init_telemetry

# Initialize telemetry
tracer = init_telemetry("celery-worker")

app = Celery('tasks')
app.config_from_object('celeryconfig')


def traced_task(name: str = None):
    """Decorator to create traced Celery tasks with context propagation"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract trace context from task headers
            headers = wrapper.request.headers or {}
            trace_context = headers.get('trace_context', {})

            if isinstance(trace_context, str):
                trace_context = json.loads(trace_context)

            parent_context = extract(trace_context) if trace_context else None

            task_name = name or func.__name__

            with tracer.start_as_current_span(
                f"celery.task.{task_name}",
                context=parent_context,
                kind=SpanKind.CONSUMER
            ) as span:
                span.set_attribute("celery.task_name", task_name)
                span.set_attribute("celery.task_id", wrapper.request.id)
                span.set_attribute("celery.queue", wrapper.request.delivery_info.get('routing_key', 'unknown'))

                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("celery.status", "SUCCESS")
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                    span.set_attribute("celery.status", "FAILURE")
                    raise

        # Preserve the request attribute for Celery
        wrapper.bind = func
        return wrapper
    return decorator


class TracedTask:
    """Base class for traced Celery tasks"""

    @staticmethod
    def send_task_with_context(app, task_name: str, args=None, kwargs=None, **options):
        """Send a task with trace context propagated"""

        with tracer.start_as_current_span(
            f"celery.send.{task_name}",
            kind=SpanKind.PRODUCER
        ) as span:
            span.set_attribute("celery.task_name", task_name)

            # Inject current trace context
            carrier = {}
            inject(carrier)

            # Add trace context to task headers
            headers = options.get('headers', {})
            headers['trace_context'] = json.dumps(carrier)
            options['headers'] = headers

            result = app.send_task(task_name, args=args, kwargs=kwargs, **options)

            span.set_attribute("celery.task_id", result.id)

            return result
```

### Celery Tasks with Tracing

```python
# tasks.py
from celery_app import app, tracer, traced_task, TracedTask
from opentelemetry import trace
import time

@app.task(bind=True)
@traced_task("process_order")
def process_order(self, order_id: str, items: list):
    """Process an order with traced sub-operations"""

    with tracer.start_as_current_span("validate_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.items_count", len(items))
        validate_items(items)

    with tracer.start_as_current_span("reserve_inventory"):
        for item in items:
            reserve_item(item)

    with tracer.start_as_current_span("process_payment"):
        charge_customer(order_id)

    return {"status": "completed", "order_id": order_id}


@app.task(bind=True)
@traced_task("send_notification")
def send_notification(self, user_id: str, message: str, channel: str = "email"):
    """Send a notification with tracing"""

    with tracer.start_as_current_span("prepare_notification") as span:
        span.set_attribute("notification.channel", channel)
        span.set_attribute("user.id", user_id)

        notification = prepare_message(user_id, message, channel)

    with tracer.start_as_current_span("deliver_notification"):
        deliver(notification)

    return {"delivered": True}


@app.task(bind=True)
@traced_task("generate_report")
def generate_report(self, report_type: str, params: dict):
    """Generate a report - may trigger additional tasks"""

    with tracer.start_as_current_span("fetch_data") as span:
        span.set_attribute("report.type", report_type)
        data = fetch_report_data(report_type, params)

    with tracer.start_as_current_span("render_report"):
        report = render_report(data)

    # Trigger notification task with trace context
    TracedTask.send_task_with_context(
        app,
        'tasks.send_notification',
        args=[params.get('user_id'), f"Report {report_type} ready"],
        kwargs={'channel': 'email'}
    )

    return report


# Helper functions
def validate_items(items):
    time.sleep(0.1)

def reserve_item(item):
    time.sleep(0.05)

def charge_customer(order_id):
    time.sleep(0.2)

def prepare_message(user_id, message, channel):
    return {"user": user_id, "message": message, "channel": channel}

def deliver(notification):
    time.sleep(0.1)

def fetch_report_data(report_type, params):
    time.sleep(0.3)
    return {"data": []}

def render_report(data):
    time.sleep(0.2)
    return {"report": "content"}
```

### Calling Celery Tasks from HTTP Handler

```python
# api.py
from flask import Flask, request, jsonify
from celery_app import TracedTask, app as celery_app, tracer

flask_app = Flask(__name__)

@flask_app.route("/api/orders", methods=["POST"])
def create_order():
    with tracer.start_as_current_span("create_order") as span:
        order_data = request.json
        order_id = generate_order_id()

        span.set_attribute("order.id", order_id)

        # Save order to database
        with tracer.start_as_current_span("save_order"):
            save_order(order_id, order_data)

        # Queue async processing with trace context
        task = TracedTask.send_task_with_context(
            celery_app,
            'tasks.process_order',
            args=[order_id, order_data.get('items', [])]
        )

        span.set_attribute("celery.task_id", task.id)

        return jsonify({
            "order_id": order_id,
            "task_id": task.id,
            "status": "processing"
        }), 202
```

---

## Message Queue Context Propagation (Redis/RabbitMQ)

### Redis Pub/Sub

```python
# redis_pubsub.py
import redis
import json
from opentelemetry import trace
from opentelemetry.propagate import inject, extract
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)

class TracedRedisPublisher:
    """Redis publisher with trace context injection"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def publish(self, channel: str, message: dict):
        with tracer.start_as_current_span(
            f"redis.publish.{channel}",
            kind=SpanKind.PRODUCER
        ) as span:
            span.set_attribute("messaging.system", "redis")
            span.set_attribute("messaging.destination", channel)
            span.set_attribute("messaging.operation", "publish")

            # Inject trace context into message
            carrier = {}
            inject(carrier)

            envelope = {
                "trace_context": carrier,
                "payload": message
            }

            self.redis.publish(channel, json.dumps(envelope))


class TracedRedisSubscriber:
    """Redis subscriber with trace context extraction"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()

    def subscribe(self, channel: str, handler):
        self.pubsub.subscribe(channel)

        for message in self.pubsub.listen():
            if message['type'] == 'message':
                self._process_message(channel, message['data'], handler)

    def _process_message(self, channel: str, data: bytes, handler):
        envelope = json.loads(data)
        trace_context = envelope.get('trace_context', {})
        payload = envelope.get('payload', envelope)

        # Extract and continue trace
        parent_context = extract(trace_context) if trace_context else None

        with tracer.start_as_current_span(
            f"redis.consume.{channel}",
            context=parent_context,
            kind=SpanKind.CONSUMER
        ) as span:
            span.set_attribute("messaging.system", "redis")
            span.set_attribute("messaging.destination", channel)
            span.set_attribute("messaging.operation", "consume")

            try:
                handler(payload)
            except Exception as e:
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                raise
```

### RabbitMQ with Pika

```python
# rabbitmq_client.py
import pika
import json
from opentelemetry import trace
from opentelemetry.propagate import inject, extract
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)

class TracedRabbitMQProducer:
    """RabbitMQ producer with trace context injection"""

    def __init__(self, connection_params):
        self.connection = pika.BlockingConnection(connection_params)
        self.channel = self.connection.channel()

    def publish(self, exchange: str, routing_key: str, message: dict):
        with tracer.start_as_current_span(
            f"rabbitmq.publish.{exchange}",
            kind=SpanKind.PRODUCER
        ) as span:
            span.set_attribute("messaging.system", "rabbitmq")
            span.set_attribute("messaging.destination", exchange)
            span.set_attribute("messaging.routing_key", routing_key)

            # Inject trace context into message headers
            headers = {}
            inject(headers)

            properties = pika.BasicProperties(
                headers=headers,
                content_type='application/json'
            )

            self.channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=json.dumps(message),
                properties=properties
            )


class TracedRabbitMQConsumer:
    """RabbitMQ consumer with trace context extraction"""

    def __init__(self, connection_params):
        self.connection = pika.BlockingConnection(connection_params)
        self.channel = self.connection.channel()

    def consume(self, queue: str, handler):
        def callback(ch, method, properties, body):
            # Extract trace context from headers
            headers = properties.headers or {}
            parent_context = extract(headers) if headers else None

            with tracer.start_as_current_span(
                f"rabbitmq.consume.{queue}",
                context=parent_context,
                kind=SpanKind.CONSUMER
            ) as span:
                span.set_attribute("messaging.system", "rabbitmq")
                span.set_attribute("messaging.destination", queue)
                span.set_attribute("messaging.message_id", properties.message_id or "unknown")

                try:
                    message = json.loads(body)
                    handler(message)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

        self.channel.basic_consume(queue=queue, on_message_callback=callback)
        self.channel.start_consuming()
```

---

## Complete Microservices Example

Here's a complete example with three services that communicate via HTTP and Celery:

### API Gateway Service

```python
# gateway/app.py
from fastapi import FastAPI, Request
from opentelemetry import trace
from opentelemetry.propagate import extract, inject
import httpx

from telemetry import init_telemetry, TraceContextMiddleware

tracer = init_telemetry("api-gateway")

app = FastAPI()
app.add_middleware(TraceContextMiddleware)

# Service clients
user_service = "http://user-service:8001"
order_service = "http://order-service:8002"

@app.post("/api/orders")
async def create_order(request: Request):
    data = await request.json()
    user_id = data.get("user_id")

    with tracer.start_as_current_span("gateway.create_order") as span:
        span.set_attribute("user.id", user_id)

        # Validate user exists
        async with httpx.AsyncClient() as client:
            headers = {}
            inject(headers)

            user_response = await client.get(
                f"{user_service}/api/users/{user_id}",
                headers=headers
            )

            if user_response.status_code != 200:
                return {"error": "User not found"}, 404

        # Create order
        async with httpx.AsyncClient() as client:
            headers = {"Content-Type": "application/json"}
            inject(headers)

            order_response = await client.post(
                f"{order_service}/api/orders",
                json=data,
                headers=headers
            )

            return order_response.json()
```

### User Service

```python
# user-service/app.py
from fastapi import FastAPI
from opentelemetry import trace

from telemetry import init_telemetry, TraceContextMiddleware

tracer = init_telemetry("user-service")

app = FastAPI()
app.add_middleware(TraceContextMiddleware)

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)

        # Simulate database query
        with tracer.start_as_current_span("db.query"):
            user = fetch_user_from_db(user_id)

        return user
```

### Order Service

```python
# order-service/app.py
from fastapi import FastAPI
from opentelemetry import trace

from telemetry import init_telemetry, TraceContextMiddleware
from celery_app import TracedTask, celery_app

tracer = init_telemetry("order-service")

app = FastAPI()
app.add_middleware(TraceContextMiddleware)

@app.post("/api/orders")
async def create_order(order: dict):
    with tracer.start_as_current_span("create_order") as span:
        order_id = generate_order_id()
        span.set_attribute("order.id", order_id)

        # Save to database
        with tracer.start_as_current_span("db.insert"):
            save_order(order_id, order)

        # Queue async processing
        TracedTask.send_task_with_context(
            celery_app,
            'tasks.process_order',
            args=[order_id, order.get('items', [])]
        )

        return {"order_id": order_id, "status": "processing"}
```

---

## Best Practices

### 1. Always Propagate Context

```python
# Every outgoing call should inject context
headers = {}
inject(headers)
response = requests.get(url, headers=headers)
```

### 2. Use Semantic Conventions

```python
span.set_attribute("http.method", "POST")
span.set_attribute("http.url", url)
span.set_attribute("rpc.system", "grpc")
span.set_attribute("messaging.system", "rabbitmq")
```

### 3. Handle Missing Context Gracefully

```python
parent_context = extract(headers) if headers else None
with tracer.start_as_current_span("operation", context=parent_context):
    # Works whether there's a parent context or not
    pass
```

### 4. Add Business Context to Spans

```python
span.set_attribute("order.id", order_id)
span.set_attribute("user.id", user_id)
span.set_attribute("payment.amount", amount)
```

---

## Conclusion

Distributed tracing across Python microservices requires consistent context propagation. Key takeaways:

- **HTTP**: Use `inject()` for outgoing requests, `extract()` for incoming
- **gRPC**: Propagate via metadata headers
- **Celery**: Pass trace context in task headers
- **Message Queues**: Include trace context in message headers/properties

With proper context propagation, you get end-to-end visibility into requests as they flow through your entire system.

---

*Need to visualize traces across your microservices? [OneUptime](https://oneuptime.com) provides distributed tracing with automatic service maps, latency analysis, and correlation with logs and metrics.*

**Related Reading:**
- [What are Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [Mastering APM: Tracing User Journeys in Distributed Systems](https://oneuptime.com/blog/post/2025-10-01-mastering-apm-tracing-user-journeys-in-distributed-systems/view)
