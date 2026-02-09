# How to Build Auto-Scaling Policies for OpenTelemetry Collector Gateway Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Auto-Scaling, Collector, Gateway

Description: Learn how to auto-scale OpenTelemetry Collector gateways based on throughput, memory pressure, and queue saturation metrics.

Running OpenTelemetry Collectors in gateway mode means all your telemetry flows through a central cluster before reaching its final destination. That cluster needs to handle traffic spikes without dropping data, but running too many replicas wastes money. The collector itself exposes internal metrics that are perfect for driving auto-scaling decisions.

This post covers how to expose those internal metrics, pick the right scaling signals, and wire everything into Kubernetes HPA.

## Understanding Collector Internal Metrics

The OpenTelemetry Collector exposes telemetry about its own performance through the `telemetry` configuration. These metrics tell you how much data is flowing through, how full the internal queues are, and whether any data is being dropped.

This config enables internal metrics and exposes them on a Prometheus endpoint:

```yaml
# otel-gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 8192
    send_batch_max_size: 16384
    timeout: 5s
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

exporters:
  otlphttp:
    endpoint: "https://telemetry-backend.internal:443"
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
```

## Key Metrics for Scaling Decisions

The collector exposes several metrics that are useful for auto-scaling. Here are the ones that matter most, and the PromQL queries to extract signals from them.

This set of PromQL queries checks the three main scaling signals - queue saturation, memory pressure, and data loss:

```promql
# Queue saturation: ratio of current queue size to capacity
# Values approaching 1.0 mean the exporter queue is almost full
otelcol_exporter_queue_size / otelcol_exporter_queue_capacity

# Memory limiter refusals: indicates the collector is under memory pressure
# Any non-zero rate here means data is being throttled
rate(otelcol_processor_refused_spans_total{processor="memory_limiter"}[5m])

# Exporter send failures: the downstream backend cannot keep up
rate(otelcol_exporter_send_failed_spans_total[5m])

# Throughput: spans received per second per collector instance
rate(otelcol_receiver_accepted_spans_total[5m])
```

## Kubernetes Deployment for the Gateway

Before setting up auto-scaling, you need the collector running as a Deployment (not a DaemonSet, since gateways are centralized).

This deployment runs the collector in gateway mode with resource requests and limits that the HPA can use:

```yaml
# otel-gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-gateway
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-gateway
  template:
    metadata:
      labels:
        app: otel-gateway
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8888"
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 8888
              name: metrics
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "2Gi"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-gateway-config
```

## HPA with Multiple Scaling Metrics

A single metric is rarely enough for reliable scaling. You want to scale on the worst-case signal across multiple dimensions. Kubernetes HPA evaluates all metrics and picks the one that requires the most replicas.

This HPA scales on three independent signals - queue saturation, memory pressure, and CPU utilization:

```yaml
# otel-gateway-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-gateway-hpa
  namespace: observability
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-gateway
  minReplicas: 3
  maxReplicas: 30
  metrics:
    # Scale based on CPU - basic but catches compute-bound scenarios
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    # Scale based on memory - catches large batch accumulation
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
    # Scale based on exporter queue saturation
    - type: Pods
      pods:
        metric:
          name: otelcol_exporter_queue_saturation
        target:
          type: AverageValue
          averageValue: "0.5"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        # Allow rapid scale-up to handle traffic spikes
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
        # Scale down slowly to avoid dropping data during transients
        - type: Pods
          value: 2
          periodSeconds: 120
```

## Prometheus Adapter Rules

To make the collector-specific metrics available to the HPA, you need Prometheus Adapter rules.

These rules translate raw Prometheus metrics into the custom metrics the HPA expects:

```yaml
# prometheus-adapter-rules.yaml
rules:
  - seriesQuery: 'otelcol_exporter_queue_size{namespace!=""}'
    resources:
      overrides:
        namespace: {resource: "namespace"}
        pod: {resource: "pod"}
    name:
      as: "otelcol_exporter_queue_saturation"
    metricsQuery: |
      avg(
        otelcol_exporter_queue_size{<<.LabelMatchers>>}
        / otelcol_exporter_queue_capacity{<<.LabelMatchers>>}
      ) by (<<.GroupBy>>)
```

## Load Shedding as a Safety Net

Auto-scaling takes time. Pods need to start, pass health checks, and begin accepting traffic. During that ramp-up window, you need the `memory_limiter` processor to protect your existing collectors from OOM kills.

The `memory_limiter` config from earlier will start refusing data when memory hits the limit. Your sending applications should handle OTLP errors by retrying with backoff. The key settings are:

- `limit_mib`: Hard ceiling on collector memory usage
- `spike_limit_mib`: Buffer reserved to handle sudden bursts
- `check_interval`: How often the limiter evaluates memory usage

Set `limit_mib` to about 80% of your container memory limit. The remaining 20% gives the Go garbage collector room to operate without the container getting OOM killed.

## Monitoring the Auto-Scaler Itself

You should track the HPA behavior to know if your policies are working. Keep an eye on these signals:

- **Replica count over time.** If you see constant oscillation, your stabilization window is too short.
- **Queue saturation during scale-up events.** If the queue fills up completely before new pods are ready, reduce your scale-up stabilization window or increase the minimum replica count.
- **Data drop rate.** Track `otelcol_exporter_send_failed_spans_total` and `otelcol_processor_refused_spans_total`. Any sustained non-zero rate means your scaling is not keeping up.

Getting collector gateway auto-scaling right takes some tuning, but once it is dialed in, you get a telemetry pipeline that handles traffic spikes without manual intervention and scales back down during quiet periods to save costs.
