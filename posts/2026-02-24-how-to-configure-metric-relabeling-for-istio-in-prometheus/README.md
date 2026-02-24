# How to Configure Metric Relabeling for Istio in Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Relabeling, Metrics, Cardinality

Description: Learn how to use Prometheus metric relabeling to filter, rename, and reshape Istio metrics to reduce cardinality and storage costs while keeping useful data.

---

Istio and Envoy together generate hundreds of metrics per sidecar. Not all of them are useful for your dashboards and alerts, but Prometheus will happily store every single one unless you tell it otherwise. Metric relabeling is how you control what gets stored, what gets dropped, and how labels are organized.

Done well, relabeling can cut your Istio metric storage by 50-80% without losing any useful observability.

## Relabeling vs. Write Relabeling

Prometheus has two places where relabeling happens:

- **relabel_configs**: Applied during target discovery, before scraping. Controls which targets are scraped and how the scrape request is formed.
- **metric_relabel_configs**: Applied after scraping, before storing. Controls which metrics are kept and how their labels are modified.

For filtering Istio metrics, you mostly work with `metric_relabel_configs`.

## Dropping Unnecessary Envoy Metrics

Envoy exposes a large number of internal metrics that are rarely useful for application monitoring. Drop them to save storage:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  metric_relabel_configs:
  # Drop detailed Envoy cluster metrics
  - source_labels: [__name__]
    regex: 'envoy_cluster_circuit_breakers_.*|envoy_cluster_membership_.*|envoy_cluster_upstream_cx_connect_.*'
    action: drop
  # Drop Envoy listener metrics
  - source_labels: [__name__]
    regex: 'envoy_listener_downstream_cx_.*|envoy_listener_http_downstream_rq_.*'
    action: drop
  # Drop Envoy server stats
  - source_labels: [__name__]
    regex: 'envoy_server_.*'
    action: drop
```

A more aggressive approach is to keep only the standard Istio metrics and drop everything else:

```yaml
metric_relabel_configs:
- source_labels: [__name__]
  regex: 'istio_requests_total|istio_request_duration_milliseconds_bucket|istio_request_bytes_bucket|istio_response_bytes_bucket|istio_tcp_sent_bytes_total|istio_tcp_received_bytes_total|istio_tcp_connections_opened_total|istio_tcp_connections_closed_total'
  action: keep
```

This is the nuclear option. It drops all Envoy-native metrics and keeps only the standard Istio metrics. This works well if you rely on Istio metrics for your dashboards and do not need low-level Envoy data.

## Dropping High-Cardinality Labels

Some labels on Istio metrics create very high cardinality. Each unique label combination creates a separate time series. The biggest offenders:

- `source_workload_namespace` + `destination_workload_namespace` combinations
- `response_code` (especially if you have many 4xx variations)
- `connection_security_policy`
- `request_protocol`

Drop labels you do not use in dashboards or alerts:

```yaml
metric_relabel_configs:
- regex: 'source_principal|destination_principal|connection_security_policy|request_protocol'
  action: labeldrop
```

The `labeldrop` action removes labels matching the regex from all metrics in this scrape job.

## Aggregating Response Codes

Instead of keeping every individual HTTP response code (200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503...), you can collapse them into response classes:

```yaml
metric_relabel_configs:
- source_labels: [response_code]
  regex: '([0-9])[0-9][0-9]'
  target_label: response_code_class
  replacement: '${1}xx'
```

This creates a new label `response_code_class` with values like `2xx`, `4xx`, `5xx`. You can then drop the original `response_code` label:

```yaml
- regex: 'response_code'
  action: labeldrop
```

## Renaming Labels for Consistency

If you have metrics from multiple sources, you might want consistent label names. For example, Istio uses `destination_service_name` but your application metrics might use `service`:

```yaml
metric_relabel_configs:
- source_labels: [destination_service_name]
  target_label: service
  action: replace
```

## Limiting Histogram Buckets

Istio histogram metrics like `istio_request_duration_milliseconds_bucket` have many buckets by default. Each bucket is a separate time series. You can drop buckets you do not need:

```yaml
metric_relabel_configs:
- source_labels: [__name__, le]
  regex: 'istio_request_duration_milliseconds_bucket;(0\.005|0\.05|0\.5|5|50)'
  action: drop
```

This drops specific bucket boundaries that you do not use in your percentile calculations. Be careful: if you drop too many buckets, your percentile calculations become inaccurate.

A safer approach is to configure the histogram buckets at the Istio level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_METAJSON_STATS_HISTOGRAM_BUCKETS: '{"istio_request_duration_milliseconds":{"buckets":[1,5,10,25,50,100,250,500,1000,2500,5000,10000]}}'
```

## Practical Relabeling Examples

Here is a complete scrape config with relabeling for a production Istio setup:

```yaml
scrape_configs:
- job_name: 'istio-mesh'
  metrics_path: /stats/prometheus
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  # Only scrape pods with istio-proxy
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  - source_labels: [__address__]
    action: replace
    regex: ([^:]+)(?::\d+)?
    replacement: ${1}:15090
    target_label: __address__
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod
  - source_labels: [__meta_kubernetes_pod_label_app]
    target_label: app

  metric_relabel_configs:
  # Keep only standard Istio metrics and a few Envoy metrics
  - source_labels: [__name__]
    regex: 'istio_.*|envoy_cluster_upstream_rq_total|envoy_cluster_upstream_rq_xx'
    action: keep
  # Drop security-related labels that add cardinality
  - regex: 'source_principal|destination_principal|connection_security_policy'
    action: labeldrop
  # Drop pod template hash labels
  - regex: 'pod_template_hash'
    action: labeldrop
```

## Using Prometheus Operator

If you use the Prometheus Operator, metric relabeling goes in the ServiceMonitor or PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats
  namespace: istio-system
spec:
  selector:
    matchExpressions:
    - key: security.istio.io/tlsMode
      operator: Exists
  namespaceSelector:
    any: true
  podMetricsEndpoints:
  - port: http-envoy-prom
    path: /stats/prometheus
    interval: 15s
    metricRelabelings:
    - sourceLabels: [__name__]
      regex: 'istio_.*'
      action: keep
    - regex: 'source_principal|destination_principal'
      action: labeldrop
```

## Measuring the Impact

Before and after applying relabeling, compare the number of active time series:

```promql
# Total time series from Istio
count({__name__=~"istio_.*"})

# Time series per metric
count by (__name__)({__name__=~"istio_.*"})
```

Also check Prometheus memory usage:

```bash
kubectl top pod -n monitoring -l app.kubernetes.io/name=prometheus
```

A significant drop in time series count should correspond to lower memory usage and faster queries.

## Common Mistakes

**Applying keep and drop together**: If you have a `keep` action followed by a `drop` action, the keep runs first and only passes matching metrics to the drop. This is usually what you want, but make sure you are not accidentally filtering out metrics before the drop can process them.

**Forgetting that relabeling is per-scrape-job**: Relabeling rules in one scrape config do not affect other scrape configs. If you scrape Envoy stats in two different jobs, both need the relabeling rules.

**Dropping labels used in alerts**: Before dropping a label, check if any of your alerting rules depend on it. Dropping `response_code` when you have alerts on 5xx rates will break those alerts.

Metric relabeling is one of the highest-impact optimizations you can make for Istio observability. Spend an hour configuring it properly and you will save hours of troubleshooting performance issues down the road.
