# How to Set Up Cortex with Prometheus for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Cortex, Prometheus, Metrics, Scalable Storage

Description: How to deploy and configure Cortex as a horizontally scalable, multi-tenant metrics backend for Istio service mesh metrics collected by Prometheus.

---

Cortex is a horizontally scalable, multi-tenant Prometheus-compatible metrics backend. It accepts metrics via Prometheus remote write and stores them in object storage with a query layer that speaks PromQL. For Istio deployments with high metric volume or multi-tenant requirements, Cortex provides better scalability than standalone Prometheus or even Thanos.

This guide covers setting up Cortex to receive and store Istio metrics from one or more Kubernetes clusters.

## Why Cortex for Istio

Cortex makes sense when:

- You have multiple clusters with Istio and want centralized metrics
- You need multi-tenancy (different teams or environments isolated in the same backend)
- Your metric volume exceeds what a single Prometheus can handle
- You want a fully horizontally scalable ingestion and query path

Compared to Thanos, Cortex takes a different approach. Thanos extends Prometheus by uploading blocks to object storage. Cortex receives metrics via remote write and handles storage independently. Both work well; Cortex is better suited when you want the storage backend to be fully decoupled from Prometheus.

## Architecture Overview

The key Cortex components for an Istio setup:

- **Distributor**: Receives remote write requests from Prometheus and distributes samples to Ingesters
- **Ingester**: Batches and compresses samples, writes them to long-term storage
- **Querier**: Handles PromQL queries by reading from both Ingesters (recent data) and Store (historical data)
- **Query Frontend** (optional): Caches and splits queries for better performance
- **Compactor**: Compacts blocks in object storage
- **Store Gateway**: Serves blocks from object storage for queries

## Deploying Cortex

The simplest way to deploy Cortex for testing is using the single-binary mode. For production, use the microservices mode. Here is a microservices deployment using Helm:

```bash
helm repo add cortex-helm https://cortexproject.github.io/cortex-helm-chart
helm repo update

helm install cortex cortex-helm/cortex \
  --namespace cortex \
  --create-namespace \
  --values cortex-values.yaml
```

The values file for an Istio-focused deployment:

```yaml
# cortex-values.yaml
config:
  storage:
    engine: blocks
  blocks_storage:
    backend: s3
    s3:
      bucket_name: istio-cortex-metrics
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
    tsdb:
      dir: /data/tsdb
    bucket_store:
      sync_dir: /data/tsdb-sync

  limits:
    ingestion_rate: 100000
    ingestion_burst_size: 200000
    max_series_per_user: 5000000
    max_series_per_metric: 50000

  distributor:
    ring:
      kvstore:
        store: memberlist

  ingester:
    ring:
      kvstore:
        store: memberlist
      replication_factor: 3

distributor:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi

ingester:
  replicas: 3
  persistentVolume:
    enabled: true
    size: 50Gi
  resources:
    requests:
      cpu: "1"
      memory: 4Gi

querier:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi

query_frontend:
  replicas: 2

compactor:
  replicas: 1
  persistentVolume:
    enabled: true
    size: 50Gi

store_gateway:
  replicas: 2
  persistentVolume:
    enabled: true
    size: 20Gi
```

## Configuring Prometheus Remote Write

Once Cortex is running, configure Prometheus to send Istio metrics via remote write:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: istio-system
spec:
  remoteWrite:
  - url: "http://cortex-distributor.cortex.svc:8080/api/v1/push"
    headers:
      X-Scope-OrgID: "production"
    writeRelabelConfigs:
    - sourceLabels: [__name__]
      regex: 'istio_.*|pilot_.*|envoy_cluster_upstream_rq_total'
      action: keep
    queueConfig:
      capacity: 10000
      maxShards: 20
      maxSamplesPerSend: 5000
  externalLabels:
    cluster: "production-us-east-1"
```

The `X-Scope-OrgID` header enables multi-tenancy. Each cluster or team can use a different tenant ID.

For plain Prometheus config:

```yaml
remote_write:
- url: "http://cortex-distributor.cortex.svc:8080/api/v1/push"
  headers:
    X-Scope-OrgID: "production"
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio_.*|pilot_.*'
    action: keep
  queue_config:
    capacity: 10000
    max_shards: 20
```

## Multi-Cluster Setup

For multiple clusters, each one runs its own Prometheus with remote write pointing to the same Cortex cluster. Use different external labels to identify each cluster:

Cluster 1:

```yaml
externalLabels:
  cluster: "prod-us-east"
remoteWrite:
- url: "http://cortex.central.example.com/api/v1/push"
  headers:
    X-Scope-OrgID: "production"
```

Cluster 2:

```yaml
externalLabels:
  cluster: "prod-eu-west"
remoteWrite:
- url: "http://cortex.central.example.com/api/v1/push"
  headers:
    X-Scope-OrgID: "production"
```

Now you can query Istio metrics across clusters:

```promql
sum(rate(istio_requests_total[5m])) by (cluster, destination_service)
```

## Multi-Tenancy for Istio

Cortex multi-tenancy is useful when you have different teams or environments sharing the same Cortex cluster. Each tenant gets isolated storage and query paths.

Example setup:
- Tenant `production`: Production Istio metrics
- Tenant `staging`: Staging Istio metrics
- Tenant `platform`: Control plane metrics from all clusters

Set different rate limits per tenant:

```yaml
config:
  limits:
    per_tenant_override_config: /etc/cortex/overrides.yaml

# overrides.yaml
overrides:
  production:
    ingestion_rate: 200000
    max_series_per_user: 10000000
  staging:
    ingestion_rate: 50000
    max_series_per_user: 2000000
  platform:
    ingestion_rate: 20000
    max_series_per_user: 500000
```

## Querying Cortex

Cortex exposes a Prometheus-compatible query API. Point Grafana to the Cortex Query Frontend:

```yaml
datasources:
- name: Cortex-Production
  type: prometheus
  url: http://cortex-query-frontend.cortex.svc:8080/prometheus
  jsonData:
    httpHeaderName1: X-Scope-OrgID
  secureJsonData:
    httpHeaderValue1: production
```

You can use all the same PromQL queries you use with regular Prometheus:

```promql
# Request rate by service across all clusters
sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service, cluster)

# P99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
```

## Tuning for Istio Workloads

Istio generates high-cardinality metrics. Here are tuning recommendations:

**Increase series limits**: The default Cortex series limit is often too low for Istio:

```yaml
limits:
  max_series_per_user: 5000000
  max_series_per_metric: 100000
```

**Enable query result caching** on the Query Frontend to speed up repeated dashboard queries:

```yaml
query_frontend:
  results_cache:
    backend: memcached
    memcached:
      addresses: "dns+memcached.cortex.svc:11211"
```

**Configure compactor retention** to control how long data is kept:

```yaml
compactor:
  deletion_enabled: true
  blocks_retention_period: 365d
```

## Monitoring Cortex Itself

Cortex exposes its own Prometheus metrics. Set up a separate scrape config:

```yaml
scrape_configs:
- job_name: 'cortex'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - cortex
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_port_name]
    action: keep
    regex: http-metrics
```

Key metrics to watch:
- `cortex_distributor_received_samples_total`: Ingestion rate
- `cortex_ingester_memory_series`: Active series in ingesters
- `cortex_request_duration_seconds_bucket`: Query latency

Cortex provides a solid foundation for large-scale Istio metric storage. The multi-tenant model, horizontal scalability, and Prometheus compatibility make it a strong choice for organizations running Istio across many clusters.
