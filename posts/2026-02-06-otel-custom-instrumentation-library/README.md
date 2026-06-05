# How to Build a Custom OpenTelemetry Instrumentation Library

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
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind, StatusCode
from opentelemetry.propagate import extract
from opentelemetry.instrumentation.instrumentor import BaseInstrumentor
from opentelemetry.instrumentation.utils import unwrap
from opentelemetry.semconv.attributes.error_attributes import ERROR_TYPE
from opentelemetry.semconv.attributes.http_attributes import (
    HTTP_REQUEST_METHOD,
    HTTP_RESPONSE_STATUS_CODE,
    HTTP_ROUTE,
)
from opentelemetry.semconv.attributes.url_attributes import URL_SCHEME
from wrapt import wrap_function_wrapper
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
            instrumenting_module_name="opentelemetry.instrumentation.internalhttp",
            instrumenting_library_version=__version__,
            tracer_provider=tracer_provider,
        )

        # Create metrics
        meter = metrics.get_meter(
            name="opentelemetry.instrumentation.internalhttp",
            version=__version__,
            meter_provider=meter_provider,
        )

        self._request_counter = meter.create_counter(
            name="internalhttp.server.request.count",
            description="Total number of HTTP requests handled",
            unit="{request}",
        )

        self._request_duration = meter.create_histogram(
            name="http.server.request.duration",
            description="Duration of HTTP requests",
            unit="s",
        )

        # Monkey-patch the handle_request method
        wrap_function_wrapper(
            "internalhttp.server",
            "InternalHTTPServer.handle_request",
            self._instrumented_handle_request,
        )

    def _uninstrument(self, **kwargs):
        """Disable instrumentation by restoring original methods."""
        from internalhttp.server import InternalHTTPServer
        unwrap(InternalHTTPServer, "handle_request")

    def _instrumented_handle_request(self, wrapped, instance, args, kwargs):
        """Wrapped version of handle_request that creates spans and metrics."""
        method = args[0] if len(args) > 0 else kwargs["method"]
        path = args[1] if len(args) > 1 else kwargs["path"]
        headers = args[2] if len(args) > 2 else kwargs.get("headers", {})
        route = path

        # Extract trace context from incoming request headers
        ctx = extract(headers)

        # Build span attributes following semantic conventions
        attributes = {
            HTTP_REQUEST_METHOD: method,
            HTTP_ROUTE: route,
            URL_SCHEME: "http",
            "internalhttp.server.name": instance.name,
        }

        # Start a server span
        with self._tracer.start_as_current_span(
            name=f"{method} {route}",
            context=ctx,
            kind=SpanKind.SERVER,
            attributes=attributes,
        ) as span:
            start_time = time.perf_counter()
            status_code = 500

            try:
                # Call the original handler
                response = wrapped(*args, **kwargs)

                # Record response status
                status_code = response.get("status", 200)
                span.set_attribute(HTTP_RESPONSE_STATUS_CODE, status_code)

                if status_code >= 500:
                    span.set_status(StatusCode.ERROR)
                    span.set_attribute(ERROR_TYPE, str(status_code))

                return response

            except Exception as exc:
                # Record the exception on the span
                span.set_status(StatusCode.ERROR)
                span.set_attribute(ERROR_TYPE, exc.__class__.__name__)
                span.record_exception(exc)
                raise

            finally:
                # Record metrics
                duration_s = time.perf_counter() - start_time
                metric_attrs = {
                    HTTP_REQUEST_METHOD: method,
                    HTTP_ROUTE: route,
                    HTTP_RESPONSE_STATUS_CODE: status_code,
                }
                self._request_counter.add(1, metric_attrs)
                self._request_duration.record(duration_s, metric_attrs)
```

## Using the Instrumentation

Users of your instrumentation library activate it with a simple call:

```python
# app.py
from internalhttp.server import InternalHTTPServer
from opentelemetry_instrumentation_internalhttp import InternalHTTPInstrumentor
from opentelemetry import trace
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

```text
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
    "wrapt >= 1.0",
]

[project.entry-points."opentelemetry_instrumentor"]
internalhttp = "opentelemetry_instrumentation_internalhttp:InternalHTTPInstrumentor"
```

The entry point registration lets `opentelemetry-instrument` auto-discover and activate your instrumentation without any code changes.

## Testing the Instrumentation

```python
# tests/test_instrumentation.py
from internalhttp.server import InternalHTTPServer
from opentelemetry_instrumentation_internalhttp import InternalHTTPInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

def test_basic_request():
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))

    InternalHTTPInstrumentor().instrument(
        tracer_provider=provider,
        skip_dep_check=True,
    )

    server = InternalHTTPServer("test")
    server.route("/test")(lambda **kw: {"status": 200, "body": "ok"})

    server.handle_request("GET", "/test", {}, "")

    spans = exporter.get_finished_spans()
    assert len(spans) == 1
    assert spans[0].name == "GET /test"
    assert spans[0].attributes["http.request.method"] == "GET"
    assert spans[0].attributes["http.response.status_code"] == 200

    InternalHTTPInstrumentor().uninstrument()
```

## Wrapping Up

Building a custom instrumentation library is the right way to add observability to internal frameworks. The key elements are extending BaseInstrumentor, monkey-patching framework methods, following semantic conventions, and propagating context correctly. Once built, your instrumentation integrates seamlessly with the rest of the OpenTelemetry ecosystem.
