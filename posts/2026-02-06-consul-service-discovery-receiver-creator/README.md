# How to Use Consul Service Discovery with the OpenTelemetry Collector Receiver Creator for Dynamic Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Consul, Service Discovery, Receiver Creator, Dynamic Targets

Description: Use Consul service discovery with the OpenTelemetry Collector receiver creator to dynamically discover and scrape metric endpoints.

Static target lists in your Collector configuration become a maintenance burden as services scale up and down. The receiver creator extension, combined with the Consul observer, automatically discovers services registered in Consul and creates receivers for them on the fly. When a new service instance appears, the Collector starts scraping it. When it disappears, scraping stops.

## Architecture

The flow works like this:

1. The Consul observer watches Consul for service registration changes
2. When a new service is found, the receiver creator instantiates a receiver for it
3. The new receiver starts collecting metrics from the discovered endpoint
4. When the service deregisters, the receiver is shut down

## Setting Up the Consul Observer

```yaml
extensions:
  observer/consul:
    # Consul connection settings
    endpoint: "consul.service.consul:8500"
    # Filter which services to observe
    # Empty means all services
    services: ["payment-service", "order-service", "user-service"]
    # How often to poll Consul for changes
    refresh_interval: 30s
    # Consul ACL token (if ACLs are enabled)
    token: "${env:CONSUL_HTTP_TOKEN}"
```

## Configuring the Receiver Creator

The receiver creator uses the observer to discover endpoints and creates receivers based on templates:

```yaml
receivers:
  receiver_creator:
    watch_observers: [observer/consul]
    receivers:
      # Create a Prometheus receiver for each discovered service
      prometheus_simple:
        # Rule determines which discovered endpoints get a receiver
        rule: type == "port" && name matches ".*"
        config:
          metrics_path: "/metrics"
          collection_interval: 15s
```

## Complete Collector Configuration

```yaml
extensions:
  observer/consul:
    endpoint: "consul.service.consul:8500"
    refresh_interval: 15s
    token: "${env:CONSUL_HTTP_TOKEN}"

receivers:
  receiver_creator/consul:
    watch_observers: [observer/consul]
    receivers:
      # Scrape Prometheus metrics from discovered services
      prometheus_simple:
        rule: type == "port"
        config:
          metrics_path: "/metrics"
          collection_interval: 15s
        resource_attributes:
          service.name: "`name`"
          service.instance.id: "`endpoint`"
          consul.service.id: "`id`"

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
  extensions: [observer/consul]
  pipelines:
    metrics:
      receivers: [receiver_creator/consul]
      processors: [resource/consul, batch]
      exporters: [otlp]
```

## Using Service Tags for Filtering

Consul services can have tags that you can use to filter which services to scrape:

```yaml
extensions:
  observer/consul:
    endpoint: "consul.service.consul:8500"
    # Only discover services tagged with "metrics-enabled"
    tags: ["metrics-enabled"]
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

Consul service metadata can drive receiver configuration. Use the observer's discovered metadata in receiver creator rules:

```yaml
receivers:
  receiver_creator/consul:
    watch_observers: [observer/consul]
    receivers:
      # Different receiver configs based on service metadata
      prometheus_simple/default:
        rule: type == "port" && annotations["metrics_path"] == ""
        config:
          metrics_path: "/metrics"
          collection_interval: 15s

      prometheus_simple/custom:
        rule: type == "port" && annotations["metrics_path"] != ""
        config:
          # Use the custom metrics path from service metadata
          metrics_path: "`annotations[\"metrics_path\"]`"
          collection_interval: 15s
```

## Handling Health Checks

The Consul observer respects service health status. By default, only healthy services are discovered. You can configure this:

```yaml
extensions:
  observer/consul:
    endpoint: "consul.service.consul:8500"
    # Only discover services that are passing health checks
    health_checks: true
    refresh_interval: 15s
```

This means if a service fails its Consul health check, the receiver creator automatically stops scraping it, preventing error logs from failed scrape attempts.

## Multi-Datacenter Discovery

If your Consul deployment spans multiple datacenters:

```yaml
extensions:
  observer/consul-dc1:
    endpoint: "consul-dc1.internal:8500"
    refresh_interval: 15s

  observer/consul-dc2:
    endpoint: "consul-dc2.internal:8500"
    refresh_interval: 15s

receivers:
  receiver_creator/multi-dc:
    watch_observers: [observer/consul-dc1, observer/consul-dc2]
    receivers:
      prometheus_simple:
        rule: type == "port"
        config:
          metrics_path: "/metrics"
          collection_interval: 15s

service:
  extensions: [observer/consul-dc1, observer/consul-dc2]
```

## Debugging Discovery Issues

If services are not being discovered, enable debug logging:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

Look for log lines from the Consul observer showing discovered endpoints. Common issues include:

- Consul ACL token missing or insufficient permissions
- Services not passing health checks
- Network connectivity between the Collector and Consul
- Service port not matching expected port in the observer

The receiver creator with Consul service discovery is the right approach when your infrastructure is dynamic. Instead of maintaining static target lists that drift out of sync with reality, you let Consul be the source of truth for what should be monitored. The Collector automatically adapts as services come and go.
