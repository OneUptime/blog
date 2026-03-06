# How to Deploy Thanos with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, thanos, kubernetes, gitops, metrics, long-term storage, prometheus, observability

Description: A practical guide to deploying Thanos for highly available Prometheus with long-term storage on Kubernetes using Flux CD.

---

## Introduction

Thanos is an open-source project that extends Prometheus with long-term storage, high availability, and global query capabilities. It achieves this by adding a set of components that integrate seamlessly with existing Prometheus deployments. Unlike a full replacement, Thanos operates as a sidecar to Prometheus, uploading blocks to object storage and providing a unified query layer.

This guide covers deploying a complete Thanos setup with Flux CD, including the sidecar, query, store gateway, compactor, and ruler components.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- Prometheus Operator already deployed
- An S3-compatible object storage bucket

## Setting Up the Helm Repository

```yaml
# clusters/my-cluster/thanos/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

## Creating the Namespace

```yaml
# clusters/my-cluster/thanos/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: thanos
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Configuring Object Storage

Create a secret with your S3 bucket configuration that Thanos components will use.

```yaml
# clusters/my-cluster/thanos/objstore-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: thanos
type: Opaque
stringData:
  objstore.yml: |
    type: S3
    config:
      bucket: my-thanos-data
      endpoint: s3.amazonaws.com
      region: us-east-1
      # Use IRSA or provide explicit credentials
      # access_key: ""
      # secret_key: ""
      insecure: false
      sse_config:
        type: "SSE-S3"
```

Encrypt with SOPS:

```bash
sops --encrypt \
  --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --encrypted-regex '^(data|stringData)$' \
  --in-place clusters/my-cluster/thanos/objstore-secret.yaml
```

## Enabling the Thanos Sidecar in Prometheus

Update your kube-prometheus-stack HelmRelease to enable the Thanos sidecar.

```yaml
# Update clusters/my-cluster/monitoring/prometheus-operator.yaml values
prometheus:
  prometheusSpec:
    # Enable Thanos sidecar
    thanos:
      # Container image for the sidecar
      image: quay.io/thanos/thanos:v0.35.0
      # Object store configuration
      objectStorageConfig:
        existingSecret:
          name: thanos-objstore-config
          key: objstore.yml
      # Resource limits for the sidecar
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 1Gi
    # Disable compaction in Prometheus (Thanos compactor handles it)
    disableCompaction: true
    # Retain data locally for 2 hours (minimum for Thanos)
    retention: 2h
    # External labels for deduplication
    externalLabels:
      cluster: my-cluster
      region: us-east-1
      replica: "$(POD_NAME)"
```

Create a Service for the Thanos sidecar gRPC endpoint.

```yaml
# clusters/my-cluster/thanos/sidecar-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: prometheus-thanos-sidecar
  namespace: monitoring
  labels:
    app: thanos-sidecar
spec:
  type: ClusterIP
  clusterIP: None
  ports:
    - name: grpc
      port: 10901
      targetPort: 10901
  selector:
    app.kubernetes.io/name: prometheus
```

## Deploying Thanos Components

```yaml
# clusters/my-cluster/thanos/thanos.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: thanos
  namespace: thanos
spec:
  interval: 30m
  chart:
    spec:
      chart: thanos
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
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
    # Use existing object store secret
    existingObjstoreSecret: thanos-objstore-config

    # Query component - unified query layer
    query:
      enabled: true
      replicaCount: 2
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 2000m
          memory: 2Gi
      # Connect to Thanos sidecar in Prometheus
      stores:
        - "dns+prometheus-thanos-sidecar.monitoring.svc:10901"
        - "dns+thanos-storegateway.thanos.svc:10901"
      # Deduplication settings
      dnsDiscovery:
        sidecarsService: ""
        sidecarsNamespace: ""
      # Extra flags for query
      extraFlags:
        - "--query.replica-label=replica"
        - "--query.auto-downsampling"

    # Query Frontend - caching layer for queries
    queryFrontend:
      enabled: true
      replicaCount: 2
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      config: |
        type: IN-MEMORY
        config:
          max_size: 256MB
          max_size_items: 2048
          validity: 6h

    # Store Gateway - serves data from object storage
    storegateway:
      enabled: true
      replicaCount: 2
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi
      persistence:
        enabled: true
        size: 20Gi
        storageClass: gp3

    # Compactor - handles compaction and downsampling
    compactor:
      enabled: true
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi
      persistence:
        enabled: true
        size: 50Gi
        storageClass: gp3
      # Retention configuration
      retentionResolutionRaw: 30d
      retentionResolution5m: 90d
      retentionResolution1h: 365d
      # Compactor-specific flags
      extraFlags:
        - "--compact.concurrency=4"
        - "--downsample.concurrency=4"
        - "--delete-delay=48h"

    # Ruler - evaluates recording and alerting rules
    ruler:
      enabled: true
      replicaCount: 2
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      # Alertmanager endpoint
      alertmanagers:
        - "http://kube-prometheus-stack-alertmanager.monitoring.svc:9093"
      config: |
        groups:
          - name: thanos-global-rules
            rules:
              - record: cluster:node_cpu:sum_rate5m
                expr: sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (cluster)
              - record: cluster:node_memory_usage:ratio
                expr: |
                  1 - sum(node_memory_MemAvailable_bytes) by (cluster)
                  / sum(node_memory_MemTotal_bytes) by (cluster)

    # Receive is not needed when using sidecar mode
    receive:
      enabled: false

    # Metrics and monitoring
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
        labels:
          release: kube-prometheus-stack
```

## Flux Kustomization

```yaml
# clusters/my-cluster/thanos/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: thanos-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: thanos
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/thanos
  prune: true
  wait: true
  timeout: 15m
  dependsOn:
    - name: monitoring-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: thanos-query
      namespace: thanos
    - apiVersion: apps/v1
      kind: StatefulSet
      name: thanos-storegateway
      namespace: thanos
```

## Configuring Grafana to Query Thanos

```yaml
# clusters/my-cluster/grafana/datasources/thanos.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: thanos
  namespace: grafana
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  datasource:
    name: Thanos
    type: prometheus
    access: proxy
    # Point to Thanos Query Frontend
    url: http://thanos-query-frontend.thanos.svc:9090
    isDefault: false
    jsonData:
      timeInterval: 30s
      httpMethod: POST
      # Custom query parameters
      customQueryParameters: "dedup=true&partial_response=true"
    editable: false
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmreleases -n thanos

# Verify all Thanos pods
kubectl get pods -n thanos

# Check Thanos sidecar in Prometheus namespace
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus

# Verify stores connected to Thanos Query
kubectl port-forward -n thanos svc/thanos-query 9090:9090
# Visit http://localhost:9090/stores to see connected stores

# Check compactor status
kubectl logs -n thanos -l app.kubernetes.io/component=compactor --tail=50

# Verify object storage uploads
kubectl logs -n monitoring -c thanos-sidecar -l app.kubernetes.io/name=prometheus --tail=20

# Query through Thanos
curl -s "http://localhost:9090/api/v1/query" \
  --data-urlencode 'query=up' | jq '.data.result | length'
```

## Conclusion

You now have a fully functional Thanos deployment managed by Flux CD. The setup provides high availability for Prometheus with deduplication, unlimited long-term metrics retention in object storage, automatic downsampling for efficient historical queries, a global query view across multiple Prometheus instances, and centralized recording and alerting rules through the Thanos ruler. All components are version-controlled in Git and automatically reconciled by Flux CD, ensuring consistent infrastructure management.
