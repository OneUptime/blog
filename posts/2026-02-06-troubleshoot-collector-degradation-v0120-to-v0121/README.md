# How to Troubleshoot Collector Performance Degradation After Upgrading from v0.120 to v0.121 Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Upgrade, Performance

Description: Diagnose and fix performance degradation in the OpenTelemetry Collector after upgrading from version 0.120 to version 0.121.

You upgraded the OpenTelemetry Collector from v0.120 to v0.121. Everything seemed fine at first, but now you notice higher CPU usage, increased latency, or more memory consumption than before. This is a common scenario with Collector upgrades because the project moves fast and changes can have subtle performance implications.

## How to Identify What Changed

### Step 1: Check the Changelog

The Collector changelog is the first place to look:

```bash
# Clone the repo and check changes between versions
git log --oneline v0.120.0..v0.121.0 -- processor/ receiver/ exporter/
```

Look for changes to components you use: processors, receivers, exporters.

### Step 2: Compare Metrics Before and After

If you have Collector metrics from before the upgrade, compare key indicators:

```
# CPU usage
rate(process_cpu_seconds_total[5m])

# Memory
process_resident_memory_bytes

# Span processing latency
histogram_quantile(0.99, rate(otelcol_processor_batch_batch_send_size_bucket[5m]))

# Export latency
histogram_quantile(0.99, rate(otelcol_exporter_send_latency_bucket[5m]))

# Dropped data
rate(otelcol_exporter_send_failed_spans[5m])
```

### Step 3: Profile the Collector

Enable Go profiling on the running Collector:

```yaml
extensions:
  pprof:
    endpoint: 0.0.0.0:1777

service:
  extensions: [pprof]
```

Then capture a CPU profile:

```bash
# 30-second CPU profile
curl -o cpu.prof "http://collector:1777/debug/pprof/profile?seconds=30"

# Analyze with go tool
go tool pprof -http=:8080 cpu.prof
```

Compare the profile with one from the previous version to see what functions are taking more time.

## Common Upgrade Issues

### Issue 1: New Default Settings

New versions sometimes change default values. For example, the batch processor might change its default `send_batch_size` or `timeout`:

```yaml
# Explicitly set values you depend on instead of relying on defaults
processors:
  batch:
    send_batch_size: 1024     # be explicit
    send_batch_max_size: 2048 # be explicit
    timeout: 5s               # be explicit
```

### Issue 2: New Telemetry Overhead

Newer versions might add more internal telemetry (metrics about the Collector itself). This adds overhead:

```yaml
service:
  telemetry:
    metrics:
      # Reduce internal metric verbosity if it's causing overhead
      level: basic  # options: none, basic, normal, detailed
```

### Issue 3: Go Runtime Changes

Collector upgrades sometimes update the Go runtime version. Go 1.22 and 1.23 changed GC behavior significantly. Check which Go version each Collector version uses:

```bash
# Check the Go version used by the Collector
kubectl exec <pod> -- /otelcol-contrib --version
```

If the Go version changed, you might need to adjust `GOMEMLIMIT`:

```yaml
env:
- name: GOMEMLIMIT
  value: "800MiB"
- name: GOGC
  value: "100"  # explicit GC percentage (default is 100)
```

### Issue 4: Deprecated Component Behavior Change

A component might have changed its behavior while being deprecated:

```yaml
# Old config (v0.120) - worked fine
processors:
  attributes:
    actions:
    - key: old.attribute
      action: upsert
      value: "new-value"

# New version might require different syntax or a different processor
processors:
  transform:
    trace_statements:
    - context: span
      statements:
      - set(attributes["old.attribute"], "new-value")
```

## Rolling Back Safely

If you need to roll back quickly:

```bash
# Kubernetes - update the image tag
kubectl set image deployment/otel-collector \
  collector=otel/opentelemetry-collector-contrib:0.120.0

# Verify the rollback
kubectl rollout status deployment/otel-collector
```

For Helm deployments:

```bash
# Check rollback history
helm history otel-collector

# Roll back to previous revision
helm rollback otel-collector 1
```

## Upgrade Safely Next Time

Before upgrading:

1. Read the full changelog for breaking changes
2. Test in a staging environment with production-like load
3. Compare metrics dashboards before and after
4. Have a rollback plan ready

Create a canary Collector deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-canary
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.121.0
        # Same config as production
```

Route a percentage of traffic to the canary and compare performance metrics.

## Pinning Configuration Explicitly

The safest approach is to pin every configuration value explicitly rather than relying on defaults:

```yaml
processors:
  batch:
    send_batch_size: 1024
    send_batch_max_size: 2048
    timeout: 5s
  memory_limiter:
    check_interval: 1s
    limit_percentage: 75
    spike_limit_percentage: 25

exporters:
  otlp:
    endpoint: tempo:4317
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 1000
```

By being explicit, you are immune to default value changes between versions. Performance should remain consistent across upgrades unless there is a bug in the new version.
