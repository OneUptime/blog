# How to Configure Prometheus Federation for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Federation, Monitoring, Metrics

Description: A hands-on guide to setting up Prometheus federation to aggregate Istio metrics from multiple clusters or multiple Prometheus instances into a central view.

---

When you run Istio across multiple Kubernetes clusters or have separate Prometheus instances per cluster, you need a way to get a unified view of your mesh metrics. Prometheus federation is one of the simplest approaches to achieve this. A federated Prometheus server scrapes selected metrics from other Prometheus servers, giving you a single place to query and alert on mesh-wide data.

This guide walks through setting up Prometheus federation specifically for Istio metrics.

## When Federation Makes Sense

Federation works well when:

- You have a small number of clusters (2-5) and the metric volume is manageable
- You want a quick centralized view without deploying Thanos or Cortex
- You already have per-cluster Prometheus instances and just need to aggregate specific metrics

Federation is not ideal for high-cardinality scenarios or when you have dozens of clusters. For those cases, look at remote write with Thanos or Cortex instead.

## Architecture Overview

The setup has two layers:

1. **Local Prometheus instances** in each cluster scrape Istio metrics from sidecars, istiod, and gateways
2. **A central Prometheus server** federates from each local instance, pulling only the metrics you care about

The central server does not scrape pods directly. It pulls pre-aggregated or selected metrics from the local servers using the `/federate` endpoint.

## Setting Up Local Prometheus

Each cluster needs a Prometheus instance that scrapes Istio metrics. If you installed Istio with the default configuration, you can deploy Prometheus using:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
```

Or if you use the Prometheus Operator, create a ServiceMonitor for istiod:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istiod
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: istiod
  endpoints:
  - port: http-monitoring
    interval: 15s
    path: /metrics
```

And for Envoy sidecars, set up a PodMonitor:

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
  podMetricsEndpoints:
  - port: http-envoy-prom
    path: /stats/prometheus
    interval: 15s
```

## Exposing the Federation Endpoint

The local Prometheus `/federate` endpoint is available by default. You need to make it accessible from the central server. There are several ways to do this:

### Option 1: NodePort or LoadBalancer Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: prometheus-federate
  namespace: istio-system
spec:
  type: LoadBalancer
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
```

### Option 2: Through Istio Gateway

If both clusters are in the same mesh, you can expose Prometheus through an Istio gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: prometheus-federate
  namespace: istio-system
spec:
  hosts:
  - prometheus.cluster1.example.com
  gateways:
  - mesh-gateway
  http:
  - match:
    - uri:
        prefix: /federate
    route:
    - destination:
        host: prometheus.istio-system.svc.cluster.local
        port:
          number: 9090
```

### Option 3: VPN or Direct Network Connectivity

If your clusters are connected via VPN, the central Prometheus can reach the local instances directly using their internal IPs or DNS names.

## Configuring the Central Prometheus

On the central Prometheus server, add federation scrape configs for each cluster. The key is to use the `match[]` parameter to select only the Istio metrics you need:

```yaml
scrape_configs:
- job_name: 'federate-cluster1'
  scrape_interval: 30s
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
    - '{__name__=~"istio_.*"}'
    - '{__name__=~"pilot_.*"}'
    - '{__name__=~"envoy_.*"}'
    - '{__name__=~"galley_.*"}'
  static_configs:
  - targets:
    - 'prometheus.cluster1.example.com:9090'
    labels:
      cluster: 'cluster1'

- job_name: 'federate-cluster2'
  scrape_interval: 30s
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
    - '{__name__=~"istio_.*"}'
    - '{__name__=~"pilot_.*"}'
    - '{__name__=~"envoy_.*"}'
  static_configs:
  - targets:
    - 'prometheus.cluster2.example.com:9090'
    labels:
      cluster: 'cluster2'
```

The `honor_labels: true` setting is important. It preserves the original labels from the local Prometheus instead of overwriting them with the federated scrape labels.

The `cluster` label added via `static_configs` lets you distinguish metrics from different clusters in your queries.

## Selecting the Right Metrics

Do not federate everything. Pulling all metrics from every cluster will overwhelm the central Prometheus. Select only what you need for cross-cluster dashboards and alerts.

Useful Istio metrics to federate:

```yaml
params:
  'match[]':
  # Request metrics
  - 'istio_requests_total'
  - 'istio_request_duration_milliseconds_bucket'
  - 'istio_request_bytes_bucket'
  - 'istio_response_bytes_bucket'
  # TCP metrics
  - 'istio_tcp_sent_bytes_total'
  - 'istio_tcp_received_bytes_total'
  - 'istio_tcp_connections_opened_total'
  - 'istio_tcp_connections_closed_total'
  # Control plane metrics
  - 'pilot_xds_pushes'
  - 'pilot_xds_push_time_bucket'
  - 'pilot_proxy_convergence_time_bucket'
```

## Handling Label Conflicts

When federating from multiple clusters, you might get label conflicts. For example, both clusters have a namespace called `production` with different services. The `cluster` label you add in the scrape config helps disambiguate:

```promql
sum(rate(istio_requests_total{cluster="cluster1"}[5m])) by (destination_service)
```

But if local Prometheus instances already have a `cluster` label on their metrics, it will conflict with the one you add. Use `metric_relabel_configs` to handle this:

```yaml
- job_name: 'federate-cluster1'
  metric_relabel_configs:
  - source_labels: [cluster]
    target_label: origin_cluster
  - replacement: 'cluster1'
    target_label: cluster
```

## Performance Considerations

Federation has overhead on both sides:

- The local Prometheus needs to evaluate the match queries and serialize the results
- The central Prometheus needs to ingest and store the federated metrics

To keep things manageable:

1. Increase the scrape interval for federation (30s or 60s instead of 15s)
2. Pre-aggregate metrics on the local Prometheus using recording rules before federating
3. Limit the label cardinality of federated metrics

Example recording rule for pre-aggregation on the local Prometheus:

```yaml
groups:
- name: istio-federation
  rules:
  - record: cluster:istio_requests_total:rate5m
    expr: sum(rate(istio_requests_total[5m])) by (source_workload, destination_workload, response_code)
```

Then federate the recorded metric instead of the raw one:

```yaml
params:
  'match[]':
  - '{__name__=~"cluster:.*"}'
```

## Testing Federation

Verify that federation is working by querying the central Prometheus:

```bash
curl -g 'http://central-prometheus:9090/api/v1/query?query=istio_requests_total{cluster="cluster1"}'
```

Check for staleness issues by comparing metric timestamps between local and central instances. Federation introduces a delay equal to the scrape interval, so dashboards on the central server will be slightly behind.

Federation is a solid starting point for multi-cluster Istio observability. It is simple to set up and does not require additional infrastructure. Just be mindful of metric volume and scrape intervals as your mesh grows.
