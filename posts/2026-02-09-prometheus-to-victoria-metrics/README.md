# How to Migrate Monitoring Stacks from Prometheus to Victoria Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Victoria Metrics, Monitoring, Kubernetes, Observability

Description: Complete migration guide from Prometheus to Victoria Metrics for improved performance and reduced resource consumption, including data migration, query translation, and Grafana dashboard updates.

---

Prometheus is the standard for Kubernetes monitoring, but it struggles with long-term retention and resource efficiency at scale. Victoria Metrics provides a drop-in replacement that offers better compression, lower memory usage, faster query performance, and native support for long-term storage. This guide walks through migrating your Prometheus deployment to Victoria Metrics while preserving historical data and maintaining compatibility with existing dashboards.

## Why Migrate to Victoria Metrics

Victoria Metrics improves on Prometheus in several key areas. It uses 7x less storage through better compression, requires up to 10x less RAM for the same workload, provides faster query execution for complex PromQL queries, and supports multi-tenancy natively. It also offers better write performance and can handle higher cardinality metrics.

The key advantage is that Victoria Metrics supports the Prometheus remote write protocol and PromQL, making migration straightforward.

## Architecture Comparison

Prometheus stack typically includes Prometheus servers for metrics collection, Alertmanager for alert routing, and Grafana for visualization. Victoria Metrics replaces this with vmsingle for single-node deployments or vmcluster for high availability, vmagent for metrics scraping, and vmalert for alerting rules. It integrates with the same Grafana dashboards.

## Installing Victoria Metrics

Deploy Victoria Metrics using Helm:

```bash
# Add Victoria Metrics Helm repository

helm repo add vm https://victoriametrics.github.io/helm-charts/
helm repo update

# Install Victoria Metrics operator
helm install victoria-metrics-operator vm/victoria-metrics-operator \
  -n monitoring \
  --create-namespace

# Verify operator is running
kubectl get pods -n monitoring
```

Deploy a single-node Victoria Metrics instance:

```yaml
# vmsingle.yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMSingle
metadata:
  name: vmsingle
  namespace: monitoring
spec:
  retentionPeriod: "12"  # months
  replicaCount: 1
  storage:
    accessModes:
      - ReadWriteOnce
    storageClassName: fast-ssd
    resources:
      requests:
        storage: 100Gi
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
```

Apply the configuration:

```bash
kubectl apply -f vmsingle.yaml

# Wait for Victoria Metrics to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=vmsingle -n monitoring --timeout=300s
```

## Migrating Historical Data

Export data from Prometheus using a snapshot:

```bash
# Install vmctl tool for data migration
wget https://github.com/VictoriaMetrics/VictoriaMetrics/releases/download/v1.144.0/vmutils-linux-amd64-v1.144.0.tar.gz
tar xzf vmutils-linux-amd64-v1.144.0.tar.gz
chmod +x vmctl-prod

# Create a Prometheus snapshot and copy it locally
SNAPSHOT_NAME=$(kubectl exec -n monitoring prometheus-0 -- \
  wget -qO- --post-data='' http://localhost:9090/api/v1/admin/tsdb/snapshot \
  | sed -n 's/.*"name":"\([^"]*\)".*/\1/p')
kubectl cp monitoring/prometheus-0:/prometheus/snapshots/$SNAPSHOT_NAME ./prometheus-snapshot

# Migrate data from Prometheus to Victoria Metrics
./vmctl-prod prometheus \
  --prom-snapshot ./prometheus-snapshot \
  --vm-addr http://vmsingle-vmsingle.monitoring.svc:8428 \
  --vm-concurrency 4 \
  --prom-concurrency 4
```

For large datasets, migrate in time windows:

```bash
# Migrate in monthly chunks
START_DATE="2025-01-01T00:00:00Z"
END_DATE="2025-02-01T00:00:00Z"

./vmctl-prod prometheus \
  --prom-snapshot ./prometheus-snapshot \
  --vm-addr http://vmsingle-vmsingle.monitoring.svc:8428 \
  --prom-filter-time-start $START_DATE \
  --prom-filter-time-end $END_DATE \
  --prom-concurrency 8 \
  --vm-concurrency 8
```

## Setting Up VMAgent for Scraping

Replace Prometheus scraping with vmagent:

```yaml
# vmagent.yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAgent
metadata:
  name: vmagent
  namespace: monitoring
spec:
  replicaCount: 1
  serviceScrapeNamespaceSelector: {}
  podScrapeNamespaceSelector: {}
  probeNamespaceSelector: {}
  selectAllByDefault: true
  remoteWrite:
    - url: "http://vmsingle-vmsingle.monitoring.svc:8428/api/v1/write"
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "1"
      memory: "1Gi"
```

Apply the vmagent configuration:

```bash
kubectl apply -f vmagent.yaml
```

VMAgent discovers VMServiceScrape and VMPodScrape resources. The Victoria Metrics Operator can also convert existing Prometheus Operator ServiceMonitor and PodMonitor resources into the corresponding Victoria Metrics resources when those Prometheus CRDs are installed.

## Converting Prometheus Rules to VMAlert

VMAlert supports the same rule format as Prometheus:

```yaml
# vmalert.yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlert
metadata:
  name: vmalert
  namespace: monitoring
spec:
  replicaCount: 1
  datasource:
    url: "http://vmsingle-vmsingle.monitoring.svc:8428"
  notifiers:
    - url: "http://alertmanager.monitoring.svc:9093"
  evaluationInterval: "30s"
  ruleNamespaceSelector: {}
  selectAllByDefault: true
  resources:
    requests:
      cpu: "250m"
      memory: "256Mi"
```

Migrate existing Prometheus rules:

```bash
# Optional: keep a backup of the original Prometheus rules
kubectl get prometheusrules --all-namespaces -o yaml > prometheus-rules.yaml

# Convert to VMRule (the spec.groups rule format is compatible)
kubectl get prometheusrules --all-namespaces -o json \
  | jq 'del(.items[].status) | .items[].apiVersion="operator.victoriametrics.com/v1beta1" | .items[].kind="VMRule"' \
  > vmrules-final.json

# Apply VMRules
kubectl apply -f vmrules-final.json
```

Example VMRule:

```yaml
# vmrule-example.yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMRule
metadata:
  name: application-alerts
  namespace: monitoring
spec:
  groups:
  - name: application
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: |
        rate(http_requests_total{status=~"5.."}[5m])
        /
        rate(http_requests_total[5m])
        > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }}"
```

## Updating Grafana Dashboards

Victoria Metrics is compatible with Prometheus datasources in Grafana. Update the datasource configuration:

```yaml
# grafana-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: VictoriaMetrics
      type: prometheus
      access: proxy
      url: http://vmsingle-vmsingle.monitoring.svc:8428
      isDefault: true
      editable: false
```

Apply the configuration:

```bash
kubectl apply -f grafana-datasource.yaml

# Restart Grafana to pick up new datasource
kubectl rollout restart deployment/grafana -n monitoring
```

Most Prometheus dashboards work without modification. For advanced queries, Victoria Metrics extends PromQL with MetricsQL functions:

```promql
# Standard PromQL
rate(http_requests_total[5m])

# MetricsQL with rollup functions (more efficient)
rate(http_requests_total)

# MetricsQL optimizations
rollup_rate(http_requests_total[5m])
```

## Running Prometheus and Victoria Metrics in Parallel

During migration, run both systems to validate Victoria Metrics behavior:

```yaml
# prometheus-remote-write.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      evaluation_interval: 30s

    remote_write:
      - url: http://vmsingle-vmsingle.monitoring.svc:8428/api/v1/write
        queue_config:
          max_samples_per_send: 10000
          capacity: 20000
          max_shards: 30

    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
```

This sends all metrics to both Prometheus local storage and Victoria Metrics, allowing you to compare results.

## Performance Optimization

Configure Victoria Metrics for optimal performance:

```yaml
# vmsingle-optimized.yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMSingle
metadata:
  name: vmsingle
  namespace: monitoring
spec:
  retentionPeriod: "12"
  storage:
    accessModes:
      - ReadWriteOnce
    storageClassName: fast-ssd
    resources:
      requests:
        storage: 200Gi
  extraArgs:
    dedup.minScrapeInterval: 30s
    search.maxUniqueTimeseries: 1000000
    search.maxQueryDuration: 120s
    search.maxConcurrentRequests: 16
  resources:
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      cpu: "4"
      memory: "8Gi"
```

## Monitoring the Migration

Create dashboards to compare Prometheus and Victoria Metrics:

```json
{
  "dashboard": {
    "title": "Prometheus vs Victoria Metrics",
    "panels": [
      {
        "title": "Query Performance",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(prometheus_http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "Prometheus p99",
            "datasource": "Prometheus"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(vm_http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "VictoriaMetrics p99",
            "datasource": "VictoriaMetrics"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{pod=~'prometheus.*'}",
            "legendFormat": "Prometheus",
            "datasource": "Prometheus"
          },
          {
            "expr": "container_memory_usage_bytes{pod=~'vmsingle.*'}",
            "legendFormat": "VictoriaMetrics",
            "datasource": "VictoriaMetrics"
          }
        ]
      }
    ]
  }
}
```

## Decommissioning Prometheus

After validating Victoria Metrics for at least two weeks:

```bash
# Take final backup
kubectl exec -n monitoring prometheus-0 -- tar czf /prometheus/backup-final.tar.gz /prometheus/data

# Stop Prometheus scraping
kubectl scale statefulset prometheus --replicas=0 -n monitoring

# Wait 24 hours to ensure no issues

# Delete Prometheus resources
helm uninstall prometheus-operator -n monitoring
kubectl delete crd prometheuses.monitoring.coreos.com
kubectl delete crd prometheusrules.monitoring.coreos.com
kubectl delete crd servicemonitors.monitoring.coreos.com
```

## Troubleshooting

Common issues and solutions:

**Query timeouts**: Increase `search.maxQueryDuration`
```bash
kubectl edit vmsingle vmsingle -n monitoring
# Add: search.maxQueryDuration: 300s
```

**Duplicate samples from parallel scraping**: Enable deduplication
```bash
# Add to extraArgs:
dedup.minScrapeInterval: 30s
```

**Missing metrics**: Check vmagent targets
```bash
kubectl port-forward -n monitoring svc/vmagent 8429:8429
# Open http://localhost:8429/targets
```

## Conclusion

Migrating from Prometheus to Victoria Metrics reduces infrastructure costs while improving query performance and data retention capabilities. The compatible APIs and PromQL support make migration straightforward, and the resource savings typically exceed 50% for equivalent workloads. Victoria Metrics is particularly valuable for large-scale Kubernetes environments with high cardinality metrics and long retention requirements.
