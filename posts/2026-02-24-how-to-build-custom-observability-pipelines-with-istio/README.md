# How to Build Custom Observability Pipelines with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Telemetry, OpenTelemetry, Monitoring

Description: How to build custom observability pipelines with Istio using the Telemetry API, OpenTelemetry Collector, and custom metric/trace/log exporters for your specific monitoring needs.

---

Istio generates a ton of telemetry data out of the box. Metrics, traces, and access logs flow from every sidecar in your mesh. The challenge is not generating the data but routing it to the right places and transforming it to match your monitoring stack. Building a custom observability pipeline lets you control exactly what data goes where.

## The Istio Telemetry Architecture

Istio's telemetry data flows through several layers:

1. Envoy sidecars generate raw metrics, traces, and access logs
2. The Istio Telemetry API controls what gets collected and where it goes
3. Backend collectors (Prometheus, Jaeger, OpenTelemetry Collector) receive and process the data
4. Storage and visualization tools (Grafana, Kibana, etc.) make the data useful

The piece you customize is step 2 and 3.

## Configuring Telemetry Providers

Istio supports multiple telemetry providers through the MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel-collector
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
    - name: custom-access-log
      envoyFileAccessLog:
        path: /dev/stdout
        logFormat:
          labels:
            source: "%REQ(X-ENVOY-PEER-METADATA)%"
            destination: "%ENVIRONMENT(POD_NAME)%"
            method: "%REQ(:METHOD)%"
            path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
            status: "%RESPONSE_CODE%"
            duration: "%DURATION%"
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
```

## Setting Up OpenTelemetry Collector

The OpenTelemetry Collector is the backbone of a custom observability pipeline. It receives data from Istio, processes it, and exports it to your backends:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
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
      - name: collector
        image: otel/opentelemetry-collector-contrib:latest
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 8888
          name: metrics
        volumeMounts:
        - name: config
          mountPath: /etc/otelcol-contrib
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
  - port: 4317
    targetPort: 4317
    name: otlp-grpc
  - port: 4318
    targetPort: 4318
    name: otlp-http
```

The collector configuration defines receivers, processors, and exporters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 5s
        limit_mib: 512
        spike_limit_mib: 128
      attributes:
        actions:
        - key: environment
          value: production
          action: insert
      filter:
        error_mode: ignore
        traces:
          span:
          - 'attributes["http.target"] == "/health"'
          - 'attributes["http.target"] == "/ready"'

    exporters:
      prometheus:
        endpoint: 0.0.0.0:8889
        namespace: istio
      otlp/jaeger:
        endpoint: jaeger-collector.observability.svc.cluster.local:4317
        tls:
          insecure: true
      otlp/tempo:
        endpoint: tempo.observability.svc.cluster.local:4317
        tls:
          insecure: true
      loki:
        endpoint: http://loki.observability.svc.cluster.local:3100/loki/api/v1/push

    service:
      pipelines:
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch, attributes]
          exporters: [prometheus]
        traces:
          receivers: [otlp]
          processors: [memory_limiter, filter, batch]
          exporters: [otlp/jaeger, otlp/tempo]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [loki]
```

This configuration:
- Receives OTLP data from Istio sidecars
- Batches data for efficiency
- Adds an `environment` label to all telemetry
- Filters out health check traces
- Exports metrics to Prometheus, traces to Jaeger and Tempo, and logs to Loki

## Enabling Telemetry with the Telemetry API

Use the Telemetry resource to control what gets sent to your pipeline:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-telemetry
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10
  metrics:
  - providers:
    - name: prometheus
  accessLogging:
  - providers:
    - name: otel-collector
```

For per-namespace or per-workload configuration:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: critical-service-telemetry
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 100
  accessLogging:
  - providers:
    - name: otel-collector
    - name: custom-access-log
```

The payment service gets 100% trace sampling while the mesh default is 10%.

## Custom Metric Pipelines

Sometimes you need to transform Istio's metrics before they reach your monitoring backend. The OTel Collector's processor pipeline is perfect for this:

```yaml
processors:
  metricstransform:
    transforms:
    - include: istio_requests_total
      action: update
      new_name: http_requests_total
      operations:
      - action: update_label
        label: destination_service_name
        new_label: service
      - action: delete_label_value
        label: response_code
        label_value: "0"
    - include: istio_request_duration_milliseconds
      action: update
      new_name: http_request_duration_seconds
      operations:
      - action: experimental_scale_value
        experimental_scale: 0.001
```

This renames Istio metrics to match your existing naming conventions and converts milliseconds to seconds.

## Trace Enrichment Pipeline

Enrich traces with additional context before sending them to your trace backend:

```yaml
processors:
  resource:
    attributes:
    - key: deployment.environment
      value: production
      action: insert
    - key: service.version
      from_attribute: app.kubernetes.io/version
      action: insert
  span:
    name:
      from_attributes: ["http.method", "http.target"]
      separator: " "
```

## Multi-Backend Fan-Out

Send different telemetry to different backends based on content:

```yaml
connectors:
  routing:
    default_pipelines: [traces/default]
    table:
    - statement: route() where attributes["service.name"] == "payment-service"
      pipelines: [traces/payment]

service:
  pipelines:
    traces/default:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
    traces/payment:
      receivers: [routing]
      processors: [batch]
      exporters: [otlp/jaeger, otlp/compliance-storage]
```

Payment service traces go to both Jaeger and a compliance storage system.

## Sampling Strategies

Control how much trace data you collect:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: sampling-config
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 1
```

For more sophisticated sampling, use the OTel Collector's tail sampling processor:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
    - name: error-traces
      type: status_code
      status_code: {status_codes: [ERROR]}
    - name: slow-traces
      type: latency
      latency: {threshold_ms: 5000}
    - name: default-sample
      type: probabilistic
      probabilistic: {sampling_percentage: 5}
```

This keeps 100% of error traces, 100% of slow traces (over 5 seconds), and 5% of everything else.

## Monitoring the Pipeline Itself

Your observability pipeline needs its own monitoring:

```bash
# Check OTel Collector metrics
kubectl port-forward svc/otel-collector -n observability 8888:8888
curl localhost:8888/metrics | grep otelcol
```

Key metrics to watch:
- `otelcol_receiver_accepted_spans` - Traces received
- `otelcol_exporter_sent_spans` - Traces exported
- `otelcol_processor_dropped_spans` - Traces dropped by processors
- `otelcol_exporter_queue_size` - Exporter queue depth

Building a custom observability pipeline gives you full control over your telemetry data flow. Start with the Istio Telemetry API for data collection, use the OpenTelemetry Collector for processing and routing, and export to whatever backends your team needs. The pipeline approach means you can change backends without touching your services or Istio configuration.
