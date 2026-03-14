# How to Deploy VictoriaMetrics Cluster with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, VictoriaMetrics, Cluster, High Availability, Metrics, HelmRelease

Description: Deploy VictoriaMetrics cluster setup using Flux CD HelmRelease for horizontally scalable, highly available metrics storage with separate write, storage, and query components.

---

## Introduction

VictoriaMetrics Cluster extends the single-node deployment with a multi-component architecture designed for horizontal scaling and high availability. The cluster separates responsibilities into three stateless components: vminsert (receives writes from remote sources), vmstorage (stores metric data with replication), and vmselect (serves queries). This separation enables each component to scale independently based on write load, storage capacity, and query load.

For organizations with millions of active time series, write rates exceeding 500,000 samples per second, or multi-team environments requiring high availability guarantees, VictoriaMetrics Cluster is the production-grade choice. It maintains full Prometheus API compatibility while providing the scalability that single-node deployments cannot match.

This guide deploys VictoriaMetrics Cluster using Flux CD HelmRelease, configuring replication for storage availability and connecting Prometheus remote write to the cluster for metrics ingestion.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- At least 3 worker nodes with sufficient storage for vmstorage replicas
- A storage class for vmstorage persistent volumes
- Prometheus or other metrics sources configured for remote write

## Step 1: Add the VictoriaMetrics HelmRepository

Register the VictoriaMetrics Helm chart repository.

```yaml
# infrastructure/victoriametrics-cluster/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: victoriametrics
  namespace: flux-system
spec:
  interval: 1h
  url: https://victoriametrics.github.io/helm-charts/
```

## Step 2: Deploy VictoriaMetrics Cluster

Create the HelmRelease for the full cluster deployment.

```yaml
# infrastructure/victoriametrics-cluster/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: victoria-metrics-cluster
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: victoria-metrics-cluster
      version: ">=0.11.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: victoriametrics
        namespace: flux-system
      interval: 12h
  values:
    # vminsert: Receives writes and distributes to vmstorage
    vminsert:
      replicaCount: 2
      extraArgs:
        # Replication factor: write to N storage nodes
        replicationFactor: "2"
        # Maximum in-memory queue size per storage node
        maxLabelsPerTimeseries: "30"
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: "2"
          memory: 2Gi
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/component: vminsert
                topologyKey: kubernetes.io/hostname

    # vmstorage: Stores metrics data with replication
    vmstorage:
      replicaCount: 3  # Must be >= replicationFactor
      retentionPeriod: "90"  # 90 days retention
      persistentVolume:
        enabled: true
        size: 100Gi
        storageClass: "standard"
      extraArgs:
        # Percentage of disk space reserved for deduplication operations
        dedup.minScrapeInterval: "30s"
      resources:
        requests:
          cpu: 500m
          memory: 2Gi
        limits:
          cpu: "4"
          memory: 8Gi
      # Spread storage nodes across availability zones
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app.kubernetes.io/component: vmstorage
              topologyKey: kubernetes.io/hostname

    # vmselect: Serves PromQL queries across all storage nodes
    vmselect:
      replicaCount: 2
      cacheMountPath: /select-cache
      persistentVolume:
        enabled: true
        size: 5Gi
        storageClass: "standard"
      extraArgs:
        # Deduplication for replicated data
        dedup.minScrapeInterval: "30s"
        # Cache for query results
        cacheExpireDuration: "30m"
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: "2"
          memory: 4Gi
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/component: vmselect
                topologyKey: kubernetes.io/hostname
```

## Step 3: Configure Prometheus Remote Write to Cluster

Point Prometheus remote write to the vminsert service.

```yaml
# infrastructure/monitoring/prometheus-remote-write-cluster.yaml
# Add to kube-prometheus-stack HelmRelease values:
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: http://victoria-metrics-cluster-vminsert.monitoring.svc.cluster.local:8480/insert/0/prometheus
        # The path format is /insert/<accountID>/prometheus
        # AccountID 0 is the default; use multiple accounts for multi-tenancy
        queueConfig:
          capacity: 100000
          maxShards: 20
          maxSamplesPerSend: 10000
          batchSendDeadline: 5s
```

## Step 4: Configure Grafana to Query the Cluster

Connect Grafana to vmselect for query access.

```yaml
# infrastructure/monitoring/victoriametrics-cluster-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-vm-cluster-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  vm-cluster-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: VictoriaMetrics-Cluster
        type: prometheus
        # vmselect provides the PromQL-compatible query API
        url: http://victoria-metrics-cluster-vmselect.monitoring.svc.cluster.local:8481/select/0/prometheus
        access: proxy
        isDefault: true
        jsonData:
          timeInterval: "30s"
```

## Step 5: Apply with Flux Kustomization

Deploy the VictoriaMetrics cluster with proper ordering.

```yaml
# clusters/production/victoriametrics-cluster-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: victoriametrics-cluster
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/victoriametrics-cluster
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: victoria-metrics-cluster-vminsert
      namespace: monitoring
    - apiVersion: apps/v1
      kind: StatefulSet
      name: victoria-metrics-cluster-vmstorage
      namespace: monitoring
    - apiVersion: apps/v1
      kind: Deployment
      name: victoria-metrics-cluster-vmselect
      namespace: monitoring
  timeout: 15m
```

## Step 6: Verify Cluster Health

Validate all cluster components are running and accepting metrics.

```bash
# Check all VictoriaMetrics cluster components
kubectl get pods -n monitoring | grep victoria-metrics-cluster

# Verify each component's service is available
kubectl get svc -n monitoring | grep victoria-metrics-cluster

# Check vminsert is receiving writes
kubectl port-forward -n monitoring svc/victoria-metrics-cluster-vminsert 8480:8480 &
curl "http://localhost:8480/insert/0/prometheus/api/v1/import/prometheus" \
  --data-raw 'test_metric{label="flux"} 1'

# Query through vmselect
kubectl port-forward -n monitoring svc/victoria-metrics-cluster-vmselect 8481:8481 &
curl "http://localhost:8481/select/0/prometheus/api/v1/query?query=test_metric"

# Check vmstorage health
kubectl exec -n monitoring victoria-metrics-cluster-vmstorage-0 -- \
  wget -qO- http://localhost:8482/health

# Verify Flux reconciliation
flux get helmrelease victoria-metrics-cluster -n monitoring
```

## Best Practices

- Set `replicationFactor` to 2 for production workloads and deploy at least 3 vmstorage nodes; this tolerates one storage node failure without data loss.
- Use `requiredDuringSchedulingIgnoredDuringExecution` pod anti-affinity for vmstorage to guarantee storage nodes are on different physical hosts, not just preferred.
- Enable deduplication (`dedup.minScrapeInterval`) in vmselect to handle the case where multiple Prometheus instances write the same metrics; without it, query results include duplicates.
- Monitor vmstorage disk usage closely; the cluster does not automatically balance data across nodes after initial placement.
- Use VictoriaMetrics's multi-tenancy feature (different account IDs in the remote write URL) when multiple teams share the cluster, enabling per-tenant data isolation.
- Plan storage node capacity conservatively; vmstorage nodes cannot be easily scaled horizontally after data is written, unlike vminsert and vmselect.

## Conclusion

VictoriaMetrics Cluster deployed through Flux CD provides a horizontally scalable metrics platform capable of handling the largest Kubernetes observability workloads. The separation of write, storage, and query components allows each layer to scale independently as your monitoring requirements grow. Combined with Flux CD's GitOps management, your metrics infrastructure evolves predictably - with every scaling change tracked in version control and automatically applied to your cluster.
