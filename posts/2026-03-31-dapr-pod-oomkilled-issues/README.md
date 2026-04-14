# How to Fix Dapr Pod OOMKilled Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Memory, OOMKilled, Resource Management

Description: Diagnose and fix OOMKilled errors in Dapr sidecar containers by tuning memory limits, configuring resource requests, and identifying memory leaks.

---

OOMKilled (Out of Memory Killed) errors in Dapr pods mean the `daprd` sidecar or your application container is exceeding its memory limit. Kubernetes terminates the container and the pod restarts.

## Identifying OOMKilled Events

Check pod restart counts and exit reasons:

```bash
kubectl get pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace> | grep -A5 "Last State"
```

An OOMKilled container shows:

```text
Last State:     Terminated
  Reason:       OOMKilled
  Exit Code:    137
```

Also check events:

```bash
kubectl get events -n <namespace> --sort-by='.lastTimestamp' | grep OOM
```

## Default Dapr Sidecar Memory Limits

By default, Dapr does not set memory limits on injected sidecar containers. Without explicit configuration, the daprd sidecar can consume as much memory as the node allows, which may lead to OOMKilled errors if a Kubernetes LimitRange applies namespace defaults or if the node runs low on memory. Set resource limits via annotations:

```yaml
annotations:
  dapr.io/sidecar-memory-limit: "512Mi"
  dapr.io/sidecar-memory-request: "256Mi"
  dapr.io/sidecar-cpu-limit: "500m"
  dapr.io/sidecar-cpu-request: "250m"
```

## Setting Resource Limits via Annotations

There is no Helm value to globally set default resource limits on all injected sidecar containers. Sidecar resources must be configured per-pod using the annotations shown above. To enforce consistent limits across a namespace without annotating every pod, apply a Kubernetes `LimitRange`:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dapr-sidecar-limits
  namespace: <namespace>
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
```

```bash
kubectl apply -f limitrange.yaml -n <namespace>
```

## Profiling Memory Usage

Enable the Dapr profiling endpoint to capture memory profiles:

```yaml
annotations:
  dapr.io/enable-profiling: "true"
```

Then capture a heap profile:

```bash
kubectl port-forward <pod-name> 7777:7777
curl http://localhost:7777/debug/pprof/heap > heap.out
go tool pprof heap.out
```

## Common Memory Leak Sources

**Large message payloads:** Dapr buffers messages in memory. If pub/sub messages are very large, memory grows quickly. Use smaller payloads or streaming.

**Actor state size:** If actors store large objects in state, memory usage scales with actor count. Minimize state per actor.

**Metrics cardinality:** High-cardinality labels in telemetry can cause memory bloat. Reduce custom labels:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  metrics:
    enabled: true
    rules:
    - name: dapr_runtime_service_invocation_req_sent_total
      labels:
      - name: app_id
        regex: {}
```

## Tuning Actor Idle Timeout and Scan Interval

For actor-heavy workloads, reduce the actor idle timeout and scan interval to deactivate and garbage collect inactive actors sooner. These values are configured in your application's actor runtime configuration (returned from the `/dapr/config` endpoint), not in the Dapr Configuration CRD:

```json
{
  "entities": ["MyActor"],
  "actorIdleTimeout": "5m",
  "actorScanInterval": "10s",
  "drainOngoingCallTimeout": "30s",
  "drainRebalancedActors": true
}
```

The default `actorIdleTimeout` is 60 minutes and `actorScanInterval` is 30 seconds. Lowering these values causes inactive actors to be deactivated more frequently, freeing memory.

## Summary

Dapr OOMKilled issues are resolved by increasing sidecar memory limits via annotations, profiling the sidecar to find leaks, and reducing memory pressure from large payloads, actor state, or high-cardinality metrics. Set memory requests and limits explicitly on every pod to give Kubernetes accurate scheduling information.
