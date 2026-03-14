# Configure OpenTelemetry Collector Pipelines with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, opentelemetry, otel, observability, kubernetes, gitops

Description: Learn how to deploy and configure OpenTelemetry Collector pipelines using Flux CD, enabling GitOps-driven observability infrastructure for traces, metrics, and logs.

---

## Introduction

The OpenTelemetry Collector is a vendor-agnostic proxy for telemetry data that supports receiving, processing, and exporting traces, metrics, and logs. Configuring Collector pipelines through Flux CD ensures that your observability infrastructure is version-controlled, consistently deployed, and auditable—just like your application code.

Managing OTel Collector configuration in Git enables teams to review pipeline changes through pull requests, roll back problematic configurations instantly, and maintain environment-specific pipeline definitions without manual kubectl commands. This is especially valuable when multiple teams share observability infrastructure.

This guide covers deploying the OpenTelemetry Collector via its Helm chart using a Flux HelmRelease, configuring multi-pipeline YAML, and connecting receivers to exporters for a production observability stack.

## Prerequisites

- Kubernetes cluster with Flux CD v2 bootstrapped
- Git repository connected to Flux
- A backend observability platform (Jaeger, Prometheus, Loki, or cloud provider)
- `flux` CLI installed

## Step 1: Add the OpenTelemetry Helm Repository

Register the OTel Helm repository as a Flux HelmRepository source.

```yaml
# infrastructure/otel-collector/helmrepository.yaml
# Flux HelmRepository pointing to the OpenTelemetry Helm chart registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: open-telemetry
  namespace: flux-system
spec:
  interval: 24h
  url: https://open-telemetry.github.io/opentelemetry-helm-charts
```

```bash
# Apply the HelmRepository and verify it syncs
kubectl apply -f infrastructure/otel-collector/helmrepository.yaml
flux get sources helm open-telemetry
```

## Step 2: Deploy OTel Collector with a Flux HelmRelease

Create a HelmRelease that deploys the Collector with a custom pipeline configuration.

```yaml
# infrastructure/otel-collector/helmrelease.yaml
# HelmRelease deploying the OpenTelemetry Collector with configured pipelines
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: otel-collector
  namespace: observability
spec:
  interval: 10m
  chart:
    spec:
      chart: opentelemetry-collector
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: open-telemetry
        namespace: flux-system
  values:
    mode: deployment
    config:
      # --- Receivers: How the Collector accepts telemetry ---
      receivers:
        otlp:
          protocols:
            grpc:
              endpoint: 0.0.0.0:4317
            http:
              endpoint: 0.0.0.0:4318
        prometheus:
          config:
            scrape_configs:
              - job_name: otel-collector
                scrape_interval: 30s
                static_configs:
                  - targets: ['0.0.0.0:8888']

      # --- Processors: Transform data before export ---
      processors:
        batch:
          send_batch_size: 1000
          timeout: 10s
        memory_limiter:
          check_interval: 1s
          limit_mib: 512

      # --- Exporters: Where to send telemetry ---
      exporters:
        otlp/jaeger:
          endpoint: jaeger-collector:4317
          tls:
            insecure: true
        prometheusremotewrite:
          endpoint: http://prometheus:9090/api/v1/write

      # --- Pipelines: Wire receivers, processors, and exporters ---
      service:
        pipelines:
          traces:
            receivers: [otlp]
            processors: [memory_limiter, batch]
            exporters: [otlp/jaeger]
          metrics:
            receivers: [otlp, prometheus]
            processors: [memory_limiter, batch]
            exporters: [prometheusremotewrite]
```

## Step 3: Add a Logs Pipeline

Extend the Collector configuration with a logs pipeline using a ConfigMap patch.

```yaml
# infrastructure/otel-collector/logs-pipeline-patch.yaml
# Kustomize patch adding a logs pipeline to the OTel Collector HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: otel-collector
  namespace: observability
spec:
  values:
    config:
      receivers:
        filelog:
          include: [/var/log/pods/*/*/*.log]
          include_file_path: true
          operators:
            - type: json_parser
              timestamp:
                parse_from: attributes.time
                layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      exporters:
        loki:
          endpoint: http://loki:3100/loki/api/v1/push
      service:
        pipelines:
          logs:
            receivers: [filelog]
            processors: [memory_limiter, batch]
            exporters: [loki]
```

## Step 4: Create Flux Kustomization for the Observability Stack

Manage the full observability stack deployment order with Flux Kustomizations.

```yaml
# clusters/production/observability-kustomization.yaml
# Flux Kustomization deploying the full observability stack in order
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: observability
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/otel-collector
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health check: wait for the Collector deployment to be ready
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: otel-collector
      namespace: observability
```

## Best Practices

- Use the `batch` processor in all pipelines to reduce export calls and improve throughput
- Configure `memory_limiter` processor to prevent OOM-killed Collector pods
- Store sensitive exporter credentials (API keys, tokens) in Kubernetes Secrets and reference them in Helm values
- Use separate Collector deployments for traces, metrics, and logs in high-volume environments
- Enable the Collector's own telemetry pipeline (`service.telemetry`) to monitor Collector health

## Conclusion

Managing OpenTelemetry Collector pipelines through Flux CD transforms observability infrastructure into auditable, version-controlled code. Changes to pipeline configuration go through the same review process as application code, and Flux ensures the cluster always converges to the desired state. This approach eliminates manual Collector reconfiguration and makes observability infrastructure first-class GitOps citizens.
