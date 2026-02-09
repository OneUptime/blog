# How to Configure the OpenTelemetry Collector for Chronosphere Ingestion with Service Account Authentication and Endpoint Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Chronosphere, Service Account Auth

Description: Set up the OpenTelemetry Collector to export to Chronosphere using service account authentication with endpoint routing per signal type.

Chronosphere uses service accounts for machine-to-machine authentication. When configuring the OpenTelemetry Collector to send data to Chronosphere, you authenticate using a service account token and route different signal types to their appropriate ingestion endpoints.

## Basic Collector Configuration

```yaml
# otel-collector-chronosphere.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Scrape Prometheus endpoints and forward to Chronosphere
  prometheus:
    config:
      scrape_configs:
        - job_name: "application-metrics"
          scrape_interval: 15s
          static_configs:
            - targets: ["app-server:8080"]

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

  # Ensure consistent resource attributes
  resource:
    attributes:
      - key: chronosphere.tenant
        value: "${CHRONOSPHERE_TENANT}"
        action: upsert
      - key: deployment.environment
        value: "production"
        action: upsert

  # Filter to reduce cardinality
  filter/metrics:
    metrics:
      exclude:
        match_type: regexp
        metric_names:
          # Exclude high-cardinality internal metrics
          - "go_.*"
          - "process_.*"

exporters:
  otlp/chronosphere:
    endpoint: "${CHRONOSPHERE_TENANT}.chronosphere.io:443"
    headers:
      API-Token: "${CHRONOSPHERE_SERVICE_ACCOUNT_TOKEN}"
    compression: snappy

    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

    timeout: 30s

service:
  pipelines:
    metrics:
      receivers: [otlp, prometheus]
      processors: [filter/metrics, resource, batch]
      exporters: [otlp/chronosphere]

    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/chronosphere]
```

## Service Account Setup

Create a Chronosphere service account and retrieve the token:

```bash
# Using the Chronosphere CLI (chronoctl)
chronoctl service-accounts create \
  --name "otel-collector" \
  --description "OpenTelemetry Collector ingestion" \
  --permissions "metrics:write,traces:write"
```

Store the token as a Kubernetes secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: chronosphere-credentials
  namespace: observability
type: Opaque
stringData:
  service-account-token: "sa_your_service_account_token_here"
  tenant: "your-company"
```

## Multi-Endpoint Routing

If Chronosphere provides separate endpoints for different signal types:

```yaml
exporters:
  otlp/chronosphere-metrics:
    endpoint: "${CHRONOSPHERE_TENANT}.chronosphere.io:443"
    headers:
      API-Token: "${CHRONOSPHERE_SERVICE_ACCOUNT_TOKEN}"
    compression: snappy
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s

  otlp/chronosphere-traces:
    endpoint: "${CHRONOSPHERE_TENANT}.chronosphere.io:443"
    headers:
      API-Token: "${CHRONOSPHERE_SERVICE_ACCOUNT_TOKEN}"
    compression: snappy
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s

service:
  pipelines:
    metrics:
      receivers: [otlp, prometheus]
      processors: [filter/metrics, resource, batch]
      exporters: [otlp/chronosphere-metrics]

    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/chronosphere-traces]
```

## Cardinality Management

Chronosphere puts a strong emphasis on cardinality control. Configure processors to manage this:

```yaml
processors:
  # Remove attributes that cause cardinality explosion
  attributes/cardinality:
    actions:
      # Remove high-cardinality attributes before export
      - key: http.url
        action: delete
      - key: db.statement
        action: delete
      # Replace with lower-cardinality versions
      - key: http.route
        from_attribute: http.url
        action: upsert

  # Aggregate metrics to reduce cardinality
  metricstransform:
    transforms:
      - include: http_server_duration
        action: update
        operations:
          # Remove high-cardinality labels
          - action: delete_label_value
            label: http.user_agent
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-chronosphere
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
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          env:
            - name: CHRONOSPHERE_TENANT
              valueFrom:
                secretKeyRef:
                  name: chronosphere-credentials
                  key: tenant
            - name: CHRONOSPHERE_SERVICE_ACCOUNT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: chronosphere-credentials
                  key: service-account-token
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 8888
              name: metrics
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-collector-chronosphere-config
```

## Monitoring the Pipeline

Watch these Collector metrics to ensure data is flowing to Chronosphere:

```promql
# Export success rate
rate(otelcol_exporter_sent_metric_points_total{exporter="otlp/chronosphere"}[5m])

# Failed exports (should trigger alerts if non-zero)
rate(otelcol_exporter_send_failed_metric_points_total{exporter="otlp/chronosphere"}[5m])

# Queue utilization
otelcol_exporter_queue_size{exporter="otlp/chronosphere"}

# Active series being exported
otelcol_exporter_sent_metric_points_total{exporter="otlp/chronosphere"}
```

This setup gives you a reliable pipeline from your applications and infrastructure to Chronosphere, with proper authentication, compression, retry handling, and cardinality management. The service account token keeps authentication secure and rotatable without touching application code.
