# How to Route OpenTelemetry Data to Different Backends Based on service.name or k8s.namespace Resource Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Routing, Resource Attributes, Kubernetes, Collector

Description: Configure the OpenTelemetry Collector routing connector to direct telemetry to different backends using service.name or Kubernetes namespace attributes.

Routing telemetry data based on resource attributes is one of the most practical patterns in production OpenTelemetry deployments. Instead of relying on external headers, you can use attributes that are already attached to your telemetry, like `service.name` or `k8s.namespace.name`, to decide where data should go.

This approach works well when you want to separate data by team, environment, or service tier without requiring any changes to your application code.

## The Routing Connector with Resource Context

The routing connector supports a `resource` context that lets you write conditions against resource attributes. This is different from the `request` context used for HTTP headers.

```yaml
connectors:
  routing/by-service:
    # Default pipeline for anything that does not match
    default_pipelines: [traces/catchall]
    match_once: true
    table:
      # Route payment service traces to a PCI-compliant backend
      - statement: resource.attributes["service.name"] == "payment-service"
        pipelines: [traces/pci]
      # Route frontend services to a separate backend
      - statement: resource.attributes["service.name"] == "web-frontend" or resource.attributes["service.name"] == "mobile-bff"
        pipelines: [traces/frontend]
```

## Routing by Kubernetes Namespace

If you are running on Kubernetes with the k8s attributes processor, your telemetry will have namespace labels attached. You can route based on those:

```yaml
connectors:
  routing/by-namespace:
    default_pipelines: [traces/default]
    match_once: true
    table:
      # Production namespace goes to the production backend
      - statement: resource.attributes["k8s.namespace.name"] == "production"
        pipelines: [traces/prod-backend]
      # Staging namespace goes to a cheaper storage tier
      - statement: resource.attributes["k8s.namespace.name"] == "staging"
        pipelines: [traces/staging-backend]
      # Dev namespace gets sampled heavily
      - statement: resource.attributes["k8s.namespace.name"] == "development"
        pipelines: [traces/dev-backend]
```

## Full Configuration Example

Here is a complete Collector config that routes traces based on both `service.name` and `k8s.namespace.name`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # Enrich telemetry with Kubernetes metadata
  k8sattributes:
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.deployment.name
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip

connectors:
  routing/traces:
    default_pipelines: [traces/general]
    match_once: true
    table:
      - statement: resource.attributes["k8s.namespace.name"] == "payments"
        pipelines: [traces/pci-compliant]
      - statement: resource.attributes["service.name"] == "checkout-api"
        pipelines: [traces/pci-compliant]
      - statement: resource.attributes["k8s.namespace.name"] == "staging"
        pipelines: [traces/staging]

exporters:
  otlp/pci:
    endpoint: "pci-backend.internal:4317"
    tls:
      cert_file: /etc/ssl/collector.crt
      key_file: /etc/ssl/collector.key
  otlp/staging:
    endpoint: "staging-backend.internal:4317"
    tls:
      insecure: true
  otlp/general:
    endpoint: "general-backend.internal:4317"

service:
  pipelines:
    traces/ingress:
      receivers: [otlp]
      processors: [k8sattributes]
      exporters: [routing/traces]
    traces/pci-compliant:
      receivers: [routing/traces]
      exporters: [otlp/pci]
    traces/staging:
      receivers: [routing/traces]
      exporters: [otlp/staging]
    traces/general:
      receivers: [routing/traces]
      exporters: [otlp/general]
```

## Using Regular Expressions for Pattern Matching

You can also use OTTL functions for more flexible matching. For example, to route all services with a specific prefix:

```yaml
connectors:
  routing/regex:
    default_pipelines: [traces/default]
    match_once: true
    table:
      # Match any service name starting with "payment-"
      - statement: IsMatch(resource.attributes["service.name"], "^payment-.*")
        pipelines: [traces/payments]
      # Match multiple namespaces with a pattern
      - statement: IsMatch(resource.attributes["k8s.namespace.name"], "^(prod|production)-.*")
        pipelines: [traces/production]
```

The `IsMatch` function takes a regular expression as its second argument, giving you flexibility when you have naming conventions that group related services.

## Routing Metrics and Logs the Same Way

The routing connector works for all signal types. You can apply the same logic to metrics and logs:

```yaml
connectors:
  routing/metrics:
    default_pipelines: [metrics/general]
    match_once: true
    table:
      - statement: resource.attributes["k8s.namespace.name"] == "payments"
        pipelines: [metrics/pci-compliant]

  routing/logs:
    default_pipelines: [logs/general]
    match_once: true
    table:
      - statement: resource.attributes["k8s.namespace.name"] == "payments"
        pipelines: [logs/pci-compliant]

service:
  pipelines:
    metrics/ingress:
      receivers: [otlp]
      processors: [k8sattributes]
      exporters: [routing/metrics]
    metrics/pci-compliant:
      receivers: [routing/metrics]
      exporters: [otlp/pci]
    metrics/general:
      receivers: [routing/metrics]
      exporters: [otlp/general]
    logs/ingress:
      receivers: [otlp]
      processors: [k8sattributes]
      exporters: [routing/logs]
    logs/pci-compliant:
      receivers: [routing/logs]
      exporters: [otlp/pci]
    logs/general:
      receivers: [routing/logs]
      exporters: [otlp/general]
```

## Things to Keep in Mind

Order of evaluation matters. The routing connector checks statements from top to bottom and uses the first match when `match_once` is true. If a resource could match multiple rules, put the most specific rules first.

Resource attributes are set at the SDK or processor level, not per-span. This means all spans from a single resource will be routed together, which is usually what you want for consistency.

If you are not seeing your Kubernetes attributes, make sure the k8s attributes processor has the right RBAC permissions to query the Kubernetes API. Missing permissions will silently skip attribute enrichment, and your routing rules will not match.

This pattern keeps your routing logic centralized in the Collector config and does not require changes to any application code. When you need to add a new service or namespace, you update the Collector config and reload.
