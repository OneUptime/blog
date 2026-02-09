# How to Use Prometheus Metric Relabeling to Drop High-Cardinality Kubernetes Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Cardinality, Performance, Relabeling

Description: Master Prometheus metric relabeling techniques to drop high-cardinality labels from Kubernetes metrics and prevent cardinality explosions that degrade performance.

---

High-cardinality labels create thousands of unique time series, overwhelming Prometheus with memory consumption and slow queries. Kubernetes metrics include many high-cardinality labels like pod UIDs, container IDs, and image hashes that provide limited value for monitoring.

This guide covers using metric relabeling to drop problematic labels before they're stored, reducing cardinality by 50-90 percent.

## Understanding Cardinality in Kubernetes Metrics

Every unique combination of metric name and label values creates a separate time series. A metric with name and 3 labels where each label has 10 possible values creates 10 × 10 × 10 = 1,000 time series.

Kubernetes metrics include labels like:

- `pod_uid`: Unique for every pod instance (high cardinality)
- `container_id`: Changes with every container restart (very high cardinality)
- `image`: Full image path with digest hash (high cardinality)
- `pod`: Pod name with random suffix (medium cardinality)
- `namespace`: Relatively stable (low cardinality)

A cluster with 1,000 pods and 5 containers per pod can generate millions of time series if all labels are preserved.

## Identifying High-Cardinality Labels

Find labels contributing to cardinality explosions:

```promql
# Count unique values per label
count by (__name__, label_name) (
  {__name__=~".+"}
)

# Top metrics by series count
topk(20,
  count by (__name__) ({__name__=~".+"})
)
```

In Prometheus UI, check the TSDB status page:

```bash
kubectl port-forward -n monitoring prometheus-0 9090:9090
```

Navigate to Status → TSDB Status to see metrics with the highest series counts.

## Basic Label Dropping with metric_relabel_configs

Use metric_relabel_configs in ServiceMonitor or PodMonitor to drop labels after scraping but before storage.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubernetes-pods
  namespace: monitoring
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
  - port: metrics
    metricRelabelings:
    # Drop pod_uid label entirely
    - action: labeldrop
      regex: pod_uid

    # Drop container_id label
    - action: labeldrop
      regex: container_id

    # Drop image digest, keep repository and tag
    - action: labeldrop
      regex: image_id
```

The `labeldrop` action removes labels matching the regex from all metrics scraped from this endpoint.

## Dropping Multiple Labels at Once

Use regex alternation to drop multiple labels in one rule:

```yaml
metricRelabelings:
# Drop all pod and container ID labels
- action: labeldrop
  regex: '(pod_uid|container_id|id|image_id)'

# Drop all labels starting with internal_
- action: labeldrop
  regex: 'internal_.*'
```

This is more efficient than multiple labeldrop rules.

## Conditional Label Dropping

Drop labels only for specific metrics where they're not needed:

```yaml
metricRelabelings:
# Drop pod label only for node-level metrics
- sourceLabels: [__name__]
  regex: 'node_.*'
  action: labeldrop
  regex: pod

# Drop container label for cluster-wide metrics
- sourceLabels: [__name__, container]
  regex: 'kube_pod_info;POD'
  action: labeldrop
  regex: container
```

This preserves labels where they're useful while dropping them from irrelevant metrics.

## Simplifying Image Labels

Image labels often include full repository paths and digest hashes. Extract just the image name:

```yaml
metricRelabelings:
# Extract image name from full path
- sourceLabels: [image]
  regex: '.*/(.*):.*'
  targetLabel: image_name
  replacement: '$1'

# Drop original image label
- action: labeldrop
  regex: '^image$'

# Drop image ID
- action: labeldrop
  regex: 'image_id'
```

This reduces cardinality while retaining image information for debugging.

## Normalizing Pod Names

Pod names include random suffixes from ReplicaSets. Extract the workload name:

```yaml
metricRelabelings:
# Extract deployment/statefulset name from pod name
- sourceLabels: [pod]
  regex: '(.*)-[a-z0-9]+-[a-z0-9]+'
  targetLabel: workload
  replacement: '$1'

# For StatefulSets, extract name without ordinal
- sourceLabels: [pod]
  regex: '(.*)-[0-9]+'
  targetLabel: workload
  replacement: '$1'

# Keep original pod name for detailed queries
# Or drop it to reduce cardinality
- action: labeldrop
  regex: '^pod$'
```

This creates a stable workload label that doesn't change with pod restarts.

## Dropping Labels for Specific Namespaces

Some namespaces (like kube-system) may not need detailed labels:

```yaml
metricRelabelings:
# Drop detailed labels for kube-system metrics
- sourceLabels: [namespace]
  regex: 'kube-system|kube-public|kube-node-lease'
  action: labeldrop
  regex: '(pod|container|image)'
```

This reduces cardinality for system namespaces while preserving detail for application namespaces.

## Handling Container Labels

The container label often has low value, especially for single-container pods:

```yaml
metricRelabelings:
# Drop container label when it matches pod name
- sourceLabels: [pod, container]
  regex: '(.*);.*'
  targetLabel: __tmp_pod
  replacement: '$1'

- sourceLabels: [__tmp_pod, container]
  regex: '(.*);\\1'
  action: labeldrop
  regex: container

# Drop POD container (pause container)
- sourceLabels: [container]
  regex: 'POD|'
  action: drop
```

## Reducing Endpoint Labels

Network endpoint metrics include port names and numbers that increase cardinality:

```yaml
metricRelabelings:
# Normalize port labels
- sourceLabels: [port]
  regex: '([0-9]+)'
  targetLabel: port_type
  replacement: 'numbered'

- sourceLabels: [port]
  regex: '(.*[a-z].*)'
  targetLabel: port_type
  replacement: 'named'

# Drop original port label
- action: labeldrop
  regex: '^port$'
```

## Complete High-Cardinality Reduction Example

Here's a comprehensive configuration for a typical Kubernetes cluster:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubernetes-services
  namespace: monitoring
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
  - port: metrics
    interval: 30s
    metricRelabelings:
    # Drop universally high-cardinality labels
    - action: labeldrop
      regex: '(pod_uid|container_id|id|uid|image_id)'

    # Simplify image to just name:tag
    - sourceLabels: [image]
      regex: '(?:.*/)?([^:]+):([^@]+).*'
      targetLabel: image
      replacement: '$1:$2'

    # Extract workload name from pod
    - sourceLabels: [pod]
      regex: '^(.*)-[a-z0-9]+-[a-z0-9]+$'
      targetLabel: workload
      replacement: '$1'

    # Drop POD container metrics
    - sourceLabels: [container]
      regex: '^POD$'
      action: drop

    # Drop high-cardinality debug metrics
    - sourceLabels: [__name__]
      regex: 'go_gc_.*|process_.*|scrape_.*'
      action: drop

    # Drop metrics from test namespaces entirely
    - sourceLabels: [namespace]
      regex: 'test-.*|tmp-.*'
      action: drop

    # For kube-system, drop detailed labels
    - sourceLabels: [namespace]
      regex: 'kube-system'
      action: labeldrop
      regex: '(pod|container|image|workload)'
```

This configuration typically reduces cardinality by 60-80 percent.

## Monitoring Cardinality Reduction Impact

Track cardinality before and after applying relabeling:

```promql
# Total active series
prometheus_tsdb_head_series

# Series by metric name
topk(20,
  count by (__name__) ({__name__=~".+"})
)

# Memory usage
process_resident_memory_bytes
```

After applying relabeling, you should see:

- Reduced series count (50-90% decrease)
- Lower memory consumption
- Faster query execution
- Smaller WAL and block sizes

## Testing Relabeling Rules

Before applying to production, test relabeling rules:

```bash
# Create a test ServiceMonitor with relabeling
kubectl apply -f test-servicemonitor.yaml

# Check metrics with port-forward
kubectl port-forward -n monitoring prometheus-0 9090:9090

# Query to see remaining labels
curl -s 'http://localhost:9090/api/v1/query?query=container_memory_working_set_bytes' | \
  jq '.data.result[0].metric'
```

Verify that important labels are preserved and high-cardinality labels are dropped.

## Common Relabeling Mistakes

Avoid these pitfalls:

1. **Dropping all pod labels**: Keep pod for debugging, extract workload instead
2. **Over-aggressive dropping**: Some labels are needed for joins (namespace, pod)
3. **Inconsistent naming**: Use the same label names across all ServiceMonitors
4. **Not testing**: Always verify relabeling doesn't break dashboards
5. **Dropping before filtering**: Use action: drop on entire metrics before labeldrop

## Relabeling vs Recording Rules

Relabeling reduces cardinality at ingestion time, while recording rules aggregate after storage. Use both:

```yaml
# Relabeling - drop labels at scrape time
metricRelabelings:
- action: labeldrop
  regex: 'pod_uid'

# Recording rules - aggregate what's left
- record: namespace:container_memory_working_set_bytes:sum
  expr: |
    sum by (namespace) (
      container_memory_working_set_bytes{container!=""}
    )
```

Relabeling is more efficient because it prevents high-cardinality data from being stored at all.

## Alerting on Cardinality Growth

Create alerts for unexpected cardinality increases:

```yaml
groups:
- name: cardinality
  rules:
  - alert: HighCardinality
    expr: |
      prometheus_tsdb_head_series > 1000000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High time series cardinality"
      description: "{{ $value }} active series"

  - alert: CardinalityGrowth
    expr: |
      rate(prometheus_tsdb_head_series[1h]) > 1000
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "Cardinality growing rapidly"
```

## Global Relabeling Configuration

For Prometheus Operator, set global relabeling for all scrapes:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: k8s
  namespace: monitoring
spec:
  # Apply to all scrape configs
  additionalScrapeConfigs:
    name: additional-scrape-configs
    key: prometheus-additional.yaml

# ConfigMap with global relabeling
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: additional-scrape-configs
  namespace: monitoring
data:
  prometheus-additional.yaml: |
    - job_name: 'global-relabeling'
      metric_relabel_configs:
      - action: labeldrop
        regex: '(pod_uid|container_id|id)'
```

Strategic label dropping is the most effective way to control Prometheus cardinality and maintain performance as your Kubernetes cluster scales.
