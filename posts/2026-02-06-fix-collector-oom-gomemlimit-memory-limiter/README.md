# How to Fix OpenTelemetry Collector OOM Kills by Configuring GOMEMLIMIT and the memory_limiter Processor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Memory, Kubernetes

Description: Prevent OpenTelemetry Collector OOM kills by properly configuring GOMEMLIMIT and the memory_limiter processor together.

The OpenTelemetry Collector is a Go application, and like all Go applications running in containers, it needs proper memory management. Without it, the Collector will eventually get OOM-killed by Kubernetes or Docker, dropping telemetry data and leaving gaps in your observability.

## The Default Problem

Out of the box, the Go runtime does not know about container memory limits. It uses the host machine's total memory to make GC decisions. In a container with a 1GB limit, the Go runtime might think it has 64GB available and delay garbage collection until it is too late.

## Step 1: Set GOMEMLIMIT

`GOMEMLIMIT` tells the Go runtime to target a specific memory limit. Set it to approximately 80% of your container's memory limit:

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.121.0
        env:
        - name: GOMEMLIMIT
          value: "800MiB"   # 80% of 1Gi container limit
        resources:
          requests:
            memory: 512Mi
          limits:
            memory: 1Gi
```

## Step 2: Configure the memory_limiter Processor

The `memory_limiter` processor is a Collector-specific mechanism that monitors memory usage and starts refusing data when usage gets too high:

```yaml
# collector-config.yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 750       # hard limit in MiB
    spike_limit_mib: 200 # additional allowance for spikes

  batch:
    send_batch_size: 1024
    timeout: 5s
```

## Step 3: Wire It Into Your Pipelines

The `memory_limiter` must be the first processor in every pipeline:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

If `memory_limiter` is not first, data can accumulate in other processors before the limiter gets a chance to refuse it.

## Understanding the Memory Layers

Here is how the three memory controls interact:

```
Container limit: 1024 MiB  (OOM-kill happens here)
    |
GOMEMLIMIT:       800 MiB  (Go GC becomes aggressive here)
    |
memory_limiter:   750 MiB  (Collector refuses new data here)
    |
Normal operation: 200-500 MiB
```

Each layer provides a safety net:

1. **memory_limiter** (750 MiB): First line of defense. Refuses incoming data with a retriable error. Clients can retry later.
2. **GOMEMLIMIT** (800 MiB): Second line. Forces aggressive GC to reclaim memory.
3. **Container limit** (1024 MiB): Last resort. OOM-kill and restart.

## Percentage-Based Configuration

Instead of absolute values, you can use percentages:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 75       # 75% of total memory
    spike_limit_percentage: 25 # 25% for spikes
```

When using percentages, the `memory_limiter` reads the container's memory limit from cgroups. This is more portable across different deployment sizes.

## What Happens When the Limiter Kicks In

When memory exceeds the soft limit, the `memory_limiter` processor:

1. Starts refusing new data with a retriable status code
2. Triggers garbage collection
3. Waits for memory to drop below the limit
4. Resumes accepting data

On the client side, OTLP exporters that receive the retriable error will queue the data and retry after a backoff period.

You will see messages like this in the Collector logs:

```
warn    memorylimiter/memorylimiter.go:186
    Memory usage is above soft limit. Refusing data.
    {"kind": "processor", "name": "memory_limiter",
     "cur_mem_mib": 760, "soft_limit_mib": 750}
```

## Complete Working Configuration

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 75
    spike_limit_percentage: 25

  batch:
    send_batch_size: 1024
    send_batch_max_size: 2048
    timeout: 5s

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.121.0
        env:
        - name: GOMEMLIMIT
          value: "800MiB"
        ports:
        - containerPort: 4317
        - containerPort: 4318
        - containerPort: 8888
        resources:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 1Gi
            cpu: 1
        volumeMounts:
        - name: config
          mountPath: /etc/otelcol
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

## Monitoring Collector Memory

The Collector exposes metrics at the telemetry endpoint. Monitor these:

- `otelcol_process_memory_rss`: actual memory usage
- `otelcol_processor_refused_spans`: spans refused by memory_limiter
- `otelcol_exporter_sent_spans`: spans successfully exported

Set alerts on `otelcol_processor_refused_spans` to know when the Collector is under memory pressure.

The combination of `GOMEMLIMIT` and `memory_limiter` is the standard approach for production Collector deployments. Without both, you are relying on OOM-kills as your memory management strategy, which means data loss on every restart.
