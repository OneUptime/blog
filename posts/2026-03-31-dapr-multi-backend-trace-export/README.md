# How to Configure Multi-Backend Trace Export for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, OpenTelemetry, Multi-Backend, Observability

Description: Configure Dapr to export traces to multiple observability backends simultaneously using the OpenTelemetry Collector fan-out pipeline.

---

## Why Multi-Backend Trace Export

Organizations often need traces in multiple systems: a compliance-oriented backend for long-term retention, a developer-facing tool for debugging, and an alerting backend for SLO monitoring. The OpenTelemetry Collector's multi-exporter pipeline makes this possible without changing Dapr configuration.

## Collector Fan-Out Architecture

```text
Dapr Sidecar (OTLP) --> OTel Collector --> Jaeger (internal debugging)
                                       --> Tempo (long-term storage)
                                       --> Honeycomb (developer analysis)
```

## Collector Configuration

Define multiple exporters and reference them all in a single pipeline:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 5s
        send_batch_size: 512
      tail_sampling:
        decision_wait: 10s
        policies:
          - name: always-errors
            type: status_code
            status_code: {status_codes: [ERROR]}
          - name: probabilistic
            type: probabilistic
            probabilistic: {sampling_percentage: 10}

    exporters:
      # Internal Jaeger for developer debugging (Jaeger supports OTLP natively)
      otlp/jaeger:
        endpoint: jaeger.monitoring:4317
        tls:
          insecure: true

      # Grafana Tempo for long-term storage
      otlp/tempo:
        endpoint: tempo.monitoring:4317
        tls:
          insecure: true

      # Honeycomb for analysis
      otlp/honeycomb:
        endpoint: api.honeycomb.io:443
        headers:
          x-honeycomb-team: "${HONEYCOMB_API_KEY}"
          x-honeycomb-dataset: dapr-traces

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, tail_sampling]
          exporters: [otlp/jaeger, otlp/tempo, otlp/honeycomb]
```

## Separate Pipelines per Backend

For fine-grained control, define separate pipelines with different processors:

```yaml
service:
  pipelines:
    # All traces to internal Jaeger
    traces/debug:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]

    # Sampled traces to Tempo (cheaper storage)
    traces/longterm:
      receivers: [otlp]
      processors: [batch, tail_sampling]
      exporters: [otlp/tempo]

    # High-priority traces to Honeycomb
    traces/analysis:
      receivers: [otlp]
      processors: [batch, tail_sampling]
      exporters: [otlp/honeycomb]
```

## Dapr Configuration

A single Dapr configuration points to the collector:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-multi-backend
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

## Storing Secrets

```bash
kubectl create secret generic otel-collector-secrets \
  --from-literal=HONEYCOMB_API_KEY=YOUR_KEY \
  -n monitoring

# Mount in collector deployment
kubectl set env deployment/otel-collector \
  --from=secret/otel-collector-secrets \
  -n monitoring
```

## Health Checking the Collector

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
```

```bash
# Verify all exporters are healthy
curl http://otel-collector.monitoring:13133/ | jq '.status'
```

## Summary

Multi-backend trace export in Dapr is implemented entirely at the OpenTelemetry Collector layer - Dapr itself only needs a single OTLP endpoint. Define multiple named exporters in the collector config and list them all in the `exporters` array of the pipeline. Use separate pipelines with different sampling processors to control cost per backend while ensuring errors always reach all backends.
