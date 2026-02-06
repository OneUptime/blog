# How to Configure Tenant Isolation with Separate Pipelines and Dedicated Exporters per Tenant in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Tenant, Pipeline Isolation, Collector, Exporters

Description: Set up complete tenant isolation in the OpenTelemetry Collector with dedicated pipelines and exporters for each tenant.

When you need strict data isolation between tenants, partial routing is not enough. You need fully separate pipelines with dedicated exporters, processors, and potentially different configurations per tenant. This is common in regulated industries where tenant data must never be co-mingled, even temporarily.

This post covers how to set up complete tenant isolation in the OpenTelemetry Collector.

## Architecture Overview

The pattern is straightforward: one shared receiver accepts all incoming data, a routing connector splits it by tenant, and then each tenant gets a completely independent pipeline with its own processors and exporters.

```
OTLP Receiver --> Routing Connector --> Tenant A Pipeline --> Tenant A Exporter
                                    --> Tenant B Pipeline --> Tenant B Exporter
                                    --> Tenant C Pipeline --> Tenant C Exporter
                                    --> Default Pipeline   --> Default Exporter
```

## Complete Configuration

Here is a full configuration demonstrating tenant isolation for three tenants:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        include_metadata: true
      http:
        endpoint: "0.0.0.0:4318"
        include_metadata: true

connectors:
  routing/tenant:
    default_pipelines: [traces/default, metrics/default, logs/default]
    match_once: true
    table:
      - statement: request["X-Tenant-ID"] == "acme-corp"
        pipelines: [traces/acme, metrics/acme, logs/acme]
      - statement: request["X-Tenant-ID"] == "globex"
        pipelines: [traces/globex, metrics/globex, logs/globex]
      - statement: request["X-Tenant-ID"] == "initech"
        pipelines: [traces/initech, metrics/initech, logs/initech]

processors:
  # Each tenant can have different batch settings
  batch/acme:
    timeout: 5s
    send_batch_size: 1024
  batch/globex:
    timeout: 10s
    send_batch_size: 512
  batch/initech:
    timeout: 5s
    send_batch_size: 256
  batch/default:
    timeout: 10s
    send_batch_size: 512

  # Tenant-specific attribute injection
  attributes/acme:
    actions:
      - key: tenant.id
        value: "acme-corp"
        action: upsert
  attributes/globex:
    actions:
      - key: tenant.id
        value: "globex"
        action: upsert
  attributes/initech:
    actions:
      - key: tenant.id
        value: "initech"
        action: upsert

  # Different sampling rates per tenant tier
  probabilistic_sampler/acme:
    sampling_percentage: 100
  probabilistic_sampler/globex:
    sampling_percentage: 50
  probabilistic_sampler/initech:
    sampling_percentage: 25

exporters:
  # Dedicated endpoints per tenant
  otlp/acme:
    endpoint: "acme.backend.internal:4317"
    tls:
      cert_file: /etc/ssl/certs/acme-client.crt
      key_file: /etc/ssl/private/acme-client.key
    headers:
      Authorization: "Bearer ${ACME_API_TOKEN}"
  otlp/globex:
    endpoint: "globex.backend.internal:4317"
    tls:
      cert_file: /etc/ssl/certs/globex-client.crt
      key_file: /etc/ssl/private/globex-client.key
    headers:
      Authorization: "Bearer ${GLOBEX_API_TOKEN}"
  otlp/initech:
    endpoint: "initech.backend.internal:4317"
    tls:
      cert_file: /etc/ssl/certs/initech-client.crt
      key_file: /etc/ssl/private/initech-client.key
    headers:
      Authorization: "Bearer ${INITECH_API_TOKEN}"
  otlp/default:
    endpoint: "default.backend.internal:4317"

service:
  pipelines:
    # Ingress pipelines (shared entry point)
    traces/ingress:
      receivers: [otlp]
      exporters: [routing/tenant]
    metrics/ingress:
      receivers: [otlp]
      exporters: [routing/tenant]
    logs/ingress:
      receivers: [otlp]
      exporters: [routing/tenant]

    # Acme Corp pipelines
    traces/acme:
      receivers: [routing/tenant]
      processors: [attributes/acme, probabilistic_sampler/acme, batch/acme]
      exporters: [otlp/acme]
    metrics/acme:
      receivers: [routing/tenant]
      processors: [attributes/acme, batch/acme]
      exporters: [otlp/acme]
    logs/acme:
      receivers: [routing/tenant]
      processors: [attributes/acme, batch/acme]
      exporters: [otlp/acme]

    # Globex pipelines
    traces/globex:
      receivers: [routing/tenant]
      processors: [attributes/globex, probabilistic_sampler/globex, batch/globex]
      exporters: [otlp/globex]
    metrics/globex:
      receivers: [routing/tenant]
      processors: [attributes/globex, batch/globex]
      exporters: [otlp/globex]
    logs/globex:
      receivers: [routing/tenant]
      processors: [attributes/globex, batch/globex]
      exporters: [otlp/globex]

    # Initech pipelines
    traces/initech:
      receivers: [routing/tenant]
      processors: [attributes/initech, probabilistic_sampler/initech, batch/initech]
      exporters: [otlp/initech]
    metrics/initech:
      receivers: [routing/tenant]
      processors: [attributes/initech, batch/initech]
      exporters: [otlp/initech]
    logs/initech:
      receivers: [routing/tenant]
      processors: [attributes/initech, batch/initech]
      exporters: [otlp/initech]

    # Default pipelines
    traces/default:
      receivers: [routing/tenant]
      processors: [batch/default]
      exporters: [otlp/default]
    metrics/default:
      receivers: [routing/tenant]
      processors: [batch/default]
      exporters: [otlp/default]
    logs/default:
      receivers: [routing/tenant]
      processors: [batch/default]
      exporters: [otlp/default]
```

## Managing Configuration at Scale

With more than a handful of tenants, this configuration grows quickly. A practical solution is to generate the config from a template. Here is a simple Python script that does this:

```python
import yaml

# Define tenants and their settings
tenants = {
    "acme-corp": {"endpoint": "acme.backend.internal:4317", "sampling": 100, "batch_size": 1024},
    "globex": {"endpoint": "globex.backend.internal:4317", "sampling": 50, "batch_size": 512},
    "initech": {"endpoint": "initech.backend.internal:4317", "sampling": 25, "batch_size": 256},
}

# Generate exporter configs
exporters = {}
for tenant_id, settings in tenants.items():
    safe_name = tenant_id.replace("-", "_")
    exporters[f"otlp/{safe_name}"] = {
        "endpoint": settings["endpoint"],
    }

print(yaml.dump({"exporters": exporters}, default_flow_style=False))
```

## Memory and Resource Isolation

Each pipeline runs its own set of processors, which means memory usage scales linearly with the number of tenants. Monitor the Collector's own metrics to track per-pipeline queue sizes:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: "0.0.0.0:8888"
```

Watch `otelcol_exporter_queue_size` and `otelcol_exporter_queue_capacity` per exporter to spot tenants that are backing up.

## When to Use This Pattern

Use full tenant isolation when you have a small to medium number of tenants (under 50) and strict isolation requirements. For larger numbers of tenants, consider using the routing connector with a shared pipeline per tier instead, since maintaining hundreds of separate pipelines becomes unwieldy.

The trade-off is clear: you get strong isolation guarantees at the cost of configuration complexity and higher resource usage. For many regulated environments, that trade-off is worth making.
