# How to Correlate Sentry Error Events with OpenTelemetry Distributed Traces for Full Request Path Visibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sentry, Error Correlation, Distributed Tracing

Description: Step-by-step guide to linking Sentry error events with OpenTelemetry distributed traces for complete request path visibility.

When an error shows up in Sentry, the first question is usually "what happened before this?" If you are using OpenTelemetry for distributed tracing, the answer is already sitting in your trace data. The trick is connecting the two. This post walks through how to correlate Sentry error events with OpenTelemetry traces so that every error comes with a full picture of the request path that led to the failure.

## The Correlation Problem

Sentry captures errors with stack traces, breadcrumbs, and context. OpenTelemetry captures the full distributed trace across services. Without correlation, you are switching between two tools and manually matching timestamps to figure out which trace belongs to which error. That is slow and error-prone.

The key to correlation is the trace ID. Both Sentry and OpenTelemetry use W3C Trace Context headers, which means they share the same `trace_id` and `span_id` format. You just need to make sure both systems are reading from the same context.

## Setting Up Shared Context

Start by initializing both the OpenTelemetry SDK and Sentry SDK in your application. The order matters here. Initialize OpenTelemetry first so that Sentry can pick up the active trace context.

```python
# tracing_setup.py - Initialize OpenTelemetry first, then Sentry
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

import sentry_sdk
from sentry_sdk.integrations.opentelemetry import OpenTelemetryIntegration

# Step 1: Set up OpenTelemetry tracing
provider = TracerProvider()
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4317")
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(provider)

# Step 2: Initialize Sentry with OpenTelemetry integration
sentry_sdk.init(
    dsn="https://your-dsn@sentry.io/project-id",
    traces_sample_rate=1.0,
    integrations=[OpenTelemetryIntegration()],
)
```

## Attaching Trace IDs to Sentry Events

With both SDKs initialized, Sentry will automatically attach the current OpenTelemetry trace ID and span ID to every error event. But you can also do this manually if you need more control.

```python
# error_handler.py - Manually attach trace context to Sentry events
from opentelemetry import trace
import sentry_sdk

def handle_request(request):
    tracer = trace.get_tracer("my-service")

    with tracer.start_as_current_span("process-request") as span:
        try:
            result = process_order(request)
            return result
        except Exception as e:
            # Get the current span context
            ctx = span.get_span_context()

            # Attach trace ID and span ID to the Sentry event
            sentry_sdk.set_context("otel_trace", {
                "trace_id": format(ctx.trace_id, "032x"),
                "span_id": format(ctx.span_id, "016x"),
                "service_name": "order-service",
            })

            # Set tags for easy searching in Sentry
            sentry_sdk.set_tag("otel.trace_id", format(ctx.trace_id, "032x"))

            # Capture the error - it now carries trace context
            sentry_sdk.capture_exception(e)
            raise
```

## Building a Lookup Workflow

Once trace IDs are attached to Sentry events, you can build a workflow for quick lookups. When you see an error in Sentry, grab the `otel.trace_id` tag and search for it in your trace backend (Jaeger, Grafana Tempo, or whatever you use).

Here is a simple script that automates this lookup:

```python
# trace_lookup.py - Look up a trace in your backend from a Sentry event
import requests

def get_trace_from_sentry_event(sentry_event_id, sentry_api_token, org_slug, project_slug):
    """Fetch a Sentry event and extract the OpenTelemetry trace ID."""
    headers = {"Authorization": f"Bearer {sentry_api_token}"}
    url = f"https://sentry.io/api/0/projects/{org_slug}/{project_slug}/events/{sentry_event_id}/"

    response = requests.get(url, headers=headers)
    event = response.json()

    # Extract the trace ID from the event context
    trace_id = event.get("contexts", {}).get("otel_trace", {}).get("trace_id")

    if trace_id:
        # Build a direct link to the trace in your trace backend
        jaeger_url = f"http://jaeger:16686/trace/{trace_id}"
        print(f"View full trace: {jaeger_url}")
        return trace_id

    print("No OpenTelemetry trace ID found on this event")
    return None
```

## Adding Sentry Event Links to Your Traces

Correlation works both ways. You might be looking at a trace and want to jump to the Sentry error. Add the Sentry event ID as a span attribute so it shows up in your trace viewer.

```python
# bidirectional_linking.py
from opentelemetry import trace
import sentry_sdk

def process_with_bidirectional_linking():
    tracer = trace.get_tracer("my-service")

    with tracer.start_as_current_span("risky-operation") as span:
        try:
            do_risky_thing()
        except Exception as e:
            # Capture in Sentry and get the event ID
            event_id = sentry_sdk.capture_exception(e)

            # Add the Sentry event ID to the OpenTelemetry span
            span.set_attribute("sentry.event_id", str(event_id))
            span.set_attribute(
                "sentry.event_url",
                f"https://sentry.io/organizations/my-org/issues/?query={event_id}"
            )

            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Querying Correlated Data

With bidirectional linking in place, you can query either system and jump to the other. In Sentry, search by `otel.trace_id` tag. In your trace backend, search by `sentry.event_id` attribute.

This is especially powerful during incident response. Instead of guessing which service caused the problem, you follow the trace from the entry point through every service call, and the Sentry error tells you exactly where and why it broke.

## Conclusion

Correlating Sentry errors with OpenTelemetry traces turns two separate data sources into a single investigation tool. The setup is straightforward: share the trace context between both SDKs, tag Sentry events with trace IDs, and optionally link back from traces to Sentry events. The payoff is immediate: every error comes with the full story of what happened across your entire system.
