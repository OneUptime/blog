# How to Create OpenTelemetry Instrumentation Libraries Shared Across Your Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation Libraries, Platform Engineering, SDK

Description: Build reusable OpenTelemetry instrumentation libraries that enforce consistent telemetry standards across all services in your platform.

When every team instruments their services independently, you get inconsistent attribute names, missing context, and telemetry data that is hard to correlate across services. One team uses `user.id`, another uses `userId`, and a third uses `customer_id` for the same concept. Dashboards break. Alerts fire incorrectly. Debugging cross-service issues becomes a guessing game.

The fix is a shared instrumentation library - a thin wrapper around the OpenTelemetry SDK that encodes your organization's telemetry standards into reusable code.

## What the Shared Library Should Do

A good shared instrumentation library handles three things:

1. **SDK initialization** with your organization's defaults (exporter endpoints, resource attributes, sampler configuration)
2. **Standard attribute helpers** that enforce naming conventions
3. **Common instrumentation patterns** for your tech stack (HTTP middleware, database wrappers, message queue handlers)

It should not try to do everything. Keep it thin and opinionated about the basics.

## Project Structure

Here is a practical structure for a Python shared library:

```
platform-otel/
    platform_otel/
        __init__.py          # Public API - init functions
        config.py            # SDK configuration and setup
        attributes.py        # Standard attribute definitions
        middleware/
            __init__.py
            http.py          # HTTP middleware instrumentation
            grpc.py          # gRPC interceptor instrumentation
            messaging.py     # Message queue instrumentation
    pyproject.toml
    tests/
```

## SDK Initialization Module

The initialization module configures the OpenTelemetry SDK with your organization's defaults. Teams import one function and get a fully configured SDK.

This module sets up tracing and metrics with standard resource attributes and exporter configuration:

```python
# platform_otel/config.py
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.semconv.resource import ResourceAttributes


def init_telemetry(service_name: str, service_version: str = "unknown"):
    """
    Initialize OpenTelemetry with platform-standard configuration.

    Call this once at application startup. It configures tracing and metrics
    with the standard collector endpoint, resource attributes, and export settings.
    """
    # Build resource with required platform attributes
    resource = Resource.create({
        ResourceAttributes.SERVICE_NAME: service_name,
        ResourceAttributes.SERVICE_VERSION: service_version,
        # These come from environment variables set by the platform
        "deployment.environment": os.getenv("DEPLOY_ENV", "development"),
        "k8s.cluster.name": os.getenv("CLUSTER_NAME", "local"),
        "platform.team": os.getenv("TEAM_NAME", "unknown"),
    })

    # Collector endpoint - defaults to the in-cluster collector
    collector_endpoint = os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "http://otel-collector.observability:4317"
    )

    # Configure tracing
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=collector_endpoint),
            max_queue_size=2048,
            max_export_batch_size=512,
        )
    )
    trace.set_tracer_provider(trace_provider)

    # Configure metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=collector_endpoint),
        export_interval_millis=30000,
    )
    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[metric_reader]))

    return trace_provider
```

## Standard Attribute Helpers

Enforce consistent attribute naming by providing helper functions instead of letting teams write raw attribute dictionaries.

These helpers ensure every service uses the same attribute keys and value formats:

```python
# platform_otel/attributes.py
from opentelemetry import trace

# Standard attribute key constants - matching your organization's conventions
USER_ID = "enduser.id"
TENANT_ID = "platform.tenant.id"
REQUEST_ID = "platform.request.id"
FEATURE_FLAG = "platform.feature_flag"


def set_user_context(user_id: str, tenant_id: str):
    """Add user and tenant info to the current span."""
    span = trace.get_current_span()
    span.set_attribute(USER_ID, user_id)
    span.set_attribute(TENANT_ID, tenant_id)


def set_request_context(request_id: str):
    """Tag the current span with the platform request ID."""
    span = trace.get_current_span()
    span.set_attribute(REQUEST_ID, request_id)


def record_business_event(event_name: str, attributes: dict = None):
    """
    Record a business event as a span event.

    Use this for domain-significant actions like 'order.placed'
    or 'subscription.upgraded'.
    """
    span = trace.get_current_span()
    safe_attrs = {f"event.{k}": str(v) for k, v in (attributes or {}).items()}
    span.add_event(event_name, attributes=safe_attrs)
```

## HTTP Middleware

Most services in a platform expose HTTP endpoints. A shared middleware ensures consistent span naming and attribute capture.

This ASGI middleware wraps incoming HTTP requests with standard tracing attributes:

```python
# platform_otel/middleware/http.py
import time
from opentelemetry import trace, metrics

_meter = metrics.get_meter("platform.http")
_request_duration = _meter.create_histogram(
    "http.server.duration",
    unit="ms",
    description="HTTP server request duration",
)


class PlatformTracingMiddleware:
    """
    ASGI middleware that adds platform-standard tracing to HTTP requests.

    Wraps each request in a span with consistent naming and records
    duration metrics with standard attributes.
    """

    def __init__(self, app):
        self.app = app
        self.tracer = trace.get_tracer("platform.http.server")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")

        start = time.monotonic()
        status_code = 500  # Default to error; overwrite on success

        with self.tracer.start_as_current_span(
            f"{method} {path}",
            kind=trace.SpanKind.SERVER,
        ) as span:
            span.set_attribute("http.method", method)
            span.set_attribute("http.target", path)

            # Capture the response status code
            async def send_wrapper(message):
                nonlocal status_code
                if message["type"] == "http.response.start":
                    status_code = message["status"]
                    span.set_attribute("http.status_code", status_code)
                await send(message)

            try:
                await self.app(scope, receive, send_wrapper)
            finally:
                duration_ms = (time.monotonic() - start) * 1000
                _request_duration.record(
                    duration_ms,
                    attributes={
                        "http.method": method,
                        "http.status_code": status_code,
                        "http.route": path,
                    },
                )
```

## Packaging and Distribution

Package the library as an internal Python package with a clear version policy.

This pyproject.toml defines the package with pinned OpenTelemetry SDK dependencies:

```toml
# pyproject.toml
[project]
name = "platform-otel"
version = "1.4.0"
description = "Shared OpenTelemetry instrumentation for the platform"
requires-python = ">=3.10"
dependencies = [
    "opentelemetry-api>=1.20.0,<2.0",
    "opentelemetry-sdk>=1.20.0,<2.0",
    "opentelemetry-exporter-otlp-proto-grpc>=1.20.0,<2.0",
]

[project.optional-dependencies]
# Teams opt-in to the middleware they need
http = ["opentelemetry-instrumentation-asgi>=0.41b0"]
grpc = ["opentelemetry-instrumentation-grpc>=0.41b0"]
```

## Adoption Strategy

Shipping a library is easy. Getting teams to use it requires more effort.

**Make the default path the instrumented path.** If your platform has a service template or scaffolding tool, bake the shared library into it. New services get instrumentation from day one.

**Provide migration scripts.** For existing services, write a codemod or script that replaces raw OpenTelemetry SDK calls with the shared library equivalents.

**Version carefully.** Breaking changes in a shared instrumentation library affect every service. Use semantic versioning and maintain a changelog. Support at least two major versions simultaneously to give teams time to migrate.

**Keep it optional.** The library should make the right thing easy, not make the wrong thing impossible. Teams that need custom behavior should be able to drop down to raw OpenTelemetry APIs without fighting the library.

A shared instrumentation library is the foundation of consistent observability across a platform. It eliminates the "every team does it differently" problem and makes telemetry data actually useful for cross-service debugging.
