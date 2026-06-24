# How to Use Consul Service Discovery with the OpenTelemetry Collector Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Consul, Service Discovery, Receiver Creator, Dynamic Target

Description: Use Consul service discovery with the OpenTelemetry Collector receiver creator to dynamically discover and scrape metric endpoints.

Static target lists in your Collector configuration become a maintenance burden as services scale up and down. The Prometheus receiver, using Prometheus Consul service discovery, automatically discovers services registered in Consul and scrapes their metric endpoints. When a new service instance appears, the Collector starts scraping it. When it disappears, scraping stops.

## Architecture

The flow works like this:

1. The Prometheus receiver queries Consul for service registration changes
2. Consul service discovery returns the current set of scrape targets
3. The Prometheus receiver starts collecting metrics from the discovered endpoints
4. When the service deregisters, the target is removed from the scrape set

## Setting Up Consul Service Discovery

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "consul-services"
          scrape_interval: 15s
          metrics_path: "/metrics"
          consul_sd_configs:
            - server: "consul.service.consul:8500"
              # Filter which services to observe
              # Empty means all services
              services: ["payment-service", "order-service", "user-service"]
              # How often to poll Consul for changes
              refresh_interval: 30s
              # Consul ACL token (if ACLs are enabled)
              token: "${env:CONSUL_HTTP_TOKEN}"
```

## Configuring Dynamic Scrapes

The Prometheus receiver uses the `consul_sd_configs` block to discover endpoints and then applies relabeling rules to decide which targets to keep:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "consul-services"
          scrape_interval: 15s
          metrics_path: "/metrics"
          consul_sd_configs:
            - server: "consul.service.consul:8500"
          relabel_configs:
            # Keep only healthy Consul service instances
            - source_labels: [__meta_consul_health]
              regex: passing
              action: keep
```

## Complete Collector Configuration

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "consul-services"
          scrape_interval: 15s
          metrics_path: "/metrics"
          consul_sd_configs:
            - server: "consul.service.consul:8500"
              refresh_interval: 15s
              token: "${env:CONSUL_HTTP_TOKEN}"
          relabel_configs:
            # Only scrape passing Consul health checks
            - source_labels: [__meta_consul_health]
              regex: passing
              action: keep
            # Preserve useful Consul metadata as metric labels
            - source_labels: [__meta_consul_service]
              target_label: service_name
            - source_labels: [__meta_consul_service_id]
              target_label: consul_service_id
            - source_labels: [__meta_consul_dc]
              target_label: consul_datacenter

processors:
  resource/consul:
    attributes:
      - key: discovery.method
        value: "consul"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [resource/consul, batch]
      exporters: [otlp]
```

## Using Service Tags for Filtering

Consul services can have tags that you can use to filter which services to scrape:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "consul-services"
          consul_sd_configs:
            - server: "consul.service.consul:8500"
              # Only discover services tagged with "metrics-enabled"
              health_filter: '"metrics-enabled" in Service.Tags'
              refresh_interval: 15s
```

In your Consul service registration:

```json
{
  "service": {
    "name": "payment-service",
    "port": 8080,
    "tags": ["metrics-enabled", "production"],
    "meta": {
      "metrics_path": "/custom-metrics",
      "metrics_port": "9090"
    }
  }
}
```

## Using Service Metadata for Custom Config

Consul service metadata can drive scrape configuration. Use Prometheus relabeling with the Consul metadata labels exposed during discovery:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "consul-services"
          scrape_interval: 15s
          metrics_path: "/metrics"
          consul_sd_configs:
            - server: "consul.service.consul:8500"
          relabel_configs:
            # Use the custom metrics path from service metadata when present
            - source_labels: [__meta_consul_service_metadata_metrics_path]
              regex: "(.+)"
              target_label: __metrics_path__
            # Use the custom metrics port from service metadata when present
            - source_labels: [__meta_consul_service_address, __meta_consul_service_metadata_metrics_port]
              regex: "(.+);(.+)"
              replacement: "$$1:$$2"
              target_label: __address__
```

## Handling Health Checks

Prometheus Consul service discovery exposes the Consul health status as the `__meta_consul_health` label. Filter on that label to scrape only services that are passing health checks:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "consul-services"
          consul_sd_configs:
            - server: "consul.service.consul:8500"
              refresh_interval: 15s
          relabel_configs:
            - source_labels: [__meta_consul_health]
              regex: passing
              action: keep
```

This means if a service fails its Consul health check, the Prometheus receiver stops scraping it after the next discovery refresh, preventing error logs from failed scrape attempts.

## Multi-Datacenter Discovery

If your Consul deployment spans multiple datacenters:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "consul-dc1"
          scrape_interval: 15s
          consul_sd_configs:
            - server: "consul-dc1.internal:8500"
              datacenter: "dc1"
              refresh_interval: 15s

        - job_name: "consul-dc2"
          scrape_interval: 15s
          consul_sd_configs:
            - server: "consul-dc2.internal:8500"
              datacenter: "dc2"
              refresh_interval: 15s

service:
  pipelines:
    metrics:
      receivers: [prometheus]
```

## Debugging Discovery Issues

If services are not being discovered, enable debug logging:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

Look for log lines from the Prometheus receiver and Consul service discovery showing discovered targets. Common issues include:

- Consul ACL token missing or insufficient permissions
- Services not passing health checks
- Network connectivity between the Collector and Consul
- Service port not matching the port that exposes Prometheus metrics

The Prometheus receiver with Consul service discovery is the right approach when your infrastructure is dynamic. Instead of maintaining static target lists that drift out of sync with reality, you let Consul be the source of truth for what should be monitored. The Collector automatically adapts as services come and go.
