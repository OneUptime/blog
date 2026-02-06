# How to Forward OpenTelemetry Span Error Events to Rollbar for Centralized Error Grouping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rollbar, Error Forwarding, Span Events

Description: Learn how to build a custom span processor that forwards OpenTelemetry error span events to Rollbar for centralized grouping.

Rollbar is built for error grouping and tracking. OpenTelemetry is built for distributed tracing. If you want Rollbar to handle your error management while OpenTelemetry handles your tracing, you need a bridge between them. This post shows how to build a custom OpenTelemetry span processor that detects error events on spans and forwards them to Rollbar's API.

## The Approach

OpenTelemetry records exceptions as span events. When you call `span.recordException(error)`, it creates an event on that span with the exception type, message, and stack trace. We will build a custom `SpanProcessor` that inspects completed spans, checks for exception events, and sends them to Rollbar via their REST API.

## Building the Rollbar Span Processor

```python
# rollbar_span_processor.py
import requests
import json
from opentelemetry.sdk.trace import SpanProcessor

class RollbarSpanProcessor(SpanProcessor):
    """
    A custom span processor that forwards exception events
    from OpenTelemetry spans to Rollbar.
    """

    def __init__(self, rollbar_token, environment="production"):
        self.rollbar_token = rollbar_token
        self.environment = environment
        self.rollbar_url = "https://api.rollbar.com/api/1/item/"

    def on_start(self, span, parent_context=None):
        # Nothing to do when a span starts
        pass

    def on_end(self, span):
        # Check if the span has any exception events
        for event in span.events:
            if event.name == "exception":
                self._send_to_rollbar(span, event)

    def _send_to_rollbar(self, span, exception_event):
        """Extract exception details and send to Rollbar API."""
        attrs = exception_event.attributes

        # Build the Rollbar payload from OpenTelemetry span data
        payload = {
            "access_token": self.rollbar_token,
            "data": {
                "environment": self.environment,
                "body": {
                    "trace": {
                        "frames": self._parse_stack_trace(
                            attrs.get("exception.stacktrace", "")
                        ),
                        "exception": {
                            "class": attrs.get("exception.type", "UnknownError"),
                            "message": attrs.get("exception.message", "No message"),
                        },
                    }
                },
                "level": "error",
                "custom": {
                    "otel_trace_id": format(span.context.trace_id, "032x"),
                    "otel_span_id": format(span.context.span_id, "016x"),
                    "service_name": span.resource.attributes.get(
                        "service.name", "unknown"
                    ),
                    "span_name": span.name,
                },
                "server": {
                    "host": span.resource.attributes.get("host.name", "unknown"),
                },
            },
        }

        try:
            response = requests.post(
                self.rollbar_url,
                json=payload,
                timeout=5,
            )
            response.raise_for_status()
        except requests.RequestException as e:
            # Log but do not crash - observability should not break the app
            print(f"Failed to send error to Rollbar: {e}")

    def _parse_stack_trace(self, stacktrace_str):
        """Parse a stack trace string into Rollbar frame format."""
        frames = []
        if not stacktrace_str:
            return frames

        for line in stacktrace_str.strip().split("\n"):
            line = line.strip()
            if line.startswith("File "):
                # Parse Python stack trace format
                parts = line.split(",")
                if len(parts) >= 2:
                    filename = parts[0].replace('File "', "").replace('"', "")
                    lineno = parts[1].strip().replace("line ", "")
                    frames.append({
                        "filename": filename,
                        "lineno": int(lineno) if lineno.isdigit() else 0,
                    })

        return frames

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

## Registering the Processor

Add the Rollbar processor alongside your normal trace exporter:

```python
# tracing_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from rollbar_span_processor import RollbarSpanProcessor

# Create the tracer provider with service info
resource = Resource.create({
    "service.name": "order-service",
    "service.version": "2.1.0",
    "deployment.environment": "production",
})

provider = TracerProvider(resource=resource)

# Add the standard OTLP exporter for traces
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4317")
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Add the Rollbar processor for error forwarding
rollbar_processor = RollbarSpanProcessor(
    rollbar_token="your-rollbar-access-token",
    environment="production",
)
provider.add_span_processor(rollbar_processor)

trace.set_tracer_provider(provider)
```

## Using It in Application Code

Your application code does not need to change at all. Just use the standard OpenTelemetry API for recording exceptions:

```python
# order_service.py
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def process_order(order_id):
    with tracer.start_as_current_span("process-order") as span:
        span.set_attribute("order.id", order_id)

        try:
            validate_order(order_id)
            charge_payment(order_id)
            fulfill_order(order_id)
        except ValueError as e:
            # This exception will be sent to both your trace backend
            # AND Rollbar automatically via the RollbarSpanProcessor
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Adding Batch Support

The processor above sends errors synchronously, which adds latency. For production, wrap the Rollbar calls in a background queue:

```python
# rollbar_batch_processor.py
from concurrent.futures import ThreadPoolExecutor
from opentelemetry.sdk.trace import SpanProcessor

class BatchedRollbarSpanProcessor(SpanProcessor):
    """Sends errors to Rollbar in a background thread pool."""

    def __init__(self, rollbar_token, environment="production", max_workers=2):
        self.rollbar_token = rollbar_token
        self.environment = environment
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.rollbar_url = "https://api.rollbar.com/api/1/item/"

    def on_end(self, span):
        for event in span.events:
            if event.name == "exception":
                # Submit to thread pool instead of blocking
                self.executor.submit(self._send_to_rollbar, span, event)

    def shutdown(self):
        self.executor.shutdown(wait=True)
```

## Verifying in Rollbar

After deploying, trigger an error and check Rollbar. You should see the error with `otel_trace_id` in the custom data section. This lets you click through from Rollbar to your trace backend for the full distributed trace context.

## Conclusion

Building a custom span processor is a clean way to bridge OpenTelemetry and Rollbar. Errors get grouped and tracked in Rollbar while traces flow to your preferred backend. The trace IDs in the Rollbar payload let you jump between the two systems during incident investigations.
