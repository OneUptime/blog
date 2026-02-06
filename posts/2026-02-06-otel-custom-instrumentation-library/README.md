# How to Build a Custom OpenTelemetry Instrumentation Library for Your Internal Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, SDK, Custom Library, Python

Description: Build a custom OpenTelemetry instrumentation library that automatically instruments your internal framework with traces, metrics, and context propagation.

If your organization has an internal framework (an HTTP server wrapper, a message queue client, a custom RPC layer), the generic OpenTelemetry instrumentations will not cover it. You need to build a custom instrumentation library that hooks into your framework and produces proper spans, metrics, and context propagation automatically.

## The Instrumentation Pattern

A good instrumentation library follows these principles:

1. It should be a separate package from the framework itself
2. It should activate/deactivate without framework code changes
3. It should follow OpenTelemetry semantic conventions
4. It should propagate context correctly

## Example: Instrumenting a Custom HTTP Framework

Let's say your company has an internal Python HTTP framework called `internalhttp`. Here is how to build instrumentation for it.

First, the framework we are instrumenting (simplified):

```python
# internalhttp/server.py
class InternalHTTPServer:
    def __init__(self, name):
        self.name = name
        self.routes = {}

    def route(self, path, method="GET"):
        def decorator(func):
            self.routes[(method, path)] = func
            return func
        return decorator

    def handle_request(self, method, path, headers, body):
        handler = self.routes.get((method, path))
        if handler:
            return handler(headers=headers, body=body)
        return {"status": 404, "body": "Not Found"}
```

## The Instrumentation Library

```python
# opentelemetry_instrumentation_internalhttp/__init__.py
from opentelemetry import trace, metrics, context
from opentelemetry.trace import SpanKind, StatusCode
from opentelemetry.propagate import extract
from opentelemetry.semconv.trace import SpanAttributes
from opentelemetry.instrumentation.instrumentor import BaseInstrumentor
from opentelemetry.instrumentation.utils import unwrap
import functools
import time

# Version of this instrumentation library
__version__ = "0.1.0"


class InternalHTTPInstrumentor(BaseInstrumentor):
    """OpenTelemetry instrumentor for the InternalHTTP framework."""

    def instrumentation_dependencies(self):
        # Specify which version of the framework this works with
        return ["internalhttp >= 1.0, < 3.0"]

    def _instrument(self, **kwargs):
        """Enable instrumentation by monkey-patching the framework."""
        tracer_provider = kwargs.get("tracer_provider")
        meter_provider = kwargs.get("meter_provider")

        # Create a tracer for this instrumentation
        self._tracer = trace.get_tracer(
            instrumenting_module_name="internalhttp",
            instrumenting_library_version=__version__,
            tracer_provider=tracer_provider,
        )

        # Create metrics
        meter = metrics.get_meter(
            name="internalhttp",
            version=__version__,
            meter_provider=meter_provider,
        )

        self._request_counter = meter.create_counter(
            name="http.server.request.count",
            description="Total number of HTTP requests handled",
            unit="requests",
        )

        self._request_duration = meter.create_histogram(
            name="http.server.request.duration",
            description="Duration of HTTP requests",
            unit="ms",
        )

        # Monkey-patch the handle_request method
        from internalhttp.server import InternalHTTPServer
        self._original_handle_request = InternalHTTPServer.handle_request
        InternalHTTPServer.handle_request = self._instrumented_handle_request

    def _uninstrument(self, **kwargs):
        """Disable instrumentation by restoring original methods."""
        from internalhttp.server import InternalHTTPServer
        InternalHTTPServer.handle_request = self._original_handle_request

    def _instrumented_handle_request(self, server_self, method, path, headers, body):
        """Wrapped version of handle_request that creates spans and metrics."""

        # Extract trace context from incoming request headers
        ctx = extract(headers)

        # Build span attributes following semantic conventions
        attributes = {
            SpanAttributes.HTTP_METHOD: method,
            SpanAttributes.HTTP_TARGET: path,
            SpanAttributes.HTTP_SCHEME: "http",
            "http.server.name": server_self.name,
        }

        # Start a server span
        with self._tracer.start_as_current_span(
            name=f"{method} {path}",
            context=ctx,
            kind=SpanKind.SERVER,
            attributes=attributes,
        ) as span:
            start_time = time.time()

            try:
                # Call the original handler
                response = self._original_handle_request(
                    server_self, method, path, headers, body
                )

                # Record response status
                status_code = response.get("status", 200)
                span.set_attribute(SpanAttributes.HTTP_STATUS_CODE, status_code)

                if status_code >= 400:
                    span.set_status(StatusCode.ERROR, f"HTTP {status_code}")

                return response

            except Exception as exc:
                # Record the exception on the span
                span.set_status(StatusCode.ERROR, str(exc))
                span.record_exception(exc)
                raise

            finally:
                # Record metrics
                duration_ms = (time.time() - start_time) * 1000
                metric_attrs = {
                    "http.method": method,
                    "http.route": path,
                    "http.status_code": str(response.get("status", 500)),
                }
                self._request_counter.add(1, metric_attrs)
                self._request_duration.record(duration_ms, metric_attrs)
```

## Using the Instrumentation

Users of your instrumentation library activate it with a simple call:

```python
# app.py
from internalhttp.server import InternalHTTPServer
from opentelemetry_instrumentation_internalhttp import InternalHTTPInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Set up tracing
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
)
trace.set_tracer_provider(provider)

# Enable instrumentation - one line
InternalHTTPInstrumentor().instrument()

# Use the framework normally - traces are automatic
app = InternalHTTPServer("my-service")

@app.route("/api/users", method="GET")
def get_users(headers, body):
    return {"status": 200, "body": [{"id": 1, "name": "Alice"}]}
```

## Package Setup

Structure your instrumentation as a proper Python package:

```
opentelemetry-instrumentation-internalhttp/
    pyproject.toml
    src/
        opentelemetry_instrumentation_internalhttp/
            __init__.py
            package.py
            version.py
```

```toml
# pyproject.toml
[project]
name = "opentelemetry-instrumentation-internalhttp"
version = "0.1.0"
dependencies = [
    "opentelemetry-api >= 1.0",
    "opentelemetry-instrumentation >= 0.40",
    "opentelemetry-semantic-conventions >= 0.40",
]

[project.entry-points."opentelemetry_instrumentor"]
internalhttp = "opentelemetry_instrumentation_internalhttp:InternalHTTPInstrumentor"
```

The entry point registration lets `opentelemetry-instrument` auto-discover and activate your instrumentation without any code changes.

## Testing the Instrumentation

```python
# tests/test_instrumentation.py
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

def test_basic_request():
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))

    InternalHTTPInstrumentor().instrument(tracer_provider=provider)

    server = InternalHTTPServer("test")
    server.route("/test")(lambda **kw: {"status": 200, "body": "ok"})

    server.handle_request("GET", "/test", {}, "")

    spans = exporter.get_finished_spans()
    assert len(spans) == 1
    assert spans[0].name == "GET /test"
    assert spans[0].attributes["http.method"] == "GET"
    assert spans[0].attributes["http.status_code"] == 200

    InternalHTTPInstrumentor().uninstrument()
```

## Wrapping Up

Building a custom instrumentation library is the right way to add observability to internal frameworks. The key elements are extending BaseInstrumentor, monkey-patching framework methods, following semantic conventions, and propagating context correctly. Once built, your instrumentation integrates seamlessly with the rest of the OpenTelemetry ecosystem.
