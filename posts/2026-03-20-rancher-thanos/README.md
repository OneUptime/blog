# How to Deploy Thanos on Rancher for Long-Term Metrics - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Thanos, Prometheus, Long-Term Storage, Observability

Description: Deploy Thanos on Rancher to enable long-term metrics retention, cross-cluster querying, and global view for your Prometheus monitoring infrastructure.

## Introduction

Thanos extends Prometheus with long-term storage, global query view across multiple clusters, and high availability. It stores metrics in object storage (S3, GCS, Azure Blob) at a fraction of the cost of local storage. This guide covers deploying Thanos alongside Rancher's monitoring stack.

## Prerequisites

- Rancher Monitoring (Prometheus) stack installed
- Object storage (S3, GCS, or MinIO)
- Helm 3.x installed
- kubectl with cluster-admin access

## Step 1: Configure Prometheus with Thanos Sidecar

Modify the Rancher Monitoring Prometheus to enable the Thanos sidecar:

```yaml
# prometheus-with-thanos.yaml - Prometheus operator config

apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: rancher-monitoring-prometheus
  namespace: cattle-monitoring-system
spec:
  # Thanos sidecar configuration
  thanos:
    image: quay.io/thanos/thanos:v0.36.0
    version: v0.36.0
    objectStorageConfig:
      secret:
        name: thanos-object-store-config
        key: thanos.yaml

  # Retention for local storage (short-term)
  retention: 6h
  retentionSize: 4GB

  # External labels for cluster identification
  externalLabels:
    cluster: rancher-production
    region: us-east-1

  # WAL compression
  walCompression: true
```

If you installed Rancher Monitoring through Helm, also enable `prometheus.thanosService.enabled: true` so Thanos Query can discover the sidecar through the `rancher-monitoring-thanos-discovery` Service.

## Step 2: Create Object Store Configuration

```bash
# Create object store secret for S3
kubectl create secret generic thanos-object-store-config \
  --from-literal=thanos.yaml="$(cat << 'EOF'
type: s3
config:
  bucket: thanos-metrics-storage
  endpoint: s3.amazonaws.com
  region: us-east-1
  access_key: AKIAIOSFODNN7EXAMPLE
  secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  insecure: false
  signature_version2: false
  http_config:
    idle_conn_timeout: 90s
    response_header_timeout: 2m
    insecure_skip_verify: false
prefix: prometheus/rancher-production
EOF
)" \
  --namespace cattle-monitoring-system
```

## Step 3: Deploy Thanos Components

```yaml
# thanos-values.yaml - Thanos stack configuration
existingObjstoreSecret: thanos-object-store-config
existingObjstoreSecretItems:
  - key: thanos.yaml
    path: objstore.yml

query:
  enabled: true
  replicaCount: 2
  dnsDiscovery:
    enabled: true
    # Requires prometheus.thanosService.enabled=true in Rancher Monitoring
    sidecarsService: rancher-monitoring-thanos-discovery
    sidecarsNamespace: cattle-monitoring-system
  resources:
    requests:
      memory: 256Mi
      cpu: 100m

# Query Frontend for caching
queryFrontend:
  enabled: true
  replicaCount: 2
  config: |
    type: IN-MEMORY
    config:
      max_size: 512MB
      validity: 24h

# Store Gateway (serves data from object store)
storegateway:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi

# Compactor (compacts blocks, downsamples, and enforces retention)
compactor:
  enabled: true
  retentionResolutionRaw: 30d   # Keep raw data for 30 days
  retentionResolution5m: 90d    # Keep 5m downsampled for 90 days
  retentionResolution1h: 365d   # Keep 1h downsampled for 1 year
  persistence:
    enabled: true
    size: 50Gi

# Ruler for alerting on long-term metrics
ruler:
  enabled: false
```

```bash
# Add Bitnami repo (has Thanos chart)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Install Thanos
helm install thanos bitnami/thanos \
  --namespace cattle-monitoring-system \
  --values thanos-values.yaml \
  --wait
```

## Step 4: Configure Grafana to Use Thanos

Configure via Grafana ConfigMap:

```yaml
# grafana-datasource-thanos.yaml - Add Thanos as Grafana datasource
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-thanos
  namespace: cattle-monitoring-system
  labels:
    grafana_datasource: "1"
data:
  thanos-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Thanos
        type: prometheus
        url: http://thanos-query-frontend.cattle-monitoring-system.svc.cluster.local:9090
        access: proxy
        isDefault: false
        jsonData:
          timeInterval: 30s
          httpMethod: POST
```

## Step 5: Multi-Cluster Global View

For querying across multiple Rancher clusters:

```yaml
# thanos-multi-cluster-query.yaml - Global Thanos Query
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-global-query
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-global-query
  template:
    metadata:
      labels:
        app: thanos-global-query
    spec:
      containers:
        - name: thanos-query
          image: quay.io/thanos/thanos:v0.36.0
          ports:
            - name: http
              containerPort: 9090
            - name: grpc
              containerPort: 10901
          args:
            - query
            - --http-address=0.0.0.0:9090
            # Connect to store gateways from all clusters
            - --endpoint=cluster1-thanos-store.cluster1.svc.cluster.local:10901
            - --endpoint=cluster2-thanos-store.cluster2.svc.cluster.local:10901
            - --endpoint=cluster3-thanos-store.cluster3.svc.cluster.local:10901
            # Deduplicate metrics from replicated Prometheus
            - --query.replica-label=prometheus_replica
```

## Step 6: Verify Thanos is Working

```bash
# Check Thanos components
kubectl get pods -n cattle-monitoring-system | grep thanos

# Query long-term metrics through Thanos
kubectl port-forward -n cattle-monitoring-system svc/thanos-query 9090:9090 &
curl "http://localhost:9090/api/v1/query?query=up&time=$(date -u +%s)" | jq '.data.result | length'

# Check compactor status
kubectl logs -n cattle-monitoring-system deployment/thanos-compactor --tail=50

# Verify object store has data
aws s3 ls s3://thanos-metrics-storage/prometheus/rancher-production/ --recursive | head -20
```

## Conclusion

Thanos transforms Prometheus from a short-term metrics store into a scalable, long-term observability platform. By storing metrics in object storage, you dramatically reduce infrastructure costs compared to keeping metrics on local SSD. The global query view enables cross-cluster queries, making Thanos essential for organizations managing multiple Rancher clusters. Start with the sidecar approach alongside Rancher Monitoring for the simplest path to long-term retention.
