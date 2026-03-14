# Deploy SigNoz Full-Stack Observability with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SigNoz, Observability, OpenTelemetry, Flux CD, GitOps, Kubernetes, Metrics, Logs, Traces

Description: Deploy SigNoz, the open-source full-stack observability platform, on Kubernetes using Flux CD. This guide covers the SigNoz Helm chart configuration, ClickHouse storage setup, and GitOps-managed observability pipeline.

---

## Introduction

SigNoz is an open-source observability platform that provides metrics, logs, and traces in a single unified interface. Unlike assembling separate tools for each signal type, SigNoz packages everything together with ClickHouse as the storage engine, providing excellent query performance and cost efficiency.

Deploying SigNoz via Flux CD ensures your entire observability stack is version-controlled. Storage sizing, alert rules, and retention configuration are managed as Git resources, making your observability infrastructure as auditable as the applications it monitors.

This guide deploys SigNoz using the official Helm chart with persistent ClickHouse storage.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Minimum 4 CPU and 8Gi RAM available (ClickHouse is resource-intensive)
- A StorageClass supporting `ReadWriteOnce` PVCs
- `flux` and `kubectl` CLIs installed
- Applications instrumented with OpenTelemetry SDKs

## Step 1: Add the SigNoz HelmRepository

```yaml
# clusters/my-cluster/signoz/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: signoz
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.signoz.io
```

## Step 2: Deploy SigNoz via HelmRelease

Configure SigNoz with persistent ClickHouse storage and the OTEL collector.

```yaml
# clusters/my-cluster/signoz/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: signoz
  namespace: platform
spec:
  interval: 15m
  chart:
    spec:
      chart: signoz
      version: ">=0.43.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: signoz
        namespace: flux-system
  values:
    # SigNoz frontend configuration
    frontend:
      replicaCount: 1
      ingress:
        enabled: true
        className: nginx
        hosts:
          - host: signoz.example.com
            paths:
              - path: /
                pathType: Prefix
        tls:
          - hosts:
              - signoz.example.com
            secretName: signoz-tls
        annotations:
          cert-manager.io/cluster-issuer: letsencrypt-prod

    # SigNoz query service
    queryService:
      replicaCount: 1

    # SigNoz OTEL collector (receives telemetry from applications)
    otelCollector:
      # OTLP gRPC port exposed for application instrumentation
      ports:
        otlpGrpc: 4317
        otlpHttp: 4318

    # ClickHouse storage — the core storage engine for all signals
    clickhouse:
      enabled: true
      replicaCount: 1
      persistence:
        enabled: true
        # SSD storage recommended for ClickHouse performance
        storageClass: fast-ssd
        size: 200Gi
      resources:
        requests:
          cpu: "2"
          memory: "4Gi"
        limits:
          cpu: "4"
          memory: "8Gi"

    # ZooKeeper is required by ClickHouse for coordination
    zookeeper:
      enabled: true
      replicaCount: 1
      persistence:
        enabled: true
        size: 10Gi
```

## Step 3: Configure Application Instrumentation

Point OpenTelemetry SDKs at the SigNoz OTLP endpoint.

```yaml
# Example application Deployment with OTEL environment variables
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            # Service name appears in SigNoz service map
            - name: OTEL_SERVICE_NAME
              value: "my-app"
            # Point at the SigNoz OTLP collector endpoint
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://signoz-otel-collector.platform.svc:4317"
            # Send all three signal types
            - name: OTEL_TRACES_EXPORTER
              value: "otlp"
            - name: OTEL_METRICS_EXPORTER
              value: "otlp"
            - name: OTEL_LOGS_EXPORTER
              value: "otlp"
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/signoz/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: signoz
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/signoz
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: signoz-frontend
      namespace: platform
    - apiVersion: apps/v1
      kind: StatefulSet
      name: chi-signoz-clickhouse-cluster-0-0
      namespace: platform
```

## Best Practices

- Allocate SSDs for ClickHouse PVCs; ClickHouse query performance degrades significantly on spinning disks.
- Start with `replicaCount: 1` for ClickHouse in development and increase to 3 for production HA.
- Use SigNoz's built-in retention configuration to set TTLs on metrics, traces, and logs independently.
- Instrument all microservices with the same `OTEL_SERVICE_NAME` convention so the service map renders correctly.
- Monitor ClickHouse's own metrics—query latency and insert throughput—to detect storage bottlenecks early.

## Conclusion

SigNoz deployed via Flux CD provides a unified, open-source observability platform without the operational complexity of managing separate systems for metrics, logs, and traces. The entire deployment—from ClickHouse storage sizing to ingress configuration—lives in Git, making your observability stack fully reproducible and auditable.
