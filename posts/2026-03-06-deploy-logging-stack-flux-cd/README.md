# How to Deploy Logging Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Logging, Loki, Promtail, Grafana, Kubernetes, GitOps, Observability

Description: Learn how to deploy a production-grade logging stack with Loki, Promtail, and Grafana using Flux CD and GitOps workflows.

---

## Introduction

Centralized logging is a cornerstone of Kubernetes observability. The Grafana Loki stack provides a lightweight, cost-effective alternative to Elasticsearch-based solutions. Loki is designed to index only metadata (labels) rather than full log content, making it significantly cheaper to operate at scale.

This guide covers deploying a complete logging stack using Loki for log aggregation, Grafana Alloy for log collection, and Grafana for visualization, all managed through Flux CD.

## Prerequisites

- A running Kubernetes cluster
- Flux CD installed and bootstrapped
- An S3-compatible object storage bucket (for production deployments)
- kubectl access to your cluster

## Architecture Overview

The logging stack consists of three main components:

```mermaid
graph LR
    A[Pods] -->|stdout/stderr| B[Grafana Alloy DaemonSet]
    B -->|Push logs| C[Loki]
    C -->|Store| D[Object Storage / S3]
    C -->|Query| E[Grafana]
```

- **Grafana Alloy** runs as a DaemonSet on every node, tailing container logs and shipping them to Loki
- **Loki** receives, indexes, and stores log data
- **Grafana** provides the query interface for exploring logs

## Repository Structure

```text
infrastructure/
  logging/
    namespace.yaml
    helmrepositories.yaml
    loki-helmrelease.yaml
    alloy-helmrelease.yaml
    grafana-datasource.yaml
```

## Creating the Logging Namespace

```yaml
# infrastructure/logging/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    monitoring: enabled
```

## Adding the Helm Repository

```yaml
# infrastructure/logging/helmrepositories.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana-community.github.io/helm-charts
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

## Deploying Loki

Deploy Loki in monolithic mode for smaller clusters or microservices mode for production.

```yaml
# infrastructure/logging/loki-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: loki
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: loki
      version: "13.x"
      sourceRef:
        kind: HelmRepository
        name: grafana-community
        namespace: flux-system
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    # Deployment mode: monolithic for simplicity
    deploymentMode: Monolithic
    singleBinary:
      replicas: 1
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 1Gi
    # Loki configuration
    loki:
      # Authentication disabled for internal use
      auth_enabled: false
      # Common configuration shared across components
      commonConfig:
        replication_factor: 1
      # Schema configuration for index and chunks
      schemaConfig:
        configs:
          - from: "2024-01-01"
            store: tsdb
            object_store: s3
            schema: v13
            index:
              prefix: loki_index_
              period: 24h
      # Storage backend configuration
      storage:
        type: s3
        bucketNames:
          chunks: loki-chunks
          ruler: loki-ruler
          admin: loki-admin
        s3:
          endpoint: s3.amazonaws.com
          region: us-east-1
          # Use IRSA or workload identity for authentication
          insecure: false
      # Retention settings
      limits_config:
        # Keep logs for 30 days
        retention_period: 720h
        # Maximum query lookback period
        max_query_lookback: 720h
        # Ingestion limits
        ingestion_rate_mb: 10
        ingestion_burst_size_mb: 20
        per_stream_rate_limit: 5MB
        per_stream_rate_limit_burst: 15MB
      # Compactor configuration for retention enforcement
      compactor:
        retention_enabled: true
        delete_request_store: s3
    # Service account with cloud IAM role
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/loki-s3-access
    # Gateway configuration
    gateway:
      enabled: true
      replicas: 1
    # Disable components not needed in monolithic mode
    read:
      replicas: 0
    write:
      replicas: 0
    backend:
      replicas: 0
    ingester:
      replicas: 0
    querier:
      replicas: 0
    queryFrontend:
      replicas: 0
    queryScheduler:
      replicas: 0
    distributor:
      replicas: 0
    compactor:
      replicas: 0
    indexGateway:
      replicas: 0
    bloomPlanner:
      replicas: 0
    bloomBuilder:
      replicas: 0
    bloomGateway:
      replicas: 0
```

## Deploying Grafana Alloy

Grafana Alloy collects logs from all pods on each node and ships them to Loki.

```yaml
# infrastructure/logging/alloy-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: alloy
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: alloy
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  install:
    remediation:
      retries: 3
  values:
    controller:
      type: daemonset
      # Tolerations to run on all nodes including masters
      tolerations:
        - effect: NoSchedule
          operator: Exists
    alloy:
      mounts:
        varlog: true
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 256Mi
      configMap:
        content: |
          logging {
            level  = "info"
            format = "logfmt"
          }

          discovery.kubernetes "pods" {
            role = "pod"

            selectors {
              role  = "pod"
              field = "spec.nodeName=" + coalesce(sys.env("HOSTNAME"), constants.hostname)
            }
          }

          discovery.relabel "pod_logs" {
            targets = discovery.kubernetes.pods.targets

            rule {
              source_labels = ["__meta_kubernetes_namespace"]
              action        = "replace"
              target_label  = "namespace"
            }

            rule {
              source_labels = ["__meta_kubernetes_pod_name"]
              action        = "replace"
              target_label  = "pod"
            }

            rule {
              source_labels = ["__meta_kubernetes_pod_container_name"]
              action        = "replace"
              target_label  = "container"
            }

            rule {
              source_labels = ["__meta_kubernetes_namespace", "__meta_kubernetes_pod_container_name"]
              action        = "replace"
              target_label  = "job"
              separator     = "/"
            }
          }

          loki.source.kubernetes "pod_logs" {
            targets    = discovery.relabel.pod_logs.output
            forward_to = [loki.process.pod_logs.receiver]
          }

          loki.process "pod_logs" {
            stage.drop {
              expression = ".*DEBUG.*"
            }

            stage.regex {
              expression = ".*level=(?P<level>\\w+).*"
            }

            stage.labels {
              values = {
                level = "",
              }
            }

            forward_to = [loki.write.default.receiver]
          }

          loki.write "default" {
            endpoint {
              url = "http://loki-gateway.logging.svc.cluster.local/loki/api/v1/push"
            }
          }
```

## Grafana Datasource Configuration

If Grafana is already deployed (e.g., via kube-prometheus-stack), add Loki as a datasource.

```yaml
# infrastructure/logging/grafana-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-grafana-datasource
  namespace: monitoring
  labels:
    # This label tells the Grafana sidecar to load this datasource
    grafana_datasource: "true"
data:
  loki-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        access: proxy
        url: http://loki-gateway.logging.svc.cluster.local
        isDefault: false
        jsonData:
          # Maximum number of log lines per query
          maxLines: 5000
          # Derive fields from log content
          derivedFields:
            # Link trace IDs to a tracing datasource
            - datasourceUid: tempo
              matcherRegex: "traceID=(\\w+)"
              name: TraceID
              url: "$${__value.raw}"
```

## Loki Health Alerting Rules

Create alerting rules based on Loki metrics. Log-based alerting rules should be created in Grafana or Loki's ruler because PrometheusRule resources evaluate PromQL, not LogQL.

```yaml
# infrastructure/logging/alert-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: loki-alerts
  namespace: logging
spec:
  groups:
    - name: loki-health
      rules:
        # Alert when Loki ingestion drops
        - alert: LokiIngestionDrop
          expr: |
            rate(loki_distributor_lines_received_total[5m]) == 0
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Loki is not receiving any logs"
            description: "No logs have been ingested for 15 minutes."
        # Alert when Loki reports request errors
        - alert: LokiRequestErrors
          expr: |
            sum(rate(loki_request_duration_seconds_count{status_code=~"5.."}[5m])) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Loki is returning 5xx responses"
```

## Flux Kustomization

Tie the logging stack together with a Flux Kustomization.

```yaml
# clusters/my-cluster/logging.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: logging-stack
  namespace: flux-system
spec:
  interval: 15m
  path: ./infrastructure/logging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Logging depends on the monitoring stack for Grafana
  dependsOn:
    - name: monitoring-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: loki
      namespace: logging
    - apiVersion: apps/v1
      kind: DaemonSet
      name: alloy
      namespace: logging
  timeout: 10m
```

## Production Considerations: Loki Microservices Mode

For production workloads, deploy Loki in microservices mode for better scalability.

```yaml
# infrastructure/logging/overlays/production/loki-patch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: loki
  namespace: logging
spec:
  values:
    deploymentMode: Distributed
    # Disable monolithic mode
    singleBinary:
      replicas: 0
    # Ingester - writes incoming log data
    ingester:
      replicas: 3
      zoneAwareReplication:
        enabled: false
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
    # Distributor - distributes incoming writes
    distributor:
      replicas: 2
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
    # Querier - handles read queries
    querier:
      replicas: 2
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
    # Query frontend - caches and splits queries
    queryFrontend:
      replicas: 2
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
    # Query scheduler - schedules query execution
    queryScheduler:
      replicas: 2
    # Index gateway - serves TSDB index queries
    indexGateway:
      replicas: 2
    # Compactor - handles retention and compaction
    compactor:
      replicas: 1
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
    # Disable simple scalable and experimental bloom components
    backend:
      replicas: 0
    read:
      replicas: 0
    write:
      replicas: 0
    bloomPlanner:
      replicas: 0
    bloomBuilder:
      replicas: 0
    bloomGateway:
      replicas: 0
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations logging-stack
flux get helmreleases -n logging

# Verify all logging pods are running
kubectl get pods -n logging

# Check Alloy is running on all nodes
kubectl get pods -n logging -l app.kubernetes.io/name=alloy -o wide

# Test Loki by querying logs
kubectl port-forward -n logging svc/loki-gateway 3100:80
curl -s "http://localhost:3100/loki/api/v1/labels" | jq .

# Query logs via LogCLI or Grafana
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={namespace="default"}' \
  --data-urlencode 'limit=10' | jq .
```

## Troubleshooting

- **Alloy not collecting logs**: Check that the Alloy DaemonSet is running on each node and can watch pods. Verify with `kubectl logs <alloy-pod> -n logging`
- **Loki rejecting logs**: Check rate limits in loki configuration. Look for "rate limit" errors in Loki logs
- **High storage costs**: Adjust retention period, enable compaction, and filter out noisy logs in Alloy processing stages
- **Query timeout**: For large log volumes, increase query timeout and consider deploying query-frontend for caching

## Conclusion

Deploying a logging stack with Flux CD provides a GitOps-managed, centralized logging solution. The Loki-Alloy-Grafana stack offers excellent performance at lower cost than Elasticsearch-based alternatives. By managing the entire stack through Flux CD, you ensure consistency, reproducibility, and easy rollback of logging configuration changes across all your clusters.
