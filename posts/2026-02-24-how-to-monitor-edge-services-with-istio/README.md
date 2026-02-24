# How to Monitor Edge Services with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Edge Computing, Monitoring, Observability, Prometheus

Description: How to set up monitoring and observability for edge services using Istio telemetry with resource-efficient configurations.

---

Monitoring edge services is harder than monitoring cloud services. You have limited resources for running monitoring infrastructure, unreliable network connections for shipping metrics, and potentially hundreds of edge sites to keep track of. Istio generates telemetry automatically from its sidecar proxies, which is a huge advantage because you do not need to instrument your application code. The trick is configuring it to work within edge constraints.

## What Istio Gives You Automatically

Every Istio sidecar proxy generates metrics about the traffic it handles. Without any extra configuration, you get:

- Request count, duration, and size (by source, destination, response code)
- TCP connection metrics (bytes sent/received, connections opened/closed)
- mTLS status for every connection

These metrics are exposed on port 15020 of each sidecar proxy in Prometheus format. The question is how to collect and use them efficiently at the edge.

## Lightweight Prometheus for Edge

Running a full Prometheus server at each edge site works but can be resource-heavy. Use Prometheus with aggressive retention and storage limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
        - name: prometheus
          image: prom/prometheus:latest
          args:
            - "--config.file=/etc/prometheus/prometheus.yml"
            - "--storage.tsdb.path=/prometheus"
            - "--storage.tsdb.retention.time=6h"
            - "--storage.tsdb.retention.size=500MB"
            - "--web.enable-lifecycle"
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
            - name: storage
              mountPath: /prometheus
      volumes:
        - name: config
          configMap:
            name: prometheus-config
        - name: storage
          emptyDir:
            sizeLimit: 1Gi
```

The 6-hour retention and 500MB storage limit keep resource usage bounded. For edge, you typically want short-term metrics locally and ship aggregated data to a central system.

## Configuring Prometheus Scraping for Istio

Set up Prometheus to scrape Istio metrics:

```yaml
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

    scrape_configs:
      - job_name: 'istiod'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - istio-system
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: istiod
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            target_label: __address__
            regex: (.+)
            replacement: ${1}:15014

      - job_name: 'envoy-stats'
        metrics_path: /stats/prometheus
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_name]
            action: keep
            regex: istio-proxy
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:15020
            target_label: __address__
```

Notice the 30-second scrape interval. The default 15 seconds is fine in the cloud but doubles the scraping load. For edge, 30 seconds gives you sufficient granularity while keeping overhead low.

## Reducing Metric Cardinality

Istio generates a lot of metrics, and many of them are high-cardinality (they have many unique label combinations). On resource-constrained edge nodes, you want to limit this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster.outbound"
          - "listener"
          - "http.inbound"
```

By specifying inclusion prefixes, you only collect the metrics you actually need. This can reduce memory usage in each proxy by 30-50%.

You can also use the Telemetry API to control which metrics are emitted:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: edge-metrics
  namespace: edge-app
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            request_protocol:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
```

Removing labels you do not need reduces the number of time series Prometheus has to store.

## Shipping Metrics to a Central System

Edge metrics are most useful when aggregated centrally. Use Prometheus remote write to ship metrics to a central store:

```yaml
# Add to prometheus.yml
remote_write:
  - url: "https://metrics.central.example.com/api/v1/write"
    queue_config:
      max_samples_per_send: 1000
      batch_send_deadline: 30s
      min_backoff: 1s
      max_backoff: 5m
      capacity: 5000
    write_relabel_configs:
      - source_labels: [__name__]
        regex: "istio_requests_total|istio_request_duration_milliseconds_bucket|istio_tcp_connections_opened_total|istio_tcp_connections_closed_total"
        action: keep
```

The `write_relabel_configs` filter ensures you only ship the most important metrics centrally. The queue configuration handles intermittent connectivity by buffering samples and retrying with backoff.

## Access Logging for Debugging

For debugging, you sometimes need request-level logs. Enable them selectively:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: edge-logging
  namespace: edge-app
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || connection.mtls == false"
```

This logs only errors and non-mTLS connections, keeping log volume manageable on resource-constrained nodes.

View the logs:

```bash
kubectl logs -n edge-app deploy/my-service -c istio-proxy --tail=100
```

## Setting Up Alerts

With Prometheus running locally, set up alerts for common edge issues:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yml: |
    groups:
      - name: istio-edge-alerts
        rules:
          - alert: HighErrorRate
            expr: |
              sum(rate(istio_requests_total{response_code=~"5.*"}[5m]))
              /
              sum(rate(istio_requests_total[5m]))
              > 0.05
            for: 2m
            labels:
              severity: warning
            annotations:
              summary: "Error rate above 5% for 2 minutes"

          - alert: SidecarNotReady
            expr: |
              sum(pilot_proxy_convergence_time_bucket{le="30"})
              /
              sum(pilot_proxy_convergence_time_bucket{le="+Inf"})
              < 0.9
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "More than 10% of proxies slow to converge"

          - alert: IstiodDown
            expr: up{job="istiod"} == 0
            for: 1m
            labels:
              severity: critical
            annotations:
              summary: "istiod is not responding"
```

## Using Kiali for Service Graph Visualization

If you have enough resources, Kiali provides a visual service graph that shows traffic flow through the mesh:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/kiali.yaml
```

For edge environments where you cannot run Kiali locally, generate the service graph data from Prometheus queries and ship it centrally:

```bash
# Query service topology data
kubectl exec -n monitoring deploy/prometheus -- \
  wget -qO- 'http://localhost:9090/api/v1/query?query=istio_requests_total' | \
  python3 -m json.tool | head -50
```

## Quick Diagnostic Commands

When something goes wrong at an edge site, these commands help you quickly assess the situation:

```bash
# Overall mesh health
istioctl analyze -n edge-app

# Check which endpoints are healthy
istioctl proxy-config endpoints deploy/my-service -n edge-app --status healthy

# View active connections
kubectl exec -n edge-app deploy/my-service -c istio-proxy -- \
  pilot-agent request GET /stats | grep "cx_active"

# Check for proxy errors
kubectl exec -n edge-app deploy/my-service -c istio-proxy -- \
  pilot-agent request GET /stats | grep "upstream_rq_5xx"
```

Monitoring edge services with Istio comes down to being selective about what you collect, keeping local retention short, and shipping aggregated metrics to a central system. The Envoy proxies generate rich telemetry automatically, so your job is mainly to configure collection and storage in a way that fits edge resource constraints.
