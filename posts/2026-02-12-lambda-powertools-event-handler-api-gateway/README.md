# How to Use Lambda Powertools Event Handler for API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, API Gateway, Powertools, Serverless

Description: Learn how to build clean API routes in Lambda using Powertools Event Handler with path parameters, request validation, middleware, CORS, and error handling.

---

Building API endpoints with raw Lambda handlers means parsing event dictionaries, manually extracting path parameters, building response objects, and handling CORS headers yourself. It's tedious and error-prone. Lambda Powertools Event Handler gives you a Flask-like routing experience for API Gateway, letting you define clean route handlers without all the boilerplate.

Whether you're using REST API, HTTP API, or ALB, Event Handler has you covered. Let's build a proper API.

## Basic Routing

The Event Handler gives you decorators for each HTTP method, just like Flask or FastAPI.

```python
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger(service="order-api")
tracer = Tracer(service="order-api")
app = APIGatewayRestResolver()

@app.get("/orders")
def list_orders():
    """GET /orders - List all orders."""
    # Access query parameters
    status = app.current_event.get_query_string_value(
        name="status", default_value="all"
    )
    limit = int(app.current_event.get_query_string_value(
        name="limit", default_value="50"
    ))

    logger.info("Listing orders", extra={"status": status, "limit": limit})
    orders = fetch_orders(status=status, limit=limit)

    return {"orders": orders, "count": len(orders)}


@app.get("/orders/<order_id>")
def get_order(order_id: str):
    """GET /orders/{order_id} - Get a specific order."""
    logger.info("Getting order", extra={"order_id": order_id})

    order = fetch_order(order_id)
    if not order:
        return Response(
            status_code=404,
            content_type="application/json",
            body=json.dumps({"error": "Order not found"})
        )

    return order


@app.post("/orders")
def create_order():
    """POST /orders - Create a new order."""
    body = app.current_event.json_body
    logger.info("Creating order", extra={"customer_id": body.get("customer_id")})

    # Validate required fields
    if not body.get("customer_id") or not body.get("items"):
        return Response(
            status_code=400,
            content_type="application/json",
            body=json.dumps({"error": "customer_id and items are required"})
        )

    order = save_order(body)
    return {"order_id": order["id"], "status": "created"}, 201


@app.put("/orders/<order_id>")
def update_order(order_id: str):
    """PUT /orders/{order_id} - Update an order."""
    body = app.current_event.json_body
    updated = update_order_in_db(order_id, body)
    return updated


@app.delete("/orders/<order_id>")
def delete_order(order_id: str):
    """DELETE /orders/{order_id} - Cancel an order."""
    cancel_order(order_id)
    return {"message": f"Order {order_id} cancelled"}, 204


# Lambda handler
@logger.inject_lambda_context
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
```

## CORS Configuration

CORS is a common pain point with API Gateway. Event Handler handles it declaratively.

```python
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
    CORSConfig
)

# Configure CORS
cors_config = CORSConfig(
    allow_origin="https://myapp.example.com",
    allow_headers=["Content-Type", "Authorization", "X-Request-Id"],
    expose_headers=["X-Request-Id"],
    max_age=3600,
    allow_credentials=True
)

app = APIGatewayRestResolver(cors=cors_config)

@app.get("/orders")
def list_orders():
    # CORS headers are automatically added to the response
    return {"orders": []}

@app.post("/orders")
def create_order():
    # CORS headers are added here too
    return {"order_id": "new-order"}, 201

# The preflight OPTIONS request is handled automatically
```

For multiple origins, you can use a custom origin resolver.

```python
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
    CORSConfig
)

ALLOWED_ORIGINS = [
    "https://app.example.com",
    "https://admin.example.com",
    "http://localhost:3000"  # Development
]

cors_config = CORSConfig(
    allow_origin=ALLOWED_ORIGINS[0],  # Default origin
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600
)

app = APIGatewayRestResolver(cors=cors_config)

@app.get("/orders")
def list_orders():
    # Dynamically set the origin based on the request
    origin = app.current_event.get_header_value("origin", default_value="")
    if origin in ALLOWED_ORIGINS:
        app.append_context({"_cors_origin": origin})
    return {"orders": []}
```

## Error Handling

Event Handler provides structured exception handling that maps to proper HTTP responses.

```python
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    NotFoundError,
    InternalServerError,
    UnauthorizedError,
    ForbiddenError,
    ServiceError
)
from aws_lambda_powertools import Logger

logger = Logger()
app = APIGatewayRestResolver()

# Custom exception handler
@app.exception_handler(ValueError)
def handle_value_error(ex: ValueError):
    logger.warning("Validation error", extra={"error": str(ex)})
    return Response(
        status_code=400,
        content_type="application/json",
        body=json.dumps({"error": str(ex)})
    )

@app.exception_handler(PermissionError)
def handle_permission_error(ex: PermissionError):
    logger.warning("Permission denied", extra={"error": str(ex)})
    return Response(
        status_code=403,
        content_type="application/json",
        body=json.dumps({"error": "Permission denied"})
    )

@app.get("/orders/<order_id>")
def get_order(order_id: str):
    order = fetch_order(order_id)
    if not order:
        # This returns a 404 response automatically
        raise NotFoundError(f"Order {order_id} not found")

    return order

@app.post("/orders")
def create_order():
    body = app.current_event.json_body

    # Validation
    if not body.get("items"):
        raise BadRequestError("At least one item is required")

    if not is_authenticated():
        raise UnauthorizedError("Authentication required")

    if not has_permission("create_order"):
        raise ForbiddenError("Insufficient permissions")

    try:
        order = save_order(body)
        return order, 201
    except Exception as e:
        logger.exception("Failed to create order")
        raise InternalServerError("Failed to create order")
```

## Middleware

Add cross-cutting concerns using middleware.

```python
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.event_handler.middlewares import BaseMiddlewareHandler, NextMiddleware
from aws_lambda_powertools import Logger, Metrics
from aws_lambda_powertools.metrics import MetricUnit
import time

logger = Logger()
metrics = Metrics(namespace="OrderAPI")

class TimingMiddleware(BaseMiddlewareHandler):
    """Measure and log request processing time."""

    def handler(self, app: APIGatewayRestResolver, next_middleware: NextMiddleware):
        start_time = time.time()

        response = next_middleware(app)

        duration_ms = (time.time() - start_time) * 1000
        logger.info("Request completed", extra={
            "duration_ms": round(duration_ms, 2),
            "path": app.current_event.path,
            "method": app.current_event.http_method,
            "status_code": response.get("statusCode", 200)
        })

        metrics.add_metric(name="RequestDuration", unit=MetricUnit.Milliseconds, value=duration_ms)

        return response


class AuthMiddleware(BaseMiddlewareHandler):
    """Verify authentication for protected routes."""

    def handler(self, app: APIGatewayRestResolver, next_middleware: NextMiddleware):
        # Skip auth for public endpoints
        public_paths = ["/health", "/status"]
        if app.current_event.path in public_paths:
            return next_middleware(app)

        # Check for authorization header
        auth_header = app.current_event.get_header_value("Authorization")
        if not auth_header:
            return Response(
                status_code=401,
                content_type="application/json",
                body=json.dumps({"error": "Authorization header required"})
            )

        # Verify the token
        try:
            user = verify_token(auth_header)
            app.append_context({"user": user})
        except Exception:
            return Response(
                status_code=401,
                content_type="application/json",
                body=json.dumps({"error": "Invalid token"})
            )

        return next_middleware(app)


app = APIGatewayRestResolver()

# Apply middleware globally
app.use(middlewares=[TimingMiddleware(), AuthMiddleware()])

@app.get("/orders")
def list_orders():
    # Access user from middleware
    user = app.context.get("user")
    return {"orders": fetch_orders_for_user(user["id"])}
```

## HTTP API vs REST API

Event Handler supports both API Gateway types. Use the appropriate resolver.

```python
# For REST API (API Gateway v1)
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
app = APIGatewayRestResolver()

# For HTTP API (API Gateway v2)
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
app = APIGatewayHttpResolver()

# For Application Load Balancer
from aws_lambda_powertools.event_handler import ALBResolver
app = ALBResolver()

# The route definitions are the same regardless of which resolver you use
@app.get("/orders")
def list_orders():
    return {"orders": []}
```

## Response Compression

Enable response compression to reduce payload sizes and Lambda costs.

```python
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, Response

app = APIGatewayRestResolver()

@app.get("/orders")
def list_orders():
    orders = fetch_all_orders()  # Might be a large response

    # Check if client accepts gzip
    accept_encoding = app.current_event.get_header_value(
        "Accept-Encoding", default_value=""
    )

    if "gzip" in accept_encoding:
        import gzip
        import json

        body = json.dumps({"orders": orders}).encode()
        compressed = gzip.compress(body)

        return Response(
            status_code=200,
            content_type="application/json",
            body=base64.b64encode(compressed).decode(),
            headers={"Content-Encoding": "gzip"}
        )

    return {"orders": orders}
```

## Testing Your API

Event Handler makes testing straightforward by letting you pass mock events.

```python
import pytest
import json
from app import app, handler

def build_api_gateway_event(method, path, body=None, headers=None):
    """Helper to build API Gateway test events."""
    return {
        "httpMethod": method,
        "path": path,
        "headers": headers or {"Content-Type": "application/json"},
        "queryStringParameters": {},
        "pathParameters": {},
        "body": json.dumps(body) if body else None,
        "requestContext": {
            "stage": "test",
            "requestId": "test-request-id"
        }
    }

def test_list_orders():
    event = build_api_gateway_event("GET", "/orders")
    result = handler(event, {})

    assert result["statusCode"] == 200
    body = json.loads(result["body"])
    assert "orders" in body

def test_create_order():
    event = build_api_gateway_event("POST", "/orders", body={
        "customer_id": "cust-123",
        "items": [{"product_id": "PROD001", "quantity": 2}]
    })
    result = handler(event, {})

    assert result["statusCode"] == 201

def test_create_order_missing_items():
    event = build_api_gateway_event("POST", "/orders", body={
        "customer_id": "cust-123"
    })
    result = handler(event, {})

    assert result["statusCode"] == 400
```

## Summary

Lambda Powertools Event Handler transforms your Lambda function from a raw event processor into a proper API framework. You get clean routing, automatic CORS handling, structured error responses, middleware support, and testability - all without the overhead of a full web framework.

For the complete serverless API picture, combine Event Handler with [structured logging](https://oneuptime.com/blog/post/2026-02-12-lambda-powertools-logger-structured-logging/view), [tracing](https://oneuptime.com/blog/post/2026-02-12-lambda-powertools-tracer-xray-integration/view), and [idempotency](https://oneuptime.com/blog/post/2026-02-12-lambda-powertools-idempotency/view) for production-grade APIs.
