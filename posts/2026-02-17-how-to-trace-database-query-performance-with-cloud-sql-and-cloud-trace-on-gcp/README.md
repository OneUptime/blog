# How to Trace Database Query Performance with Cloud SQL and Cloud Trace on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Cloud Trace, Database Performance, OpenTelemetry, Google Cloud

Description: A practical guide to tracing database query performance with Cloud SQL and Cloud Trace on Google Cloud to identify and fix slow queries.

---

Slow database queries are one of the most common causes of application latency, but they are also one of the hardest to debug without proper instrumentation. You know the request is slow, but which query? On which table? With what parameters? By integrating Cloud SQL with Cloud Trace on Google Cloud, you can see exactly how long each database query takes in the context of the full request. In this post, I will show you how to set this up for both SQL tracing within your application and Cloud SQL Insights for deeper analysis.

## Two Approaches to Database Tracing

There are two complementary approaches on GCP. First, application-level tracing using OpenTelemetry to instrument your database driver. This gives you spans in Cloud Trace for every query your application executes. Second, Cloud SQL Insights, which is a built-in feature of Cloud SQL that provides query-level performance data. Using both together gives you the complete picture.

## Step 1: Application-Level Database Tracing

Let me show this with a Python application using SQLAlchemy, but the approach works with any language and ORM.

```bash
# Install the required packages
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-cloud-trace
pip install opentelemetry-instrumentation-sqlalchemy
pip install sqlalchemy pg8000
```

```python
# db_tracing.py - Set up database tracing with OpenTelemetry

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
import sqlalchemy

def setup_tracing():
    """Initialize OpenTelemetry with Cloud Trace exporter."""
    exporter = CloudTraceSpanExporter(
        project_id=os.getenv("GOOGLE_CLOUD_PROJECT")
    )
    provider = TracerProvider()
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

def create_traced_engine():
    """Create a SQLAlchemy engine with automatic query tracing."""
    # Connect to Cloud SQL using the Cloud SQL Auth Proxy or private IP
    engine = sqlalchemy.create_engine(
        "postgresql+pg8000://user:password@127.0.0.1:5432/mydb",
        pool_size=10,
        max_overflow=5,
    )

    # This instruments all queries executed through this engine
    # Each query becomes a span with the SQL statement as an attribute
    SQLAlchemyInstrumentor().instrument(
        engine=engine,
        # Include the SQL statement in the span (be careful with sensitive data)
        enable_commenter=True,
    )

    return engine

# Initialize everything
setup_tracing()
engine = create_traced_engine()
tracer = trace.get_tracer(__name__)
```

Now use it in your application.

```python
# app.py - Application using traced database queries

from flask import Flask, jsonify
from db_tracing import engine, tracer
import sqlalchemy

app = Flask(__name__)

@app.route("/users/<int:user_id>")
def get_user(user_id):
    # This parent span wraps the entire request
    with tracer.start_as_current_span("get-user-handler") as span:
        span.set_attribute("user.id", user_id)

        with engine.connect() as conn:
            # This query automatically becomes a child span
            # The span includes the SQL statement and execution time
            result = conn.execute(
                sqlalchemy.text("SELECT * FROM users WHERE id = :id"),
                {"id": user_id},
            )
            user = result.mappings().first()

            if user is None:
                return jsonify({"error": "Not found"}), 404

            # This second query also becomes its own span
            orders = conn.execute(
                sqlalchemy.text(
                    "SELECT * FROM orders WHERE user_id = :uid ORDER BY created_at DESC LIMIT 10"
                ),
                {"uid": user_id},
            ).mappings().all()

        return jsonify({
            "user": dict(user),
            "recent_orders": [dict(o) for o in orders],
        })

@app.route("/reports/daily")
def daily_report():
    with tracer.start_as_current_span("daily-report") as span:
        with engine.connect() as conn:
            # A more complex query - the span will show exactly how long this takes
            result = conn.execute(
                sqlalchemy.text("""
                    SELECT
                        DATE(created_at) as date,
                        COUNT(*) as order_count,
                        SUM(total) as revenue
                    FROM orders
                    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                """)
            ).mappings().all()

            span.set_attribute("report.row_count", len(result))

        return jsonify([dict(r) for r in result])
```

## Step 2: Enable Cloud SQL Insights

Cloud SQL Insights provides query-level performance data directly from the database engine, without needing to change application code.

```bash
# Enable Query Insights on an existing Cloud SQL instance
gcloud sql instances patch my-instance \
    --insights-config-query-insights-enabled \
    --insights-config-query-string-length=1024 \
    --insights-config-record-application-tags \
    --insights-config-record-client-address \
    --project=my-gcp-project
```

For a new instance, enable it at creation time.

```bash
# Create a new Cloud SQL instance with Query Insights enabled
gcloud sql instances create my-new-instance \
    --database-version=POSTGRES_15 \
    --tier=db-custom-4-16384 \
    --region=us-central1 \
    --insights-config-query-insights-enabled \
    --insights-config-query-string-length=1024 \
    --insights-config-record-application-tags \
    --insights-config-record-client-address \
    --project=my-gcp-project
```

## Step 3: Correlate Application Tags with Traces

Cloud SQL Insights supports application tags, which let you correlate database queries with specific application operations.

```python
# Using sqlcommenter to automatically add application tags to queries
# These tags show up in Cloud SQL Insights and link back to your traces

from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# The enable_commenter option adds OTel context as SQL comments
# This creates a link between Cloud Trace spans and Cloud SQL Insights
SQLAlchemyInstrumentor().instrument(
    engine=engine,
    enable_commenter=True,
    commenter_options={
        "opentelemetry_values": True,  # Include trace_id and span_id
        "db_framework": True,          # Include ORM framework name
        "route": True,                 # Include the HTTP route
    },
)
```

When this is enabled, your SQL queries will have comments appended automatically.

```sql
-- The actual query sent to the database looks like this:
SELECT * FROM users WHERE id = 42
/*traceparent='00-abc123-def456-01',route='/users/42'*/
```

Cloud SQL Insights can then group queries by route and link them to specific traces.

## Step 4: Query Performance Dashboard

Build a dashboard that combines application-level traces with Cloud SQL Insights data.

```
# MQL query for Cloud SQL query latency
fetch cloudsql_database::cloudsql.googleapis.com/database/postgresql/insights/aggregate/execution_time
| group_by [metric.querystring], percentile(val(), 95)
| every 5m
| top 10
```

```
# MQL query for Cloud SQL active queries
fetch cloudsql_database::cloudsql.googleapis.com/database/postgresql/num_backends
| group_by [resource.database_id], mean(val())
| every 1m
```

## Trace Visualization

Here is what the trace looks like in Cloud Trace.

```mermaid
gantt
    title Request Trace: GET /users/42
    dateFormat X
    axisFormat %L ms

    section API Handler
    get-user-handler        :0, 150

    section Database
    SELECT * FROM users     :10, 30
    SELECT * FROM orders    :40, 90

    section Response
    JSON serialization      :130, 150
```

The trace clearly shows that the orders query (50ms) is significantly slower than the users query (20ms), and together they account for most of the request latency.

## Step 5: Identifying N+1 Query Problems

One of the best uses of database tracing is catching N+1 query problems. Here is what that looks like.

```python
# BAD: N+1 query pattern - each user triggers a separate query
@app.route("/users")
def list_users():
    with tracer.start_as_current_span("list-users") as span:
        with engine.connect() as conn:
            users = conn.execute(
                sqlalchemy.text("SELECT * FROM users LIMIT 50")
            ).mappings().all()

            # This creates 50 separate database spans!
            for user in users:
                orders = conn.execute(
                    sqlalchemy.text(
                        "SELECT COUNT(*) FROM orders WHERE user_id = :uid"
                    ),
                    {"uid": user["id"]},
                ).scalar()

        span.set_attribute("query_count", 51)  # 1 + 50
        return jsonify([dict(u) for u in users])
```

In Cloud Trace, this shows up as 51 database spans under a single request. The fix is obvious once you see it.

```python
# GOOD: Single query with a JOIN
@app.route("/users")
def list_users():
    with tracer.start_as_current_span("list-users") as span:
        with engine.connect() as conn:
            users = conn.execute(
                sqlalchemy.text("""
                    SELECT u.*, COUNT(o.id) as order_count
                    FROM users u
                    LEFT JOIN orders o ON o.user_id = u.id
                    GROUP BY u.id
                    LIMIT 50
                """)
            ).mappings().all()

        span.set_attribute("query_count", 1)
        return jsonify([dict(u) for u in users])
```

## Step 6: Set Up Alerts for Slow Queries

Create alerts when database query latency exceeds acceptable thresholds.

```bash
# Alert when P95 query latency exceeds 500ms
gcloud monitoring policies create --policy-from-file=- << 'EOF'
{
  "displayName": "Cloud SQL Slow Queries",
  "conditions": [{
    "displayName": "P95 query time above 500ms",
    "conditionThreshold": {
      "filter": "metric.type=\"cloudsql.googleapis.com/database/postgresql/insights/aggregate/execution_time\" resource.type=\"cloudsql_database\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 0.5,
      "duration": "300s",
      "aggregations": [{
        "alignmentPeriod": "60s",
        "perSeriesAligner": "ALIGN_PERCENTILE_95"
      }]
    }
  }],
  "combiner": "OR"
}
EOF
```

## Wrapping Up

Tracing database query performance with Cloud SQL and Cloud Trace gives you the visibility needed to find and fix slow queries in the context of actual user requests. The OpenTelemetry SQLAlchemy instrumentation creates spans for every query automatically, and Cloud SQL Insights provides a database-level view with query normalization and tagging. Together, they help you catch N+1 queries, identify slow joins, and understand how database latency contributes to overall request latency. The investment in setting this up pays off quickly the first time you debug a performance issue.
