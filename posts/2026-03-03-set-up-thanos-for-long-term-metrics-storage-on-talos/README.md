# How to Set Up Thanos for Long-Term Metrics Storage on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Thanos, Prometheus, Long-Term Storage, Kubernetes, Monitoring, Object Storage

Description: Learn how to deploy Thanos alongside Prometheus on Talos Linux for scalable long-term metrics retention using object storage.

---

Prometheus is great at collecting and querying recent metrics, but it was not designed for long-term storage. By default, most setups retain 15 to 30 days of data. If you need to look back months or years for capacity planning, trend analysis, or compliance, you need something more. Thanos extends Prometheus with a global query view and cheap long-term storage using object storage backends like S3, GCS, or MinIO. In this guide, we will deploy Thanos on a Talos Linux Kubernetes cluster and configure it for durable metrics retention.

## What Thanos Does

Thanos is a set of components that work alongside Prometheus to solve three problems:

1. **Long-term storage**: Thanos ships Prometheus blocks to object storage where they can live indefinitely at low cost.
2. **Global query view**: If you have multiple Prometheus instances, Thanos lets you query all of them from a single endpoint.
3. **Downsampling**: For older data, Thanos can reduce resolution to save storage while keeping the ability to query historical trends.

## Architecture Overview

The Thanos deployment we will build consists of:

- **Thanos Sidecar**: Runs alongside each Prometheus instance, uploading TSDB blocks to object storage
- **Thanos Store Gateway**: Serves historical data from object storage
- **Thanos Query**: Provides a unified PromQL query interface across all data sources
- **Thanos Compactor**: Handles compaction and downsampling of stored blocks

## Prerequisites

You will need:

- A running Talos Linux Kubernetes cluster with the kube-prometheus-stack installed
- An S3-compatible object storage bucket (AWS S3, MinIO, or similar)
- Helm 3 and kubectl configured

## Step 1: Create Object Storage Configuration

First, create a secret containing your object storage configuration:

```yaml
# thanos-objstore-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: monitoring
type: Opaque
stringData:
  objstore.yml: |
    type: S3
    config:
      bucket: "talos-thanos-metrics"
      endpoint: "s3.us-east-1.amazonaws.com"
      region: "us-east-1"
      access_key: "YOUR_ACCESS_KEY"
      secret_key: "YOUR_SECRET_KEY"
```

If you are using MinIO instead:

```yaml
stringData:
  objstore.yml: |
    type: S3
    config:
      bucket: "thanos-metrics"
      endpoint: "minio.minio-system.svc.cluster.local:9000"
      access_key: "minio-admin"
      secret_key: "minio-secret"
      insecure: true
```

Apply the secret:

```bash
kubectl apply -f thanos-objstore-secret.yaml
```

## Step 2: Configure Prometheus with Thanos Sidecar

Update your kube-prometheus-stack Helm values to enable the Thanos sidecar:

```yaml
# prometheus-thanos-values.yaml
prometheus:
  prometheusSpec:
    # Keep local retention short since Thanos handles long-term storage
    retention: 4h
    # Add external labels so Thanos can identify the source
    externalLabels:
      cluster: talos-production
      environment: production
    # Reference the object store secret for the sidecar
    thanos:
      objectStorageConfig:
        existingSecret:
          name: thanos-objstore-config
          key: objstore.yml
      # Thanos sidecar gRPC port
      grpcServerTlsConfig: {}
    # Ensure Prometheus uses persistent storage
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 20Gi
  # Expose the Thanos sidecar service
  thanosService:
    enabled: true
  thanosServiceMonitor:
    enabled: true
```

Upgrade your Prometheus installation:

```bash
helm upgrade prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-thanos-values.yaml
```

Verify the sidecar is running:

```bash
# Check that the Prometheus pod now has two containers
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus

# Check the sidecar logs
kubectl logs -n monitoring prometheus-prometheus-stack-kube-prometheus-prometheus-0 -c thanos-sidecar
```

## Step 3: Deploy Thanos Components

Now deploy the remaining Thanos components using the Bitnami Thanos Helm chart:

```bash
# Add the Bitnami Helm repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

Create values for the Thanos deployment:

```yaml
# thanos-values.yaml
existingObjstoreSecret: thanos-objstore-config

# Query component - provides unified PromQL interface
query:
  enabled: true
  replicaCount: 2
  # Connect to the Prometheus sidecar
  stores:
    - "dnssrv+_grpc._tcp.prometheus-stack-thanos-discovery.monitoring.svc.cluster.local"
  # Also connect to the Store Gateway for historical data
  extraFlags:
    - "--query.auto-downsampling"

# Store Gateway - serves historical data from object storage
storegateway:
  enabled: true
  replicaCount: 1
  persistence:
    enabled: true
    size: 20Gi

# Compactor - handles compaction and downsampling
compactor:
  enabled: true
  persistence:
    enabled: true
    size: 50Gi
  # Retention configuration
  retentionResolutionRaw: 30d
  retentionResolution5m: 120d
  retentionResolution1h: 365d
  # Run compaction continuously
  extraFlags:
    - "--compact.concurrency=1"
    - "--downsample.concurrency=1"
    - "--wait"

# Query Frontend - caches and splits queries
queryFrontend:
  enabled: true
  replicaCount: 1
  extraFlags:
    - "--query-frontend.compress-responses"
    - "--query-range.split-interval=24h"
    - "--query-range.max-retries-per-request=5"

# We do not need the Ruler for now
ruler:
  enabled: false

# Metrics and service monitors
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
```

Install Thanos:

```bash
helm install thanos bitnami/thanos \
  --namespace monitoring \
  --values thanos-values.yaml
```

## Step 4: Point Grafana to Thanos Query

Update your Grafana data source to point to the Thanos Query endpoint instead of Prometheus directly. This way, all your dashboards will automatically query both recent and historical data.

```yaml
# grafana-thanos-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-thanos-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  thanos-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Thanos
        type: prometheus
        access: proxy
        url: http://thanos-query.monitoring.svc.cluster.local:9090
        isDefault: true
        jsonData:
          timeInterval: "15s"
```

Apply the data source:

```bash
kubectl apply -f grafana-thanos-datasource.yaml
# Restart Grafana to pick up the new data source
kubectl rollout restart deployment -n monitoring prometheus-stack-grafana
```

## Step 5: Verify the Setup

Check that all Thanos components are running and data is flowing:

```bash
# Check all Thanos pods
kubectl get pods -n monitoring -l app.kubernetes.io/name=thanos

# Port-forward to Thanos Query UI
kubectl port-forward -n monitoring svc/thanos-query 9090:9090
```

Open http://localhost:9090 and you should see the Thanos Query interface. Check the Stores tab to verify that both the Sidecar and Store Gateway are connected.

Run a test query to see data from both recent (sidecar) and historical (store gateway) sources:

```promql
# This should return data from both sources
up
```

## Step 6: Verify Object Storage Uploads

Check that Prometheus blocks are being uploaded to your object storage:

```bash
# Check sidecar logs for upload activity
kubectl logs -n monitoring prometheus-prometheus-stack-kube-prometheus-prometheus-0 -c thanos-sidecar | grep "upload"

# If using MinIO, you can also check the bucket directly
# mc ls myminio/thanos-metrics/
```

## Compaction and Downsampling

The Thanos Compactor runs continuously and handles two important jobs:

1. **Compaction**: Merges small TSDB blocks into larger ones for efficient querying
2. **Downsampling**: Creates lower-resolution copies of data for long-term retention

The retention settings in our configuration mean:
- Raw data (full resolution): kept for 30 days
- 5-minute resolution: kept for 120 days
- 1-hour resolution: kept for 365 days

Monitor the compactor to make sure it is keeping up:

```bash
kubectl logs -n monitoring -l app.kubernetes.io/component=compactor --tail=100
```

## Performance Tuning

For production Talos Linux clusters, consider these optimizations:

```yaml
# Increase Store Gateway memory for large datasets
storegateway:
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
    limits:
      memory: 4Gi
      cpu: 1000m
  # Cache configuration for faster queries
  extraFlags:
    - "--store.caching-bucket.config={type: IN-MEMORY, config: {max_size_bytes: 1073741824}}"
```

## Conclusion

Thanos turns your Talos Linux Prometheus setup into a proper long-term metrics platform. With the sidecar uploading blocks to object storage, the store gateway serving historical queries, and the compactor managing retention and downsampling, you get months or years of metrics data at a fraction of the cost of keeping it all in Prometheus. The unified query layer means your Grafana dashboards work seamlessly across both recent and historical data without any changes. This is the kind of setup that lets you do real capacity planning and trend analysis instead of guessing.
