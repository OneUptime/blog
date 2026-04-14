# How to Respond to Dapr High Latency Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, Latency, Monitoring, Incident Response

Description: Investigate and resolve Dapr high latency alerts by analyzing sidecar metrics, identifying bottlenecks in service invocation and state operations, and applying tuning strategies.

---

## Understanding Dapr Latency Sources

Dapr adds a sidecar hop to every service call, state operation, and pub/sub publish. Typical well-tuned Dapr adds 1-5ms of overhead. When latency rises above alerting thresholds, the cause may be in the sidecar, the backend, the network, or the application itself.

## Step 1 - Check Dapr Metrics

Dapr exposes Prometheus metrics for operation latency. Query key metrics:

```bash
# Service invocation latency (p99)
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

Query in Prometheus:

```text
histogram_quantile(0.99,
  sum by (le, app_id, method) (
    rate(dapr_http_server_latency_bucket[5m])
  )
)
```

For gRPC service invocation:

```text
histogram_quantile(0.99,
  sum by (le, app_id) (
    rate(dapr_grpc_io_server_server_latency_bucket[5m])
  )
)
```

## Step 2 - Distinguish Sidecar vs Backend Latency

If the Dapr sidecar latency is high but the backend is fast, the overhead is in the sidecar itself (usually CPU throttling or mTLS overhead):

```bash
# Check if sidecars are CPU throttled
kubectl top pods --containers -n my-namespace | grep daprd
```

If backend (state store or pub/sub) latency is high, query backend-specific metrics:

```text
dapr_component_state_latencies
dapr_component_pubsub_egress_latencies
```

## Step 3 - Check for CPU Throttling

CPU throttling causes bursty high latency. Inspect throttling metrics:

```bash
# View CPU throttle ratio for daprd containers
kubectl exec -it my-pod -c daprd -- cat /sys/fs/cgroup/cpu/cpu.stat | grep throttled
```

If throttling is occurring, increase the CPU limit:

```yaml
annotations:
  dapr.io/sidecar-cpu-limit: "1000m"
  dapr.io/sidecar-cpu-request: "200m"
```

## Step 4 - Enable gRPC for Service Invocation

Switch from HTTP to gRPC between services to reduce serialization overhead:

```yaml
annotations:
  dapr.io/app-protocol: "grpc"
  dapr.io/app-port: "50051"
```

## Step 5 - Tune Concurrency Limits

If the application is overwhelmed by Dapr forwarding too many concurrent requests, set a concurrency limit:

```yaml
annotations:
  dapr.io/app-max-concurrency: "50"
```

This instructs Dapr to queue requests beyond the limit rather than flooding the app.

## Step 6 - Review Resiliency Policy Timeouts

Overly aggressive retry policies can amplify latency under load. Review timeout settings:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: my-resiliency
spec:
  policies:
    timeouts:
      defaultTimeout: 3s
    retries:
      defaultRetry:
        policy: constant
        duration: 500ms
        maxRetries: 3
```

## Summary

High Dapr latency is diagnosed through Prometheus metrics to separate sidecar overhead from backend slowness. CPU throttling, HTTP-vs-gRPC protocol choice, excessive concurrency, and retry amplification are the most common causes. Apply targeted fixes - increase CPU limits, switch to gRPC, set concurrency limits, and tune resiliency timeouts - to restore normal latency levels.
