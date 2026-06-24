# How to Fix Collector Failing to Start Because a Component Is Defined but Not

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Configuration, Troubleshooting

Description: Fix the OpenTelemetry Collector startup failure caused by components defined in config but not referenced in the service section.

You write your Collector configuration, start the Collector, and a processor, receiver, or exporter appears to have no effect. In current Collector versions, defining a component in the configuration file does not enable it by itself. The component must be referenced in a pipeline under the `service` section.

The startup error you are more likely to see is the opposite case: a pipeline references a component name that is not defined. For example, `service::pipelines::traces: references processor "memorylimiter" which is not configured`.

## Why This Happens

The OpenTelemetry Collector enables pipeline components through the `service.pipelines` section. A component can be configured under `receivers`, `processors`, or `exporters`, but it will not process telemetry unless a pipeline references it. This catches typos in one direction: if a pipeline references a component name that is not configured, startup validation fails.

## The Problem Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 1024
  attributes:                  # defined here
    actions:
    - key: environment
      value: production
      action: upsert

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]      # attributes processor NOT referenced
      exporters: [otlp]
```

The `attributes` processor is defined under `processors` but is not listed in any pipeline. The Collector will not use that processor.

## The Fix

Either add the component to a pipeline or remove its definition:

### Option 1: Add It to the Pipeline

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, attributes]  # now referenced
      exporters: [otlp]
```

### Option 2: Remove the Unused Definition

```yaml
processors:
  batch:
    send_batch_size: 1024
  # Removed the 'attributes' processor definition entirely
```

## Common Scenarios That Cause This Issue

### Scenario 1: Copy-Paste from Examples

You copy a configuration from documentation that defines more components than you need:

```yaml
receivers:
  otlp:
    protocols:
      grpc: {}
  jaeger:          # copied but not needed
    protocols:
      grpc: {}

exporters:
  otlp:
    endpoint: backend:4317
  debug:           # copied but not needed
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]    # jaeger not referenced
      exporters: [otlp]    # debug not referenced
```

Fix: remove `jaeger` receiver and `debug` exporter definitions.

### Scenario 2: Commenting Out a Pipeline but Not the Component

```yaml
processors:
  batch: {}
  filter:            # still defined
    traces:
      span:
      - 'name == "health-check"'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]  # filter removed from pipeline but still defined above
      exporters: [otlp]
    # metrics pipeline was removed but metrics components remain defined
```

### Scenario 3: Typo in Component Reference

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 400

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memorylimiter]  # typo: should be memory_limiter
      exporters: [otlp]
```

This causes a startup error because `memorylimiter` is referenced but not defined. The configured `memory_limiter` processor is still not used by the pipeline.

## Validating Configuration Before Deployment

Use the Collector's `validate` command to catch invalid component references, invalid component names, and configuration decoding errors before deploying:

```bash
# Validate the configuration file

otelcol-contrib validate --config config.yaml

# Or with Docker
docker run --rm -v $(pwd)/config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:0.121.0 \
  validate --config /etc/otelcol/config.yaml
```

## Using Environment Variables in Config

When using environment variables, make sure the resolved config is valid:

```yaml
exporters:
  otlp:
    endpoint: ${env:OTEL_BACKEND_ENDPOINT}
  debug:
    verbosity: ${env:DEBUG_VERBOSITY:-normal}
```

If an environment variable is not set and there is no default, the component might not resolve correctly. Always test with:

```bash
# Export the variables and validate
export OTEL_BACKEND_ENDPOINT=tempo:4317
otelcol-contrib validate --config config.yaml
```

## CI/CD Integration

Add config validation to your CI pipeline:

```yaml
# GitHub Actions
jobs:
  validate-collector-config:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Validate Collector Config
      run: |
        docker run --rm \
          -v ${{ github.workspace }}/collector-config.yaml:/config.yaml \
          otel/opentelemetry-collector-contrib:0.121.0 \
          validate --config /config.yaml
```

This catches configuration errors before they reach production. Unused component definitions are one of the most common Collector configuration mistakes, and they are preventable by checking that every intended component is wired into the appropriate pipeline.
