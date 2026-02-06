# How to Debug N+1 Database Query Problems Using OpenTelemetry Span Counts per Parent Span

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, N+1 Queries, Database, Performance, Span Analysis

Description: Detect and fix N+1 database query problems by counting child database spans per parent span using OpenTelemetry tracing.

The N+1 query problem is a silent performance killer. Your ORM fetches a list of 100 items with one query, then fires 100 additional queries to load related data for each item. Everything works fine in development with 5 records. In production with 10,000 records, your endpoint takes 30 seconds. OpenTelemetry tracing makes this pattern trivially easy to detect by counting database spans under each parent span.

## The Pattern to Look For

In a trace view, an N+1 problem has a distinctive visual signature: a parent span with an absurd number of child database spans, all running the same query template with different parameters. If your "GET /api/orders" handler span has 500 child spans all named `SELECT * FROM order_items WHERE order_id = ?`, you have found your N+1.

## Instrumenting Database Calls

Most OpenTelemetry auto-instrumentation libraries already create spans for database queries. Here is a manual instrumentation example in Python to show what the auto-instrumentation does under the hood:

```python
from opentelemetry import trace
import psycopg2

tracer = trace.get_tracer("db-instrumentation")

def execute_query(connection, query, params=None):
    with tracer.start_as_current_span("db.query") as span:
        # Record standard database span attributes
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.statement", query)
        span.set_attribute("db.operation", query.split()[0].upper())

        cursor = connection.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()

        span.set_attribute("db.row_count", len(results))
        return results
```

## Building the N+1 Detector

The real power comes from analyzing span relationships after collection. Here is a script that queries your trace backend and identifies N+1 patterns:

```python
import requests
from collections import defaultdict

def find_n_plus_1_patterns(trace_data):
    """
    Analyze a trace and find parent spans with an excessive
    number of similar database child spans.
    """
    # Group child spans by parent span ID
    children_by_parent = defaultdict(list)
    span_lookup = {}

    for span in trace_data["spans"]:
        span_lookup[span["spanId"]] = span
        if "parentSpanId" in span:
            children_by_parent[span["parentSpanId"]].append(span)

    suspects = []

    for parent_id, children in children_by_parent.items():
        # Filter to only database spans
        db_children = [
            s for s in children
            if s.get("attributes", {}).get("db.system") is not None
        ]

        if len(db_children) < 10:
            continue  # Not enough to be suspicious

        # Group by query template (ignoring parameter values)
        query_groups = defaultdict(int)
        for span in db_children:
            statement = span.get("attributes", {}).get("db.statement", "")
            # Normalize the query by replacing literal values
            normalized = normalize_query(statement)
            query_groups[normalized] += 1

        # Flag any query template that appears more than 10 times
        for query_template, count in query_groups.items():
            if count > 10:
                parent = span_lookup.get(parent_id, {})
                suspects.append({
                    "parent_span": parent.get("name", "unknown"),
                    "query_template": query_template,
                    "query_count": count,
                    "parent_duration_ms": parent.get("duration", 0),
                })

    return suspects


def normalize_query(sql):
    """Replace literal values with placeholders for grouping."""
    import re
    # Replace numbers
    sql = re.sub(r'\b\d+\b', '?', sql)
    # Replace quoted strings
    sql = re.sub(r"'[^']*'", '?', sql)
    return sql
```

## Adding Span Attributes for Automated Detection

You can also instrument your application to count child spans in real time and flag potential N+1 patterns before they leave your service:

```python
from opentelemetry import trace, context

class NPlusOneDetector:
    """Middleware that counts DB spans per request and logs warnings."""

    def __init__(self, threshold=20):
        self.threshold = threshold

    def on_span_end(self, span):
        # Only check database spans
        if span.attributes.get("db.system") is None:
            return

        parent_ctx = span.parent
        if parent_ctx is None:
            return

        # Increment counter on the parent span
        parent_span = trace.get_current_span()
        current_count = parent_span.attributes.get("db.child_query_count", 0)
        new_count = current_count + 1
        parent_span.set_attribute("db.child_query_count", new_count)

        if new_count == self.threshold:
            parent_span.set_attribute("n_plus_1.detected", True)
            parent_span.add_event(
                "N+1 query pattern detected",
                attributes={"db.query_count": new_count},
            )
```

## Fixing the Problem

Once you identify the N+1, the fix is usually straightforward. Replace the loop of individual queries with a batch query or an eager-loading strategy:

```python
# Before: N+1 pattern
def get_orders_with_items_bad(user_id):
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", [user_id])
    for order in orders:
        # This fires one query per order
        order.items = db.query(
            "SELECT * FROM order_items WHERE order_id = ?", [order.id]
        )
    return orders

# After: Fixed with a single batch query
def get_orders_with_items_good(user_id):
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", [user_id])
    order_ids = [o.id for o in orders]

    # One query for all items, then group in memory
    all_items = db.query(
        "SELECT * FROM order_items WHERE order_id = ANY(?)", [order_ids]
    )

    items_by_order = defaultdict(list)
    for item in all_items:
        items_by_order[item.order_id].append(item)

    for order in orders:
        order.items = items_by_order[order.id]

    return orders
```

## Setting Up Alerts

Create an alert on the `db.child_query_count` span attribute so you catch new N+1 patterns as they get introduced. A reasonable threshold depends on your application, but anything over 50 database child spans under a single parent span deserves investigation.

## Takeaway

The N+1 problem is easy to introduce and hard to notice without the right observability. OpenTelemetry span hierarchies give you a natural way to count database calls per operation. Count the child spans, group by query template, and flag anything with an unusually high count. This approach catches N+1 patterns whether they come from ORMs, hand-written queries, or third-party libraries.
