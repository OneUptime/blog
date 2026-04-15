# How to Debug Dapr State Store Query Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Performance, Debugging, Observability

Description: Learn how to identify and resolve Dapr state store performance bottlenecks using tracing, metrics, and query analysis.

---

Slow state store operations can cascade into latency across your entire microservice application. Dapr abstracts the underlying store, but performance issues still originate from query patterns, connection pooling, and component configuration. This guide covers techniques to diagnose and fix slow state operations.

## Measure State Operation Latency

Dapr exposes Prometheus metrics for state operations. Check the `dapr_component_state_latencies` metric:

```bash
kubectl port-forward <your-app-pod> 9090:9090 &
curl http://localhost:9090/metrics | grep dapr_component_state_latencies
```

High p99 latency on `get` or `set` operations points to the underlying store, not the Dapr sidecar itself.

## Enable Query Logging on the State Store

For Redis-backed state stores, enable slowlog to capture expensive commands:

```bash
redis-cli CONFIG SET slowlog-log-slower-than 1000  # Log queries > 1ms
redis-cli SLOWLOG GET 10
```

For PostgreSQL (used with Dapr state):

```sql
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries > 100ms
SELECT pg_reload_conf();
```

## Inspect Dapr State API Calls with Tracing

Add distributed tracing to capture state operation spans:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

In Zipkin, filter by `dapr.state` operations to see which keys take the longest to retrieve.

## Optimize Bulk State Operations

Replace individual get/set calls with bulk operations:

```bash
# Instead of multiple single requests:
curl -X POST http://localhost:3500/v1.0/state/mystore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "user:1", "value": {"name": "Alice"}},
    {"key": "user:2", "value": {"name": "Bob"}},
    {"key": "user:3", "value": {"name": "Carol"}}
  ]'
```

Bulk operations reduce round-trip overhead significantly compared to sequential individual calls.

## Check Connection Pool Configuration

State store components support connection pool tuning. For Redis:

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
    value: redis-master:6379
  - name: maxRetries
    value: "3"
  - name: dialTimeout
    value: "5s"
  - name: readTimeout
    value: "3s"
  - name: poolSize
    value: "20"
```

Low `poolSize` causes queuing under concurrent load. Increase it based on your replica count.

## Profile with Dapr Debug Endpoint

Enable the Dapr profiling port to capture Go pprof data from the sidecar:

```bash
kubectl port-forward <pod> 7777:7777
curl http://localhost:7777/debug/pprof/profile?seconds=30 > profile.pprof
go tool pprof -http=:8080 profile.pprof
```

This reveals if the sidecar itself is CPU-bound during state serialization.

## Use State Store Query API for Large Datasets

When retrieving multiple records matching a filter, use the query API instead of get-by-key loops:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/state/statestore/query \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"EQ": {"status": "active"}},
    "page": {"limit": 100}
  }'
```

Not all stores support query API - check component documentation for compatibility.

## Summary

Debugging Dapr state store performance starts with Prometheus metrics and distributed tracing to isolate slow operations. Enabling slow query logging on the underlying store reveals expensive patterns, while bulk operations and connection pool tuning address throughput bottlenecks. The Dapr profiling endpoint helps identify serialization overhead in the sidecar itself.
