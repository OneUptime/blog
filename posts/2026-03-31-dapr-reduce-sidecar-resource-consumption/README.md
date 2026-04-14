# How to Reduce Dapr Sidecar Resource Consumption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resource, Optimization, CPU, Memory

Description: Learn how to reduce Dapr sidecar CPU and memory consumption through feature configuration, component scoping, and Go runtime tuning.

---

## Overview

In large clusters with hundreds of Dapr-enabled pods, sidecar resource consumption multiplies significantly. Even saving 50MB of memory per sidecar across 200 pods saves 10GB of cluster memory. This guide covers the most impactful techniques for reducing sidecar footprint.

## Audit Current Sidecar Usage

Measure actual sidecar resource consumption across the cluster:

```bash
# CPU and memory per sidecar
kubectl top pods --containers -A | grep daprd | \
  awk '{cpu+=$3; mem+=$4} END {print "Total CPU:", cpu"m, Total Mem:", mem"Mi"}'

# Per-service breakdown
kubectl top pods --containers -A | grep daprd | sort -k4 -rn | head -20
```

## Disable Unused Observability Features

Each observability feature consumes background resources:

```yaml
annotations:
  dapr.io/enable-metrics: "false"      # Saves ~10MB memory
  dapr.io/enable-profiling: "false"    # Saves CPU for pprof server
  dapr.io/log-as-json: "false"         # Reduces JSON marshaling CPU
```

Reduce tracing overhead:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: lean-config
spec:
  tracing:
    samplingRate: "0"   # Disable tracing entirely
```

## Scope Components to Reduce Loading

Components not scoped to a service are still loaded by that sidecar:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: analytics-store
spec:
  type: state.mongodb
  version: v1
scopes:
- analytics-service   # Only analytics-service loads this component
```

Without scoping, every sidecar loads every component, consuming connection pool memory.

## Tune Go Runtime

```yaml
annotations:
  dapr.io/env: "GOMEMLIMIT=80MiB,GOGC=40,GOMAXPROCS=1"
```

- `GOMEMLIMIT=80MiB`: Cap Go heap at 80MB
- `GOGC=40`: Trigger GC more aggressively
- `GOMAXPROCS=1`: Use single OS thread if CPU limit is low

## Use Minimal Sidecar Image

Dapr provides a distroless sidecar image with smaller footprint:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.tag=1.14.0 \
  --set dapr_sidecar_injector.sidecarImageName=ghcr.io/dapr/daprd:1.14.0-distroless
```

## Set Right-Sized Resource Requests

Over-requesting resources wastes cluster capacity:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "25m"    # Start conservative
  dapr.io/sidecar-cpu-limit: "100m"     # Allow burst
  dapr.io/sidecar-memory-request: "32Mi"
  dapr.io/sidecar-memory-limit: "64Mi"
```

Adjust based on actual measurements from `kubectl top`.

## Calculate Fleet-Wide Savings

```python
# Calculate savings from optimizations
pods = 200
before_mem_mb = 150    # Before optimization
after_mem_mb = 70      # After optimization
savings = (before_mem_mb - after_mem_mb) * pods
print(f"Memory savings: {savings} MB = {savings/1024:.1f} GB")
# Output: Memory savings: 16000 MB = 15.6 GB
```

## Summary

Reducing Dapr sidecar resource consumption requires auditing actual usage, disabling unused observability features, scoping components to prevent unnecessary loading, tuning Go runtime parameters, and setting accurate resource requests based on measurements. In large clusters, even modest per-sidecar savings translate to significant fleet-wide resource recovery.
