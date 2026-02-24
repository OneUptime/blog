# How to Export Istio Metrics to Datadog

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Datadog, Metrics, Monitoring, Observability, Prometheus

Description: A practical guide to exporting Istio service mesh metrics to Datadog for centralized monitoring, alerting, and dashboarding.

---

If you are running Istio in production, you probably already know that it generates a ton of useful metrics out of the box. Request rates, latencies, error codes - all of it flows through Envoy sidecars and gets exposed as Prometheus metrics. But if your team uses Datadog as its primary monitoring platform, you need a way to get those metrics from Istio into Datadog where you can build dashboards, set up alerts, and correlate them with everything else you are already tracking.

The good news is that this integration is pretty straightforward. There are a few different approaches, and I will walk through the most reliable ones.

## Understanding the Metrics Pipeline

Istio's Envoy sidecars expose metrics on port 15090 at the `/stats/prometheus` endpoint. These are standard Prometheus-format metrics. The key metrics you will care about include:

- `istio_requests_total` - Total request count with labels for source, destination, response code, etc.
- `istio_request_duration_milliseconds` - Request duration histogram
- `istio_request_bytes` - Request body sizes
- `istio_response_bytes` - Response body sizes
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed

Datadog can ingest these metrics through its agent, which has built-in support for scraping Prometheus endpoints.

## Option 1: Datadog Agent with Prometheus Autodiscovery

The most common approach is to deploy the Datadog Agent as a DaemonSet and configure it to automatically discover and scrape Istio's Prometheus endpoints.

First, install the Datadog Agent using Helm:

```bash
helm repo add datadog https://helm.datadoghq.com
helm repo update
```

Create a values file for the Datadog Helm chart:

```yaml
# datadog-values.yaml
datadog:
  apiKey: <YOUR_DATADOG_API_KEY>
  appKey: <YOUR_DATADOG_APP_KEY>
  site: datadoghq.com

  prometheusScrape:
    enabled: true
    serviceEndpoints: true

  logs:
    enabled: true
    containerCollectAll: true

  confd:
    istio.yaml: |-
      ad_identifiers:
        - proxyv2
      init_config:
      instances:
        - istio_mesh_endpoint: http://%%host%%:15090/stats/prometheus
          send_histograms_buckets: true
          send_monotonic_counter: true
          send_distribution_buckets: true

agents:
  tolerations:
    - operator: Exists
```

Install it:

```bash
helm install datadog-agent datadog/datadog \
  -n datadog \
  --create-namespace \
  -f datadog-values.yaml
```

This tells the Datadog Agent to look for any pod running the `proxyv2` container (which is the Envoy sidecar image) and scrape its Prometheus endpoint.

## Option 2: Annotate Pods for Prometheus Scraping

If you prefer more granular control, you can use Datadog's annotation-based Prometheus autodiscovery. Add annotations to your workload pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  template:
    metadata:
      annotations:
        ad.datadoghq.com/istio-proxy.checks: |
          {
            "istio": {
              "instances": [
                {
                  "istio_mesh_endpoint": "http://%%host%%:15090/stats/prometheus",
                  "send_histograms_buckets": true,
                  "send_monotonic_counter": true
                }
              ]
            }
          }
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

This approach gives you the ability to enable metrics collection on a per-workload basis rather than globally.

## Option 3: Use the OpenTelemetry Collector as a Bridge

Another popular pattern is to use the OpenTelemetry Collector to scrape Istio metrics and then forward them to Datadog. This is useful if you are already standardizing on OpenTelemetry across your stack.

Deploy the OpenTelemetry Collector:

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
            - job_name: 'istio-mesh'
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

    processors:
      batch:
        timeout: 10s
      filter:
        metrics:
          include:
            match_type: regexp
            metric_names:
              - istio_.*

    exporters:
      datadog:
        api:
          key: ${DD_API_KEY}
          site: datadoghq.com
        metrics:
          histograms:
            mode: distributions

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [filter, batch]
          exporters: [datadog]
```

Deploy the collector:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          env:
            - name: DD_API_KEY
              valueFrom:
                secretKeyRef:
                  name: datadog-secret
                  key: api-key
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

Make sure to create the necessary RBAC rules so the collector can discover pods:

```bash
kubectl create clusterrolebinding otel-collector \
  --clusterrole=view \
  --serviceaccount=istio-system:otel-collector
```

## Verifying Metrics in Datadog

Once the pipeline is running, head over to the Datadog Metrics Explorer. Search for `istio_requests_total` or `istio.mesh.request.count` (Datadog normalizes metric names). You should see metrics flowing in within a few minutes.

A quick way to verify from the command line:

```bash
# Check if the Datadog Agent is scraping successfully
kubectl exec -it $(kubectl get pod -n datadog -l app=datadog -o jsonpath='{.items[0].metadata.name}') -n datadog -- agent status | grep istio
```

## Building a Useful Dashboard

Once metrics are flowing, create a Datadog dashboard with these key widgets:

1. **Request rate by service** - Graph `istio_requests_total` grouped by `destination_service`
2. **Error rate** - Graph `istio_requests_total` filtered by `response_code:5xx` divided by total requests
3. **P99 latency** - Use `istio_request_duration_milliseconds` with the p99 aggregation
4. **TCP connections** - Track `istio_tcp_connections_opened_total` over time

## Setting Up Alerts

Create monitors in Datadog for critical conditions:

- **High error rate**: Alert when 5xx rate exceeds 1% for any service over 5 minutes
- **Latency spike**: Alert when P99 latency exceeds your SLO threshold
- **Connection surge**: Alert on abnormal TCP connection counts

## Tips for Production

A few things I have learned running this setup:

- **Filter metrics early.** Istio generates hundreds of metric series per pod. Use the filter processor (in OTel) or `metrics_filter` in the Datadog config to only send what you actually use. Otherwise your Datadog bill will spike.
- **Watch cardinality.** Labels like `source_workload`, `destination_workload`, `response_code`, and `request_protocol` multiply fast. If you have 50 services talking to each other, that is already thousands of unique time series.
- **Use distributions, not histograms.** Datadog's distribution metrics give you server-side percentile calculations, which are more accurate than pre-bucketed histograms.
- **Set reasonable scrape intervals.** Every 15-30 seconds is usually fine. Scraping every 5 seconds generates a lot of data without much extra insight for most use cases.

The integration between Istio and Datadog works well once you have it set up. The main decision point is whether to go with the native Datadog Agent approach or use OpenTelemetry as an intermediary. If Datadog is your only monitoring backend, the Agent approach is simpler. If you are shipping telemetry to multiple backends, the OTel Collector gives you more flexibility.
