# How to Implement Per-Tenant Observability Isolation in Multi-Tenant SaaS with OpenTelemetry Resource Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Tenant, SaaS, Resource Attributes

Description: Learn how to isolate observability data per tenant in a multi-tenant SaaS platform using OpenTelemetry resource attributes and context propagation.

Multi-tenant SaaS platforms face a unique challenge: you need to observe everything happening in your system while keeping each tenant's data logically separated. If a tenant reports slowness, you need to filter down to their traces, metrics, and logs without wading through noise from other tenants. OpenTelemetry resource attributes give you a clean way to tag all telemetry data with tenant identity from the very start.

## Why Resource Attributes Matter for Tenant Isolation

Resource attributes in OpenTelemetry describe the entity producing telemetry. Unlike span attributes (which apply to individual operations), resource attributes apply to every signal emitted by a service instance. When you set `tenant.id` as a resource attribute, every trace, metric, and log from that request pipeline carries the tenant context automatically.

The alternative is manually adding tenant IDs to every span and metric. That approach is fragile and easy to forget in new code paths.

## Setting Up a Tenant-Aware Resource Provider

Here is how you can build a custom resource detector that pulls tenant information from the incoming request context:

```python
# tenant_resource.py
from opentelemetry.sdk.resources import Resource, ResourceDetector
from contextvars import ContextVar

# Context variable to hold tenant info for the current request
current_tenant = ContextVar('current_tenant', default=None)

class TenantResourceDetector(ResourceDetector):
    """Detects tenant information and attaches it as resource attributes."""

    def detect(self) -> Resource:
        tenant = current_tenant.get()
        if tenant is None:
            return Resource.get_empty()

        return Resource.create({
            "tenant.id": tenant["id"],
            "tenant.name": tenant["name"],
            "tenant.plan": tenant["plan"],  # free, pro, enterprise
            "tenant.region": tenant["region"],
        })
```

Since resource attributes are typically set at SDK initialization (and tenants change per request), you will need a different strategy. The better approach for multi-tenant apps is to use span attributes combined with a SpanProcessor that enriches every span:

```python
# tenant_span_processor.py
from opentelemetry.sdk.trace import SpanProcessor
from opentelemetry.trace import Span

class TenantSpanProcessor(SpanProcessor):
    """Injects tenant context into every span automatically."""

    def on_start(self, span: Span, parent_context=None):
        tenant = current_tenant.get()
        if tenant:
            span.set_attribute("tenant.id", tenant["id"])
            span.set_attribute("tenant.name", tenant["name"])
            span.set_attribute("tenant.plan", tenant["plan"])

    def on_end(self, span):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

## Middleware to Extract Tenant Context

You need middleware that runs early in the request lifecycle to populate the tenant context variable:

```python
# middleware.py
from fastapi import Request
from tenant_resource import current_tenant

async def tenant_context_middleware(request: Request, call_next):
    # Extract tenant from JWT, API key, subdomain, or header
    tenant_id = request.headers.get("X-Tenant-ID")
    if tenant_id:
        tenant_info = await resolve_tenant(tenant_id)
        token = current_tenant.set(tenant_info)
        try:
            response = await call_next(request)
            return response
        finally:
            current_tenant.reset(token)
    return await call_next(request)

async def resolve_tenant(tenant_id: str) -> dict:
    # Look up tenant details from cache or database
    return {
        "id": tenant_id,
        "name": "Acme Corp",
        "plan": "enterprise",
        "region": "us-east-1",
    }
```

## Configuring the OpenTelemetry SDK

Wire the custom processor into your SDK configuration:

```python
# tracing_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from tenant_span_processor import TenantSpanProcessor

def setup_tracing():
    provider = TracerProvider()

    # Add the tenant processor first so it runs on every span
    provider.add_span_processor(TenantSpanProcessor())

    # Then add the export processor
    otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317")
    provider.add_span_processor(BatchSpanExporter(otlp_exporter))

    trace.set_tracer_provider(provider)
```

## Filtering Telemetry by Tenant in the Collector

On the OpenTelemetry Collector side, you can use the `filter` processor to route tenant data to different backends or apply sampling:

```yaml
# otel-collector-config.yaml
processors:
  filter/enterprise:
    traces:
      include:
        match_type: strict
        resource_attributes:
          - key: tenant.plan
            value: enterprise

  filter/free:
    traces:
      include:
        match_type: strict
        resource_attributes:
          - key: tenant.plan
            value: free

  # Sample free-tier tenants more aggressively to control costs
  probabilistic_sampler/free:
    sampling_percentage: 10

exporters:
  otlp/enterprise:
    endpoint: enterprise-backend:4317
  otlp/free:
    endpoint: free-backend:4317

service:
  pipelines:
    traces/enterprise:
      receivers: [otlp]
      processors: [filter/enterprise]
      exporters: [otlp/enterprise]
    traces/free:
      receivers: [otlp]
      processors: [filter/free, probabilistic_sampler/free]
      exporters: [otlp/free]
```

## Querying Tenant-Specific Data

With tenant attributes on every span, you can query your observability backend with precision. For example, in a system like OneUptime, you can filter traces by `tenant.id = "acme-123"` to see exactly what that tenant experienced, including latency, errors, and dependency calls.

You can also build per-tenant SLO dashboards by grouping metrics on the `tenant.id` attribute. This is particularly useful when you have contractual SLAs with enterprise customers and need to prove compliance.

## Key Takeaways

Tenant isolation in observability is not just about filtering. It is about building a system where tenant context flows through every layer of your telemetry pipeline. Start with a context variable and a SpanProcessor, propagate tenant identity through your middleware, and use the Collector to route and sample per tenant. This gives you the ability to debug tenant-specific issues quickly while keeping your observability costs under control.
