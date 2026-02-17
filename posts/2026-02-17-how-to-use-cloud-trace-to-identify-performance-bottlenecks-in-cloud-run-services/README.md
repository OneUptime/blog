# How to Use Cloud Trace to Identify Performance Bottlenecks in Cloud Run Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, Cloud Run, Performance, Latency

Description: Learn how to use Cloud Trace to find and fix performance bottlenecks in Cloud Run services, from cold start latency to slow downstream calls and database queries.

---

Cloud Run makes it easy to deploy services, but understanding why they are slow requires more effort. Is it cold starts? A slow database query? A downstream service taking too long? Cloud Trace can answer all of these questions by showing you exactly where each request spends its time.

Cloud Run has built-in integration with Cloud Trace, which means you get basic tracing with almost no configuration. But to get real insights, you need to add a bit more instrumentation. Let me show you the full picture.

## Built-in Tracing on Cloud Run

Cloud Run automatically creates trace spans for incoming HTTP requests. You do not need to configure anything - just deploy your service and traces start appearing in the Cloud Console.

However, the built-in tracing only captures the outermost request span. It tells you the total latency but not what happened inside your service. For that, you need to add OpenTelemetry instrumentation.

## Setting Up OpenTelemetry on Cloud Run

Here is a complete setup for a Python Flask service running on Cloud Run. The configuration is tailored for the Cloud Run environment.

```python
# tracing.py - Cloud Run optimized tracing setup
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.sdk.resources import Resource


def init_tracing():
    """Initialize tracing for Cloud Run."""
    # Cloud Run sets these environment variables automatically
    service_name = os.environ.get("K_SERVICE", "unknown-service")
    revision = os.environ.get("K_REVISION", "unknown-revision")

    resource = Resource.create({
        "service.name": service_name,
        "service.version": revision,
        "cloud.platform": "gcp_cloud_run",
    })

    provider = TracerProvider(resource=resource)

    # BatchSpanProcessor batches spans and sends them periodically
    # Reduce the schedule delay for Cloud Run since instances can shut down
    processor = BatchSpanProcessor(
        CloudTraceSpanExporter(),
        max_export_batch_size=32,
        schedule_delay_millis=5000,  # Flush every 5 seconds
    )
    provider.add_span_processor(processor)

    trace.set_tracer_provider(provider)
    return provider
```

## Identifying Cold Start Latency

Cold starts are one of the biggest performance concerns on Cloud Run. When a new instance starts up, there is initialization time before it can serve the first request. Cloud Trace makes this visible.

To measure cold start impact, add a span around your initialization code.

```python
# app.py - Measuring cold start time with tracing
from tracing import init_tracing
import time

# Record when the module starts loading
init_start = time.time()

provider = init_tracing()

from flask import Flask, jsonify
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry import trace

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

# Calculate initialization time
init_duration = time.time() - init_start

@app.before_request
def track_cold_start():
    """Add cold start information to the current span."""
    span = trace.get_current_span()
    if span:
        span.set_attribute("cloud_run.init_duration_ms", int(init_duration * 1000))
```

In the Trace Explorer, filter for traces where `cloud_run.init_duration_ms` is present. Compare the latency of cold start requests versus warm requests to understand the impact.

Strategies to reduce cold start latency:
- Use minimum instances to keep at least one instance warm
- Reduce dependency loading by using lazy imports
- Choose a smaller container image
- Pre-compute or cache initialization results

```bash
# Set minimum instances to avoid cold starts
gcloud run services update my-service \
  --min-instances=1 \
  --region=us-central1
```

## Finding Slow Database Queries

Database queries are often the biggest latency contributor. Instrument your database client to see individual query timings.

```python
# db.py - Traced database operations
import pg8000
from opentelemetry import trace

tracer = trace.get_tracer("database")

def execute_query(query, params=None):
    """Execute a database query with tracing."""
    with tracer.start_as_current_span("db.query") as span:
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.statement", query)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()

        span.set_attribute("db.rows_returned", len(results))
        return results
```

When you look at traces in the Explorer, you can now see how long each database query takes. Sort by duration to find the slowest queries, and check the `db.statement` attribute to see the actual SQL.

## Tracing Downstream Service Calls

If your Cloud Run service calls other services (APIs, other Cloud Run services, external APIs), trace those calls to see where time goes.

```python
# services/user_service.py - Traced HTTP calls to downstream services
import requests
from opentelemetry import trace

tracer = trace.get_tracer("user-service-client")

def get_user(user_id):
    """Fetch user from the user service with tracing."""
    with tracer.start_as_current_span("fetch_user") as span:
        span.set_attribute("user.id", user_id)

        # The requests instrumentation adds HTTP details automatically
        response = requests.get(
            f"https://user-service-xyz.run.app/users/{user_id}",
            timeout=5
        )

        span.set_attribute("http.status_code", response.status_code)

        if response.status_code != 200:
            span.set_status(
                trace.StatusCode.ERROR,
                f"User service returned {response.status_code}"
            )
            return None

        return response.json()
```

## Identifying Serial vs. Parallel Operations

One of the most impactful optimizations is converting serial operations to parallel ones. Cloud Trace makes serial patterns obvious in the waterfall view - you will see spans stacked one after another.

Here is a before and after example.

```python
# BEFORE: Sequential calls - each waits for the previous to complete
@app.route('/api/dashboard/<user_id>')
def get_dashboard(user_id):
    with tracer.start_as_current_span("get_dashboard"):
        # These three calls happen one after another
        user = get_user(user_id)           # 100ms
        orders = get_orders(user_id)       # 150ms
        recommendations = get_recs(user_id) # 200ms
        # Total: ~450ms

        return jsonify({
            "user": user,
            "orders": orders,
            "recommendations": recommendations,
        })
```

```python
# AFTER: Parallel calls using concurrent.futures
import concurrent.futures

@app.route('/api/dashboard/<user_id>')
def get_dashboard(user_id):
    with tracer.start_as_current_span("get_dashboard"):
        # Run all three calls in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            user_future = executor.submit(get_user, user_id)
            orders_future = executor.submit(get_orders, user_id)
            recs_future = executor.submit(get_recs, user_id)

            user = user_future.result()
            orders = orders_future.result()
            recommendations = recs_future.result()
        # Total: ~200ms (limited by the slowest call)

        return jsonify({
            "user": user,
            "orders": orders,
            "recommendations": recommendations,
        })
```

In the trace waterfall, the "before" version shows three sequential bars. The "after" version shows three overlapping bars. The total request time drops from 450ms to 200ms.

## Analyzing Latency Patterns Over Time

Use the Trace Explorer to look at latency trends. Select your Cloud Run service endpoint and expand the time range to a few days. Look for:

- **Periodic spikes**: These often indicate scheduled jobs competing for resources or autoscaling events.
- **Gradual increases**: Could mean data growth affecting query performance or memory leaks causing GC pressure.
- **Sudden jumps**: Usually caused by deployments, configuration changes, or external dependency degradation.

## Setting Up Alerts Based on Trace Data

Combine Cloud Trace insights with Cloud Monitoring alerts to catch performance regressions automatically.

```bash
# Alert when p95 latency exceeds 2 seconds for a Cloud Run service
gcloud monitoring policies create \
  --display-name="Cloud Run High Latency" \
  --condition-display-name="p95 latency above 2s" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"' \
  --condition-threshold-value=2000 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_PERCENTILE_95"}'
```

## Performance Optimization Checklist

Based on what traces typically reveal in Cloud Run services:

1. **Cold starts over 2 seconds**: Set min-instances, optimize imports, reduce container size
2. **Database queries over 100ms**: Add indexes, optimize queries, use connection pooling
3. **Serial downstream calls**: Parallelize independent operations
4. **Large response serialization**: Paginate responses, use streaming
5. **Missing connection reuse**: Enable HTTP keep-alive and connection pooling
6. **Memory pressure**: Check if response bodies are being held in memory unnecessarily

## Wrapping Up

Cloud Trace turns Cloud Run performance debugging from guesswork into data-driven analysis. Start with the built-in tracing to see overall request latency, then add OpenTelemetry instrumentation for internal operations. Focus on cold starts, database queries, and downstream calls - these three areas account for the majority of latency issues in Cloud Run services.
