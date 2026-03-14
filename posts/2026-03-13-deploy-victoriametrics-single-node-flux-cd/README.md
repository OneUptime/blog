# How to Deploy VictoriaMetrics Single Node with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, VictoriaMetrics, Prometheus, Metrics, Observability, HelmRelease, Performance

Description: Deploy VictoriaMetrics single-node for high-performance metrics storage using Flux CD HelmRelease as a drop-in Prometheus replacement with superior compression and faster queries.

---

## Introduction

VictoriaMetrics is a high-performance, cost-effective time series database that serves as a drop-in replacement for Prometheus. In benchmark tests, VictoriaMetrics consistently outperforms Prometheus on write throughput, query speed, and storage efficiency — often using 7-10x less disk space than Prometheus for the same dataset. For teams running large-scale monitoring, these efficiency gains translate directly to lower infrastructure costs.

The single-node VictoriaMetrics deployment is ideal for clusters with up to several million active time series. It provides a fully compatible Prometheus remote write endpoint, a PromQL-compatible query API (with MetricsQL extensions), and native Grafana integration through the Prometheus data source. Migrating from Prometheus to VictoriaMetrics single-node requires minimal configuration changes.

This guide deploys VictoriaMetrics single-node using Flux CD HelmRelease, configuring Prometheus or Grafana Alloy to remote-write metrics into VictoriaMetrics for persistent storage.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- A metrics collector (Prometheus, Grafana Alloy, or VictoriaMetrics Agent) for scraping
- A storage class for persistent volumes

## Step 1: Add the VictoriaMetrics HelmRepository

Register the VictoriaMetrics Helm chart repository with Flux CD.

```yaml
# infrastructure/victoriametrics/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: victoriametrics
  namespace: flux-system
spec:
  interval: 1h
  url: https://victoriametrics.github.io/helm-charts/
```

## Step 2: Deploy VictoriaMetrics Single Node

Create the HelmRelease for the VictoriaMetrics single-node deployment.

```yaml
# infrastructure/victoriametrics/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: victoria-metrics-single
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: victoria-metrics-single
      version: ">=0.9.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: victoriametrics
        namespace: flux-system
      interval: 12h
  values:
    server:
      # Data retention period
      retentionPeriod: 90d  # 90 days of data

      # Extra command-line flags for tuning
      extraArgs:
        # Memory limit for caches
        memory.allowedPercent: "60"
        # Deduplication window for remote-write sources
        dedup.minScrapeInterval: "15s"
        # Enable VictoriaMetrics web UI
        http.pathPrefix: ""
        # Snapshot support for backups
        snapshotCreateURL: ""

      persistentVolume:
        enabled: true
        size: 100Gi
        storageClass: "standard"
        accessModes:
          - ReadWriteOnce

      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "4"
          memory: 8Gi

      # Ingress for the VictoriaMetrics UI
      ingress:
        enabled: true
        ingressClassName: nginx
        hosts:
          - name: victoriametrics.internal.example.com
            path: /
            port: http

      # Prometheus metrics for VictoriaMetrics itself
      serviceMonitor:
        enabled: true
        namespace: monitoring

    # VMAgent for scraping (alternative to Prometheus)
    vmagent:
      enabled: false  # Use existing Prometheus remote write instead
```

## Step 3: Configure Prometheus Remote Write to VictoriaMetrics

Update your Prometheus configuration to remote-write all metrics to VictoriaMetrics.

```yaml
# infrastructure/monitoring/prometheus-remote-write.yaml
# Add this to your kube-prometheus-stack HelmRelease values:
prometheus:
  prometheusSpec:
    # Short local retention - VictoriaMetrics handles long-term storage
    retention: 1h
    retentionSize: "5GiB"

    remoteWrite:
      - url: http://victoria-metrics-single-server.monitoring.svc.cluster.local:8428/api/v1/write
        # Queue configuration for high-throughput environments
        queueConfig:
          capacity: 100000
          maxShards: 10
          maxSamplesPerSend: 10000
          batchSendDeadline: 5s
          minBackoff: 30ms
          maxBackoff: 100ms
        # Write relabeling to add source labels
        writeRelabelConfigs:
          - targetLabel: remote_write_source
            replacement: prometheus
```

## Step 4: Deploy VMAgent for Direct Scraping (Optional)

Use VMAgent instead of Prometheus for efficient metrics scraping directly into VictoriaMetrics.

```yaml
# infrastructure/victoriametrics/vmagent-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: victoria-metrics-agent
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: victoria-metrics-agent
      version: ">=0.9.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: victoriametrics
        namespace: flux-system
  values:
    remoteWriteUrls:
      - http://victoria-metrics-single-server.monitoring.svc.cluster.local:8428/api/v1/write

    config:
      global:
        scrape_interval: 30s
      scrape_configs:
        - job_name: kubernetes-pods
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: "true"
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
              action: replace
              target_label: __metrics_path__
              regex: (.+)

    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: "1"
        memory: 1Gi
```

## Step 5: Configure Grafana Data Source

Connect Grafana to VictoriaMetrics using the Prometheus-compatible API.

```yaml
# infrastructure/monitoring/victoriametrics-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-vm-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  victoriametrics-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: VictoriaMetrics
        type: prometheus
        url: http://victoria-metrics-single-server.monitoring.svc.cluster.local:8428
        access: proxy
        isDefault: true
        jsonData:
          timeInterval: "30s"
          # Enable MetricsQL functions (VictoriaMetrics extensions)
          queryType: range
```

## Step 6: Apply with Flux and Verify

Deploy VictoriaMetrics and verify metrics are being ingested.

```yaml
# clusters/production/victoriametrics-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: victoriametrics
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/victoriametrics
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: victoria-metrics-single-server
      namespace: monitoring
  timeout: 10m
```

```bash
# Verify VictoriaMetrics is running
kubectl get pods -n monitoring | grep victoria-metrics

# Check metrics ingestion via the HTTP API
kubectl port-forward -n monitoring svc/victoria-metrics-single-server 8428:8428 &

# Query metrics (PromQL compatible)
curl "http://localhost:8428/api/v1/query?query=up"

# Check write statistics
curl http://localhost:8428/api/v1/status/tsdb | jq '.data.topMetricsCountByMetricName[0:5]'

# Check storage usage
curl http://localhost:8428/api/v1/status/active_queries

# Verify Flux reconciliation
flux get helmrelease victoria-metrics-single -n monitoring
```

## Best Practices

- Set the deduplication window (`dedup.minScrapeInterval`) to match your scrape interval when using multiple Prometheus instances writing to the same VictoriaMetrics; this prevents duplicate data storage.
- Monitor VictoriaMetrics's own metrics — specifically `vm_data_size_bytes` and `vm_rows_inserted_total` — to track ingestion rates and storage growth.
- Use VictoriaMetrics snapshots for point-in-time backups before upgrades; create a snapshot via the `/snapshot/create` HTTP endpoint and sync to object storage.
- Configure `memory.allowedPercent` based on your VictoriaMetrics pod's memory limit; the default 60% is conservative and can be raised for higher-performance workloads.
- Take advantage of VictoriaMetrics's MetricsQL extensions in Grafana dashboards for advanced queries unavailable in standard PromQL.
- Consider VictoriaMetrics over Prometheus when your cluster has more than 500,000 active time series; at that scale the performance and storage efficiency differences become very significant.

## Conclusion

VictoriaMetrics single-node deployed through Flux CD provides a high-performance, storage-efficient metrics platform that drops into your existing Prometheus ecosystem with minimal friction. The Prometheus-compatible API means your dashboards, alerting rules, and recording rules work without modification, while VictoriaMetrics handles the heavy lifting with significantly lower resource consumption. The GitOps model ensures your metrics infrastructure is as well-managed as the services it monitors.
