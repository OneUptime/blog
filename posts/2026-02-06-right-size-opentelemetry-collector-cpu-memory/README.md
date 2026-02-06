# How to Right-Size OpenTelemetry Collector CPU and Memory Based on Throughput Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Performance Tuning, Resource Optimization, Collector

Description: A hands-on guide to measuring OpenTelemetry Collector throughput and setting correct CPU and memory limits based on real data.

One of the most common mistakes when deploying OpenTelemetry Collectors is guessing at resource limits. Teams either set them too low and get OOM kills and data drops, or set them too high and waste cluster resources. The collector gives you enough internal metrics to calculate exactly what it needs based on your actual telemetry volume.

This post shows how to benchmark your collector, establish the relationship between throughput and resource consumption, and set limits that are grounded in real numbers.

## Enabling Detailed Internal Metrics

Before you can right-size anything, you need the collector to report its own resource usage. The built-in telemetry does this.

This configuration enables detailed internal metrics including process-level CPU and memory reporting:

```yaml
# otel-collector-config.yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
    resource:
      # Tag metrics with the pipeline configuration for comparison
      service.name: "otel-collector"
      deployment.environment: "production"
```

## Measuring the Baseline

The first step is to understand the relationship between throughput (spans/sec or datapoints/sec) and resource usage. You need to collect these metrics over several days to capture both peak and trough patterns.

These PromQL queries give you the throughput and resource consumption numbers you need:

```promql
# Spans received per second across all collector instances
sum(rate(otelcol_receiver_accepted_spans_total[5m]))

# Metric data points received per second
sum(rate(otelcol_receiver_accepted_metric_points_total[5m]))

# Average CPU usage per collector pod (in cores)
avg(rate(container_cpu_usage_seconds_total{container="collector"}[5m]))

# Memory working set per collector pod (in bytes)
avg(container_memory_working_set_bytes{container="collector"})

# Per-pod throughput (spans/sec per instance)
sum(rate(otelcol_receiver_accepted_spans_total[5m])) by (pod)
```

## Running a Controlled Benchmark

For more precise numbers, run a load test using `telemetrygen`, a tool that ships with the OpenTelemetry project. This lets you push a known volume of data through the collector and measure the resource impact.

This script ramps up telemetry load in increments and records resource usage at each step:

```bash
#!/bin/bash
# benchmark-collector.sh
# Run increasingly heavy loads and record resource usage

COLLECTOR_ENDPOINT="otel-collector.observability:4317"
PROM_URL="http://prometheus:9090"

for RATE in 1000 5000 10000 25000 50000; do
    echo "Testing at ${RATE} spans/sec..."

    # Generate load for 5 minutes at each level
    telemetrygen traces \
        --otlp-endpoint ${COLLECTOR_ENDPOINT} \
        --otlp-insecure \
        --rate ${RATE} \
        --duration 5m \
        --workers 4 &

    LOAD_PID=$!
    # Wait 3 minutes for metrics to stabilize
    sleep 180

    # Query current resource usage
    CPU=$(curl -s "${PROM_URL}/api/v1/query" \
        --data-urlencode "query=avg(rate(container_cpu_usage_seconds_total{container=\"collector\"}[2m]))" \
        | jq -r '.data.result[0].value[1]')

    MEM=$(curl -s "${PROM_URL}/api/v1/query" \
        --data-urlencode "query=avg(container_memory_working_set_bytes{container=\"collector\"})" \
        | jq -r '.data.result[0].value[1]')

    echo "Rate: ${RATE} spans/sec | CPU: ${CPU} cores | Memory: ${MEM} bytes"
    echo "${RATE},${CPU},${MEM}" >> benchmark_results.csv

    # Stop the load generator and wait for the queue to drain
    kill $LOAD_PID
    sleep 60
done
```

## Interpreting the Results

From a typical benchmark, you will see a roughly linear relationship between throughput and CPU, and a stepped relationship with memory. Here is an example of what the numbers might look like:

| Spans/sec | CPU (cores) | Memory (MB) |
|-----------|-------------|-------------|
| 1,000     | 0.15        | 180         |
| 5,000     | 0.52        | 220         |
| 10,000    | 0.98        | 310         |
| 25,000    | 2.30        | 520         |
| 50,000    | 4.50        | 890         |

From this data, each span costs roughly 0.00009 CPU cores and 14 KB of memory at higher throughput levels. These numbers vary based on your processor configuration, span complexity, and export destination latency.

## Calculating the Right Limits

Use this Python script to compute optimal resource limits from your benchmark data.

This script reads the benchmark CSV and calculates resource requests and limits with appropriate headroom:

```python
import csv
import numpy as np

# Load benchmark results
rates, cpus, mems = [], [], []
with open("benchmark_results.csv") as f:
    for row in csv.reader(f):
        rates.append(float(row[0]))
        cpus.append(float(row[1]))
        mems.append(float(row[2]))

rates = np.array(rates)
cpus = np.array(cpus)
mems = np.array(mems) / (1024 * 1024)  # Convert to MB

# Linear fit for CPU
cpu_slope, cpu_intercept = np.polyfit(rates, cpus, 1)

# Linear fit for memory
mem_slope, mem_intercept = np.polyfit(rates, mems, 1)

# Calculate for your target throughput
target_rate = 30000  # spans/sec per collector instance
predicted_cpu = cpu_slope * target_rate + cpu_intercept
predicted_mem = mem_slope * target_rate + mem_intercept

# Add headroom: 20% for requests, 50% for limits
print(f"For {target_rate} spans/sec per instance:")
print(f"  CPU request: {predicted_cpu * 1.2:.2f} cores")
print(f"  CPU limit:   {predicted_cpu * 1.5:.2f} cores")
print(f"  Mem request: {predicted_mem * 1.2:.0f} Mi")
print(f"  Mem limit:   {predicted_mem * 1.5:.0f} Mi")
```

## Applying the Configuration

Once you have the numbers, update your deployment accordingly.

This deployment spec uses the calculated values and includes a memory limiter aligned with the container limits:

```yaml
# otel-collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  template:
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          resources:
            requests:
              # Based on benchmark: 30k spans/sec target
              cpu: "3200m"
              memory: "650Mi"
            limits:
              # 50% headroom above predicted usage
              cpu: "4000m"
              memory: "900Mi"
```

And align the `memory_limiter` processor with the container limit:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    # Set to ~80% of container memory limit (900Mi)
    limit_mib: 720
    # Reserve buffer for GC and spikes
    spike_limit_mib: 180
```

## Ongoing Right-Sizing

Resource requirements change as your application fleet grows and telemetry volume increases. Set up a recording rule that tracks the per-span resource cost over time.

This Prometheus recording rule tracks how many CPU cores each span costs, letting you detect configuration drift:

```yaml
groups:
  - name: collector_efficiency
    interval: 5m
    rules:
      - record: collector:cpu_per_span:ratio
        expr: |
          sum(rate(container_cpu_usage_seconds_total{container="collector"}[10m]))
          /
          sum(rate(otelcol_receiver_accepted_spans_total[10m]))

      - record: collector:memory_per_span:ratio
        expr: |
          sum(avg_over_time(container_memory_working_set_bytes{container="collector"}[10m]))
          /
          sum(rate(otelcol_receiver_accepted_spans_total[10m]))
```

If these ratios start climbing, it usually means one of three things: you added a new processor that costs more per span, your export destination got slower (causing queue buildup), or your span payload sizes increased. Tracking this ratio over time helps you catch resource drift before it causes outages.
