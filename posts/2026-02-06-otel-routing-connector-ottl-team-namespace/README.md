# How to Use the Routing Connector with OTTL to Route Telemetry by Team, Namespace, or Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Routing Connector, OTTL, Multi-Tenant, Collector

Description: Use the OpenTelemetry routing connector with OTTL expressions to route telemetry to different pipelines based on team, namespace, or environment.

In a large organization, different teams often have different observability needs. The platform team might want all their traces in one backend, the payments team in another, and staging environments might go to a completely separate system. The routing connector with OTTL expressions lets you split telemetry at the collector level based on any attribute you choose.

## How the Routing Connector Works

The routing connector is a special component that acts as both an exporter (from the upstream pipeline) and a receiver (for downstream pipelines). It evaluates OTTL expressions against each piece of telemetry and routes it to the appropriate downstream pipeline.

```
                        +--> [traces/platform] --> [Backend A]
[OTLP Receiver] --> [routing] --> [traces/payments] --> [Backend B]
                        +--> [traces/default]  --> [Backend C]
```

## Routing by Team

Suppose your services set a `team` resource attribute (or your Kubernetes pods have a `team` label that gets enriched by the k8sattributes processor):

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  routing/by_team:
    table:
      - statement: route() where resource.attributes["team"] == "payments"
        pipelines: [traces/payments]
      - statement: route() where resource.attributes["team"] == "platform"
        pipelines: [traces/platform]
      - statement: route() where resource.attributes["team"] == "mobile"
        pipelines: [traces/mobile]
    default_pipelines: [traces/default]

processors:
  batch:
    send_batch_size: 256
    timeout: 5s

exporters:
  otlp/payments:
    endpoint: "payments-backend.internal:4317"
  otlp/platform:
    endpoint: "platform-backend.internal:4317"
  otlp/mobile:
    endpoint: "mobile-backend.internal:4317"
  otlp/default:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [routing/by_team]

    traces/payments:
      receivers: [routing/by_team]
      processors: [batch]
      exporters: [otlp/payments]

    traces/platform:
      receivers: [routing/by_team]
      processors: [batch]
      exporters: [otlp/platform]

    traces/mobile:
      receivers: [routing/by_team]
      processors: [batch]
      exporters: [otlp/mobile]

    traces/default:
      receivers: [routing/by_team]
      processors: [batch]
      exporters: [otlp/default]
```

## Routing by Kubernetes Namespace

If you prefer to route based on Kubernetes namespace (which is often a proxy for team or environment), use the k8s attributes:

```yaml
connectors:
  routing/by_namespace:
    table:
      # Production namespaces go to the production backend
      - statement: >
          route() where resource.attributes["k8s.namespace.name"] == "prod-payments"
          or resource.attributes["k8s.namespace.name"] == "prod-platform"
        pipelines: [traces/production]

      # Staging namespaces go to a cheaper backend
      - statement: >
          route() where IsMatch(resource.attributes["k8s.namespace.name"], "^staging-.*")
        pipelines: [traces/staging]

      # CI namespaces go to a short-retention backend
      - statement: >
          route() where IsMatch(resource.attributes["k8s.namespace.name"], "^ci-.*")
        pipelines: [traces/ci]

    default_pipelines: [traces/default]
```

The `IsMatch` function supports regex patterns, which is useful when namespaces follow a naming convention.

## Routing by Environment

For environment-based routing, you can match on the standard `deployment.environment` resource attribute:

```yaml
connectors:
  routing/by_env:
    table:
      - statement: >
          route() where resource.attributes["deployment.environment"] == "production"
        pipelines: [traces/prod]
      - statement: >
          route() where resource.attributes["deployment.environment"] == "staging"
        pipelines: [traces/staging]
      - statement: >
          route() where resource.attributes["deployment.environment"] == "development"
        pipelines: [traces/dev]
    default_pipelines: [traces/prod]
```

## Combining Multiple Conditions

You can combine team, namespace, and environment in a single routing table for more granular control:

```yaml
connectors:
  routing/granular:
    table:
      # Production payment traces get the premium treatment
      - statement: >
          route() where resource.attributes["team"] == "payments"
          and resource.attributes["deployment.environment"] == "production"
        pipelines: [traces/critical]

      # All other production traces
      - statement: >
          route() where resource.attributes["deployment.environment"] == "production"
        pipelines: [traces/production]

      # Everything else
    default_pipelines: [traces/standard]
```

The routing table is evaluated top to bottom. The first matching rule wins, so put your most specific rules first.

## Routing All Signal Types

The routing connector works for traces, metrics, and logs. You can route each signal type independently:

```yaml
service:
  pipelines:
    # Route traces by team
    traces:
      receivers: [otlp]
      exporters: [routing/by_team]
    traces/payments:
      receivers: [routing/by_team]
      processors: [batch]
      exporters: [otlp/payments]

    # Route metrics by environment
    metrics:
      receivers: [otlp]
      exporters: [routing/by_env]
    metrics/prod:
      receivers: [routing/by_env]
      processors: [batch]
      exporters: [otlp/metrics_prod]

    # Route logs by namespace
    logs:
      receivers: [otlp]
      exporters: [routing/by_namespace]
    logs/staging:
      receivers: [routing/by_namespace]
      processors: [batch]
      exporters: [otlp/logs_staging]
```

## Things to Keep in Mind

- Each downstream pipeline has its own batch processor and exporter queue, so memory usage scales with the number of routes.
- If a telemetry item matches no routing rule and no default pipeline is set, it gets dropped silently.
- The routing connector evaluates OTTL expressions per span (not per batch), so the overhead is proportional to your throughput.

This pattern is the foundation of multi-tenant observability. Once you have routing in place, each team can have their own retention policy, sampling rate, and backend, all managed centrally at the collector level.
