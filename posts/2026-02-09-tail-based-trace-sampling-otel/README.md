# How to Implement Tail-Based Trace Sampling Using OpenTelemetry Collector Load Balancing in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Tracing

Description: Configure tail-based sampling with load-balanced OpenTelemetry Collectors in Kubernetes to make intelligent sampling decisions based on complete trace data.

---

Tail-based sampling makes sampling decisions after seeing the complete trace, enabling intelligent choices based on errors, latency, or business logic. Unlike head-based sampling, tail sampling can capture all error traces while aggressively sampling successful requests. However, it requires buffering complete traces and coordinating decisions across distributed collectors.

This guide demonstrates implementing tail-based sampling with load balancing in Kubernetes.

## Understanding Tail-Based Sampling

Tail sampling decisions are made after all spans in a trace arrive. Benefits include:
- Sampling based on complete trace characteristics
- Always capturing interesting traces (errors, slow requests)
- Making decisions with full context
- More efficient use of storage budget

Challenges:
- Requires buffering complete traces
- Higher memory and CPU requirements
- Load balancing needed to co-locate trace spans
- Increased latency before export

## Architecture for Tail Sampling

Deploy a two-tier collector architecture:

1. **Agent Collectors**: Run as DaemonSet, forward to gateway
2. **Gateway Collectors**: StatefulSet with load balancing, perform tail sampling

```yaml
# Agent collector (on each node)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-agent
  namespace: tracing
spec:
  selector:
    matchLabels:
      app: otel-agent
  template:
    metadata:
      labels:
        app: otel-agent
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args:
        - --config=/etc/otel/agent-config.yaml
        ports:
        - containerPort: 4317
          name: otlp-grpc
        volumeMounts:
        - name: config
          mountPath: /etc/otel
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
          name: otel-agent-config
```

Agent configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-agent-config
  namespace: tracing
data:
  agent-config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 5s
        send_batch_size: 512

      # Add resource detection
      resourcedetection:
        detectors: [env, system]

    exporters:
      # Load-balanced export to gateway collectors
      loadbalancing:
        routing_key: "traceID"
        protocol:
          otlp:
            timeout: 1s
            tls:
              insecure: true
        resolver:
          dns:
            hostname: otel-gateway.tracing.svc.cluster.local
            port: 4317

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [resourcedetection, batch]
          exporters: [loadbalancing]
```

## Gateway Collector with Tail Sampling

Deploy gateway collectors with tail sampling:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: otel-gateway
  namespace: tracing
spec:
  serviceName: otel-gateway
  replicas: 3
  selector:
    matchLabels:
      app: otel-gateway
  template:
    metadata:
      labels:
        app: otel-gateway
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args:
        - --config=/etc/otel/gateway-config.yaml
        ports:
        - containerPort: 4317
          name: otlp-grpc
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        resources:
          requests:
            memory: 2Gi
            cpu: 1000m
          limits:
            memory: 8Gi
            cpu: 4000m
      volumes:
      - name: config
        configMap:
          name: otel-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway
  namespace: tracing
spec:
  clusterIP: None
  selector:
    app: otel-gateway
  ports:
  - name: otlp-grpc
    port: 4317
```

Gateway configuration with tail sampling:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-gateway-config
  namespace: tracing
data:
  gateway-config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      # Group spans by trace ID
      groupbytrace:
        wait_duration: 10s
        num_traces: 100000
        num_workers: 10

      # Tail sampling policies
      tail_sampling:
        decision_wait: 10s
        num_traces: 100000
        expected_new_traces_per_sec: 1000
        policies:
          # Always sample errors
          - name: errors
            type: status_code
            status_code:
              status_codes: [ERROR]

          # Always sample slow traces (>1s)
          - name: slow-traces
            type: latency
            latency:
              threshold_ms: 1000

          # Sample by HTTP status code
          - name: http-errors
            type: numeric_attribute
            numeric_attribute:
              key: http.status_code
              min_value: 400
              max_value: 599

          # Sample important services at higher rate
          - name: critical-services
            type: string_attribute
            string_attribute:
              key: service.name
              values: [payment-service, auth-service, checkout-service]
              enabled_regex_matching: false
              invert_match: false

          # Probabilistic sampling for everything else
          - name: probabilistic-policy
            type: probabilistic
            probabilistic:
              sampling_percentage: 5

          # Composite policy: sample errors OR slow traces
          - name: errors-and-slow
            type: and
            and:
              and_sub_policy:
                - name: errors
                  type: status_code
                  status_code:
                    status_codes: [ERROR]
                - name: slow
                  type: latency
                  latency:
                    threshold_ms: 500

          # Rate limiting per service
          - name: rate-limit
            type: rate_limiting
            rate_limiting:
              spans_per_second: 100

      batch:
        timeout: 10s
        send_batch_size: 1024

      memory_limiter:
        check_interval: 1s
        limit_mib: 6144
        spike_limit_mib: 1024

    exporters:
      otlp:
        endpoint: tempo.tracing.svc.cluster.local:4317
        tls:
          insecure: true

      logging:
        loglevel: debug
        sampling_initial: 5
        sampling_thereafter: 200

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, groupbytrace, tail_sampling, batch]
          exporters: [otlp, logging]
```

## Advanced Tail Sampling Policies

Span count-based sampling:

```yaml
policies:
  # Sample traces with many spans (complex operations)
  - name: span-count
    type: span_count
    span_count:
      min_spans: 10
```

String attribute matching:

```yaml
policies:
  # Sample specific endpoints
  - name: critical-endpoints
    type: string_attribute
    string_attribute:
      key: http.route
      values: [/api/checkout, /api/payment]

  # Sample by customer tier
  - name: premium-customers
    type: string_attribute
    string_attribute:
      key: customer.tier
      values: [premium, enterprise]
```

Boolean attribute sampling:

```yaml
policies:
  # Sample traces marked as important
  - name: important-traces
    type: boolean_attribute
    boolean_attribute:
      key: trace.important
      value: true
```

Composite policies:

```yaml
policies:
  # Sample if (error OR slow) AND from production
  - name: prod-issues
    type: composite
    composite:
      max_total_spans_per_second: 1000
      policy_order: [errors-or-slow, production-only]
      composite_sub_policy:
        - name: errors-or-slow
          type: or
          or:
            - name: errors
              type: status_code
              status_code: {status_codes: [ERROR]}
            - name: slow
              type: latency
              latency: {threshold_ms: 1000}
        - name: production-only
          type: string_attribute
          string_attribute:
            key: deployment.environment
            values: [production]
```

## Monitoring Tail Sampling

Track sampling decisions:

```promql
# Traces sampled vs received
rate(otelcol_processor_tail_sampling_sampling_decision_latency_count[5m])

# Sampling decisions by policy
sum by (policy) (rate(otelcol_processor_tail_sampling_count_traces_sampled[5m]))

# Dropped traces
rate(otelcol_processor_tail_sampling_count_trace_dropped[5m])

# Buffer utilization
otelcol_processor_tail_sampling_traces_on_memory
```

Create alerts:

```yaml
- alert: TailSamplingBufferFull
  expr: |
    otelcol_processor_tail_sampling_traces_on_memory >
    otelcol_processor_tail_sampling_num_traces * 0.9
  for: 5m
  annotations:
    summary: "Tail sampling buffer near capacity"

- alert: HighTraceDropRate
  expr: |
    rate(otelcol_processor_tail_sampling_count_trace_dropped[5m]) > 10
  for: 10m
  annotations:
    summary: "High trace drop rate in tail sampling"
```

## Load Balancer Configuration

Ensure traces are routed to the same collector:

```yaml
exporters:
  loadbalancing:
    routing_key: "traceID"
    protocol:
      otlp:
        timeout: 10s
        sending_queue:
          enabled: true
          num_consumers: 10
          queue_size: 1000
        retry_on_failure:
          enabled: true
          initial_interval: 1s
          max_interval: 30s
          max_elapsed_time: 300s
    resolver:
      dns:
        hostname: otel-gateway.tracing.svc.cluster.local
        port: 4317
        interval: 5s
        timeout: 1s
      static:
        hostnames:
          - otel-gateway-0.otel-gateway.tracing.svc.cluster.local:4317
          - otel-gateway-1.otel-gateway.tracing.svc.cluster.local:4317
          - otel-gateway-2.otel-gateway.tracing.svc.cluster.local:4317
```

## Tuning Performance

Adjust for your workload:

```yaml
processors:
  groupbytrace:
    wait_duration: 10s  # How long to wait for spans
    num_traces: 200000  # Increase for high cardinality
    num_workers: 20     # Parallel processing

  tail_sampling:
    decision_wait: 10s  # Match groupbytrace
    num_traces: 200000  # Must match groupbytrace
    expected_new_traces_per_sec: 5000  # For sizing buffers
```

## Best Practices

1. **Size buffers appropriately**: Balance memory with trace completeness
2. **Use load balancing**: Ensure all spans for a trace reach same collector
3. **Monitor buffer utilization**: Alert before capacity is reached
4. **Set reasonable wait times**: Too short misses spans, too long wastes memory
5. **Prioritize policies**: Put "always sample" policies first
6. **Test with production traffic**: Validate sampling rates match expectations
7. **Scale gateway collectors**: Add replicas based on trace volume

## Conclusion

Tail-based sampling in Kubernetes requires careful architecture and configuration but provides intelligent sampling based on complete trace data. The load-balanced gateway pattern ensures trace spans are co-located for decision making. Start with simple policies for errors and latency, then add sophisticated rules as you understand your trace patterns. Monitor memory usage carefully and scale gateway collectors based on trace volume to maintain performance.
