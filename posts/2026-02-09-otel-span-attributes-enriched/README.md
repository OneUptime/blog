# How to implement OpenTelemetry span attributes for enriched tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Attributes, Tracing, Observability, Metadata

Description: Learn how to add custom span attributes to OpenTelemetry traces for enriched observability context, including business metrics, user information, and technical metadata.

---

Span attributes provide detailed context about operations in your distributed system. While auto-instrumentation captures basic information, custom attributes add business logic, user context, and application-specific metadata that makes traces more valuable for troubleshooting and analysis.

## Understanding Span Attributes

Span attributes are key-value pairs attached to spans that describe the operation being traced. They include HTTP status codes, database queries, error messages, and custom business data. Attributes make spans searchable and filterable in observability backends.

OpenTelemetry defines semantic conventions for common attributes like `http.method`, `db.system`, and `error.type`. Following these conventions ensures consistency across systems and enables better tooling support.

## Adding Basic Custom Attributes

Add custom attributes to spans using the span API. This works with both manually created spans and spans from auto-instrumentation.

```python
# basic_attributes.py
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer(__name__)

def process_order(order_id, user_id, items):
    """Process order with detailed span attributes"""
    with tracer.start_as_current_span("process_order") as span:
        # Add business context attributes
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.user_id", user_id)
        span.set_attribute("order.item_count", len(items))
        span.set_attribute("order.total_value", calculate_total(items))

        try:
            # Process order
            result = validate_and_save_order(order_id, items)

            # Add result attributes
            span.set_attribute("order.status", "confirmed")
            span.set_attribute("order.confirmation_number", result['confirmation'])

            return result

        except InsufficientInventoryError as e:
            # Add error context
            span.set_attribute("error.type", "inventory_shortage")
            span.set_attribute("error.product_id", e.product_id)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise

        except PaymentFailedError as e:
            # Add payment error context
            span.set_attribute("error.type", "payment_failed")
            span.set_attribute("error.payment_method", e.payment_method)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise

def calculate_total(items):
    return sum(item['price'] * item['quantity'] for item in items)

def validate_and_save_order(order_id, items):
    return {'confirmation': 'ORD-12345'}

class InsufficientInventoryError(Exception):
    def __init__(self, product_id):
        self.product_id = product_id
        super().__init__(f"Insufficient inventory for product {product_id}")

class PaymentFailedError(Exception):
    def __init__(self, payment_method):
        self.payment_method = payment_method
        super().__init__(f"Payment failed with method {payment_method}")
```

These attributes provide context that helps identify patterns in failed orders or performance issues.

## HTTP Request Attributes

Enrich HTTP request spans with additional context beyond what auto-instrumentation captures.

```python
# http_attributes.py
from flask import Flask, request, g
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
import time

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

@app.before_request
def before_request():
    """Add request start time for custom latency tracking"""
    g.start_time = time.time()

@app.after_request
def after_request(response):
    """Add custom attributes to HTTP spans"""
    span = trace.get_current_span()

    if span and span.is_recording():
        # Add custom HTTP attributes
        span.set_attribute("http.request.size", request.content_length or 0)
        span.set_attribute("http.response.size", len(response.data))

        # Add user context if available
        if hasattr(g, 'user_id'):
            span.set_attribute("enduser.id", g.user_id)
            span.set_attribute("enduser.role", g.user_role)

        # Add custom latency breakdown
        if hasattr(g, 'start_time'):
            total_time = time.time() - g.start_time
            span.set_attribute("app.request.duration_ms", total_time * 1000)

        # Add feature flags
        if hasattr(g, 'feature_flags'):
            for flag, enabled in g.feature_flags.items():
                span.set_attribute(f"feature.{flag}", enabled)

        # Add API version
        api_version = request.headers.get('X-API-Version', 'v1')
        span.set_attribute("api.version", api_version)

    return response

@app.route('/api/products/<product_id>')
def get_product(product_id):
    """Endpoint with custom attributes"""
    span = trace.get_current_span()

    # Add route-specific attributes
    span.set_attribute("product.id", product_id)
    span.set_attribute("product.category", "electronics")

    # Simulate user authentication
    g.user_id = request.headers.get('X-User-ID', 'anonymous')
    g.user_role = request.headers.get('X-User-Role', 'guest')

    # Simulate feature flags
    g.feature_flags = {
        'new_pricing': True,
        'recommendations': False
    }

    return {'id': product_id, 'name': 'Sample Product'}
```

These enriched attributes help filter traces by user, API version, or feature flag state.

## Database Query Attributes

Add detailed attributes to database operations for better query analysis.

```python
# database_attributes.py
from opentelemetry import trace
import psycopg2
from contextlib import contextmanager

tracer = trace.get_tracer(__name__)

@contextmanager
def traced_db_query(operation, table_name):
    """Context manager for traced database queries"""
    with tracer.start_as_current_span(f"db.{operation}") as span:
        # Set semantic convention attributes
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.operation", operation)
        span.set_attribute("db.sql.table", table_name)

        start_time = time.time()
        try:
            yield span
            # Add success metrics
            duration = time.time() - start_time
            span.set_attribute("db.query.duration_ms", duration * 1000)
        except Exception as e:
            # Add error context
            span.set_attribute("db.error.type", type(e).__name__)
            span.set_attribute("db.error.message", str(e))
            raise

def get_user_orders(user_id, limit=10):
    """Fetch user orders with traced query"""
    with traced_db_query("SELECT", "orders") as span:
        # Add query-specific attributes
        span.set_attribute("db.user_id", user_id)
        span.set_attribute("db.query.limit", limit)

        # Execute query
        conn = psycopg2.connect("dbname=mydb user=user")
        cur = conn.cursor()

        query = "SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC LIMIT %s"
        cur.execute(query, (user_id, limit))

        results = cur.fetchall()

        # Add result metrics
        span.set_attribute("db.query.rows_returned", len(results))

        cur.close()
        conn.close()

        return results

def update_order_status(order_id, new_status):
    """Update order with traced operation"""
    with traced_db_query("UPDATE", "orders") as span:
        # Add update context
        span.set_attribute("db.order_id", order_id)
        span.set_attribute("db.update.field", "status")
        span.set_attribute("db.update.new_value", new_status)

        conn = psycopg2.connect("dbname=mydb user=user")
        cur = conn.cursor()

        query = "UPDATE orders SET status = %s WHERE id = %s"
        cur.execute(query, (new_status, order_id))

        # Add affected rows
        span.set_attribute("db.query.rows_affected", cur.rowcount)

        conn.commit()
        cur.close()
        conn.close()
```

Query-level attributes enable analysis of slow queries and database performance patterns.

## Business Metrics as Attributes

Track business metrics alongside technical telemetry for better correlation.

```python
# business_metrics.py
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_checkout(cart, payment_info):
    """Checkout process with business metrics"""
    with tracer.start_as_current_span("checkout.process") as span:
        # Add cart metrics
        span.set_attribute("cart.item_count", len(cart.items))
        span.set_attribute("cart.total_value", cart.total)
        span.set_attribute("cart.currency", "USD")

        # Add discount information
        if cart.discount_code:
            span.set_attribute("cart.discount_code", cart.discount_code)
            span.set_attribute("cart.discount_amount", cart.discount_amount)

        # Add payment method
        span.set_attribute("payment.method", payment_info.method)
        span.set_attribute("payment.provider", payment_info.provider)

        # Process payment
        with tracer.start_as_current_span("payment.authorize") as payment_span:
            payment_span.set_attribute("payment.amount", cart.total)
            payment_result = authorize_payment(payment_info, cart.total)

            # Add payment result metrics
            payment_span.set_attribute("payment.success", payment_result.success)
            payment_span.set_attribute("payment.transaction_id", payment_result.transaction_id)

            if not payment_result.success:
                payment_span.set_attribute("payment.decline_reason", payment_result.reason)

        # Add customer segmentation
        span.set_attribute("customer.segment", determine_segment(cart.customer))
        span.set_attribute("customer.lifetime_value", cart.customer.lifetime_value)
        span.set_attribute("customer.order_count", cart.customer.order_count)

        return payment_result

def determine_segment(customer):
    """Determine customer segment"""
    if customer.lifetime_value > 10000:
        return "premium"
    elif customer.order_count > 10:
        return "regular"
    else:
        return "new"
```

Business metrics in spans enable correlation between technical performance and business outcomes.

## Array and Object Attributes

Store complex data structures as span attributes using arrays or JSON strings.

```python
# complex_attributes.py
from opentelemetry import trace
import json

tracer = trace.get_tracer(__name__)

def process_batch_operation(items):
    """Process batch with array attributes"""
    with tracer.start_as_current_span("batch.process") as span:
        # Add array attributes for item IDs
        item_ids = [item['id'] for item in items]
        span.set_attribute("batch.item_ids", json.dumps(item_ids))

        # Add batch statistics
        span.set_attribute("batch.size", len(items))
        span.set_attribute("batch.total_size_bytes", sum(item.get('size', 0) for item in items))

        # Process each item with sub-spans
        success_count = 0
        failure_count = 0

        for item in items:
            with tracer.start_as_current_span("batch.process_item") as item_span:
                item_span.set_attribute("item.id", item['id'])
                item_span.set_attribute("item.type", item.get('type', 'unknown'))

                try:
                    process_item(item)
                    success_count += 1
                except Exception as e:
                    failure_count += 1
                    item_span.set_attribute("error.message", str(e))

        # Add batch results
        span.set_attribute("batch.success_count", success_count)
        span.set_attribute("batch.failure_count", failure_count)
        span.set_attribute("batch.success_rate", success_count / len(items))

def process_item(item):
    """Process individual item"""
    pass
```

## Attribute Naming Conventions

Follow OpenTelemetry semantic conventions for consistent attribute naming.

```python
# attribute_conventions.py
from opentelemetry import trace
from opentelemetry.semconv.trace import SpanAttributes

tracer = trace.get_tracer(__name__)

def make_http_request(url, method="GET"):
    """HTTP request with semantic convention attributes"""
    with tracer.start_as_current_span("http.client.request") as span:
        # Use semantic convention constants
        span.set_attribute(SpanAttributes.HTTP_METHOD, method)
        span.set_attribute(SpanAttributes.HTTP_URL, url)
        span.set_attribute(SpanAttributes.HTTP_SCHEME, "https")

        # Make request
        response = perform_request(url, method)

        # Add response attributes
        span.set_attribute(SpanAttributes.HTTP_STATUS_CODE, response.status_code)
        span.set_attribute(SpanAttributes.HTTP_RESPONSE_CONTENT_LENGTH, len(response.content))

        return response

def query_database(query, params):
    """Database query with semantic conventions"""
    with tracer.start_as_current_span("db.query") as span:
        # Database semantic conventions
        span.set_attribute(SpanAttributes.DB_SYSTEM, "postgresql")
        span.set_attribute(SpanAttributes.DB_STATEMENT, query)
        span.set_attribute(SpanAttributes.DB_USER, "app_user")
        span.set_attribute(SpanAttributes.DB_NAME, "production_db")

        # Execute query
        results = execute_query(query, params)

        return results

def perform_request(url, method):
    """Placeholder for HTTP request"""
    class Response:
        status_code = 200
        content = b"response data"
    return Response()

def execute_query(query, params):
    """Placeholder for database query"""
    return []
```

Using semantic conventions improves interoperability and backend integration.

## Conditional Attributes

Add attributes based on conditions to avoid cluttering spans with unnecessary data.

```python
# conditional_attributes.py
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_request(request_data, debug_mode=False):
    """Add conditional debug attributes"""
    with tracer.start_as_current_span("process_request") as span:
        # Always add basic attributes
        span.set_attribute("request.id", request_data.id)
        span.set_attribute("request.type", request_data.type)

        # Add detailed debug attributes only when needed
        if debug_mode:
            span.set_attribute("debug.request.headers", str(request_data.headers))
            span.set_attribute("debug.request.body", request_data.body)
            span.set_attribute("debug.request.timestamp", request_data.timestamp)

        # Add error details only on failure
        try:
            result = process(request_data)
        except Exception as e:
            span.set_attribute("error.occurred", True)
            span.set_attribute("error.type", type(e).__name__)
            span.set_attribute("error.message", str(e))

            # Add stack trace only for unexpected errors
            if not isinstance(e, ExpectedError):
                import traceback
                span.set_attribute("error.stacktrace", traceback.format_exc())

            raise

        return result

class ExpectedError(Exception):
    pass

def process(request_data):
    return {"status": "success"}
```

Conditional attributes keep spans focused while providing detailed context when needed.

OpenTelemetry span attributes transform basic traces into rich observability data that captures both technical and business context. Well-designed attributes make traces searchable, filterable, and valuable for troubleshooting and analysis.
