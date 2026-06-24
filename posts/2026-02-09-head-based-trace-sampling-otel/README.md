# How to Use Head-Based Trace Sampling Strategies in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Tracing

Description: Configure head-based sampling in the OpenTelemetry Collector to reduce trace volume in Kubernetes while maintaining observability through probabilistic, rate-limiting, and attribute-based sampling.

---

Tracing every request in production generates massive data volumes, overwhelming storage and increasing costs. Head-based sampling makes the sampling decision early, without inspecting the complete trace. When it is configured in application SDKs, it can reduce data at the source; when it is configured in the OpenTelemetry Collector with the probabilistic sampler, it reduces data before export. While simpler than tail-based sampling, head-based strategies can reduce trace volume by 90% or more when configured properly.

This guide covers implementing head-based sampling strategies in the OpenTelemetry Collector for Kubernetes.

## Understanding Head-Based Sampling

Head-based sampling decides whether to record or export telemetry early in the trace collection pipeline. The decision is made early (at the "head" of the trace) without seeing the complete trace.

**Advantages**:
- Low resource overhead
- Consistent sampling across services
- Simple to implement and understand
- Reduces network and storage costs

**Disadvantages**:
- May miss interesting traces (errors, slow requests)
- Decision made without complete context
- All-or-nothing per trace

## Probabilistic Sampling

Sample a fixed percentage of traces:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: tracing
data:
  collector.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      # Probabilistic sampling: 10% of traces
      probabilistic_sampler:
        sampling_percentage: 10.0

      batch:
        timeout: 10s
        send_batch_size: 1024

    exporters:
      otlp:
        endpoint: tempo.tracing.svc.cluster.local:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [probabilistic_sampler, batch]
          exporters: [otlp]
```

Deploy the collector:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: tracing
spec:
  replicas: 3
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
        image: otel/opentelemetry-collector-contrib:0.153.0
        args:
        - --config=/etc/otel/collector.yaml
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        resources:
          requests:
            memory: 512Mi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 2000m
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

## Rate-Limiting Sampling

The Collector's built-in rate-limiting sampling policy is part of the tail sampling processor, not the probabilistic head sampler. Use it when you need a hard spans-per-second cap, and make sure all spans for a given trace reach the same collector instance:

```yaml
processors:
  # Sample max 100 spans/sec for this collector pipeline
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
    - name: rate_limiting
      type: rate_limiting
      rate_limiting:
        spans_per_second: 100

  memory_limiter:
    check_interval: 1s
    limit_mib: 512

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp]
```

## Attribute-Based Sampling

Sample based on span attributes:

```yaml
processors:
  # Raise sampling priority for spans that must be kept
  transform/sampling_priority:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["sampling.priority"], 1) where span.attributes["http.status_code"] >= 400
      - set(span.attributes["sampling.priority"], 1) where span.attributes["http.duration_ms"] > 1000
      - set(span.attributes["sampling.priority"], 1) where resource.attributes["service.name"] == "payment-service"

  probabilistic_sampler:
    hash_seed: 22
    sampling_percentage: 10.0

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/sampling_priority, probabilistic_sampler, batch]
      exporters: [otlp]
```

## Service-Specific Sampling Rates

Configure different rates per service:

```yaml
connectors:
  # Route by service name
  routing:
    default_pipelines: [traces/medium]
    error_mode: ignore
    table:
      - context: resource
        condition: 'attributes["service.name"] == "frontend"'
        pipelines: [traces/high]
      - context: resource
        condition: 'attributes["service.name"] == "payment-service"'
        pipelines: [traces/high]
      - context: resource
        condition: 'attributes["service.name"] == "worker"'
        pipelines: [traces/low]

processors:
  probabilistic_sampler/high:
    sampling_percentage: 50.0

  probabilistic_sampler/medium:
    sampling_percentage: 20.0

  probabilistic_sampler/low:
    sampling_percentage: 5.0

  batch:

exporters:
  otlp/high_sample:
    endpoint: tempo:4317
  otlp/medium_sample:
    endpoint: tempo:4317
  otlp/low_sample:
    endpoint: tempo:4317

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      exporters: [routing]

    traces/high:
      receivers: [routing]
      processors: [probabilistic_sampler/high, batch]
      exporters: [otlp/high_sample]

    traces/medium:
      receivers: [routing]
      processors: [probabilistic_sampler/medium, batch]
      exporters: [otlp/medium_sample]

    traces/low:
      receivers: [routing]
      processors: [probabilistic_sampler/low, batch]
      exporters: [otlp/low_sample]
```

## Parent-Based Sampling

Parent-based sampling is configured in the application SDK, where child spans can inherit the parent span's sampling decision. In the Collector, use deterministic trace-ID sampling with the same `hash_seed` across collectors to keep sampling decisions consistent:

```yaml
processors:
  # Consistent TraceID-based sampler
  probabilistic_sampler:
    sampling_percentage: 10.0
    hash_seed: 22

  # Attributes processor to add sampling metadata
  attributes:
    actions:
      - key: sampling.rule
        action: insert
        value: probabilistic_10pct

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [probabilistic_sampler, attributes, batch]
      exporters: [otlp]
```

## Critical Path Sampling

Always sample important operations:

```yaml
processors:
  transform/critical:
    error_mode: ignore
    trace_statements:
      # Always sample these critical operations
      - set(span.attributes["sampling.priority"], 1) where span.attributes["operation"] == "checkout"
      - set(span.attributes["sampling.priority"], 1) where span.attributes["operation"] == "payment"
      - set(span.attributes["sampling.priority"], 1) where span.attributes["operation"] == "order_placed"
      - set(span.attributes["sampling.priority"], 1) where resource.attributes["service.name"] == "auth-service"

  probabilistic_sampler:
    sampling_percentage: 10.0

exporters:
  otlp:
    endpoint: tempo:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/critical, probabilistic_sampler, batch]
      exporters: [otlp]
```

## Environment-Based Sampling

Different sampling for different environments:

```yaml
connectors:
  routing:
    default_pipelines: [traces/dev]
    error_mode: ignore
    table:
      - context: resource
        condition: 'attributes["deployment.environment"] == "production"'
        pipelines: [traces/prod]
      - context: resource
        condition: 'attributes["deployment.environment"] == "staging"'
        pipelines: [traces/staging]
      - context: resource
        condition: 'attributes["deployment.environment"] == "development"'
        pipelines: [traces/dev]

processors:
  probabilistic_sampler/production:
    sampling_percentage: 5.0

  probabilistic_sampler/staging:
    sampling_percentage: 25.0

  probabilistic_sampler/development:
    sampling_percentage: 100.0

  batch:

exporters:
  otlp/prod:
    endpoint: tempo:4317
  otlp/staging:
    endpoint: tempo:4317
  otlp/dev:
    endpoint: tempo:4317

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      exporters: [routing]

    traces/prod:
      receivers: [routing]
      processors: [probabilistic_sampler/production, batch]
      exporters: [otlp/prod]

    traces/staging:
      receivers: [routing]
      processors: [probabilistic_sampler/staging, batch]
      exporters: [otlp/staging]

    traces/dev:
      receivers: [routing]
      processors: [probabilistic_sampler/development, batch]
      exporters: [otlp/dev]
```

## Monitoring Sampling Effectiveness

Track sampling metrics. If you scrape the Collector's default Prometheus endpoint, counter metrics usually include the `_total` suffix:

```promql
# Traces sampled vs total

rate(otelcol_processor_outgoing_items_total{processor="probabilistic_sampler"}[5m])
/
rate(otelcol_processor_incoming_items_total{processor="probabilistic_sampler"}[5m])

# Sampling rate by service
sum by (service_name) (rate(otelcol_exporter_sent_spans_total[5m]))

# Export failures
rate(otelcol_exporter_send_failed_spans_total[5m])
```

Create alerts for sampling issues:

```yaml
- alert: LowSamplingRate
  expr: |
    (rate(otelcol_processor_outgoing_items_total{processor="probabilistic_sampler"}[5m]) /
     rate(otelcol_processor_incoming_items_total{processor="probabilistic_sampler"}[5m])) < 0.01
  for: 10m
  annotations:
    summary: "Sampling rate below 1%"

- alert: HighExportFailureRate
  expr: |
    rate(otelcol_exporter_send_failed_spans_total[5m]) > 100
  for: 5m
  annotations:
    summary: "High span export failure rate detected"
```

## Best Practices

1. **Start with conservative rates**: Begin at 10-20% and adjust down
2. **Always sample errors**: Use SDK sampling or Collector sampling priority rules if errors are available before sampling; otherwise use tail sampling
3. **Monitor actual sampling rates**: Verify configuration matches expectations
4. **Consider user impact**: Sample user-facing services more aggressively
5. **Document sampling decisions**: Track why certain rates were chosen
6. **Review periodically**: Adjust as traffic patterns change
7. **Test in staging first**: Validate sampling before production deployment

## Calculating Appropriate Sampling Rates

```text
# Example calculation:
# Current trace rate: 10,000 traces/sec
# Target rate: 1,000 traces/sec
# Required sampling percentage: 10%

# Storage estimate:
# Average trace size: 50KB
# Traces per day: 1,000 * 86,400 = 86.4M
# Storage per day: 86.4M * 50KB = 4.32TB
# Monthly storage: ~130TB

# Adjust sampling to meet budget
```

## Conclusion

Head-based sampling in the OpenTelemetry Collector provides a straightforward way to control trace volume in Kubernetes. By combining probabilistic, attribute-based, and service-specific sampling strategies, you can reduce costs while maintaining visibility into important operations. Start with simple probabilistic sampling, monitor effectiveness, and progressively add more sophisticated rules as your understanding of trace patterns grows.
