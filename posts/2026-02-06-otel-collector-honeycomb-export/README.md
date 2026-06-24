# How to Configure the OpenTelemetry Collector to Export Data to Honeycomb with

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Honeycomb, Dataset Routing

Description: Configure the OpenTelemetry Collector to export traces, metrics, and logs to Honeycomb with per-signal dataset routing and team tokens.

Running the OpenTelemetry Collector as a gateway between your services and Honeycomb gives you centralized control over routing, sampling, and enrichment. You can route metrics, and optionally logs or Honeycomb Classic traces, to specific Honeycomb datasets and manage team tokens in one place.

## Basic Collector Configuration

```yaml
# otel-collector-honeycomb.yaml

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

  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

exporters:
  otlp/honeycomb-traces:
    endpoint: "api.honeycomb.io:443"
    headers:
      "x-honeycomb-team": "${HONEYCOMB_API_KEY}"

  otlp/honeycomb-metrics:
    endpoint: "api.honeycomb.io:443"
    headers:
      "x-honeycomb-team": "${HONEYCOMB_API_KEY}"
      "x-honeycomb-dataset": "metrics"

  otlp/honeycomb-logs:
    endpoint: "api.honeycomb.io:443"
    headers:
      "x-honeycomb-team": "${HONEYCOMB_API_KEY}"
      # If OTLP logs include service.name, Honeycomb uses that instead of this header.
      "x-honeycomb-dataset": "logs"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/honeycomb-traces]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/honeycomb-metrics]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/honeycomb-logs]
```

## Multi-Team Routing

If you have multiple Honeycomb teams (for example, separate teams for production and staging), route data based on attributes:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s

connectors:
  # Route to different teams based on environment
  routing:
    default_pipelines: [traces/prod]
    table:
      - context: resource
        condition: attributes["deployment.environment"] == "production"
        pipelines: [traces/prod]
      - context: resource
        condition: attributes["deployment.environment"] == "staging"
        pipelines: [traces/staging]

exporters:
  otlp/honeycomb-prod:
    endpoint: "api.honeycomb.io:443"
    headers:
      "x-honeycomb-team": "${HONEYCOMB_PROD_API_KEY}"

  otlp/honeycomb-staging:
    endpoint: "api.honeycomb.io:443"
    headers:
      "x-honeycomb-team": "${HONEYCOMB_STAGING_API_KEY}"

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      processors: [batch]
      exporters: [routing]
    traces/prod:
      receivers: [routing]
      exporters: [otlp/honeycomb-prod]
    traces/staging:
      receivers: [routing]
      exporters: [otlp/honeycomb-staging]
```

## Adding Sampling Before Honeycomb

Honeycomb charges based on event volume, so tail sampling can significantly reduce costs:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    policies:
      # Always keep traces with errors
      - name: errors-policy
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Always keep slow traces
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 1000

      # Sample 10% of everything else
      - name: default-sampling
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp/honeycomb-traces]
```

## Enriching Data for Honeycomb

Add attributes that are useful for Honeycomb queries:

```yaml
processors:
  attributes:
    actions:
      # Add Kubernetes metadata
      - key: k8s.cluster.name
        value: "prod-us-east-1"
        action: upsert

  transform:
    error_mode: ignore
    trace_statements:
      # Add a human-readable duration field
      - set(span.attributes["duration_ms"], (span.end_time_unix_nano - span.start_time_unix_nano) / 1000000)
```

## Docker Compose Deployment

```yaml
version: "3.8"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      - HONEYCOMB_API_KEY=${HONEYCOMB_API_KEY}
    ports:
      - "4317:4317"
      - "4318:4318"
    volumes:
      - ./otel-collector-honeycomb.yaml:/etc/otelcol-contrib/config.yaml
    command: ["--config", "/etc/otelcol-contrib/config.yaml"]
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
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
          env:
            - name: HONEYCOMB_API_KEY
              valueFrom:
                secretKeyRef:
                  name: honeycomb-credentials
                  key: api-key
          ports:
            - containerPort: 4317
            - containerPort: 4318
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
---
apiVersion: v1
kind: Secret
metadata:
  name: honeycomb-credentials
type: Opaque
stringData:
  api-key: "your-honeycomb-api-key"
```

Running the Collector as a gateway to Honeycomb gives you a single place to manage API keys, control sampling rates, and route data to the right datasets. Your application code stays clean with standard OTLP exports, and all the Honeycomb-specific configuration lives in the Collector.
