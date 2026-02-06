# How to Configure the Grafana Cloud Connector in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Grafana Cloud, Grafana, Observability

Description: Step-by-step guide to configuring the OpenTelemetry Collector to send traces, metrics, and logs to Grafana Cloud using native exporters.

Grafana Cloud is a popular observability platform that provides managed Prometheus, Loki, and Tempo services. The OpenTelemetry Collector can send all three telemetry signals to Grafana Cloud using native OTLP endpoints and protocol-specific exporters. This guide walks through the complete configuration process for integrating the OpenTelemetry Collector with Grafana Cloud.

## Prerequisites

Before configuring the OpenTelemetry Collector, you need to gather connection information from your Grafana Cloud account:

1. **Grafana Cloud Instance URL**: Your instance identifier (e.g., `yourinstance.grafana.net`)
2. **Prometheus Remote Write Endpoint**: For metrics ingestion
3. **Loki Endpoint**: For logs ingestion
4. **Tempo Endpoint**: For traces ingestion
5. **API Token**: For authentication (generate from Grafana Cloud Access Policies)

You can find these in the Grafana Cloud portal under "Details" for each service.

## Architecture Overview

The OpenTelemetry Collector acts as a centralized telemetry gateway that receives data from your applications and forwards it to Grafana Cloud services:

```mermaid
graph LR
    A[Applications] -->|OTLP| B[OTel Collector]
    B -->|Prometheus Remote Write| C[Grafana Cloud Prometheus]
    B -->|OTLP/HTTP| D[Grafana Cloud Tempo]
    B -->|Loki HTTP| E[Grafana Cloud Loki]
    C --> F[Grafana Dashboard]
    D --> F
    E --> F
```

## Complete Configuration for Grafana Cloud

Here's a comprehensive configuration that sends all three telemetry signals to Grafana Cloud:

```yaml
# OpenTelemetry Collector configuration for Grafana Cloud
receivers:
  # OTLP receiver for traces, metrics, and logs
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Prometheus receiver for scraping metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8888']

processors:
  # Batch processor for efficient sending
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

  # Add resource attributes for better organization
  resource:
    attributes:
      - key: service.instance.id
        from_attribute: host.name
        action: insert
      - key: deployment.environment
        value: production
        action: insert

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  # Prometheus Remote Write exporter for metrics
  prometheusremotewrite:
    endpoint: https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
    headers:
      authorization: Basic <base64-encoded-instance-id:api-token>
    resource_to_telemetry_conversion:
      enabled: true
    tls:
      insecure: false

  # OTLP HTTP exporter for traces to Tempo
  otlphttp/tempo:
    endpoint: https://tempo-prod-04-eu-west-0.grafana.net:443
    headers:
      authorization: Basic <base64-encoded-instance-id:api-token>
    compression: gzip
    tls:
      insecure: false

  # Loki exporter for logs
  loki:
    endpoint: https://logs-prod-eu-west-0.grafana.net/loki/api/v1/push
    headers:
      authorization: Basic <base64-encoded-instance-id:api-token>
    format: json
    labels:
      resource:
        service.name: "service_name"
        service.namespace: "service_namespace"
      attributes:
        level: "level"
    tls:
      insecure: false

service:
  pipelines:
    # Traces pipeline
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlphttp/tempo]

    # Metrics pipeline
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, resource, batch]
      exporters: [prometheusremotewrite]

    # Logs pipeline
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [loki]

  # Enable telemetry for the collector itself
  telemetry:
    logs:
      level: info
    metrics:
      address: 0.0.0.0:8888
```

## Authentication Configuration

Grafana Cloud uses basic authentication. You need to base64-encode your credentials in the format `instanceID:apiToken`:

```bash
# Generate base64-encoded credentials
echo -n "123456:glc_your_api_token_here" | base64
```

Replace `<base64-encoded-instance-id:api-token>` in the configuration with your encoded credentials. The header should look like:

```yaml
headers:
  authorization: Basic MTIzNDU2OmdsY195b3VyX2FwaV90b2tlbl9oZXJl
```

Alternatively, use environment variables for better security:

```yaml
exporters:
  prometheusremotewrite:
    endpoint: https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
    headers:
      authorization: Basic ${GRAFANA_CLOUD_AUTH}
    resource_to_telemetry_conversion:
      enabled: true

  otlphttp/tempo:
    endpoint: https://tempo-prod-04-eu-west-0.grafana.net:443
    headers:
      authorization: Basic ${GRAFANA_CLOUD_AUTH}
    compression: gzip

  loki:
    endpoint: https://logs-prod-eu-west-0.grafana.net/loki/api/v1/push
    headers:
      authorization: Basic ${GRAFANA_CLOUD_AUTH}
    format: json
```

Then set the environment variable before running the collector:

```bash
export GRAFANA_CLOUD_AUTH=$(echo -n "instanceID:apiToken" | base64)
./otelcol-contrib --config=grafana-cloud-config.yaml
```

## Optimizing Metrics Ingestion

Grafana Cloud Prometheus has specific requirements for metrics. Here's an optimized metrics configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Transform metrics for better compatibility
  metricstransform:
    transforms:
      - include: .*
        match_type: regexp
        action: update
        operations:
          # Add prefix to avoid naming conflicts
          - action: add_label
            new_label: otel_collector
            new_value: true

  # Filter out high-cardinality metrics
  filter/metrics:
    metrics:
      exclude:
        match_type: regexp
        metric_names:
          - .*_bucket
          - .*_count
          - .*_sum

  resource:
    attributes:
      - key: cluster
        value: production
        action: insert

exporters:
  prometheusremotewrite:
    endpoint: https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
    headers:
      authorization: Basic ${GRAFANA_CLOUD_AUTH}
    # Enable resource to metric label conversion
    resource_to_telemetry_conversion:
      enabled: true
    # Configure retry behavior
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    # Configure sending queue
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 1000
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, metricstransform, filter/metrics, batch]
      exporters: [prometheusremotewrite]
```

The `resource_to_telemetry_conversion` setting is crucial as it converts OpenTelemetry resource attributes into Prometheus labels, making your metrics queryable in Grafana.

## Configuring Logs with Loki

Loki has a unique approach to log ingestion, using labels for indexing. Here's an optimized logs configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Also accept logs via filelog receiver
  filelog:
    include:
      - /var/log/app/*.log
    start_at: beginning
    operators:
      # Parse JSON logs
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      # Extract severity
      - type: severity_parser
        parse_from: attributes.level

processors:
  batch:
    timeout: 10s

  # Add resource attributes for Loki labels
  resource:
    attributes:
      - key: loki.resource.labels
        value: service.name, service.namespace, deployment.environment
        action: insert

  # Transform log attributes
  attributes:
    actions:
      - key: level
        action: insert
        from_attribute: severity_text
      - key: job
        action: insert
        from_attribute: service.name

exporters:
  loki:
    endpoint: https://logs-prod-eu-west-0.grafana.net/loki/api/v1/push
    headers:
      authorization: Basic ${GRAFANA_CLOUD_AUTH}
    # Configure labels from resource and log attributes
    format: json
    labels:
      # Resource attributes become static labels
      resource:
        service.name: "service_name"
        service.namespace: "namespace"
        deployment.environment: "environment"
      # Log attributes become indexed labels
      attributes:
        level: "level"
        job: "job"
      # Log record attributes
      record:
        severity_text: "severity"
    # Configure retry and queue
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
    sending_queue:
      enabled: true
      num_consumers: 5
      queue_size: 500
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [resource, attributes, batch]
      exporters: [loki]
```

Be careful with Loki labels. Too many labels or high-cardinality labels can cause performance issues. Keep labels to low-cardinality identifiers like service name, environment, and severity level.

## Traces Configuration with Tempo

Tempo is Grafana Cloud's distributed tracing backend. Here's an optimized configuration:

```yaml
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

  # Add span metrics for RED metrics
  spanmetrics:
    metrics_exporter: prometheusremotewrite
    latency_histogram_buckets: [2ms, 4ms, 8ms, 16ms, 32ms, 64ms, 128ms, 256ms, 512ms, 1024ms, 2048ms, 4096ms, 8192ms]
    dimensions:
      - name: http.method
        default: GET
      - name: http.status_code
      - name: service.name

  # Sample traces if needed
  probabilistic_sampler:
    sampling_percentage: 100.0

  resource:
    attributes:
      - key: cluster
        value: production
        action: insert

exporters:
  # Tempo exporter
  otlphttp/tempo:
    endpoint: https://tempo-prod-04-eu-west-0.grafana.net:443
    headers:
      authorization: Basic ${GRAFANA_CLOUD_AUTH}
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    tls:
      insecure: false

  # Export span metrics to Prometheus
  prometheusremotewrite:
    endpoint: https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
    headers:
      authorization: Basic ${GRAFANA_CLOUD_AUTH}
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, probabilistic_sampler, spanmetrics, batch]
      exporters: [otlphttp/tempo]

    # Separate pipeline for span metrics
    metrics/spanmetrics:
      receivers: [spanmetrics]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

The `spanmetrics` processor is particularly valuable as it generates RED (Rate, Errors, Duration) metrics from your traces, giving you automatic service-level metrics in Grafana Cloud Prometheus.

## Kubernetes Deployment

Here's a Kubernetes deployment manifest for the OpenTelemetry Collector configured for Grafana Cloud:

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
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
      resource:
        attributes:
          - key: k8s.cluster.name
            value: production-cluster
            action: insert

    exporters:
      prometheusremotewrite:
        endpoint: https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
        headers:
          authorization: Basic ${GRAFANA_CLOUD_AUTH}
        resource_to_telemetry_conversion:
          enabled: true

      otlphttp/tempo:
        endpoint: https://tempo-prod-04-eu-west-0.grafana.net:443
        headers:
          authorization: Basic ${GRAFANA_CLOUD_AUTH}
        compression: gzip

      loki:
        endpoint: https://logs-prod-eu-west-0.grafana.net/loki/api/v1/push
        headers:
          authorization: Basic ${GRAFANA_CLOUD_AUTH}
        format: json

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, resource, batch]
          exporters: [otlphttp/tempo]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, resource, batch]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, resource, batch]
          exporters: [loki]
---
apiVersion: v1
kind: Secret
metadata:
  name: grafana-cloud-credentials
  namespace: observability
type: Opaque
stringData:
  auth: <base64-encoded-credentials>
---
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
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.95.0
        args:
          - --config=/conf/config.yaml
        env:
        - name: GRAFANA_CLOUD_AUTH
          valueFrom:
            secretKeyRef:
              name: grafana-cloud-credentials
              key: auth
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        volumeMounts:
        - name: config
          mountPath: /conf
        resources:
          requests:
            memory: 256Mi
            cpu: 200m
          limits:
            memory: 512Mi
            cpu: 500m
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
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

## Monitoring and Validation

After deploying the collector, verify data is flowing to Grafana Cloud:

1. **Check Collector Logs**: Look for successful export messages
2. **Query Prometheus**: In Grafana, verify metrics are arriving
3. **Check Tempo**: Search for traces in the Tempo UI
4. **Validate Loki**: Query logs using LogQL in Grafana

Monitor the collector's own metrics at the `/metrics` endpoint (default port 8888) to track export success rates and errors.

## Related Resources

For more information on OpenTelemetry Collector deployment patterns:

- [How to Deploy the OpenTelemetry Collector as a Gateway](https://oneuptime.com/blog/post/deploy-opentelemetry-collector-gateway/view)
- [How to Deploy the OpenTelemetry Collector as a DaemonSet in Kubernetes](https://oneuptime.com/blog/post/deploy-opentelemetry-collector-daemonset-kubernetes/view)

Configuring the OpenTelemetry Collector to send data to Grafana Cloud provides a vendor-neutral approach to observability while leveraging Grafana's powerful visualization and analysis capabilities. The native OTLP support in Tempo and the mature Prometheus and Loki exporters make this integration seamless and performant.
