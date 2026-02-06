# How to Set Up Multi-Environment Configuration Overrides (Dev, Staging, Prod) with Declarative Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Environment, Configuration Overrides, DevOps

Description: Set up OpenTelemetry declarative configuration overrides for dev, staging, and production environments using YAML files.

Running the same OpenTelemetry configuration in development, staging, and production is a recipe for problems. In dev, you want to sample everything, export to a local collector, and print to the console. In production, you want aggressive sampling, batched exports to a hardened collector, and tight resource limits. This post shows how to structure your declarative configuration files for clean multi-environment overrides.

## Strategy 1: Separate Files Per Environment

The most straightforward approach is maintaining separate config files for each environment. This is explicit and easy to reason about, even if it means some duplication.

```
config/
  otel-base.yaml      # shared settings
  otel-dev.yaml        # development overrides
  otel-staging.yaml    # staging overrides
  otel-prod.yaml       # production settings
```

Your development configuration optimizes for debugging:

```yaml
# config/otel-dev.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION:-dev}"
    deployment.environment: "development"

tracer_provider:
  processors:
    # Simple processor for immediate export in dev
    - simple:
        exporter:
          otlp:
            endpoint: "http://localhost:4317"
            protocol: "grpc"
    # Also print spans to console for easy debugging
    - simple:
        exporter:
          console: {}
  sampler:
    always_on: {}  # capture every span in dev
  limits:
    attribute_count_limit: 256
    event_count_limit: 256

meter_provider:
  readers:
    - periodic:
        interval: 10000  # collect metrics every 10s in dev
        exporter:
          otlp:
            endpoint: "http://localhost:4317"
            protocol: "grpc"

logger_provider:
  processors:
    - simple:
        exporter:
          console: {}

propagator:
  composite: [tracecontext, baggage]
```

Your production configuration prioritizes throughput and reliability:

```yaml
# config/otel-prod.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
    deployment.environment: "production"

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 4096
        max_export_batch_size: 512
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT}"
            protocol: "grpc"
            compression: "gzip"
            timeout: 10000
            headers:
              Authorization: "Bearer ${OTEL_AUTH_TOKEN}"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: ${SAMPLE_RATIO:-0.05}
  limits:
    attribute_count_limit: 128
    attribute_value_length_limit: 2048
    event_count_limit: 64
    link_count_limit: 32

meter_provider:
  readers:
    - periodic:
        interval: 60000
        timeout: 30000
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT}"
            protocol: "grpc"
            compression: "gzip"

logger_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 4096
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT}"
            protocol: "grpc"
            compression: "gzip"

propagator:
  composite: [tracecontext, baggage]
```

Select the right file at deployment time:

```bash
# In your deployment script or Dockerfile
export OTEL_EXPERIMENTAL_CONFIG_FILE="/etc/otel/otel-${DEPLOY_ENV}.yaml"
```

## Strategy 2: Single File with Environment Variable Substitution

If you want to avoid maintaining multiple files, you can use a single file that adapts based on environment variables:

```yaml
# config/otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION:-0.0.0}"
    deployment.environment: "${DEPLOY_ENV:-development}"

tracer_provider:
  processors:
    - batch:
        schedule_delay: ${BATCH_DELAY:-1000}
        max_queue_size: ${BATCH_QUEUE_SIZE:-2048}
        max_export_batch_size: ${BATCH_SIZE:-512}
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT:-http://localhost:4317}"
            protocol: "grpc"
            compression: "${OTEL_COMPRESSION:-none}"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: ${SAMPLE_RATIO:-1.0}

meter_provider:
  readers:
    - periodic:
        interval: ${METRICS_INTERVAL:-30000}
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT:-http://localhost:4317}"
            protocol: "grpc"

logger_provider:
  processors:
    - batch:
        schedule_delay: ${BATCH_DELAY:-1000}
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT:-http://localhost:4317}"
            protocol: "grpc"

propagator:
  composite: [tracecontext, baggage]
```

Then define per-environment env files:

```bash
# env/prod.env
OTEL_COLLECTOR_ENDPOINT=https://collector.prod.internal:4317
SAMPLE_RATIO=0.05
BATCH_DELAY=5000
BATCH_QUEUE_SIZE=4096
BATCH_SIZE=512
OTEL_COMPRESSION=gzip
METRICS_INTERVAL=60000
```

```bash
# env/dev.env
OTEL_COLLECTOR_ENDPOINT=http://localhost:4317
SAMPLE_RATIO=1.0
BATCH_DELAY=1000
BATCH_QUEUE_SIZE=512
BATCH_SIZE=128
OTEL_COMPRESSION=none
METRICS_INTERVAL=10000
```

## Strategy 3: Kubernetes ConfigMaps with Kustomize

For Kubernetes deployments, Kustomize overlays map naturally to environment-specific configs:

```
k8s/
  base/
    kustomization.yaml
    otel-config.yaml
  overlays/
    dev/
      kustomization.yaml
      otel-config-patch.yaml
    staging/
      kustomization.yaml
      otel-config-patch.yaml
    prod/
      kustomization.yaml
      otel-config-patch.yaml
```

Base ConfigMap:

```yaml
# k8s/base/kustomization.yaml
resources:
  - deployment.yaml

configMapGenerator:
  - name: otel-config
    files:
      - otel-config.yaml
```

Production overlay that replaces the config:

```yaml
# k8s/overlays/prod/kustomization.yaml
resources:
  - ../../base

configMapGenerator:
  - name: otel-config
    behavior: replace
    files:
      - otel-config.yaml  # prod-specific file in this directory
```

Deploy with:

```bash
# Deploy to production
kubectl apply -k k8s/overlays/prod/

# Deploy to staging
kubectl apply -k k8s/overlays/staging/
```

## Validating All Environments in CI

Whatever strategy you choose, validate every environment's config in CI:

```bash
#!/bin/bash
# validate-all-envs.sh
# Validates config files for each environment

ENVS=("dev" "staging" "prod")
FAILED=0

for env in "${ENVS[@]}"; do
  echo "Validating $env configuration..."

  # Source environment-specific variables
  source "env/${env}.env"

  # Run validation with substitution
  ./otel-config-validator validate \
    --config "config/otel-config.yaml" \
    --substitute-env \
    --strict || FAILED=1
done

exit $FAILED
```

## Wrapping Up

There is no single right answer for multi-environment configuration. Separate files per environment give you maximum clarity at the cost of some duplication. A single file with environment variable defaults is DRY but can get hard to read with many substitutions. Kustomize overlays fit naturally into Kubernetes workflows. Pick the approach that matches your team's deployment patterns, and make sure every environment's config gets validated in CI before it reaches a running service.
