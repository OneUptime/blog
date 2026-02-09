# How to Implement Multi-Tenant Routing in the Collector Using the Routing Connector with Tenant ID HTTP Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Tenant, Routing Connector, Collector, HTTP Headers

Description: Learn how to configure the OpenTelemetry Collector routing connector to route telemetry data based on tenant ID HTTP headers for multi-tenant architectures.

If you are running a SaaS platform or any multi-tenant system, you probably need to route telemetry data from different tenants to different backends or storage systems. The OpenTelemetry Collector's routing connector makes this straightforward by letting you inspect incoming request metadata (like HTTP headers) and direct data to the right pipeline.

In this post, we will walk through setting up the routing connector to use tenant ID HTTP headers for routing decisions.

## Why Multi-Tenant Routing Matters

When multiple tenants share a single Collector deployment, you need a way to keep their data separate. Some tenants might have compliance requirements that mandate data residency in specific regions. Others might be on different pricing tiers with different retention policies. The routing connector solves this by evaluating conditions on each piece of telemetry and forwarding it to the appropriate pipeline.

## Prerequisites

You will need the OpenTelemetry Collector Contrib distribution, since the routing connector ships in contrib. Make sure you are running version 0.92.0 or later.

## Setting Up the OTLP Receiver with Header Extraction

First, configure the OTLP receiver to include HTTP headers in the context. This is key because the routing connector needs access to those headers.

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        # Include metadata lets us access headers in routing
        include_metadata: true
      http:
        endpoint: "0.0.0.0:4318"
        include_metadata: true
```

The `include_metadata: true` setting passes along HTTP headers (and gRPC metadata) so downstream components can read them.

## Configuring the Routing Connector

The routing connector sits between pipelines. It receives data from one pipeline and routes it to one or more output pipelines based on conditions you define.

```yaml
connectors:
  routing:
    # The default route handles tenants that do not match any rule
    default_pipelines: [traces/default]
    # We want to match on the X-Tenant-ID header from gRPC metadata
    match_once: true
    table:
      # Route tenant-a to a dedicated pipeline
      - statement: request["X-Tenant-ID"] == "tenant-a"
        pipelines: [traces/tenant-a]
      # Route tenant-b to its own pipeline
      - statement: request["X-Tenant-ID"] == "tenant-b"
        pipelines: [traces/tenant-b]
      # You can also match multiple tenants to a shared pipeline
      - statement: request["X-Tenant-ID"] == "tenant-c" or request["X-Tenant-ID"] == "tenant-d"
        pipelines: [traces/shared-tier]
```

The `request` context gives you access to the incoming request metadata. For HTTP, this includes any custom headers your clients send. For gRPC, it maps to metadata keys.

## Defining Per-Tenant Pipelines

Now wire everything together with per-tenant exporters and pipelines:

```yaml
exporters:
  otlp/tenant-a:
    endpoint: "tenant-a-backend.internal:4317"
    tls:
      insecure: false
  otlp/tenant-b:
    endpoint: "tenant-b-backend.internal:4317"
    tls:
      insecure: false
  otlp/shared:
    endpoint: "shared-backend.internal:4317"
    tls:
      insecure: false
  otlp/default:
    endpoint: "default-backend.internal:4317"
    tls:
      insecure: false

service:
  pipelines:
    # The input pipeline feeds the routing connector
    traces/input:
      receivers: [otlp]
      exporters: [routing]
    # Per-tenant output pipelines
    traces/tenant-a:
      receivers: [routing]
      exporters: [otlp/tenant-a]
    traces/tenant-b:
      receivers: [routing]
      exporters: [otlp/tenant-b]
    traces/shared-tier:
      receivers: [routing]
      exporters: [otlp/shared]
    traces/default:
      receivers: [routing]
      exporters: [otlp/default]
```

Notice the flow: data enters through `traces/input`, gets evaluated by the routing connector, and ends up in the matching pipeline.

## Sending Data with Tenant Headers

Your application code needs to include the tenant ID header. Here is an example using Python:

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Pass tenant ID as metadata for gRPC
exporter = OTLPSpanExporter(
    endpoint="collector.internal:4317",
    headers={"X-Tenant-ID": "tenant-a"},
)
```

For HTTP exporters, the header is passed in the standard way:

```python
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(
    endpoint="http://collector.internal:4318/v1/traces",
    headers={"X-Tenant-ID": "tenant-b"},
)
```

## Adding Processors Per Tenant

You can also add tenant-specific processing. For example, you might want to sample more aggressively for free-tier tenants:

```yaml
processors:
  probabilistic_sampler/free-tier:
    sampling_percentage: 10
  probabilistic_sampler/paid-tier:
    sampling_percentage: 100

service:
  pipelines:
    traces/shared-tier:
      receivers: [routing]
      processors: [probabilistic_sampler/free-tier]
      exporters: [otlp/shared]
    traces/tenant-a:
      receivers: [routing]
      processors: [probabilistic_sampler/paid-tier]
      exporters: [otlp/tenant-a]
```

## Handling Missing Headers

If a request arrives without the `X-Tenant-ID` header, it falls through to the `default_pipelines`. Make sure your default pipeline has appropriate handling - you might want to add a log statement or metric to track how often this happens so you can fix misconfigured clients.

## Performance Considerations

The routing connector evaluates conditions in order and stops at the first match when `match_once: true` is set. Put your most common tenants first in the routing table to minimize evaluation overhead. If you have hundreds of tenants, consider grouping them by tier and routing at the tier level instead of per-tenant.

Multi-tenant routing with the Collector is a clean way to isolate tenant data without running separate Collector instances per tenant. It centralizes your routing logic in configuration rather than spreading it across application code.
