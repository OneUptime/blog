# How to Enable SQLCommenter in OpenTelemetry SQLAlchemy for Query-Level Trace Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SQLCommenter, SQLAlchemy, Python, Database, Trace Correlation

Description: Learn how to use SQLCommenter with OpenTelemetry and SQLAlchemy to embed trace context directly in SQL queries for seamless correlation between application traces and database logs.

When debugging database performance issues, you often need to correlate slow query logs with application traces. SQLCommenter solves this by automatically injecting trace context into SQL queries as comments, creating a direct link between your observability data and database logs. This becomes invaluable when investigating production incidents.

## The Problem with Traditional Correlation

Database administrators see slow queries in their logs but have no idea which application request triggered them. Developers see slow spans in their traces but can't find the corresponding database execution plan. This disconnect wastes hours during incidents.

Traditional approaches require manual correlation using timestamps, which is error-prone and imprecise. SQLCommenter eliminates this guesswork by embedding correlation metadata directly in the SQL.

## What is SQLCommenter

SQLCommenter is a specification and set of libraries that augment SQL statements with comments containing metadata about the code that generated them. When combined with OpenTelemetry, these comments include:

- Trace ID and Span ID for exact correlation
- Service name and version
- Database driver information
- Application framework details
- Custom tags you specify

The resulting SQL looks like this:

```sql
SELECT * FROM users WHERE id = 42
/*traceparent='00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
  service='user-service',
  route='/api/users/:id'*/
```

## Installing Dependencies

Install OpenTelemetry with SQLAlchemy instrumentation and SQLCommenter support.

```bash
pip install opentelemetry-api opentelemetry-sdk \
    opentelemetry-instrumentation-sqlalchemy \
    opentelemetry-exporter-otlp \
    sqlalchemy \
    opentelemetry-util-http
```

For database connectivity, install your driver. We'll use PostgreSQL as an example.

```bash
pip install psycopg2-binary
```

## Basic Configuration

Set up OpenTelemetry tracing with SQLCommenter enabled for SQLAlchemy.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Configure the tracer provider with service information
resource = Resource(attributes={
    "service.name": "order-service",
    "service.version": "2.1.0",
    "deployment.environment": "production",
    "service.namespace": "ecommerce"
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(
    endpoint="http://localhost:4317",
    insecure=True
))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("sqlalchemy.app", "1.0.0")
```

## Enabling SQLCommenter

Enable SQLCommenter when instrumenting your SQLAlchemy engine. The key parameter is `enable_commenter=True`.

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Create your database engine
engine = create_engine(
    "postgresql://user:password@localhost:5432/orderdb",
    echo=False,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True  # Verify connections before using them
)

# Instrument with SQLCommenter enabled
SQLAlchemyInstrumentor().instrument(
    engine=engine,
    service="order-service",
    enable_commenter=True,  # This is the critical parameter
    commenter_options={
        # Control what metadata to include in comments
        "db_driver": True,  # Include database driver info
        "db_framework": True,  # Include SQLAlchemy version
        "opentelemetry_values": True,  # Include trace context
    }
)

Session = sessionmaker(bind=engine)
```

## Configuring Commenter Options

Customize what information appears in SQL comments based on your needs.

```python
# Comprehensive configuration with all available options
SQLAlchemyInstrumentor().instrument(
    engine=engine,
    service="order-service",
    enable_commenter=True,
    commenter_options={
        # OpenTelemetry trace context
        "opentelemetry_values": True,

        # Database driver information
        "db_driver": True,

        # Framework information (SQLAlchemy version)
        "db_framework": True,

        # Include route information if available
        # Requires integration with web framework
        "route": True,

        # Include controller/handler name
        "controller": True,

        # Include action/method name
        "action": True,
    }
)
```

## Practical Example with Full Context

Here's a complete example showing how trace context flows through your application.

```python
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
from typing import List, Optional

Base = declarative_base()

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    orders = relationship("Order", back_populates="customer")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    customer = relationship("Customer", back_populates="orders")

Base.metadata.create_all(engine)

def create_order(customer_email: str, amount: float) -> Order:
    """
    Create an order with full trace context in SQL comments.
    Every query will include the trace ID for correlation.
    """
    with tracer.start_as_current_span("create_order") as span:
        # Add business context to the span
        span.set_attribute("order.amount", amount)
        span.set_attribute("customer.email", customer_email)

        session = Session()
        try:
            with tracer.start_as_current_span("lookup_customer"):
                # This SELECT will include trace context in comments
                customer = session.query(Customer).filter(
                    Customer.email == customer_email
                ).first()

                if not customer:
                    # Create new customer
                    with tracer.start_as_current_span("create_customer"):
                        customer = Customer(
                            email=customer_email,
                            name=customer_email.split("@")[0]
                        )
                        session.add(customer)
                        session.flush()  # Get customer ID

            # Create the order
            with tracer.start_as_current_span("insert_order"):
                order = Order(
                    customer_id=customer.id,
                    total_amount=amount,
                    status="pending"
                )
                session.add(order)
                session.commit()

                span.set_attribute("order.id", order.id)
                span.set_attribute("customer.id", customer.id)

                return order

        except Exception as e:
            session.rollback()
            span.record_exception(e)
            raise
        finally:
            session.close()
```

## Web Framework Integration

When integrated with web frameworks, SQLCommenter can include route information automatically.

```python
from flask import Flask, request, jsonify
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)

# Instrument Flask to capture HTTP context
FlaskInstrumentor().instrument_app(app)

@app.route("/api/orders", methods=["POST"])
def create_order_endpoint():
    """
    Handle order creation via HTTP.
    SQL comments will include the route '/api/orders'.
    """
    data = request.get_json()

    # Get the current span to add HTTP context
    current_span = trace.get_current_span()
    current_span.set_attribute("http.method", request.method)
    current_span.set_attribute("http.route", "/api/orders")

    try:
        order = create_order(
            customer_email=data["email"],
            amount=data["amount"]
        )

        return jsonify({
            "order_id": order.id,
            "status": order.status
        }), 201

    except Exception as e:
        current_span.record_exception(e)
        return jsonify({"error": str(e)}), 500

# The resulting SQL will look like:
# INSERT INTO orders (customer_id, total_amount, status, created_at)
# VALUES (1, 99.99, 'pending', '2026-02-06 10:30:00')
# /*traceparent='00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
#   service='order-service',
#   route='/api/orders',
#   db_driver='psycopg2',
#   db_framework='sqlalchemy'*/
```

## Custom Tags in SQL Comments

Add custom application-specific metadata to SQL comments.

```python
from opentelemetry.trace import get_current_span

class CustomSQLCommenter:
    """Add custom tags to SQL comments via span attributes"""

    @staticmethod
    def add_context(tenant_id: str, feature_flag: str = None):
        """Add custom context that will appear in SQL comments"""
        span = get_current_span()
        if span:
            # These attributes can be configured to appear in SQL comments
            span.set_attribute("tenant.id", tenant_id)
            if feature_flag:
                span.set_attribute("feature.flag", feature_flag)

def get_orders_for_tenant(tenant_id: str, limit: int = 100) -> List[Order]:
    """
    Retrieve orders with tenant context in SQL comments.
    This helps correlate database activity to specific tenants.
    """
    with tracer.start_as_current_span("get_orders_for_tenant") as span:
        # Add custom context
        CustomSQLCommenter.add_context(
            tenant_id=tenant_id,
            feature_flag="new_order_flow"
        )

        span.set_attribute("query.limit", limit)

        session = Session()
        try:
            # Join query with all context embedded
            orders = session.query(Order).join(Customer).filter(
                Customer.email.endswith(f"@{tenant_id}.com")
            ).limit(limit).all()

            span.set_attribute("orders.count", len(orders))

            return orders
        finally:
            session.close()
```

## Parsing SQL Comments in Database Logs

On the database side, you can extract trace context from query logs to correlate with application traces.

```python
import re
from typing import Dict, Optional

def parse_sqlcommenter_metadata(sql_query: str) -> Optional[Dict[str, str]]:
    """
    Extract SQLCommenter metadata from a SQL query.
    Use this to parse database logs and extract trace IDs.
    """
    # Pattern to match SQLCommenter format
    pattern = r"/\*([^*]+)\*/"

    match = re.search(pattern, sql_query)
    if not match:
        return None

    comment_content = match.group(1)
    metadata = {}

    # Parse key='value' pairs
    for item in comment_content.split(","):
        item = item.strip()
        if "=" in item:
            key, value = item.split("=", 1)
            # Remove quotes from value
            value = value.strip("'\"")
            metadata[key.strip()] = value

    return metadata

# Example usage for log analysis
def analyze_slow_query_log(log_entry: str):
    """
    Analyze a slow query log entry and extract trace context.
    This allows you to find the exact trace for a slow query.
    """
    sql_query = log_entry  # Your log parsing logic here

    metadata = parse_sqlcommenter_metadata(sql_query)

    if metadata and "traceparent" in metadata:
        trace_parent = metadata["traceparent"]
        # Parse W3C Trace Context format: version-trace_id-span_id-flags
        parts = trace_parent.split("-")

        if len(parts) == 4:
            trace_id = parts[1]
            span_id = parts[2]

            print(f"Slow query trace ID: {trace_id}")
            print(f"Slow query span ID: {span_id}")
            print(f"Service: {metadata.get('service', 'unknown')}")
            print(f"Route: {metadata.get('route', 'unknown')}")

            # Now you can look up this exact trace in your observability backend
            return {
                "trace_id": trace_id,
                "span_id": span_id,
                "metadata": metadata
            }

    return None
```

## Monitoring SQLCommenter Overhead

SQLCommenter adds minimal overhead, but you should monitor it in high-throughput systems.

```python
import time
from contextlib import contextmanager

class SQLCommenterMonitor:
    def __init__(self, tracer):
        self.tracer = tracer

    @contextmanager
    def measure_query_with_comments(self, operation: str):
        """Measure the overhead of SQL comments"""
        with self.tracer.start_as_current_span(f"db.{operation}") as span:
            start_time = time.perf_counter()

            try:
                yield span
            finally:
                duration_ms = (time.perf_counter() - start_time) * 1000
                span.set_attribute("db.duration_ms", duration_ms)

                # SQLCommenter overhead is typically < 1ms
                # Alert if overhead seems high
                if duration_ms < 10:
                    span.set_attribute("db.comments_enabled", True)

monitor = SQLCommenterMonitor(tracer)

def benchmark_commented_queries():
    """Benchmark queries with and without comments"""
    with monitor.measure_query_with_comments("benchmark"):
        session = Session()
        try:
            # Run sample query
            result = session.query(Order).filter(
                Order.status == "pending"
            ).limit(100).all()

            return len(result)
        finally:
            session.close()
```

## Best Practices

**Enable in All Environments**: Use SQLCommenter in development, staging, and production. The overhead is minimal and the debugging value is immense.

**Configure Database Logs**: Ensure your database captures query comments in its logs. PostgreSQL, MySQL, and most databases include comments in their slow query logs by default.

**Create Log Parsers**: Build tools to automatically extract trace IDs from database logs and link to your tracing backend.

**Index Trace IDs**: If you store database logs, index the trace ID field for fast lookups when investigating incidents.

**Use with Connection Pooling**: SQLCommenter works seamlessly with connection pools. Each query gets its own trace context regardless of which pool connection executes it.

**Sanitize Sensitive Data**: Be cautious about what custom attributes you add. Don't include passwords, tokens, or PII in SQL comments.

## Trace Correlation Flow

Understanding how correlation works helps you debug more effectively:

```mermaid
sequenceDiagram
    participant Client
    participant App as Application
    participant OTel as OpenTelemetry
    participant DB as Database

    Client->>App: HTTP Request
    App->>OTel: Create trace
    OTel->>OTel: Generate trace ID
    App->>OTel: Start span
    OTel->>DB: Execute SQL with comments
    Note over DB: Query log includes<br/>trace ID in comments
    DB->>OTel: Query result
    OTel->>App: Span complete
    App->>Client: HTTP Response

    Note over DB,OTel: Slow query log entry contains<br/>trace ID for exact correlation
```

## Troubleshooting

**Comments Not Appearing**: Verify `enable_commenter=True` is set when instrumenting. Check that your database version supports SQL comments (all modern databases do).

**Truncated Comments**: Some database configurations limit comment length. Adjust `max_allowed_packet` (MySQL) or similar settings if comments are being truncated.

**Missing Trace Context**: Ensure OpenTelemetry is properly initialized before the first database connection. The trace provider must be set up first.

**Performance Impact**: If you notice performance degradation, reduce the number of fields in `commenter_options`. Start with just `opentelemetry_values` and add others as needed.

## Database-Specific Considerations

**PostgreSQL**: Comments appear in pg_stat_statements and slow query logs. Enable log_statement to capture all queries with comments.

**MySQL**: Comments are included in the slow query log when log_slow_extra is enabled.

**SQLite**: SQLite supports comments but has limited logging. Use SQLite extensions or application-level logging to capture queries.

## Conclusion

SQLCommenter bridges the gap between application observability and database operations. By embedding trace context directly in SQL queries, you eliminate the guesswork when correlating slow queries with application traces. This capability is indispensable during production incidents when every second counts. Enable it once, and benefit from seamless correlation forever.
