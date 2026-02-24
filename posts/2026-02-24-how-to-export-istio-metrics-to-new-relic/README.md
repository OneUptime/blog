# How to Export Istio Metrics to New Relic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, New Relic, Metrics, Monitoring, Observability, OpenTelemetry

Description: Step-by-step guide to shipping Istio service mesh metrics to New Relic using Prometheus, OpenTelemetry, and native integrations.

---

New Relic has been expanding its Kubernetes and service mesh support over the past few years, and getting Istio metrics into New Relic is a realistic goal for teams that have standardized on the platform. The approach is not as plug-and-play as some might hope, but with the right configuration you can get full visibility into your mesh traffic without too much effort.

Istio generates Prometheus-format metrics through its Envoy sidecars, and New Relic can ingest Prometheus metrics through several channels. I will cover the main approaches and help you pick the one that fits your setup.

## What Metrics Are Available

Before jumping into configuration, here is what Istio exposes:

- `istio_requests_total` - Counter of all requests with labels for source, destination, response code, gRPC status, protocol, and more
- `istio_request_duration_milliseconds` - Histogram of request duration
- `istio_request_bytes` / `istio_response_bytes` - Size of request and response bodies
- `istio_tcp_sent_bytes_total` / `istio_tcp_received_bytes_total` - TCP traffic volume
- `istio_tcp_connections_opened_total` / `istio_tcp_connections_closed_total` - TCP connection counts

Each sidecar exposes these at `http://localhost:15090/stats/prometheus`.

## Option 1: New Relic Prometheus Agent

New Relic provides a Prometheus agent that can scrape endpoints and forward metrics to the New Relic OTLP endpoint. This is the most direct path.

Install the New Relic Prometheus agent:

```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm repo update
```

Create a values file:

```yaml
# newrelic-prom-values.yaml
licenseKey: <YOUR_NEW_RELIC_LICENSE_KEY>
cluster: my-cluster

config:
  static_targets:
    - targets:
        - "istiod.istio-system.svc.cluster.local:15014"
      labels:
        job: istiod

  kubernetes:
    jobs:
      - job_name_prefix: istio-mesh
        target_discovery:
          pod: true
          filter:
            annotations:
              prometheus.io/scrape: "true"
        integrations_filter:
          enabled: false

      - job_name_prefix: istio-proxy
        target_discovery:
          pod: true
          filter:
            annotations:
              prometheus.io/port: "15090"
        integrations_filter:
          enabled: false
```

Install it:

```bash
helm install newrelic-prometheus newrelic/nri-prometheus \
  -n newrelic \
  --create-namespace \
  -f newrelic-prom-values.yaml
```

The challenge with this approach is that not all Istio-injected pods have the `prometheus.io/scrape` annotation by default. You may need to add scrape annotations or use a different discovery mechanism.

## Option 2: OpenTelemetry Collector to New Relic

This is the approach I would recommend for most teams. The OpenTelemetry Collector can scrape Prometheus endpoints and export to New Relic's OTLP ingest endpoint.

Create the collector configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: istio-system
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
          scrape_configs:
            - job_name: 'istiod'
              scrape_interval: 15s
              static_configs:
                - targets: ['istiod.istio-system.svc.cluster.local:15014']

            - job_name: 'istio-proxy'
              scrape_interval: 15s
              kubernetes_sd_configs:
                - role: pod
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_container_name]
                  action: keep
                  regex: istio-proxy
                - source_labels: [__address__]
                  action: replace
                  regex: ([^:]+)(?::\d+)?
                  replacement: $1:15090
                  target_label: __address__
                - source_labels: [__meta_kubernetes_namespace]
                  target_label: namespace
                - source_labels: [__meta_kubernetes_pod_name]
                  target_label: pod
                - source_labels: [__meta_kubernetes_pod_label_app]
                  target_label: app

    processors:
      batch:
        send_batch_size: 1000
        timeout: 10s

      filter:
        metrics:
          include:
            match_type: regexp
            metric_names:
              - istio_.*
              - envoy_.*

      memory_limiter:
        check_interval: 5s
        limit_mib: 512
        spike_limit_mib: 128

    exporters:
      otlphttp:
        endpoint: https://otlp.nr-data.net
        headers:
          api-key: ${NEW_RELIC_LICENSE_KEY}

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [memory_limiter, filter, batch]
          exporters: [otlphttp]
```

Deploy the collector:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          env:
            - name: NEW_RELIC_LICENSE_KEY
              valueFrom:
                secretKeyRef:
                  name: newrelic-secret
                  key: license-key
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

Note the `sidecar.istio.io/inject: "false"` annotation. You do not want the collector itself to get an Istio sidecar, or you will create a monitoring loop.

Set up the RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "endpoints"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: istio-system
```

## Option 3: Prometheus Remote Write

If you already have Prometheus running in your cluster, you can use Prometheus remote write to send metrics to New Relic. Add this to your Prometheus configuration:

```yaml
remote_write:
  - url: https://metric-api.newrelic.com/prometheus/v1/write?prometheus_server=istio-cluster
    authorization:
      credentials: <YOUR_NEW_RELIC_LICENSE_KEY>
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'istio_.*'
        action: keep
```

This is the simplest approach if you are already running Prometheus and scraping Istio metrics with it.

## Querying Istio Metrics in New Relic

Once metrics are flowing, you can query them using NRQL:

```sql
-- Request rate per service
SELECT rate(sum(istio_requests_total), 1 minute)
FROM Metric
FACET destination_service
SINCE 1 hour ago

-- Error rate
SELECT filter(count(istio_requests_total), WHERE response_code LIKE '5%') / count(istio_requests_total) * 100 as 'Error Rate %'
FROM Metric
FACET destination_service
SINCE 1 hour ago

-- P99 latency
SELECT percentile(istio_request_duration_milliseconds, 99)
FROM Metric
FACET destination_service
SINCE 1 hour ago
```

## Building Dashboards

In New Relic One, create a dashboard with these panels:

1. **Service Map** - Use the relationship data from source/destination labels to build a visual service map
2. **Request Rate Timeline** - Line chart of `istio_requests_total` rate by service
3. **Error Rate Billboard** - Billboard widgets showing current error rates per service
4. **Latency Heatmap** - Heatmap of request durations across services

## Practical Considerations

Here are some things to watch out for:

**Metric cardinality matters.** Istio metrics have many labels, and each unique combination creates a new time series. In New Relic, data points per minute (DPM) can add up fast. Use the filter processor to drop metrics you do not need and strip high-cardinality labels.

**Scrape interval affects cost.** Scraping every 15 seconds is standard. Going lower than that rarely provides actionable benefit and increases your ingest volume.

**Name normalization.** New Relic may normalize metric names (replacing underscores with dots, for example). Check the actual metric names in the query builder if your NRQL queries return empty results.

**Use the memory limiter processor.** The OTel Collector can consume a lot of memory if it is scraping hundreds of pods. The memory limiter processor prevents OOM kills.

Getting Istio metrics into New Relic opens up powerful correlation capabilities. You can overlay mesh metrics with APM data, infrastructure metrics, and logs all in one place. The OTel Collector approach gives you the most control and is the path New Relic is investing in going forward.
