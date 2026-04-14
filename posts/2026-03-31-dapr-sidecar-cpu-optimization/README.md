# How to Optimize Dapr Sidecar CPU Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CPU, Optimization, Sidecar, Performance

Description: Learn how to reduce Dapr sidecar CPU consumption by tuning Go runtime settings, disabling tracing, and right-sizing CPU requests and limits.

---

## Overview

Dapr sidecars consume CPU for request processing, mTLS encryption, metrics collection, and tracing. In high-density clusters, even small per-sidecar CPU savings multiply across hundreds of pods. This guide covers targeted optimizations to reduce sidecar CPU footprint.

## Profile Current CPU Usage

Measure baseline sidecar CPU consumption:

```bash
# Real-time CPU usage per container
kubectl top pods --containers -l app=myservice

# CPU usage over time via metrics-server
watch -n5 "kubectl top pods --containers -n default | grep daprd"
```

## Set CPU Requests and Limits

Accurate CPU requests prevent over-provisioning and ensure the scheduler places pods correctly:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "50m"
  dapr.io/sidecar-cpu-limit: "200m"
```

For Guaranteed QoS (prevents throttling):

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "200m"
  dapr.io/sidecar-cpu-limit: "200m"  # Same value = Guaranteed QoS
```

## Reduce Tracing Overhead

Distributed tracing adds CPU for span generation and export. Reduce the sampling rate:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: optimized-config
spec:
  tracing:
    samplingRate: "0.01"  # Sample 1% of requests
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

Or disable tracing entirely for non-critical services:

```yaml
spec:
  tracing:
    samplingRate: "0"
```

## Disable Metrics Collection

Prometheus metrics scraping adds background CPU:

```yaml
annotations:
  dapr.io/enable-metrics: "false"
```

## Control Go GOMAXPROCS

By default, Go uses all available CPUs. Limit the Go runtime to match CPU limits:

```yaml
annotations:
  dapr.io/env: "GOMAXPROCS=1"
```

This prevents the Go scheduler from creating OS threads for CPUs that the container won't get time on due to limits, reducing unnecessary context switching overhead.

## Tune mTLS Refresh Interval

mTLS certificate rotation consumes CPU. Extend the rotation interval for less critical services:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_sentry.workloadCertTTL=24h \
  --set dapr_sentry.allowedClockSkew=15m
```

## Use CPU Throttling Detection

Detect when sidecars are being throttled:

```bash
kubectl exec -it <pod-name> -c daprd -- \
  cat /sys/fs/cgroup/cpu/cpu.stat | grep throttled
```

High `nr_throttled` values mean the CPU limit is too low. Increase it:

```yaml
annotations:
  dapr.io/sidecar-cpu-limit: "500m"
```

## Summary

Dapr sidecar CPU usage can be reduced by setting accurate limits, reducing trace sampling rates, disabling unused metrics, limiting Go's GOMAXPROCS, and extending mTLS rotation intervals. Always measure CPU with realistic traffic patterns before and after changes to quantify the impact of each optimization.
