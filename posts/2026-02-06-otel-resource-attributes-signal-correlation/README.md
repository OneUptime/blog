# How to Use Resource Attributes Consistently Across Traces, Metrics, and Logs for Exact Signal Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Attributes, Signal Correlation, Observability

Description: Ensure consistent resource attributes across traces, metrics, and logs to enable exact correlation between all OpenTelemetry signals.

When your traces say `service.name=checkout-svc`, your metrics say `service_name=checkout-service`, and your logs say `app=checkout`, you cannot correlate them. Different attribute names and values for the same service across different signals is one of the most common and frustrating observability problems. OpenTelemetry's resource concept is designed to prevent this, but only if you configure it correctly.

## What Are Resource Attributes?

A resource in OpenTelemetry represents the entity producing telemetry. It is a set of key-value pairs that describe the service, host, container, or process. Every span, every metric data point, and every log record carries the same resource attributes.

The standard resource attributes defined by the OpenTelemetry semantic conventions include:

```yaml
# Essential resource attributes
service.name: "checkout-service"         # required, identifies the service
service.version: "2.4.1"                 # version of the deployed code
service.namespace: "ecommerce"           # logical grouping of services

# Deployment context
deployment.environment.name: "production"   # dev, staging, production

# Host information (often auto-detected)
host.name: "ip-10-0-1-42"
host.id: "i-0abc123def456"

# Container information (auto-detected in containers)
container.id: "abc123def456"
container.name: "checkout-service"
container.image.name: "registry.example.com/checkout-service"
container.image.tag: "2.4.1"

# Kubernetes context (auto-detected with k8s resource detector)
k8s.pod.name: "checkout-service-7b9f4d5c6-x2j4k"
k8s.namespace.name: "production"
k8s.deployment.name: "checkout-service"
k8s.node.name: "node-pool-1-abc123"

# Cloud provider context
cloud.provider: "aws"
cloud.region: "us-east-1"
cloud.availability_zone: "us-east-1a"
```

## Setting Resource Attributes in Declarative Configuration

The declarative configuration ensures all three signal pipelines share the same resource:

```yaml
# otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
    service.namespace: "ecommerce"
    deployment.environment.name: "${DEPLOY_ENV}"

# All three providers inherit the resource above
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"

meter_provider:
  readers:
    - periodic:
        interval: 30000
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"

logger_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
```

The key point: the `resource` block is defined once at the top level. Every span, metric, and log record emitted by this SDK instance will carry those exact same attributes.

## The Consistency Problem

Inconsistency creeps in when different teams or services define resources differently:

```yaml
# Team A's service
resource:
  attributes:
    service.name: "checkout-svc"
    env: "prod"

# Team B's service
resource:
  attributes:
    service.name: "checkout-service"
    deployment.environment: "production"
```

These refer to the same service but use different attribute names (`env` vs `deployment.environment`) and different values (`checkout-svc` vs `checkout-service`). Your observability backend will treat them as completely separate entities.

## Enforcing Consistency with a Shared Base Configuration

Create a shared base configuration that all services extend:

```yaml
# shared/base-resource.yaml
# All services MUST use these resource attribute names.
# Values are set per-service via environment variables.

resource:
  attributes:
    # Required attributes - every service must have these
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
    service.namespace: "${SERVICE_NAMESPACE}"
    deployment.environment.name: "${DEPLOY_ENV}"

    # Standard team attribution
    team.name: "${TEAM_NAME}"
    team.slack_channel: "${TEAM_SLACK}"
```

Each service then uses this as the basis for its configuration.

## Collector-Side Enforcement

Even with a shared base, services might send telemetry with missing or inconsistent attributes. Use the collector to enforce and normalize:

```yaml
# collector-config.yaml
processors:
  # Ensure required attributes exist
  resource/required:
    attributes:
      # Set defaults for missing required attributes
      - key: deployment.environment.name
        value: "unknown"
        action: "insert"  # only adds if not present

      - key: service.namespace
        value: "default"
        action: "insert"

  # Normalize inconsistent attribute names
  transform/normalize:
    trace_statements:
      - context: resource
        statements:
          # Normalize "env" to "deployment.environment.name"
          - set(attributes["deployment.environment.name"], attributes["env"])
            where attributes["env"] != nil and attributes["deployment.environment.name"] == nil
          - delete_key(attributes, "env")

          # Normalize "environment" to "deployment.environment.name"
          - set(attributes["deployment.environment.name"], attributes["environment"])
            where attributes["environment"] != nil and attributes["deployment.environment.name"] == nil
          - delete_key(attributes, "environment")
    log_statements:
      - context: resource
        statements:
          - set(attributes["deployment.environment.name"], attributes["env"])
            where attributes["env"] != nil and attributes["deployment.environment.name"] == nil
          - delete_key(attributes, "env")
    metric_statements:
      - context: resource
        statements:
          - set(attributes["deployment.environment.name"], attributes["env"])
            where attributes["env"] != nil and attributes["deployment.environment.name"] == nil
          - delete_key(attributes, "env")

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource/required, transform/normalize, batch]
      exporters: [otlp/backend]
    metrics:
      receivers: [otlp]
      processors: [resource/required, transform/normalize, batch]
      exporters: [otlp/backend]
    logs:
      receivers: [otlp]
      processors: [resource/required, transform/normalize, batch]
      exporters: [otlp/backend]
```

## Auto-Detected Resource Attributes

The OpenTelemetry SDK can auto-detect resource attributes from the runtime environment. Enable resource detectors in your configuration:

```yaml
resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
  detectors:
    - env          # reads OTEL_RESOURCE_ATTRIBUTES
    - host         # detects host.name, host.id
    - os           # detects os.type, os.description
    - process      # detects process.pid, process.runtime.name
    - container    # detects container.id (from cgroup)
```

These detectors add attributes automatically, which saves you from hardcoding host and container information.

## Validating Consistency in CI

Write a validation script that checks resource attribute consistency across all service configurations:

```python
#!/usr/bin/env python3
# validate_resources.py
# Checks that all service configs use consistent resource attribute names

import yaml
import sys
import os

REQUIRED_ATTRS = [
    "service.name",
    "service.version",
    "deployment.environment.name",
    "service.namespace",
]

FORBIDDEN_ATTRS = {
    "env": "Use 'deployment.environment.name' instead",
    "environment": "Use 'deployment.environment.name' instead",
    "app": "Use 'service.name' instead",
    "version": "Use 'service.version' instead",
}

def validate_config(path):
    with open(path) as f:
        config = yaml.safe_load(f)

    resource = config.get("resource", {})
    attrs = resource.get("attributes", {})
    errors = []

    # Check required attributes
    for attr in REQUIRED_ATTRS:
        if attr not in attrs:
            errors.append(f"Missing required attribute: {attr}")

    # Check forbidden attributes
    for attr, msg in FORBIDDEN_ATTRS.items():
        if attr in attrs:
            errors.append(f"Forbidden attribute '{attr}': {msg}")

    return errors

# Validate all configs in the services directory
failed = False
for root, dirs, files in os.walk("services"):
    for f in files:
        if f.endswith(".yaml"):
            path = os.path.join(root, f)
            errors = validate_config(path)
            if errors:
                print(f"FAIL: {path}")
                for e in errors:
                    print(f"  - {e}")
                failed = True
            else:
                print(f"OK: {path}")

sys.exit(1 if failed else 0)
```

## Querying with Consistent Attributes

Once attributes are consistent, cross-signal queries work reliably:

```promql
# Metrics: error rate for checkout-service in production
sum(rate(http_server_request_duration_seconds_count{
  service_name="checkout-service",
  deployment_environment_name="production"
}[5m]))
```

```
# TraceQL: traces for checkout-service in production
{ resource.service.name = "checkout-service" && resource.deployment.environment.name = "production" }
```

```
# LogQL: logs for checkout-service in production
{service_name="checkout-service", deployment_environment_name="production"}
```

The same attribute names and values work across all three query languages because the underlying data is consistent.

## Wrapping Up

Consistent resource attributes are the foundation of multi-signal correlation. Without them, you cannot reliably jump between metrics, traces, and logs for the same service. Use the declarative configuration to define resources once, create a shared base that all services extend, enforce consistency at the collector level, and validate it in CI. The effort is small and the payoff is every cross-signal query in your observability platform actually working.
