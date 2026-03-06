# How to Deploy Mimir with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, mimir, grafana mimir, kubernetes, gitops, metrics, long-term storage, observability

Description: A practical guide to deploying Grafana Mimir for scalable long-term metrics storage on Kubernetes using Flux CD.

---

## Introduction

Grafana Mimir is an open-source, horizontally scalable, highly available long-term metrics storage solution. It is fully compatible with the Prometheus remote write API and PromQL, making it a drop-in replacement for long-term Prometheus storage. Mimir supports multi-tenancy, global aggregation, and can handle billions of active time series.

This guide covers deploying Mimir with Flux CD, configuring Prometheus to remote-write to Mimir, and setting up the components for production use.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- An S3-compatible object storage bucket
- Prometheus already deployed (see the Prometheus Operator guide)

## Setting Up the Helm Repository

```yaml
# clusters/my-cluster/mimir/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

## Creating the Namespace

```yaml
# clusters/my-cluster/mimir/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mimir
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying Mimir in Distributed Mode

```yaml
# clusters/my-cluster/mimir/mimir.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mimir-distributed
  namespace: mimir
spec:
  interval: 30m
  chart:
    spec:
      chart: mimir-distributed
      version: "5.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
      interval: 12h
  maxHistory: 5
  install:
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # Global configuration
    mimir:
      structuredConfig:
        # Multi-tenancy configuration
        multitenancy_enabled: false

        # Ingester configuration
        ingester:
          ring:
            replication_factor: 3
            kvstore:
              store: memberlist

        # Block storage configuration
        blocks_storage:
          backend: s3
          s3:
            bucket_name: my-mimir-blocks
            endpoint: s3.amazonaws.com
            region: us-east-1
          tsdb:
            dir: /data/tsdb
            # How long to keep data in memory before flushing
            block_ranges_period:
              - 2h
            # Retention of local TSDB data
            retention_period: 24h

        # Ruler storage
        ruler_storage:
          backend: s3
          s3:
            bucket_name: my-mimir-ruler
            endpoint: s3.amazonaws.com
            region: us-east-1

        # Alertmanager storage
        alertmanager_storage:
          backend: s3
          s3:
            bucket_name: my-mimir-alertmanager
            endpoint: s3.amazonaws.com
            region: us-east-1

        # Compactor configuration
        compactor:
          # How long to retain data in object storage
          deletion_delay: 2h
          # Data retention period
          blocks_retention_period: 365d

        # Limits configuration
        limits:
          # Maximum series per tenant
          max_global_series_per_user: 1500000
          # Maximum series per metric
          max_global_series_per_metric: 50000
          # Ingestion rate limit
          ingestion_rate: 200000
          ingestion_burst_size: 400000
          # Maximum label names per series
          max_label_names_per_series: 30
          # Compactor blocks retention
          compactor_blocks_retention_period: 365d

        # Frontend configuration for query splitting
        frontend:
          # Split queries by day for parallelism
          split_queries_by_interval: 24h
          # Cache results
          results_cache:
            backend: memcached
            memcached:
              addresses: "dns+mimir-results-cache.mimir.svc:11211"

    # Distributor handles incoming writes
    distributor:
      replicas: 3
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 2000m
          memory: 2Gi

    # Ingester stores recent data
    ingester:
      replicas: 3
      resources:
        requests:
          cpu: 1000m
          memory: 4Gi
        limits:
          cpu: 4000m
          memory: 12Gi
      persistentVolume:
        enabled: true
        size: 50Gi
        storageClass: gp3
      # Zone-aware replication
      zoneAwareReplication:
        enabled: false

    # Store gateway reads blocks from object storage
    store_gateway:
      replicas: 3
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi
      persistentVolume:
        enabled: true
        size: 20Gi
        storageClass: gp3

    # Compactor merges blocks
    compactor:
      replicas: 1
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi
      persistentVolume:
        enabled: true
        size: 50Gi
        storageClass: gp3

    # Query frontend
    query_frontend:
      replicas: 2
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 2000m
          memory: 2Gi

    # Querier
    querier:
      replicas: 2
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi

    # Ruler for recording and alerting rules
    ruler:
      replicas: 2
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi

    # NGINX gateway
    nginx:
      enabled: true
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi

    # Memcached for caching
    chunks-cache:
      enabled: true
      replicas: 2
      allocatedMemory: 2048

    index-cache:
      enabled: true
      replicas: 2
      allocatedMemory: 1024

    metadata-cache:
      enabled: true
      replicas: 1
      allocatedMemory: 512

    results-cache:
      enabled: true
      replicas: 1
      allocatedMemory: 512
```

## Configuring Prometheus Remote Write

Update your Prometheus configuration to send metrics to Mimir.

```yaml
# Add to your kube-prometheus-stack HelmRelease values
prometheus:
  prometheusSpec:
    # Remote write configuration to Mimir
    remoteWrite:
      - url: http://mimir-nginx.mimir.svc:80/api/v1/push
        # Optional: add headers for tenant identification
        headers:
          X-Scope-OrgID: "my-tenant"
        # Queue configuration for reliability
        queueConfig:
          capacity: 10000
          maxShards: 30
          minShards: 1
          maxSamplesPerSend: 5000
          batchSendDeadline: 30s
          minBackoff: 1s
          maxBackoff: 5m
        # Write relabeling to filter metrics
        writeRelabelConfigs:
          # Drop high-cardinality metrics
          - sourceLabels: [__name__]
            regex: "go_.*"
            action: drop
```

## Flux Kustomization

```yaml
# clusters/my-cluster/mimir/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mimir-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: mimir
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/mimir
  prune: true
  wait: true
  timeout: 15m
  dependsOn:
    - name: monitoring-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: mimir-distributed-distributor
      namespace: mimir
    - apiVersion: apps/v1
      kind: Deployment
      name: mimir-distributed-query-frontend
      namespace: mimir
```

## Adding Recording Rules in Mimir

```yaml
# clusters/my-cluster/mimir/recording-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mimir-recording-rules
  namespace: mimir
data:
  rules.yaml: |
    groups:
      - name: aggregated_metrics
        interval: 1m
        rules:
          # Pre-compute namespace CPU usage
          - record: namespace:container_cpu_usage:sum_rate5m
            expr: |
              sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace)

          # Pre-compute namespace memory usage
          - record: namespace:container_memory_usage:sum
            expr: |
              sum(container_memory_working_set_bytes{container!=""}) by (namespace)

          # Pre-compute request rate by service
          - record: service:http_requests:rate5m
            expr: |
              sum(rate(http_requests_total[5m])) by (service, method, status_code)
```

## Configuring Grafana Data Source for Mimir

```yaml
# clusters/my-cluster/grafana/datasources/mimir.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: mimir
  namespace: grafana
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  datasource:
    name: Mimir
    type: prometheus
    access: proxy
    url: http://mimir-nginx.mimir.svc:80/prometheus
    jsonData:
      timeInterval: 30s
      httpMethod: POST
      # Custom header for tenant ID
      httpHeaderName1: "X-Scope-OrgID"
    secureJsonData:
      httpHeaderValue1: "my-tenant"
    editable: false
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmreleases -n mimir

# Verify all Mimir pods are running
kubectl get pods -n mimir

# Check Mimir ring status
kubectl port-forward -n mimir svc/mimir-nginx 8080:80
# Visit http://localhost:8080/ingester/ring

# Verify remote write is working
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus -c prometheus | grep "remote_write"

# Query Mimir directly
curl -s http://localhost:8080/prometheus/api/v1/query \
  -H "X-Scope-OrgID: my-tenant" \
  --data-urlencode 'query=up' | jq .

# Check active series count
curl -s http://localhost:8080/prometheus/api/v1/query \
  -H "X-Scope-OrgID: my-tenant" \
  --data-urlencode 'query=cortex_ingester_active_series' | jq .
```

## Conclusion

You now have a production-ready Grafana Mimir deployment managed by Flux CD. The setup provides horizontally scalable long-term metrics storage, multi-tenancy support for isolating different teams, caching layers for fast query performance, recording rules for pre-computed aggregations, and seamless integration with Prometheus via remote write. Flux CD ensures all configuration changes are tracked in Git and automatically applied to your cluster.
