# How to Export Istio Metrics to Dynatrace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Dynatrace, Metric, Monitoring, Observability, Kubernetes

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

Dynatrace has a built-in Prometheus integration that can scrape endpoints and ingest the metrics natively. You configure this through annotations on pods or services, with the Dynatrace Operator managing the in-cluster ActiveGate that performs the scraping.

If you are using the Dynatrace Operator, make sure Kubernetes monitoring is enabled and that **Monitor annotated Prometheus exporters** is turned on for the cluster in Dynatrace. Your DynaKube should include an ActiveGate with Kubernetes monitoring enabled:

```yaml
apiVersion: dynatrace.com/v1beta6
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

  oneAgent:
    classicFullStack:
      tolerations:
        - operator: Exists
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
              "istio_request_duration_milliseconds"
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

      metricstarttime: {}

      cumulativetodelta:
        max_staleness: 25h

      memory_limiter:
        check_interval: 5s
        limit_mib: 400

    exporters:
      otlphttp:
        endpoint: https://<your-environment>.live.dynatrace.com/api/v2/otlp
        headers:
          Authorization: "Api-Token ${env:DT_API_TOKEN}"

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [memory_limiter, filter, metricstarttime, cumulativetodelta, batch]
          exporters: [otlphttp]
```

Deploy the collector with the proper secret:

```bash
kubectl create secret generic dynatrace-secret \
  -n istio-system \
  --from-literal=api-token=<YOUR_DT_API_TOKEN>
```

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
  name: otel-collector-istio-scrape
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector-istio-scrape
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector-istio-scrape
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: istio-system
---
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

Notice the `metricstarttime` and `cumulativetodelta` processors. Dynatrace requires delta temporality for counters, and the start time processor gives the cumulative-to-delta conversion the start timestamps it needs.

## Option 3: Existing Prometheus via Federation

If you already have Prometheus scraping Istio metrics, do not point Prometheus `remote_write` directly at the Dynatrace metrics ingest API. Prometheus remote write uses its own protobuf protocol, while the Dynatrace metrics ingest API expects the Dynatrace metric line protocol. Instead, have the OTel Collector scrape Prometheus's federation endpoint and export the metrics to Dynatrace over OTLP:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'istio-federate'
          scrape_interval: 30s
          honor_labels: true
          metrics_path: /federate
          params:
            'match[]':
              - '{__name__=~"istio_.*"}'
          static_configs:
            - targets:
                - prometheus-server.monitoring.svc.cluster.local:9090
```

## Querying Metrics in Dynatrace

Once metrics land in Dynatrace, you can query them using DQL (Dynatrace Query Language):

```text
timeseries requests=sum(istio_requests_total, rate: 1m), by: {destination_service}
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
- Use the `metricstarttime` and `cumulativetodelta` processors when exporting Prometheus metrics over OTLP
- Monitor your DDU consumption in the Dynatrace billing dashboard after enabling the integration

## Troubleshooting

If metrics are not showing up:

```bash
# Check if the OTel Collector is running
kubectl logs -n istio-system deploy/otel-collector

# Verify the collector can reach the Dynatrace OTLP metrics endpoint
kubectl exec -n istio-system deploy/otel-collector -- wget -S --spider https://<your-environment>.live.dynatrace.com/api/v2/otlp/v1/metrics

# Check if metrics are being scraped
kubectl port-forward -n istio-system deploy/otel-collector 8888:8888
# Then visit http://localhost:8888/metrics to see collector internal metrics
```

The combination of Istio metrics and Dynatrace's AI-powered analysis (Davis) can surface issues before they impact users. Once the pipeline is in place, you get automated root cause analysis that correlates mesh-level metrics with infrastructure and application data.
