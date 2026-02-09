# How to Implement Head-Based Trace Sampling Strategies in the OpenTelemetry Collector for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Tracing

Description: Configure head-based sampling in the OpenTelemetry Collector to reduce trace volume in Kubernetes while maintaining observability through probabilistic, rate-limiting, and attribute-based sampling.

---

Tracing every request in production generates massive data volumes, overwhelming storage and increasing costs. Head-based sampling makes the sampling decision at trace creation time, reducing data at the source. While simpler than tail-based sampling, head-based strategies can reduce trace volume by 90% or more when configured properly.

This guide covers implementing head-based sampling strategies in the OpenTelemetry Collector for Kubernetes.

## Understanding Head-Based Sampling

Head-based sampling decides whether to record a trace when it starts, propagating the decision through the entire distributed transaction. The decision is made early (at the "head" of the trace) without seeing the complete trace.

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
        image: otel/opentelemetry-collector-contrib:latest
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

Limit traces per second per service:

```yaml
processors:
  # Sample max 100 traces/sec per service
  tail_sampling:
    policies:
    - name: rate_limiting
      type: rate_limiting
      rate_limiting:
        spans_per_second: 100

  # Alternative: groupbytrace with rate limiting
  groupbytrace:
    wait_duration: 10s
    num_traces: 100000

  # Rate limiter processor
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, groupbytrace, tail_sampling, batch]
      exporters: [otlp]
```

## Attribute-Based Sampling

Sample based on span attributes:

```yaml
processors:
  # Attribute-based sampling rules
  filter:
    traces:
      span:
        # Always sample errors
        - 'attributes["http.status_code"] >= 400'
        # Always sample slow requests (>1s)
        - 'attributes["http.duration_ms"] > 1000'
        # Sample specific services at higher rate
        - 'resource.attributes["service.name"] == "payment-service"'

  # Probabilistic by attribute
  probabilistic_sampler:
    hash_seed: 22
    sampling_percentage: 10.0
    attribute_source: record  # Use span attributes in sampling decision

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter, probabilistic_sampler, batch]
      exporters: [otlp]
```

## Service-Specific Sampling Rates

Configure different rates per service:

```yaml
processors:
  # Route by service name
  routing:
    from_attribute: service.name
    table:
      - value: frontend
        exporters: [otlp/high_sample]
      - value: payment-service
        exporters: [otlp/high_sample]
      - value: worker
        exporters: [otlp/low_sample]
      default_exporters: [otlp/medium_sample]

  probabilistic_sampler/high:
    sampling_percentage: 50.0

  probabilistic_sampler/medium:
    sampling_percentage: 20.0

  probabilistic_sampler/low:
    sampling_percentage: 5.0

exporters:
  otlp/high_sample:
    endpoint: tempo:4317
  otlp/medium_sample:
    endpoint: tempo:4317
  otlp/low_sample:
    endpoint: tempo:4317

service:
  pipelines:
    traces/high:
      receivers: [otlp]
      processors: [probabilistic_sampler/high, batch]
      exporters: [otlp/high_sample]

    traces/medium:
      receivers: [otlp]
      processors: [probabilistic_sampler/medium, batch]
      exporters: [otlp/medium_sample]

    traces/low:
      receivers: [otlp]
      processors: [probabilistic_sampler/low, batch]
      exporters: [otlp/low_sample]
```

## Parent-Based Sampling

Respect upstream sampling decisions:

```yaml
processors:
  # Parent-based sampler
  probabilistic_sampler:
    sampling_percentage: 10.0
    # Hash algorithm ensures consistent sampling across distributed trace
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
  filter/critical:
    traces:
      span:
        # Always sample these critical operations
        - 'attributes["operation"] == "checkout"'
        - 'attributes["operation"] == "payment"'
        - 'attributes["operation"] == "order_placed"'
        - 'resource.attributes["service.name"] == "auth-service"'

  probabilistic_sampler:
    sampling_percentage: 10.0

  # Route critical and sampled separately
  routing:
    from_attribute: critical_path
    table:
      - value: "true"
        exporters: [otlp/critical]
    default_exporters: [otlp/sampled]

exporters:
  otlp/critical:
    endpoint: tempo:4317
  otlp/sampled:
    endpoint: tempo:4317

service:
  pipelines:
    traces/critical:
      receivers: [otlp]
      processors: [filter/critical, batch]
      exporters: [otlp/critical]

    traces/sampled:
      receivers: [otlp]
      processors: [probabilistic_sampler, batch]
      exporters: [otlp/sampled]
```

## Environment-Based Sampling

Different sampling for different environments:

```yaml
processors:
  attributes:
    actions:
      - key: environment
        from_attribute: deployment.environment
        action: upsert

  probabilistic_sampler/production:
    sampling_percentage: 5.0

  probabilistic_sampler/staging:
    sampling_percentage: 25.0

  probabilistic_sampler/development:
    sampling_percentage: 100.0

  routing:
    from_attribute: environment
    table:
      - value: production
        exporters: [otlp/prod]
      - value: staging
        exporters: [otlp/staging]
      - value: development
        exporters: [otlp/dev]

exporters:
  otlp/prod:
    endpoint: tempo:4317
  otlp/staging:
    endpoint: tempo:4317
  otlp/dev:
    endpoint: tempo:4317
```

## Monitoring Sampling Effectiveness

Track sampling metrics:

```promql
# Traces sampled vs total
rate(otelcol_processor_accepted_spans[5m])
/
rate(otelcol_processor_received_spans[5m])

# Sampling rate by service
sum by (service_name) (rate(otelcol_processor_accepted_spans[5m]))

# Dropped spans
rate(otelcol_processor_dropped_spans[5m])
```

Create alerts for sampling issues:

```yaml
- alert: LowSamplingRate
  expr: |
    (rate(otelcol_processor_accepted_spans[5m]) /
     rate(otelcol_processor_received_spans[5m])) < 0.01
  for: 10m
  annotations:
    summary: "Sampling rate below 1%"

- alert: HighDropRate
  expr: |
    rate(otelcol_processor_dropped_spans[5m]) > 100
  for: 5m
  annotations:
    summary: "High span drop rate detected"
```

## Best Practices

1. **Start with conservative rates**: Begin at 10-20% and adjust down
2. **Always sample errors**: Include 100% of error traces
3. **Monitor actual sampling rates**: Verify configuration matches expectations
4. **Consider user impact**: Sample user-facing services more aggressively
5. **Document sampling decisions**: Track why certain rates were chosen
6. **Review periodically**: Adjust as traffic patterns change
7. **Test in staging first**: Validate sampling before production deployment

## Calculating Appropriate Sampling Rates

```
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
