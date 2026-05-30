# How to Analyze Request Latency Using Cloud Trace Spans and the Trace Explorer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, Latency Analysis, Performance, Observability

Description: A practical guide to using Cloud Trace spans and the Trace Explorer to identify latency bottlenecks, analyze request timing, and optimize service performance on Google Cloud.

---

Your users are complaining that the app feels slow, but you are not sure which service or operation is causing the delay. This is exactly the problem Cloud Trace solves. It breaks down every request into individual spans - discrete units of work like HTTP calls, database queries, and cache lookups - and shows you exactly how long each one takes.

But collecting traces is only half the battle. Knowing how to actually analyze them in the Trace Explorer is what turns raw data into actionable insights. Let me show you how to use the Trace Explorer effectively.

## Understanding Spans and Traces

A **trace** represents a single end-to-end request as it flows through your system. It is made up of multiple **spans**, where each span represents one operation. Spans have a parent-child relationship that mirrors your call hierarchy.

For example, a single API request might generate this span tree:

```text
[HTTP GET /api/orders] (total: 450ms)
  [authenticate_user] (35ms)
  [fetch_orders] (380ms)
    [db.query: SELECT orders] (120ms)
    [db.query: SELECT order_items] (95ms)
    [cache.get: user_preferences] (5ms)
    [enrich_order_data] (150ms)
      [HTTP GET http://product-service/products] (140ms)
  [serialize_response] (12ms)
```

Each span records:
- A name identifying the operation
- Start time and duration
- Status (OK or ERROR)
- Custom attributes you have attached
- Parent span reference

## Navigating the Trace Explorer

Open **Trace > Trace Explorer** in the Cloud Console. The main view shows:

1. **Latency chart**: A heatmap or percentile chart showing span latency over time.
2. **Filter bar**: Where you add predefined span filters or custom attribute filters.
3. **Spans and Grouped tables**: Individual spans and span groupings matching your filter, sortable by columns like duration.

### Filtering Traces

The filter bar is your primary tool for narrowing down traces. Here are the most useful filters.

To find spans from a specific service, use the **OpenTelemetry service** filter or add an attribute filter for `service.name`:

```text
service.name: orders-api
```

To find slow spans over a certain duration, use the **Duration** span filter:

```text
Duration: > 1s
```

To filter by HTTP method and status, add attribute filters for the attributes your instrumentation emits. For example, older HTTP instrumentation might use:

```text
/http/method: GET
/http/status_code: 500
```

To find traces from a specific time window, use the time range picker at the top of the page. You can also highlight a range on the x-axis to zoom into a specific time range.

### Reading the Waterfall View

When you click on a span in the table, the details flyout opens and shows the span in the context of its trace. This is where the real analysis happens.

The waterfall shows each span as a horizontal bar. The length of the bar represents the span's duration. Bars are nested to show the parent-child hierarchy, and they are positioned on a timeline so you can see overlapping operations.

Things to look for:

- **Long bars**: These are your time sinks. A span that takes 500ms in a 600ms trace is the obvious bottleneck.
- **Sequential bars**: Operations that happen one after another when they could happen in parallel. For example, if you make three API calls sequentially, consider running them concurrently.
- **Gaps**: Time between spans where nothing seems to be happening. This often indicates CPU-bound processing, garbage collection pauses, or time spent in uninstrumented code.
- **Error spans**: Spans marked with an error status show up with a red indicator.

## Practical Analysis Techniques

### Finding the Slowest Operation

Highlight a time range on the chart where latency spiked. Then sort the Spans table by duration (descending) to find the slowest spans. Open one and look at the trace waterfall to identify which span is taking the most time.

### Comparing Fast vs. Slow Traces

Find a fast trace and a slow trace for the same endpoint. Open them side by side (in separate browser tabs) and compare:

- Which spans are present in the slow trace but not the fast one?
- Which spans take significantly longer in the slow trace?
- Are there additional child spans (like cache misses triggering database queries)?

This comparison often reveals the root cause immediately.

### Identifying Serialized Operations

Look for spans that run sequentially when they could run in parallel. In the waterfall, these appear as bars that start only after the previous one ends.

For example, if your code does this:

```python
# These two independent queries run sequentially - slow

user = await fetch_user(user_id)
orders = await fetch_orders(user_id)
preferences = await fetch_preferences(user_id)
```

You will see three consecutive spans. Refactoring to parallel execution cuts the latency:

```python
# Run independent queries in parallel - much faster
import asyncio

user, orders, preferences = await asyncio.gather(
    fetch_user(user_id),
    fetch_orders(user_id),
    fetch_preferences(user_id),
)
```

After the refactoring, the waterfall will show three overlapping bars instead of three sequential ones.

### Analyzing Database Query Latency

If you have instrumented your database client, you can filter traces to find those with slow database spans.

In the Trace Explorer filter:

```text
Span name: db.query
Duration: > 500ms
```

Open the matching traces and look at the `db.statement` attribute on the slow spans. This tells you exactly which query is slow and lets you optimize it.

## Using Aggregated Trace Data

Cloud Trace also provides aggregated views across many spans.

Go to **Trace > Trace Explorer**. Here you can:

1. Filter by a span name (like `/api/orders`)
2. Choose a time range
3. Set the chart view to **Span duration (percentile)** to see p50, p90, p95, and p99 latency
4. Use the **Grouped** table to see latency statistics grouped by span name and service or workload

The grouped view shows you something like:

| Span | p50 | p95 | p99 |
|------|-----|-----|-----|
| /api/orders (total) | 120ms | 450ms | 1200ms |
| db.query: SELECT orders | 30ms | 150ms | 800ms |
| HTTP GET product-service | 60ms | 200ms | 350ms |
| authenticate_user | 10ms | 25ms | 50ms |

From this table, you can see that the database query is the biggest contributor to p99 latency, making it the top optimization target.

## Building Custom Queries with the API

For automated analysis, you can query Cloud Trace programmatically.

This Python script fetches traces matching specific criteria and calculates latency statistics.

```python
# analyze_traces.py - Query Cloud Trace API for latency analysis
from datetime import datetime, timedelta, timezone
from google.cloud import trace_v1
import statistics

client = trace_v1.TraceServiceClient()

# Define the time range
end_time = datetime.now(timezone.utc)
start_time = end_time - timedelta(hours=1)

# List traces for a specific endpoint
traces = client.list_traces(
    request={
        "project_id": "your-project-id",
        "start_time": start_time,
        "end_time": end_time,
        "filter": '+root:/api/orders',
        "view": trace_v1.ListTracesRequest.ViewType.COMPLETE,
    }
)

# Collect latency values
latencies = []
for trace in traces:
    for span in trace.spans:
        if span.name == "/api/orders":
            duration_ms = (span.end_time - span.start_time).total_seconds() * 1000
            latencies.append(duration_ms)

if latencies:
    print(f"Traces analyzed: {len(latencies)}")
    print(f"p50 latency: {statistics.median(latencies):.1f}ms")
    print(f"p95 latency: {sorted(latencies)[int(len(latencies) * 0.95)]:.1f}ms")
    print(f"p99 latency: {sorted(latencies)[int(len(latencies) * 0.99)]:.1f}ms")
```

## Practical Optimization Workflow

Here is the workflow I follow when investigating latency issues:

1. **Start with the overview**: Check the latency chart for the affected time period. Look for spikes or shifts in the baseline.
2. **Sample slow traces**: Pick 5-10 traces from the p99 range and examine their waterfalls.
3. **Identify the pattern**: Usually 2-3 of those traces will share the same bottleneck. That is your target.
4. **Quantify the impact**: Use the Grouped table and percentile chart to see what percentage of time the bottleneck represents.
5. **Fix and verify**: Make your optimization, deploy, and compare the latency chart before and after.

## Wrapping Up

Cloud Trace is most valuable when you know how to read the data it collects. Focus on the waterfall view for individual request analysis, use the latency chart to spot trends, and leverage the Grouped table for aggregate insights. The combination of these views will reliably point you toward the operations that need optimization.
