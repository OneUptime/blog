# How to implement OpenTelemetry Collector exporters to multiple backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Exporters, Monitoring, Integration

Description: Configure OpenTelemetry Collector exporters to send telemetry to multiple backends including Prometheus, Jaeger, Grafana, OneUptime, and cloud providers with load balancing and failover strategies.

---

Exporters send processed telemetry data from the OpenTelemetry Collector to backend systems. The collector supports sending data to multiple destinations simultaneously, enabling vendor-neutral observability and gradual migrations. This guide covers configuring exporters for common backends and implementing reliability patterns like retries and load balancing.

## Understanding Exporter Types

Exporters come in different types based on the signal they handle. Some exporters are signal-specific (prometheus for metrics only, jaeger for traces only), while others are universal (OTLP supports traces, metrics, and logs). Most production deployments use multiple exporters to send data to different backends based on team preferences or specific tooling requirements.

Exporters support various reliability features including retry logic, queue management, and batch processing. Understanding these features helps you configure exporters that handle backpressure and network issues gracefully without losing data.

## Configuring OTLP Exporters

OTLP exporters send data to backends that support the OpenTelemetry protocol:

```yaml
exporters:
  otlp/oneuptime:
    endpoint: oneuptime.com:443
    headers:
      "x-oneuptime-api-key": "${env:ONEUPTIME_API_KEY}"
    compression: gzip
    timeout: 30s
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
      ca_file: /certs/ca.crt
      cert_file: /certs/client.crt
      key_file: /certs/client.key

  otlp/jaeger:
    endpoint: jaeger-collector:4317
    tls:
      insecure: true
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
    sending_queue:
      enabled: true
      num_consumers: 5
      queue_size: 1000

  otlp/grafana-cloud:
    endpoint: otlp-gateway-prod-us-central-0.grafana.net:443
    headers:
      authorization: "Basic ${env:GRAFANA_CLOUD_AUTH}"
    compression: gzip
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/oneuptime, otlp/jaeger, otlp/grafana-cloud]
    metrics:
      receivers: [otlp]
      exporters: [otlp/oneuptime, otlp/grafana-cloud]
```

Store credentials securely:

```bash
kubectl create secret generic otel-exporter-secrets -n observability \
  --from-literal=oneuptime-api-key='your-key' \
  --from-literal=grafana-cloud-auth='your-token'

# Reference in deployment
env:
- name: ONEUPTIME_API_KEY
  valueFrom:
    secretKeyRef:
      name: otel-exporter-secrets
      key: oneuptime-api-key
```

## Configuring Prometheus Remote Write

Export metrics to Prometheus-compatible backends:

```yaml
exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 5s
      max_elapsed_time: 60s
    resource_to_telemetry_conversion:
      enabled: true
    target_info:
      enabled: true
    add_metric_suffixes: true
    headers:
      X-Scope-OrgID: "tenant-1"

  prometheusremotewrite/mimir:
    endpoint: https://mimir.example.com/api/v1/push
    headers:
      Authorization: "Bearer ${env:MIMIR_TOKEN}"
    tls:
      insecure_skip_verify: false
    external_labels:
      cluster: production
      region: us-east-1

  prometheusremotewrite/victoria:
    endpoint: http://victoria-metrics:8428/api/v1/write
    timeout: 10s

processors:
  batch:
    timeout: 10s
    send_batch_size: 1000

service:
  pipelines:
    metrics:
      receivers: [otlp, prometheus]
      processors: [batch]
      exporters: [prometheusremotewrite, prometheusremotewrite/mimir, prometheusremotewrite/victoria]
```

## Configuring Jaeger Exporter

Export traces specifically to Jaeger:

```yaml
exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      insecure: false
      ca_file: /certs/ca.crt
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 2000

service:
  pipelines:
    traces:
      receivers: [otlp, jaeger, zipkin]
      exporters: [jaeger]
```

## Configuring Cloud Provider Exporters

Send data to cloud-native backends:

### AWS CloudWatch

```yaml
exporters:
  awscloudwatch:
    region: us-east-1
    log_group_name: /aws/otel/application
    log_stream_name: application-logs
    role_arn: arn:aws:iam::123456789012:role/OTelCollectorRole
    namespace: ApplicationMetrics
    metric_declarations:
    - dimensions:
      - - service
        - operation
      metric_name_selectors:
      - latency_*
      - request_*

  awsxray:
    region: us-east-1
    role_arn: arn:aws:iam::123456789012:role/OTelCollectorRole
    index_all_attributes: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [awsxray]
    metrics:
      receivers: [otlp]
      exporters: [awscloudwatch]
```

### Google Cloud Operations

```yaml
exporters:
  googlecloud:
    project: my-gcp-project
    metric:
      prefix: custom.googleapis.com
      skip_create_descriptor: false
      instrumentation_library_labels: true
      service_resource_labels: true
    trace:
      endpoint: cloudtrace.googleapis.com:443
    log:
      default_log_name: otel-collector
    retry_on_failure:
      enabled: true
    resource_filters:
    - prefix: "k8s."
    - prefix: "cloud."

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [googlecloud]
    metrics:
      receivers: [otlp]
      exporters: [googlecloud]
```

### Azure Monitor

```yaml
exporters:
  azuremonitor:
    instrumentation_key: "${env:AZURE_INSTRUMENTATION_KEY}"
    endpoint: https://dc.services.visualstudio.com/v2/track
    max_batch_size: 1024
    max_batch_interval: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [azuremonitor]
```

## Configuring Kafka Exporter

Send telemetry to Kafka for further processing:

```yaml
exporters:
  kafka:
    protocol_version: 2.8.0
    brokers:
    - kafka-1:9092
    - kafka-2:9092
    - kafka-3:9092
    topic: otel-traces
    encoding: otlp_proto
    auth:
      sasl:
        username: otel-producer
        password: ${env:KAFKA_PASSWORD}
        mechanism: SCRAM-SHA-512
      tls:
        insecure: false
        ca_file: /certs/ca.crt
        cert_file: /certs/client.crt
        key_file: /certs/client.key
    metadata:
      full: true
      retry:
        max: 3
        backoff: 100ms
    producer:
      compression: gzip
      max_message_bytes: 1048576
      required_acks: 1
      flush_max_messages: 100

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [kafka]
```

## Implementing Load Balancing Exporter

Distribute load across multiple backend instances:

```yaml
exporters:
  loadbalancing:
    protocol:
      otlp:
        timeout: 1s
        insecure: true
    resolver:
      static:
        hostnames:
        - otel-backend-1:4317
        - otel-backend-2:4317
        - otel-backend-3:4317
      dns:
        hostname: otel-backends.svc.cluster.local
        port: 4317
        interval: 5m
        timeout: 1m

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [loadbalancing]
```

## Configuring File Exporter for Testing

Export to files for development and debugging:

```yaml
exporters:
  file:
    path: /var/log/otel/traces.json
    rotation:
      max_megabytes: 100
      max_days: 3
      max_backups: 3
      localtime: true
    format: json
    compression: gzip

  file/metrics:
    path: /var/log/otel/metrics.json
    rotation:
      max_megabytes: 100
      max_days: 3

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [file]
    metrics:
      receivers: [otlp]
      exporters: [file/metrics]
```

Mount a persistent volume for file storage:

```yaml
volumes:
- name: otel-logs
  persistentVolumeClaim:
    claimName: otel-logs-pvc
volumeMounts:
- name: otel-logs
  mountPath: /var/log/otel
```

## Implementing Exporter Failover

Use routing processor for failover between exporters:

```yaml
processors:
  routing:
    default_exporters:
    - otlp/primary
    error_mode: propagate
    table:
    - statement: route()
      exporters:
      - otlp/primary
      - otlp/backup

exporters:
  otlp/primary:
    endpoint: primary-backend:4317
    retry_on_failure:
      enabled: true
      max_elapsed_time: 60s

  otlp/backup:
    endpoint: backup-backend:4317
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [routing]
      exporters: [otlp/primary, otlp/backup]
```

## Monitoring Exporter Health

Track exporter metrics:

```bash
# View exporter metrics
kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep exporter

# Key metrics:
# otelcol_exporter_sent_spans - Successfully sent spans
# otelcol_exporter_send_failed_spans - Failed sends
# otelcol_exporter_queue_size - Current queue size
# otelcol_exporter_queue_capacity - Max queue capacity
```

Create alerts for exporter issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: otel-exporter-alerts
  namespace: observability
spec:
  groups:
  - name: otel-exporters
    interval: 30s
    rules:
    - alert: OTelExporterHighFailureRate
      expr: |
        rate(otelcol_exporter_send_failed_spans[5m]) /
        rate(otelcol_exporter_sent_spans[5m]) > 0.05
      for: 5m
      annotations:
        summary: "High failure rate for OTel exporter"
        description: "Exporter {{ $labels.exporter }} has >5% failure rate"

    - alert: OTelExporterQueueFull
      expr: |
        otelcol_exporter_queue_size / otelcol_exporter_queue_capacity > 0.9
      for: 2m
      annotations:
        summary: "OTel exporter queue nearly full"
        description: "Exporter {{ $labels.exporter }} queue is >90% full"
```

## Troubleshooting Exporters

Debug exporter issues:

```bash
# Check exporter connectivity
kubectl exec -n observability deployment/otel-collector -- \
  curl -v http://prometheus:9090/-/healthy

# Test OTLP endpoint
kubectl exec -n observability deployment/otel-collector -- \
  grpcurl -plaintext otel-backend:4317 list

# Enable debug logging for specific exporter
# Edit config to add:
exporters:
  otlp/primary:
    endpoint: backend:4317
    sending_queue:
      enabled: true
      queue_size: 5000
    debug:
      verbosity: detailed

# View detailed logs
kubectl logs -n observability -l app=otel-collector -f | grep "exporter.*error"
```

OpenTelemetry Collector exporters provide flexible data routing to multiple backends simultaneously. By configuring appropriate retry logic, queue management, and monitoring, you build resilient pipelines that handle failures gracefully while maintaining vendor neutrality and supporting gradual migrations between observability platforms.
