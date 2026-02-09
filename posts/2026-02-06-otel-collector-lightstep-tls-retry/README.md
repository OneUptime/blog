# How to Configure the OpenTelemetry Collector to Export Traces to Lightstep with TLS and Retry Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Lightstep, TLS Configuration

Description: Set up the OpenTelemetry Collector to export traces to Lightstep with proper TLS configuration, retry policies, and queue management.

When using the OpenTelemetry Collector as a gateway to Lightstep (ServiceNow Cloud Observability), you want proper TLS, retry policies, and queue management. This ensures telemetry data reaches Lightstep reliably even during transient network failures.

## Basic Collector Configuration for Lightstep

```yaml
# otel-collector-lightstep.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 512
    send_batch_max_size: 1024

  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert

exporters:
  otlp/lightstep:
    endpoint: "ingest.lightstep.com:443"
    headers:
      "lightstep-access-token": "${LIGHTSTEP_ACCESS_TOKEN}"

    # TLS is mandatory for Lightstep
    tls:
      # Use system certificate pool
      insecure: false
      # Optionally specify a custom CA certificate
      # ca_file: /etc/ssl/certs/ca-certificates.crt

    # Retry configuration for transient failures
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s

    # Queue to buffer data during export failures
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
      storage: null

    # Timeout per export batch
    timeout: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/lightstep]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/lightstep]
```

## TLS Configuration Options

For environments where you need custom TLS settings:

```yaml
exporters:
  otlp/lightstep:
    endpoint: "ingest.lightstep.com:443"
    headers:
      "lightstep-access-token": "${LIGHTSTEP_ACCESS_TOKEN}"

    tls:
      # Do not skip TLS verification (never set this to true in production)
      insecure: false
      insecure_skip_verify: false

      # Custom CA certificate (useful in corporate environments with proxy CAs)
      ca_file: /etc/ssl/certs/corporate-ca.pem

      # Mutual TLS (if Lightstep requires client certificates)
      # cert_file: /etc/certs/client.crt
      # key_file: /etc/certs/client.key

      # Minimum TLS version
      min_version: "1.2"
```

## Advanced Retry Configuration

```yaml
exporters:
  otlp/lightstep:
    endpoint: "ingest.lightstep.com:443"
    headers:
      "lightstep-access-token": "${LIGHTSTEP_ACCESS_TOKEN}"

    retry_on_failure:
      enabled: true
      # Wait 1 second before the first retry
      initial_interval: 1s
      # Double the wait time each retry, up to this maximum
      max_interval: 30s
      # Give up after 5 minutes of retrying
      max_elapsed_time: 300s
      # Randomization factor to avoid thundering herd
      randomization_factor: 0.5
      # Multiplier for exponential backoff
      multiplier: 1.5

    sending_queue:
      enabled: true
      # Number of parallel export workers
      num_consumers: 10
      # Maximum items in the queue (traces or metric data points)
      queue_size: 10000
      # Use persistent storage to survive collector restarts
      storage: file_storage

extensions:
  file_storage:
    directory: /var/lib/otelcol/queue
    timeout: 10s

service:
  extensions: [file_storage]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/lightstep]
```

## Monitoring the Export Pipeline

Add the Collector's internal telemetry to monitor the export pipeline health:

```yaml
service:
  telemetry:
    logs:
      level: info
    metrics:
      address: 0.0.0.0:8888
      level: detailed
```

Key metrics to watch:

```promql
# Export failures (should be zero most of the time)
rate(otelcol_exporter_send_failed_spans_total[5m])

# Queue utilization (approaching queue_size means you are losing data)
otelcol_exporter_queue_size

# Retry attempts
rate(otelcol_exporter_send_retries_total[5m])

# Successful exports
rate(otelcol_exporter_sent_spans_total[5m])
```

## Load Balancing Multiple Collectors

For high-volume deployments, run multiple Collector instances behind a load balancer:

```yaml
# Kubernetes deployment with multiple replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-lightstep
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          env:
            - name: LIGHTSTEP_ACCESS_TOKEN
              valueFrom:
                secretKeyRef:
                  name: lightstep-credentials
                  key: access-token
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
```

## Troubleshooting

If data is not reaching Lightstep, check these things:

1. TLS certificate issues: Make sure the system CA certificates are available in the container
2. Access token: Verify the token is valid and not expired
3. Network connectivity: Ensure the Collector can reach `ingest.lightstep.com:443`
4. Queue overflow: Check `otelcol_exporter_queue_size` to see if the queue is full

```bash
# Test connectivity from the Collector container
curl -v https://ingest.lightstep.com:443

# Check Collector logs for export errors
docker logs otel-collector 2>&1 | grep -i "error\|failed\|retry"
```

This configuration gives you a production-ready Collector pipeline to Lightstep with resilience against network failures, proper TLS security, and monitoring of the pipeline itself.
