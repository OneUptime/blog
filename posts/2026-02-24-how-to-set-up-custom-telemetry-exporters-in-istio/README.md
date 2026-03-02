# How to Set Up Custom Telemetry Exporters in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Exporter, OpenTelemetry, Observability, Custom Metrics

Description: How to set up custom telemetry exporters in Istio to send metrics, traces, and logs to third-party backends using OpenTelemetry Collector and EnvoyFilter.

---

Istio's built-in telemetry gives you Prometheus metrics, Zipkin traces, and Envoy access logs out of the box. But what if you need to send telemetry to Datadog, New Relic, Grafana Cloud, Elasticsearch, or your own custom backend? Custom telemetry exporters let you route observability data wherever you need it, and the OpenTelemetry Collector is the most flexible way to do this.

## The Architecture of Custom Exporters

The typical setup for custom telemetry export in Istio has three layers:

1. **Envoy sidecars** generate raw telemetry (metrics, traces, access logs)
2. **An intermediary** collects and processes this telemetry (usually the OpenTelemetry Collector)
3. **Backend services** receive and store the final telemetry data

The intermediary is key because it gives you a single place to transform, filter, and route telemetry to multiple backends without changing the sidecar configuration.

## Setting Up the OpenTelemetry Collector

The OpenTelemetry Collector is a vendor-neutral proxy for telemetry data. It can receive data in many formats and export to dozens of backends.

### Deploy the Collector

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: istio-system
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      prometheus:
        config:
          scrape_configs:
          - job_name: 'istio-envoy'
            scrape_interval: 15s
            metrics_path: /stats/prometheus
            kubernetes_sd_configs:
            - role: pod
            relabel_configs:
            - source_labels: [__meta_kubernetes_pod_container_name]
              action: keep
              regex: istio-proxy

    processors:
      batch:
        timeout: 5s
        send_batch_size: 1000
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
        spike_limit_mib: 128
      attributes:
        actions:
        - key: environment
          value: production
          action: insert
      filter:
        metrics:
          include:
            match_type: regexp
            metric_names:
            - "istio_.*"
            - "envoy_cluster_upstream.*"

    exporters:
      otlp:
        endpoint: "tempo.monitoring.svc:4317"
        tls:
          insecure: true
      prometheusremotewrite:
        endpoint: "http://mimir.monitoring.svc:9009/api/v1/push"
      elasticsearch:
        endpoints:
        - "http://elasticsearch.logging.svc:9200"
        logs_index: istio-access-logs
      logging:
        loglevel: info

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, memory_limiter, attributes]
          exporters: [otlp, logging]
        metrics:
          receivers: [prometheus]
          processors: [batch, memory_limiter, filter]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp]
          processors: [batch, memory_limiter]
          exporters: [elasticsearch, logging]
---
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
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args:
        - --config=/etc/otel/config.yaml
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 8888
          name: metrics
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1
            memory: 1Gi
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
  - name: otlp-http
    port: 4318
  - name: metrics
    port: 8888
```

### Configure Istio to Send to the Collector

Register the collector as a telemetry provider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
```

Then enable it:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-telemetry
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 5.0
  accessLogging:
  - providers:
    - name: otel
```

## Exporting to Specific Backends

### Datadog

Add the Datadog exporter to your collector config:

```yaml
exporters:
  datadog:
    api:
      key: ${DD_API_KEY}
      site: datadoghq.com
    metrics:
      histograms:
        mode: distributions
    traces:
      span_name_as_resource_name: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [datadog]
    metrics:
      receivers: [prometheus]
      processors: [batch]
      exporters: [datadog]
```

Store the API key as a Kubernetes secret and mount it as an environment variable:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: datadog-secret
  namespace: istio-system
type: Opaque
data:
  api-key: <base64-encoded-api-key>
```

### Grafana Cloud (Loki, Tempo, Mimir)

```yaml
exporters:
  prometheusremotewrite:
    endpoint: "https://prometheus-prod-XX.grafana.net/api/prom/push"
    headers:
      Authorization: "Basic <base64-encoded-credentials>"
  otlp:
    endpoint: "tempo-prod-XX.grafana.net:443"
    headers:
      Authorization: "Basic <base64-encoded-credentials>"
  loki:
    endpoint: "https://logs-prod-XX.grafana.net/loki/api/v1/push"
    headers:
      Authorization: "Basic <base64-encoded-credentials>"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [batch]
      exporters: [prometheusremotewrite]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

### AWS CloudWatch and X-Ray

```yaml
exporters:
  awsxray:
    region: us-east-1
    local_mode: true
  awscloudwatchlogs:
    region: us-east-1
    log_group_name: "/istio/access-logs"
    log_stream_name: "mesh"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [awsxray]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [awscloudwatchlogs]
```

## Custom Access Log Formatting

Before exporting access logs, you might want to customize the format. Use the Telemetry API or EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-access-log
  namespace: istio-system
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          access_log:
          - name: envoy.access_loggers.file
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
              path: /dev/stdout
              log_format:
                json_format:
                  timestamp: "%START_TIME%"
                  source_ip: "%DOWNSTREAM_REMOTE_ADDRESS%"
                  destination: "%UPSTREAM_HOST%"
                  method: "%REQ(:METHOD)%"
                  path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
                  status: "%RESPONSE_CODE%"
                  duration_ms: "%DURATION%"
                  request_id: "%REQ(X-REQUEST-ID)%"
                  user_agent: "%REQ(USER-AGENT)%"
                  response_flags: "%RESPONSE_FLAGS%"
                  bytes_received: "%BYTES_RECEIVED%"
                  bytes_sent: "%BYTES_SENT%"
```

## Creating Custom Metrics

Beyond filtering existing metrics, you can create entirely new metrics using the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: SERVER
      tagOverrides:
        api_version:
          value: "request.headers['x-api-version'] || 'unknown'"
        tenant_id:
          value: "request.headers['x-tenant-id'] || 'default'"
```

This adds custom labels to the request count metric based on request header values. Be careful with this because custom labels can increase cardinality significantly.

## Multi-Backend Export Strategy

A common pattern is to send different types of telemetry to different backends:

```yaml
service:
  pipelines:
    # Real-time metrics to Prometheus for dashboards and alerts
    metrics/prometheus:
      receivers: [prometheus]
      processors: [batch, filter]
      exporters: [prometheusremotewrite]

    # Detailed traces to Jaeger for debugging
    traces/jaeger:
      receivers: [otlp]
      processors: [batch, memory_limiter]
      exporters: [otlp]

    # Long-term trace storage in S3 via a different exporter
    traces/archive:
      receivers: [otlp]
      processors: [batch]
      exporters: [awss3]

    # Access logs to Elasticsearch for search
    logs/elasticsearch:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [elasticsearch]

    # Error logs to PagerDuty for alerting
    logs/alerts:
      receivers: [otlp]
      processors: [batch, filter/errors-only]
      exporters: [pagerduty]
```

## Monitoring the Exporter Pipeline

The collector itself generates metrics about its operation. Monitor these to make sure data is flowing:

```promql
# Export failures
rate(otelcol_exporter_send_failed_metric_points[5m])
rate(otelcol_exporter_send_failed_spans[5m])
rate(otelcol_exporter_send_failed_log_records[5m])

# Queue size (if using queued retry)
otelcol_exporter_queue_size

# Receiver accepted data
rate(otelcol_receiver_accepted_metric_points[5m])
rate(otelcol_receiver_accepted_spans[5m])

# Processor dropped data
rate(otelcol_processor_dropped_metric_points[5m])
```

Set up alerts for export failures:

```yaml
groups:
- name: otel-collector
  rules:
  - alert: TelemetryExportFailures
    expr: rate(otelcol_exporter_send_failed_spans[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OpenTelemetry Collector failing to export spans"
```

## Scaling the Collector

For high-traffic meshes, a single collector instance may not be enough:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 3
```

For traces, all spans of a single trace should go to the same collector instance for proper batching. Use a load balancing exporter or tail-based sampling processor for this.

For metrics, the collector can be stateless since Prometheus scraping is pull-based. Use multiple collector instances behind a service with standard load balancing.

Custom telemetry exporters give you the flexibility to send Istio's observability data wherever it needs to go. The OpenTelemetry Collector is the most versatile tool for this job because it supports dozens of exporters and gives you a powerful processing pipeline in between. Start with a simple setup, verify data flows end-to-end, and then add more exporters and processing as your needs grow.
