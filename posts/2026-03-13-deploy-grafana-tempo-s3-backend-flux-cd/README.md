# Deploy Grafana Tempo with S3 Backend Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Grafana Tempo, Distributed Tracing, S3, Observability, OpenTelemetry

Description: Deploy Grafana Tempo, a cost-effective distributed tracing backend, with S3 object storage on Kubernetes using Flux CD.

---

## Introduction

Grafana Tempo provides distributed tracing at scale by storing trace data as objects in S3-compatible storage rather than in a specialized database. This makes it dramatically cheaper than Jaeger with Cassandra or Elasticsearch backends while still supporting TraceQL for powerful trace queries.

Deploying Tempo via Flux CD means your ingestion configuration, retention settings, and S3 block storage parameters are version-controlled alongside the rest of your observability stack. Changes flow through Git and are automatically reconciled by Flux.

This guide deploys Tempo in microservices mode with an S3 backend and integrates with Grafana for trace visualization.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- S3-compatible bucket (AWS S3, MinIO, GCS)
- IAM credentials with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`
- Grafana deployed and accessible
- `flux` and `kubectl` CLIs installed

## Step 1: Create the S3 Credentials Secret

Encrypt this file with SOPS before pushing to Git.

```yaml
# clusters/my-cluster/tempo/s3-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: tempo-s3-credentials
  namespace: monitoring
type: Opaque
stringData:
  # S3 credentials for Tempo block storage - encrypt with SOPS
  access_key: "AKIAIOSFODNN7EXAMPLE"
  secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

## Step 2: Add the Grafana HelmRepository

```yaml
# clusters/my-cluster/tempo/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 12h
  url: https://grafana.github.io/helm-charts
```

## Step 3: Deploy Tempo via HelmRelease

Configure Tempo with S3 block storage and OTLP ingestion.

```yaml
# clusters/my-cluster/tempo/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tempo
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: tempo-distributed
      version: ">=1.9.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  valuesFrom:
    # Inject S3 access key from Secret
    - kind: Secret
      name: tempo-s3-credentials
      valuesKey: access_key
      targetPath: storage.trace.s3.access_key
    # Inject S3 secret key from Secret
    - kind: Secret
      name: tempo-s3-credentials
      valuesKey: secret_key
      targetPath: storage.trace.s3.secret_key
  values:
    storage:
      trace:
        # Use S3 as the block storage backend
        backend: s3
        s3:
          bucket: my-tempo-traces
          endpoint: s3.us-east-1.amazonaws.com
          region: us-east-1
          insecure: false

    # Configure OTLP gRPC and HTTP ingestion endpoints
    distributor:
      config:
        receivers:
          otlp:
            protocols:
              grpc:
                endpoint: 0.0.0.0:4317
              http:
                endpoint: 0.0.0.0:4318

    # Enable TraceQL search
    querier:
      config:
        search:
          external_endpoints: []

    compactor:
      config:
        compaction:
          # Retain traces for 72 hours (adjust to your SLO)
          block_retention: 72h

    # Expose Tempo metrics for Prometheus scraping
    serviceMonitor:
      enabled: true
```

## Step 4: Configure Grafana Datasource for Tempo

Add a Grafana datasource ConfigMap that points to the Tempo query-frontend.

```yaml
# clusters/my-cluster/tempo/grafana-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-tempo-datasource
  namespace: monitoring
  labels:
    # Grafana sidecar picks up ConfigMaps with this label
    grafana_datasource: "1"
data:
  tempo-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Tempo
        type: tempo
        url: http://tempo-query-frontend.monitoring.svc:3100
        jsonData:
          tracesToLogsV2:
            datasourceUid: loki
          serviceMap:
            datasourceUid: prometheus
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/tempo/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tempo
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/tempo
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Best Practices

- Set `block_retention` to align with your observability SLO; 72h is reasonable for debugging but extend for compliance requirements.
- Enable `serviceMonitor: true` to track Tempo's ingestion and query latency in Grafana dashboards.
- Use `tracesToLogsV2` in the Grafana datasource to link traces directly to Loki log lines by trace ID.
- Configure S3 lifecycle rules to expire objects after `block_retention + buffer_period` to avoid orphaned objects.
- Use a dedicated S3 bucket for Tempo separate from Loki and Mimir to simplify cost attribution and lifecycle management.

## Conclusion

Grafana Tempo with S3 storage delivers distributed tracing at a fraction of the cost of traditional tracing backends. Managing the deployment with Flux CD ensures your trace infrastructure is consistent, auditable, and easy to evolve as your tracing requirements grow.
