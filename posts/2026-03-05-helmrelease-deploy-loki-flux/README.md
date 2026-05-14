# How to Use HelmRelease for Deploying Loki with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Loki, Logging, Observability

Description: Learn how to deploy Grafana Loki on Kubernetes using a Flux HelmRelease for cost-effective, scalable log aggregation.

---

Grafana Loki is a horizontally scalable, multi-tenant log aggregation system inspired by Prometheus. Unlike traditional logging solutions like Elasticsearch, Loki indexes only metadata (labels) rather than the full text of log messages, making it significantly more cost-effective. Deploying Loki through Flux CD ensures your logging infrastructure is declaratively managed.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Object storage (S3, GCS, or MinIO) for production deployments
- Grafana for querying logs with a full UI

## Creating the HelmRepository

Loki is published through the Grafana Community Helm chart repository. Grafana Alloy is published through the Grafana Helm chart repository.

```yaml
# helmrepository-grafana-community.yaml - Grafana Community Helm chart repository for Loki

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana-community.github.io/helm-charts
---
# helmrepository-grafana.yaml - Grafana Helm chart repository for Alloy and Grafana charts

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

## Deploying Loki with HelmRelease

The following HelmRelease deploys Loki in monolithic mode, suitable for small to medium workloads. For large-scale deployments, use the distributed mode instead.

```yaml
# helmrelease-loki.yaml - Loki deployment via Flux using the loki chart
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: loki
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: loki
      version: "13.x"
      sourceRef:
        kind: HelmRepository
        name: grafana-community
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Deploy in monolithic mode for simplicity
    deploymentMode: Monolithic

    # Monolithic configuration
    singleBinary:
      replicas: 1
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      persistence:
        enabled: true
        size: 50Gi

    # Loki configuration
    loki:
      # Authentication disabled for single-tenant setups
      auth_enabled: false

      # Common configuration shared across all components
      commonConfig:
        replication_factor: 1

      # Schema configuration for log storage
      schemaConfig:
        configs:
          - from: "2024-01-01"
            store: tsdb
            object_store: filesystem
            schema: v13
            index:
              prefix: loki_index_
              period: 24h

      # Storage configuration using local filesystem
      storage:
        type: filesystem

      # Limits configuration
      limits_config:
        # Maximum number of label names per series
        max_label_names_per_series: 30
        # Retention period for logs
        retention_period: 744h
        # Ingestion rate limit per user
        ingestion_rate_mb: 10
        ingestion_burst_size_mb: 20

      # Compactor configuration required for retention enforcement
      compactor:
        working_directory: /var/loki/compactor
        retention_enabled: true
        delete_request_store: filesystem

    # Gateway configuration
    gateway:
      enabled: true
      replicas: 1
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi

    # Disable microservices components
    read:
      replicas: 0
    write:
      replicas: 0
    backend:
      replicas: 0

    # Chunk cache configuration
    chunksCache:
      enabled: false

    # Results cache configuration
    resultsCache:
      enabled: false

    # Monitoring and alerting for Loki itself
    monitoring:
      selfMonitoring:
        enabled: false
      lokiCanary:
        enabled: false

    # Test configuration
    test:
      enabled: false
```

## Deploying Grafana Alloy for Log Collection

Loki needs a log collector to send logs from your cluster. Grafana Alloy is the recommended choice for new deployments.

```yaml
# helmrelease-alloy.yaml - Alloy deployment for shipping logs to Loki
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: alloy
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: alloy
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  values:
    alloy:
      mounts:
        varlog: true
      configMap:
        content: |
          logging {
            level  = "info"
            format = "logfmt"
          }

          discovery.kubernetes "pods" {
            role = "pod"
          }

          loki.source.kubernetes "pods" {
            targets    = discovery.kubernetes.pods.targets
            forward_to = [loki.write.endpoint.receiver]
          }

          loki.write "endpoint" {
            endpoint {
              url = "http://loki-gateway.monitoring.svc.cluster.local/loki/api/v1/push"
            }
          }
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi

    # Tolerate all taints so Alloy can run across the cluster
    controller:
      tolerations:
        - operator: Exists
```

## Production Configuration with Object Storage

For production workloads, configure Loki to use object storage (such as S3) instead of the local filesystem.

```yaml
# Snippet: Production Loki values with S3 storage
loki:
  schemaConfig:
    configs:
      - from: "2024-01-01"
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h
  storage:
    type: s3
    s3:
      endpoint: s3.amazonaws.com
      region: us-east-1
      accessKeyId: "<AWS_ACCESS_KEY_ID>"
      secretAccessKey: "<AWS_SECRET_ACCESS_KEY>"
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
  storage_config:
    aws:
      region: us-east-1
      bucketnames: loki-chunks
      s3forcepathstyle: false
  compactor:
    working_directory: /var/loki/compactor
    retention_enabled: true
    delete_request_store: s3
```

## Configuring Grafana Data Source

Add Loki as a data source in your Grafana configuration so you can query logs.

```yaml
# Snippet: Grafana datasource configuration for Loki
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        url: http://loki-gateway.monitoring.svc.cluster.local
        access: proxy
        jsonData:
          maxLines: 1000
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease loki -n monitoring
flux get helmrelease alloy -n monitoring

# Verify Loki pods are running
kubectl get pods -n monitoring -l app.kubernetes.io/name=loki

# Verify Alloy is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=alloy

# Test Loki is accepting logs
kubectl port-forward -n monitoring svc/loki-gateway 3100:80
curl http://localhost:3100/loki/api/v1/labels

# Query recent logs
curl -G http://localhost:3100/loki/api/v1/query --data-urlencode 'query={namespace="default"}'
```

## Summary

Deploying Loki with Alloy through Flux HelmRelease from `https://grafana-community.github.io/helm-charts` and `https://grafana.github.io/helm-charts` provides a GitOps-managed, cost-effective logging solution. Loki's label-based indexing keeps storage costs low compared to full-text indexing solutions, while its tight integration with Grafana gives you a unified observability platform for both metrics and logs.
