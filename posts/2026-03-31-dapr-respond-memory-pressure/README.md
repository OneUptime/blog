# How to Respond to Dapr Memory Pressure Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Memory, Performance, Kubernetes, Troubleshooting

Description: Identify and resolve Dapr sidecar memory pressure by profiling memory usage, adjusting limits, disabling unused features, and tuning component configurations.

---

## Recognizing Dapr Memory Pressure

Memory pressure in Dapr shows up in several ways: OOMKilled sidecar containers, slow operation performance as the sidecar swaps, or node-level eviction of Dapr-enabled pods. Check current consumption:

```bash
kubectl top pods --containers -n my-namespace | grep daprd
# NAMESPACE    NAME                            CONTAINER   CPU    MEMORY
# my-namespace orders-api-6d8f9c-xkp2m        daprd       45m    180Mi
```

If a sidecar consistently uses more than 150-200 MB, investigate.

## Step 1 - Check for OOMKill Events

```bash
kubectl describe pod orders-api-6d8f9c-xkp2m -n my-namespace | grep -A 5 "OOMKilled\|Last State"
```

Also check node events:

```bash
kubectl get events -n my-namespace --field-selector reason=OOMKilling
```

## Step 2 - Profile Component Memory Usage

Components that maintain in-memory caches or persistent connections consume memory. Check how many components are loaded:

```bash
kubectl logs orders-api-6d8f9c-xkp2m -c daprd | grep "component loaded"
```

Reduce to only the components your app needs using scoping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
scopes:
- orders-api
```

Services not listed in `scopes` will not load this component.

## Step 3 - Disable Unused Features

Tracing and metrics collection consume memory for buffering:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: my-config
spec:
  tracing:
    samplingRate: "0.1"
  metric:
    enabled: true
    http:
      increasedCardinality: false
```

Reduce sampling rate and lower metric cardinality to decrease memory usage.

## Step 4 - Adjust Memory Limits

If the sidecar legitimately needs more memory (high throughput workloads), increase the limit:

```yaml
annotations:
  dapr.io/sidecar-memory-request: "128Mi"
  dapr.io/sidecar-memory-limit: "512Mi"
```

Apply with a rolling restart:

```bash
kubectl rollout restart deployment/orders-api -n my-namespace
```

## Step 5 - Monitor Memory Trends

Set up Prometheus-based alerting for memory trends:

```yaml
- alert: DaprSidecarHighMemory
  expr: |
    container_memory_working_set_bytes{container="daprd"}
    / container_spec_memory_limit_bytes{container="daprd"} > 0.85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Dapr sidecar is using over 85% of its memory limit"
    pod: "{{ $labels.pod }}"
```

## Step 6 - Consider Actor State Cleanup

If your app uses Dapr actors, unbounded actor state accumulation increases memory. Enable TTL for actor state:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actor-config
spec:
  features:
  - name: ActorStateTTL
    enabled: true
```

Then set TTL in actor state operations:

```csharp
await this.StateManager.SetStateAsync("key", value, TimeSpan.FromSeconds(3600));
```

## Summary

Dapr sidecar memory pressure is addressed by scoping components to reduce the number loaded, disabling unused tracing and metrics, adjusting memory limits for high-throughput services, and cleaning up actor state with TTL. Proactive memory alerting at 85% of the limit provides time to act before OOMKill events disrupt workloads.
