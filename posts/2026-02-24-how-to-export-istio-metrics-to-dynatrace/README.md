# How to Export Istio Metrics to Dynatrace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Dynatrace, Metrics, Monitoring, Observability, Kubernetes

Description: Learn how to export Istio service mesh metrics into Dynatrace for unified observability using ActiveGate, OpenTelemetry, and Prometheus integration.

---

Dynatrace has strong Kubernetes monitoring capabilities, and it can automatically discover a lot of what is happening in your cluster. But when it comes to Istio-specific metrics like per-service request rates, latencies, and error breakdowns, you need to set up explicit metric ingestion. Dynatrace does not scrape Istio's Prometheus endpoints automatically out of the box.

There are a few ways to bridge this gap. I will cover the main approaches and share what works best based on real production setups.

## The Metrics You Want

Istio's Envoy sidecars expose Prometheus metrics on port 15090. The most useful ones for Dynatrace dashboards are:

- `istio_requests_total` - Request counts with rich labels (source, destination, response code, etc.)
- `istio_request_duration_milliseconds` - Request latency distribution
- `istio_request_bytes` and `istio_response_bytes` - Payload sizes
- `istio_tcp_connections_opened_total` and `istio_tcp_connections_closed_total` - TCP connection tracking

The istiod control plane also exposes metrics on port 15014, including pilot configuration push latency, proxy connection counts, and resource validation errors.

## Option 1: Dynatrace Prometheus Integration

Dynatrace has a built-in Prometheus integration that can scrape endpoints and ingest the metrics natively. You configure this through annotations on the Dynatrace OneAgent or through the Dynatrace Operator.

If you are using the Dynatrace Operator, enable Prometheus monitoring in your DynaKube custom resource:

```yaml
apiVersion: dynatrace.com/v1beta1
kind: DynaKube
metadata:
  name: dynakube
  namespace: dynatrace
spec:
  apiUrl: https://<your-environment>.live.dynatrace.com/api
  tokens: dynakube

  activeGate:
    capabilities:
      - kubernetes-monitoring
      - routing
      - metrics-ingest

  oneAgent:
    classicFullStack:
      tolerations:
        - operator: Exists
      env:
        - name: DT_PROMETHEUS_ENABLED
          value: "true"
```

Then annotate your Istio-injected pods to tell Dynatrace to scrape the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        metrics.dynatrace.com/scrape: "true"
        metrics.dynatrace.com/port: "15090"
        metrics.dynatrace.com/path: "/stats/prometheus"
        metrics.dynatrace.com/filter: |
          {
            "mode": "include",
            "names": [
              "istio_requests_total",
              "istio_request_duration_milliseconds_bucket",
              "istio_request_duration_milliseconds_sum",
              "istio_request_duration_milliseconds_count"
            ]
          }
```

The filter annotation is important. Without it, Dynatrace will ingest every Envoy metric, and there are hundreds of them. That will consume a lot of your Davis Data Units (DDU) allowance.

## Option 2: OpenTelemetry Collector to Dynatrace

The OpenTelemetry Collector approach is more flexible and gives you better control over metric processing before ingestion.

First, create a Dynatrace API token with the `metrics.ingest` scope. Then configure the OTel Collector:

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
              scrape_interval: 30s
              static_configs:
                - targets: ['istiod.istio-system.svc.cluster.local:15014']

            - job_name: 'istio-proxy'
              scrape_interval: 30s
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
        timeout: 30s
        send_batch_size: 1000

      filter:
        metrics:
          include:
            match_type: regexp
            metric_names:
              - istio_requests_total
              - istio_request_duration_milliseconds.*
              - istio_request_bytes.*
              - istio_response_bytes.*
              - istio_tcp_.*

      cumulativetodelta: {}

      memory_limiter:
        check_interval: 5s
        limit_mib: 400

    exporters:
      otlphttp:
        endpoint: https://<your-environment>.live.dynatrace.com/api/v2/otlp
        headers:
          Authorization: "Api-Token ${DT_API_TOKEN}"

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [memory_limiter, filter, cumulativetodelta, batch]
          exporters: [otlphttp]
```

Deploy the collector with the proper secret:

```bash
kubectl create secret generic dynatrace-secret \
  -n istio-system \
  --from-literal=api-token=<YOUR_DT_API_TOKEN>
```

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
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          env:
            - name: DT_API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: dynatrace-secret
                  key: api-token
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              memory: 512Mi
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

Notice the `cumulativetodelta` processor. Dynatrace prefers delta metrics for counters rather than cumulative counters. This processor converts Prometheus cumulative counters into delta values that Dynatrace handles more efficiently.

## Option 3: Prometheus Remote Write via ActiveGate

If you already have Prometheus scraping Istio metrics, you can use Prometheus remote write to push them through a Dynatrace ActiveGate:

```yaml
# prometheus remote write config
remote_write:
  - url: https://<your-environment>.live.dynatrace.com/api/v2/metrics/ingest
    bearer_token: <YOUR_DT_API_TOKEN>
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'istio_.*'
        action: keep
    metadata_config:
      send: true
      send_interval: 1m
```

## Querying Metrics in Dynatrace

Once metrics land in Dynatrace, you can query them using DQL (Dynatrace Query Language):

```text
timeseries avg(istio_requests_total), by: {destination_service}
| filter destination_service != ""
```

Or use the classic metric selector syntax:

```text
istio_requests_total:splitBy("destination_service"):rate(1m)
```

## Building Dynatrace Dashboards

Create a dashboard with these tiles:

1. **Request throughput** - Line chart of `istio_requests_total` rate split by destination service
2. **Error rate percentage** - Single value tile showing 5xx responses as a percentage of total
3. **P95 latency by service** - Line chart using `istio_request_duration_milliseconds` percentiles
4. **Top talkers** - Table showing the highest traffic source-to-destination pairs

## Cost Management Tips

Dynatrace bills based on DDU consumption, and Istio metrics can generate a lot of data:

- Always use metric filters to only ingest what you need
- Drop high-cardinality labels you do not use (like `request_protocol` or `connection_security_policy` if they are not relevant)
- Set scrape intervals to 30 seconds or higher unless you need sub-minute granularity
- Use the `cumulativetodelta` processor to reduce storage overhead
- Monitor your DDU consumption in the Dynatrace billing dashboard after enabling the integration

## Troubleshooting

If metrics are not showing up:

```bash
# Check if the OTel Collector is running
kubectl logs -n istio-system deploy/otel-collector

# Verify the collector can reach Dynatrace
kubectl exec -n istio-system deploy/otel-collector -- wget -q -O- https://<your-environment>.live.dynatrace.com/api/v2/metrics/ingest --header="Authorization: Api-Token $DT_API_TOKEN" --post-data=""

# Check if metrics are being scraped
kubectl port-forward -n istio-system deploy/otel-collector 8888:8888
# Then visit http://localhost:8888/metrics to see collector internal metrics
```

The combination of Istio metrics and Dynatrace's AI-powered analysis (Davis) can surface issues before they impact users. Once the pipeline is in place, you get automated root cause analysis that correlates mesh-level metrics with infrastructure and application data.
