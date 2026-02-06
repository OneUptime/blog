# How to Build an Interactive Production Debugging Notebook Using Jupyter and OpenTelemetry Trace Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Jupyter, Notebook, Production Debugging, Data Analysis

Description: Build interactive Jupyter notebooks for querying and analyzing OpenTelemetry trace data to debug production issues efficiently.

Dashboards are great for monitoring, but they are rigid. When you are debugging a production issue, you need to ask ad-hoc questions, slice data in unexpected ways, and follow a trail of evidence wherever it leads. Jupyter notebooks give you this flexibility. By connecting a notebook to your OpenTelemetry trace backend, you get an interactive debugging environment where you can query traces, analyze patterns, and visualize results, all in one place.

## Setting Up the Notebook Environment

First, install the necessary packages and set up the connection to your trace backend:

```python
# Cell 1: Setup
# Install dependencies (run once)
# !pip install opentelemetry-api opentelemetry-sdk requests pandas matplotlib

import requests
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import json

# Configuration for your trace backend
TRACE_API_URL = "https://otel.oneuptime.com/api/v1"
API_KEY = "your-api-key"  # Use environment variable in practice

class TraceClient:
    """Simple client for querying traces from the backend."""

    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def search_traces(self, service=None, operation=None,
                      min_duration_ms=None, status=None,
                      start_time=None, end_time=None, limit=100):
        """Search for traces matching the given criteria."""
        params = {"limit": limit}

        if service:
            params["service"] = service
        if operation:
            params["operation"] = operation
        if min_duration_ms:
            params["minDuration"] = f"{min_duration_ms}ms"
        if status:
            params["status"] = status
        if start_time:
            params["start"] = start_time.isoformat()
        if end_time:
            params["end"] = end_time.isoformat()

        response = requests.get(
            f"{self.base_url}/traces",
            headers=self.headers,
            params=params,
        )
        return response.json()

    def get_trace(self, trace_id):
        """Fetch a complete trace by ID."""
        response = requests.get(
            f"{self.base_url}/traces/{trace_id}",
            headers=self.headers,
        )
        return response.json()


client = TraceClient(TRACE_API_URL, API_KEY)
print("Trace client initialized")
```

## Querying and Exploring Traces

Build reusable query cells that let you explore different dimensions of your trace data:

```python
# Cell 2: Find recent error traces
end_time = datetime.utcnow()
start_time = end_time - timedelta(hours=1)

error_traces = client.search_traces(
    service="checkout-service",
    status="ERROR",
    start_time=start_time,
    end_time=end_time,
    limit=200,
)

# Convert to DataFrame for easy analysis
rows = []
for trace_data in error_traces:
    root_span = trace_data["spans"][0]
    rows.append({
        "trace_id": root_span["traceId"],
        "operation": root_span["name"],
        "duration_ms": (root_span["endTime"] - root_span["startTime"]) / 1e6,
        "error_message": root_span.get("status", {}).get("message", ""),
        "timestamp": datetime.fromtimestamp(root_span["startTime"] / 1e9),
        "span_count": len(trace_data["spans"]),
    })

df = pd.DataFrame(rows)
print(f"Found {len(df)} error traces in the last hour")
df.head(10)
```

## Analyzing Error Patterns

```python
# Cell 3: Group errors by message and visualize
error_groups = df.groupby("error_message").agg(
    count=("trace_id", "count"),
    avg_duration=("duration_ms", "mean"),
    max_duration=("duration_ms", "max"),
).sort_values("count", ascending=False)

print("Error breakdown:")
print(error_groups.to_string())

# Plot error distribution over time
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Error counts by type
error_groups["count"].head(10).plot(kind="barh", ax=ax1)
ax1.set_xlabel("Count")
ax1.set_title("Errors by Type (Last Hour)")

# Error timeline
df.set_index("timestamp").resample("5min").size().plot(ax=ax2)
ax2.set_ylabel("Error Count")
ax2.set_title("Errors Over Time (5-min buckets)")

plt.tight_layout()
plt.show()
```

## Deep Dive into a Specific Trace

```python
# Cell 4: Inspect a specific trace
# Pick the trace with the longest duration from the error set
worst_trace_id = df.loc[df["duration_ms"].idxmax(), "trace_id"]
trace_detail = client.get_trace(worst_trace_id)

def display_trace_tree(trace_data, indent=0):
    """Display a trace as an indented tree."""
    spans_by_id = {s["spanId"]: s for s in trace_data["spans"]}
    children = {}
    root = None

    for span in trace_data["spans"]:
        parent_id = span.get("parentSpanId")
        if parent_id:
            children.setdefault(parent_id, []).append(span)
        else:
            root = span

    def print_span(span, level=0):
        duration = (span["endTime"] - span["startTime"]) / 1e6
        status = "ERR" if span.get("status", {}).get("code") == "ERROR" else "OK "
        prefix = "  " * level
        service = span.get("resource", {}).get("service.name", "?")

        print(f"{prefix}{status} [{service}] {span['name']} ({duration:.1f}ms)")

        # Print error details if present
        if status == "ERR":
            msg = span.get("status", {}).get("message", "")
            if msg:
                print(f"{prefix}    Error: {msg}")

        for child in children.get(span["spanId"], []):
            print_span(child, level + 1)

    if root:
        print_span(root)

display_trace_tree(trace_detail)
```

## Latency Distribution Analysis

```python
# Cell 5: Analyze latency distributions to find anomalies
all_traces = client.search_traces(
    service="checkout-service",
    operation="POST /api/checkout",
    start_time=start_time,
    end_time=end_time,
    limit=1000,
)

durations = []
for t in all_traces:
    root = t["spans"][0]
    d = (root["endTime"] - root["startTime"]) / 1e6
    durations.append(d)

duration_series = pd.Series(durations)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Histogram
duration_series.hist(bins=50, ax=ax1)
ax1.set_xlabel("Duration (ms)")
ax1.set_ylabel("Count")
ax1.set_title("Request Duration Distribution")
ax1.axvline(duration_series.quantile(0.95), color="red",
            linestyle="--", label="p95")
ax1.legend()

# Box plot by 10-minute bucket
trace_df = pd.DataFrame({
    "duration": durations,
    "timestamp": [
        datetime.fromtimestamp(t["spans"][0]["startTime"] / 1e9)
        for t in all_traces
    ],
})
trace_df["bucket"] = trace_df["timestamp"].dt.floor("10min")
trace_df.boxplot(column="duration", by="bucket", ax=ax2, rot=45)
ax2.set_ylabel("Duration (ms)")
ax2.set_title("Duration by 10-min Bucket")

plt.tight_layout()
plt.show()

print(f"p50: {duration_series.quantile(0.50):.1f}ms")
print(f"p95: {duration_series.quantile(0.95):.1f}ms")
print(f"p99: {duration_series.quantile(0.99):.1f}ms")
```

## Building Reusable Debugging Functions

```python
# Cell 6: Reusable debugging toolkit
def compare_traces(trace_id_good, trace_id_bad):
    """
    Side-by-side comparison of a good and bad trace
    to find what differs.
    """
    good = client.get_trace(trace_id_good)
    bad = client.get_trace(trace_id_bad)

    good_spans = {s["name"]: s for s in good["spans"]}
    bad_spans = {s["name"]: s for s in bad["spans"]}

    all_names = sorted(set(good_spans.keys()) | set(bad_spans.keys()))

    rows = []
    for name in all_names:
        g = good_spans.get(name)
        b = bad_spans.get(name)
        rows.append({
            "span": name,
            "good_ms": round((g["endTime"] - g["startTime"]) / 1e6, 1) if g else None,
            "bad_ms": round((b["endTime"] - b["startTime"]) / 1e6, 1) if b else None,
            "diff_ms": (
                round((b["endTime"] - b["startTime"]) / 1e6 -
                      (g["endTime"] - g["startTime"]) / 1e6, 1)
                if g and b else None
            ),
            "in_good": g is not None,
            "in_bad": b is not None,
        })

    comparison = pd.DataFrame(rows)
    return comparison.sort_values("diff_ms", ascending=False, na_position="last")


def find_service_bottleneck(traces, service_name):
    """Find the slowest span type for a given service."""
    span_durations = {}

    for trace_data in traces:
        for span in trace_data["spans"]:
            svc = span.get("resource", {}).get("service.name")
            if svc != service_name:
                continue

            name = span["name"]
            duration = (span["endTime"] - span["startTime"]) / 1e6

            span_durations.setdefault(name, []).append(duration)

    results = []
    for name, durations in span_durations.items():
        results.append({
            "span_name": name,
            "count": len(durations),
            "avg_ms": round(sum(durations) / len(durations), 1),
            "p95_ms": round(sorted(durations)[int(len(durations) * 0.95)], 1),
            "total_ms": round(sum(durations), 1),
        })

    return pd.DataFrame(results).sort_values("total_ms", ascending=False)
```

## Saving and Sharing Notebooks

The beauty of notebooks is that they capture both your analysis and your findings. When you finish debugging, the notebook serves as documentation:

```python
# Cell 7: Summary
print("=" * 60)
print("INCIDENT ANALYSIS SUMMARY")
print("=" * 60)
print(f"Time window: {start_time} to {end_time}")
print(f"Total error traces found: {len(df)}")
print(f"Top error: {error_groups.index[0]}")
print(f"Root cause: Payment gateway timeout causing cascade")
print(f"Affected trace example: {worst_trace_id}")
print("=" * 60)
```

## Summary

Jupyter notebooks turn production debugging from a frantic grep-through-logs exercise into a structured, repeatable analysis workflow. Connect to your OpenTelemetry trace backend, use pandas for slicing and aggregation, and matplotlib for visualization. The notebook captures your debugging process as executable documentation that your team can reuse the next time a similar incident occurs. Build a library of debugging functions, share them across your team, and you will find that each incident gets resolved faster than the last.
