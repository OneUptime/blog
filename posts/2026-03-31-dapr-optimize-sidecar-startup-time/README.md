# How to Optimize Dapr Sidecar Startup Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, Startup Time, Sidecar, Kubernetes

Description: Reduce Dapr sidecar startup latency using pre-pulled images, readiness tuning, reduced component counts, and sidecar resource optimization for faster pod ready times.

---

## Overview

Dapr sidecar startup time directly affects how quickly pods become ready to serve traffic. A slow sidecar startup can delay deployments, increase rolling update time, and trigger false readiness failures. This guide covers techniques to minimize `daprd` startup latency.

## Baseline Measurement

Measure current sidecar startup time before optimizing:

```bash
# Get pod ready timestamp
kubectl get pod order-service-abc -o jsonpath='{.status.conditions[?(@.type=="Ready")].lastTransitionTime}'

# Check daprd container start time
kubectl describe pod order-service-abc | grep -A 5 "daprd"

# Use kube-state-metrics to track startup duration
# kube_pod_status_container_ready_time - kube_pod_container_state_started
```

## Pre-Pull Sidecar Images

The biggest startup overhead is often image pull time. Use a DaemonSet to pre-pull the Dapr sidecar image on all nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: dapr-image-puller
  namespace: dapr-system
spec:
  selector:
    matchLabels:
      app: image-puller
  template:
    metadata:
      labels:
        app: image-puller
    spec:
      initContainers:
      - name: pull-daprd
        image: daprio/daprd:1.14.0
        command: ["sh", "-c", "echo Image pre-pulled"]
      containers:
      - name: pause
        image: gcr.io/google_containers/pause:3.2
```

## Disabling Unused Components

Each component Dapr loads adds initialization time. Disable built-in components not needed by specific services, and use the `scopes` field in component specs to restrict which app IDs load each component:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/disable-builtin-k8s-secret-store: "true"
```

## Tuning Sidecar Readiness and Liveness Probes

Adjust probe timing to match actual sidecar startup duration:

```yaml
annotations:
  dapr.io/sidecar-liveness-probe-delay-seconds: "3"
  dapr.io/sidecar-liveness-probe-timeout-seconds: "3"
  dapr.io/sidecar-liveness-probe-period-seconds: "6"
  dapr.io/sidecar-liveness-probe-threshold: "3"
  dapr.io/sidecar-readiness-probe-delay-seconds: "3"
  dapr.io/sidecar-readiness-probe-timeout-seconds: "3"
  dapr.io/sidecar-readiness-probe-period-seconds: "6"
  dapr.io/sidecar-readiness-probe-threshold: "3"
```

## Allocating Sufficient CPU for Startup

Insufficient CPU causes throttled startup. Ensure the sidecar has enough CPU during the burst:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "200m"
  dapr.io/sidecar-cpu-limit: "1000m"
```

## Waiting for Sidecar Before App Traffic

Prevent your application from receiving traffic before Dapr is ready:

```javascript
async function waitForDapr(maxWaitMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch('http://localhost:3500/v1.0/healthz');
      if (res.ok) {
        console.log('Dapr sidecar is ready');
        return;
      }
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Dapr sidecar did not become ready in time');
}

waitForDapr().then(startServer);
```

## Summary

Dapr sidecar startup time can be optimized through a combination of pre-pulling images on all nodes, limiting the number of loaded components per service, and correctly sizing CPU resources to prevent startup throttling. Measure baseline startup duration using pod condition timestamps, then apply targeted optimizations. For services requiring the fastest possible startup, consider using the Dapr HTTP API directly in init containers to pre-warm connections.
