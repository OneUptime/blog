# How to Optimize Dapr Sidecar Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Memory, Optimization, Sidecar, Resource

Description: Learn how to reduce Dapr sidecar memory consumption by tuning Go runtime settings, disabling unused features, and right-sizing memory limits.

---

## Overview

Each Dapr sidecar is a Go process that consumes memory for connection pools, component caches, and the Go runtime. In large clusters with many pods, sidecar memory adds up quickly. This guide covers practical techniques for minimizing sidecar memory footprint.

## Understanding Sidecar Memory Usage

Profile the current memory usage of a sidecar:

```bash
# Get memory usage of the daprd container
kubectl top pods -l app=myservice --containers | grep daprd

# Get detailed memory metrics
kubectl exec -it <pod-name> -c daprd -- cat /proc/meminfo | head -20
```

## Set Appropriate Memory Limits

Start with measured values and set limits with headroom:

```yaml
annotations:
  dapr.io/sidecar-memory-request: "64Mi"
  dapr.io/sidecar-memory-limit: "128Mi"
```

## Tune Go Runtime Memory

Set Go runtime environment variables to reduce heap growth via the sidecar environment:

```yaml
annotations:
  dapr.io/env: "GOGC=50,GOMEMLIMIT=100MiB"
```

- `GOGC=50`: Trigger GC more frequently (default 100), reducing peak heap
- `GOMEMLIMIT=100MiB`: Soft memory limit for the Go runtime (Go 1.19+), triggers more aggressive GC as usage approaches the limit

## Disable Unused Features

Each enabled feature adds memory overhead. Disable what you don't use:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: lean-config
spec:
  features:
  - name: HotReload
    enabled: false
  tracing:
    samplingRate: "0"
```

```yaml
annotations:
  dapr.io/enable-metrics: "false"
  dapr.io/enable-profiling: "false"
```

## Reduce Component Count

Load only components needed by the specific service using component scoping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
scopes:
- order-service
- inventory-service
# All other services won't load this component
```

## Monitor Memory Over Time

Set up a Prometheus alert for sidecar memory approaching limits:

```yaml
groups:
- name: dapr-memory
  rules:
  - alert: DaprSidecarMemoryHigh
    expr: |
      container_memory_working_set_bytes{container="daprd"}
      / container_spec_memory_limit_bytes{container="daprd"} > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Dapr sidecar memory usage above 85%"
```

## Using Vertical Pod Autoscaler

Let VPA recommend optimal memory settings:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myservice-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myservice
  updatePolicy:
    updateMode: "Off"   # Recommendation only, no automatic changes
```

Check recommendations:

```bash
kubectl describe vpa myservice-vpa | grep -A10 "Container Recommendations"
```

## Summary

Optimizing Dapr sidecar memory involves setting right-sized limits based on measurements, tuning Go GC settings with `GOGC` and `GOMEMLIMIT`, disabling unused features, and using component scoping to reduce loaded components. Monitor memory trends over time and use VPA recommendations to set accurate resource requests and limits.
