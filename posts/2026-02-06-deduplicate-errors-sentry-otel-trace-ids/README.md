# How to Deduplicate Error Reports by Correlating Sentry Issues with OpenTelemetry Trace IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sentry, Deduplication, Error Tracking

Description: Reduce alert noise by deduplicating Sentry error reports using OpenTelemetry trace IDs to correlate related failures.

A single failed request in a microservices system can trigger errors in multiple services. The payment service fails, which causes the order service to fail, which causes the API gateway to return a 500. Without deduplication, you get three separate Sentry alerts for what is actually one incident. OpenTelemetry trace IDs give you the connection between these errors. This post shows how to use that connection to deduplicate error reports.

## The Problem: Cascading Error Alerts

Consider a request that flows through three services:

```
Client -> API Gateway -> Order Service -> Payment Service
```

If the Payment Service throws a `PaymentDeclinedException`, the error cascades:
1. Payment Service records the original error.
2. Order Service catches a `ServiceCallFailedError` from calling Payment Service.
3. API Gateway catches a `DownstreamError` from calling Order Service.

All three services report to Sentry. Three issues. Three alerts. One root cause.

## Using Trace IDs for Correlation

All three spans share the same OpenTelemetry trace ID because they are part of the same distributed trace. By attaching the trace ID to each Sentry event, you can identify that these three errors belong to the same request.

```python
# sentry_otel_dedup.py - Attach trace context to Sentry events
import sentry_sdk
from opentelemetry import trace

def init_sentry_with_trace_context():
    sentry_sdk.init(
        dsn="https://your-dsn@sentry.io/project",
        before_send=attach_trace_context,
    )

def attach_trace_context(event, hint):
    """
    Sentry before_send hook that attaches the current
    OpenTelemetry trace ID and span ID to every error event.
    """
    span = trace.get_current_span()
    if span and span.get_span_context().is_valid:
        ctx = span.get_span_context()
        trace_id = format(ctx.trace_id, "032x")
        span_id = format(ctx.span_id, "016x")

        # Add as tags for searching
        event.setdefault("tags", {})
        event["tags"]["otel.trace_id"] = trace_id
        event["tags"]["otel.span_id"] = span_id

        # Add as fingerprint component to help Sentry group
        # events from the same trace together
        event.setdefault("fingerprint", [])
        event["fingerprint"].append(trace_id)

        # Add context for the event detail view
        event.setdefault("contexts", {})
        event["contexts"]["trace"] = {
            "trace_id": trace_id,
            "span_id": span_id,
        }

    return event
```

## Building a Deduplication Layer

You can build a deduplication layer that sits between your services and Sentry. This layer groups events by trace ID and only sends the root cause.

```python
# dedup_processor.py - Deduplicate errors by trace ID
import time
from collections import defaultdict
from threading import Lock, Timer

class ErrorDeduplicator:
    """
    Collects errors from multiple services, groups them by trace ID,
    and only forwards the root cause to Sentry.
    """

    def __init__(self, flush_interval_seconds=5):
        self.pending = defaultdict(list)  # trace_id -> list of errors
        self.lock = Lock()
        self.flush_interval = flush_interval_seconds
        self._start_flush_timer()

    def add_error(self, trace_id, error_data):
        """Add an error to the pending buffer."""
        with self.lock:
            self.pending[trace_id].append({
                "timestamp": time.time(),
                "service": error_data.get("service"),
                "exception_type": error_data.get("exception_type"),
                "message": error_data.get("message"),
                "span_id": error_data.get("span_id"),
                "is_root_span": error_data.get("is_root_span", False),
            })

    def flush(self):
        """
        Process pending errors. For each trace ID, identify the
        root cause and discard the cascading errors.
        """
        with self.lock:
            pending = dict(self.pending)
            self.pending.clear()

        for trace_id, errors in pending.items():
            root_cause = self._find_root_cause(errors)
            cascading = [e for e in errors if e != root_cause]

            # Send only the root cause to Sentry
            self._send_to_sentry(root_cause, trace_id, len(cascading))

    def _find_root_cause(self, errors):
        """
        Identify the root cause error from a set of related errors.

        Heuristics:
        1. The earliest error in the trace is likely the root cause.
        2. Errors from leaf services (not root spans) are more likely
           to be the actual source.
        3. Certain exception types indicate root causes vs. propagation.
        """
        # Sort by timestamp - earliest first
        sorted_errors = sorted(errors, key=lambda e: e["timestamp"])

        # Prefer non-root-span errors (deeper in the call chain)
        leaf_errors = [e for e in sorted_errors if not e["is_root_span"]]

        if leaf_errors:
            return leaf_errors[0]

        # Fall back to the earliest error
        return sorted_errors[0]

    def _send_to_sentry(self, error, trace_id, cascading_count):
        """Send the deduplicated error to Sentry."""
        sentry_sdk.capture_message(
            f"[{error['service']}] {error['exception_type']}: {error['message']}",
            level="error",
            extras={
                "trace_id": trace_id,
                "root_cause_service": error["service"],
                "cascading_errors_suppressed": cascading_count,
            },
        )

    def _start_flush_timer(self):
        """Periodically flush pending errors."""
        timer = Timer(self.flush_interval, self._timer_flush)
        timer.daemon = True
        timer.start()

    def _timer_flush(self):
        self.flush()
        self._start_flush_timer()
```

## Using the Sentry API for Post-Hoc Deduplication

If you prefer not to add a deduplication layer, you can deduplicate after the fact using the Sentry API:

```python
# sentry_dedup_report.py - Find duplicate errors sharing the same trace
import requests

def find_duplicates(org_slug, project_slug, api_token):
    """
    Query Sentry for recent errors and group them by trace ID.
    Returns groups with more than one error (potential duplicates).
    """
    headers = {"Authorization": f"Bearer {api_token}"}
    url = f"https://sentry.io/api/0/projects/{org_slug}/{project_slug}/events/"

    response = requests.get(
        url,
        headers=headers,
        params={"query": "has:otel.trace_id", "limit": 100},
    )
    events = response.json()

    # Group by trace ID
    trace_groups = defaultdict(list)
    for event in events:
        trace_id = event.get("tags", {}).get("otel.trace_id")
        if trace_id:
            trace_groups[trace_id].append({
                "event_id": event["eventID"],
                "title": event["title"],
                "timestamp": event["dateCreated"],
            })

    # Find trace IDs with multiple errors
    duplicates = {
        tid: events
        for tid, events in trace_groups.items()
        if len(events) > 1
    }

    return duplicates
```

## Results

After implementing trace-based deduplication, teams typically see a 40-60% reduction in Sentry alert volume. The remaining alerts are more actionable because each one points to a unique root cause rather than a symptom of a cascade.

## Conclusion

OpenTelemetry trace IDs are the natural key for deduplicating error reports across services. Whether you build a real-time deduplication layer or do it post-hoc through the Sentry API, the trace ID tells you which errors belong to the same failed request. Fewer duplicate alerts means faster triage and less alert fatigue for your on-call team.
