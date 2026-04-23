# How to Deploy Mimir on Rancher for Metrics Storage - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Mimir, Prometheus, Metrics Storage, Observability

Description: Deploy Grafana Mimir on Rancher for horizontally scalable, long-term Prometheus metrics storage with multi-tenancy and high availability.

## Introduction

Grafana Mimir is a horizontally scalable, highly available, multi-tenant, long-term storage for Prometheus metrics. It's the successor to Cortex and provides object-storage-based metrics storage at massive scale. This guide covers deploying Mimir on Rancher and configuring Prometheus to remote-write metrics to it.

## Prerequisites

- Rancher-managed Kubernetes 1.29+ cluster
- Helm 3.8+ installed
- Object storage (S3, GCS, or MinIO)
- Rancher Monitoring (Prometheus) installed

## Step 1: Deploy Mimir

```yaml
# mimir-values.yaml - Mimir classic architecture for small/medium deployments

kafka:
  enabled: false

mimir:
  structuredConfig:
    # Classic architecture disables ingest storage and Kafka for the write path.
    ingest_storage:
      enabled: false
      kafka:
        address: null
        topic: null
        auto_create_topic_default_partitions: null

    distributor:
      remote_timeout: null

    common:
      storage:
        backend: s3
        s3:
          endpoint: minio.observability.svc.cluster.local:9000
          access_key_id: minioadmin
          secret_access_key: minioadmin
          insecure: true

    # Block storage configuration
    blocks_storage:
      s3:
        bucket_name: mimir-blocks
      tsdb:
        retention_period: 13h
        ship_interval: 1m

    # Alertmanager storage
    alertmanager_storage:
      s3:
        bucket_name: mimir-alertmanager

    # Ruler storage
    ruler_storage:
      s3:
        bucket_name: mimir-ruler

    # Limits configuration
    limits:
      # Retention period for blocks in object storage
      compactor_blocks_retention_period: 365d
      # Maximum number of series per tenant
      max_global_series_per_user: 1000000
      # Maximum ingestion rate
      ingestion_rate: 100000
      ingestion_burst_size: 200000

    # Ingester configuration
    ingester:
      push_grpc_method_enabled: null
      ring:
        replication_factor: 3

    # Multi-tenancy
    multitenancy_enabled: true

# Persistence for WAL / TSDB
ingester:
  replicas: 3
  persistentVolume:
    enabled: true
    size: 20Gi

distributor:
  replicas: 2

alertmanager:
  replicas: 2
  statefulSet:
    enabled: true
  persistentVolume:
    enabled: true
    size: 2Gi

compactor:
  persistentVolume:
    enabled: true
    size: 20Gi

store_gateway:
  replicas: 3
  persistentVolume:
    enabled: true
    size: 10Gi

# Enable the gateway as the HTTP entry point
gateway:
  enabled: true
  replicas: 2

# Disable the built-in MinIO deployment
minio:
  enabled: false

metaMonitoring:
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
    labels:
      release: rancher-monitoring
```

```bash
# Add Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Create MinIO buckets for Mimir
kubectl run -n observability minio-client --rm -i --restart=Never \
  --image=minio/mc -- \
  sh -c "mc alias set local http://minio.observability.svc.cluster.local:9000 minioadmin minioadmin && \
         mc mb --ignore-existing local/mimir-blocks && \
         mc mb --ignore-existing local/mimir-alertmanager && \
         mc mb --ignore-existing local/mimir-ruler"

# Install Mimir
helm install mimir grafana/mimir-distributed \
  --namespace observability \
  --create-namespace \
  --values mimir-values.yaml \
  --wait \
  --timeout 10m
```

## Step 2: Configure Prometheus Remote Write

Configure Rancher Monitoring's Prometheus to send metrics to Mimir:

```yaml
# prometheus-remote-write.yaml - Configure Prometheus to remote write to Mimir
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: rancher-monitoring-prometheus
  namespace: cattle-monitoring-system
spec:
  # Remote write to Mimir
  remoteWrite:
    - url: "http://mimir-gateway.observability.svc.cluster.local/api/v1/push"
      headers:
        # Tenant ID for multi-tenancy
        X-Scope-OrgID: rancher-production
      queueConfig:
        maxSamplesPerSend: 1000
        maxShards: 30
        capacity: 2500
      writeRelabelConfigs:
        # Add cluster label to all metrics
        - sourceLabels: []
          targetLabel: cluster
          replacement: rancher-production
```

## Step 3: Configure Grafana to Query Mimir

```yaml
# grafana-mimir-datasource.yaml - Mimir data source for Grafana
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-mimir
  namespace: cattle-monitoring-system
  labels:
    grafana_datasource: "1"
data:
  mimir-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Mimir
        type: prometheus
        url: http://mimir-gateway.observability.svc.cluster.local/prometheus
        access: proxy
        basicAuth: false
        jsonData:
          httpHeaderName1: X-Scope-OrgID
          timeInterval: 30s
        secureJsonData:
          httpHeaderValue1: rancher-production
```

## Step 4: Set Up Multi-Tenancy for Multiple Clusters

```yaml
# mimir-multi-tenant.yaml - Remote write with per-cluster tenant IDs
# Cluster 1 (production)
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: rancher-monitoring-prometheus
  namespace: cattle-monitoring-system
spec:
  remoteWrite:
    - url: "http://central-mimir.monitoring.svc.cluster.local/api/v1/push"
      headers:
        X-Scope-OrgID: production-cluster
```

```yaml
# Cluster 2 (staging)
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: rancher-monitoring-prometheus
  namespace: cattle-monitoring-system
spec:
  remoteWrite:
    - url: "http://central-mimir.monitoring.svc.cluster.local/api/v1/push"
      headers:
        X-Scope-OrgID: staging-cluster
```

## Step 5: Configure Alertmanager in Mimir

```bash
# Configure Mimir's built-in Alertmanager via API
curl -X POST \
  http://mimir-gateway.observability.svc.cluster.local/api/v1/alerts \
  -H "X-Scope-OrgID: rancher-production" \
  -H "Content-Type: application/yaml" \
  --data-binary @- <<'EOF'
alertmanager_config: |
  global:
    resolve_timeout: 5m
    slack_api_url: "https://hooks.slack.com/services/XXX/YYY/ZZZ"
  route:
    group_by: ["alertname", "cluster"]
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 1h
    receiver: "slack-notifications"
  receivers:
    - name: "slack-notifications"
      slack_configs:
        - channel: "#alerts"
          title: "{{ .GroupLabels.alertname }}"
          text: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
EOF
```

## Step 6: Monitor Mimir Itself

```yaml
# mimir-alerts.yaml - Alerts for Mimir health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mimir-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: mimir
      rules:
        - alert: MimirIngesterUnhealthy
          expr: min(cortex_ring_members{state="Unhealthy",name="ingester"}) > 0
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Mimir ingester is unhealthy"

        - alert: MimirCompactorRunFailing
          expr: sum(increase(cortex_compactor_runs_failed_total[1h])) > 0
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Mimir compactor runs are failing"
```

## Conclusion

Grafana Mimir provides enterprise-grade, horizontally scalable metrics storage for Rancher environments managing multiple clusters. Its compatibility with the Prometheus remote write API makes migration straightforward, and the multi-tenancy model enables clean separation between different teams or clusters in a single Mimir deployment. When combined with Loki (logs) and Tempo (traces), Mimir completes the LGTM observability stack that Grafana Labs recommends for cloud-native environments.
