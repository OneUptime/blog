# How to Use Envoy Admin Interface for Debugging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Admin Interface, Debugging, Kubernetes

Description: A practical guide to using the Envoy admin interface in Istio sidecars for real-time debugging, stats monitoring, and configuration inspection.

---

Every Envoy sidecar in your Istio mesh has a built-in admin interface running on port 15000. It gives you direct, real-time access to the proxy's internal state - active connections, statistics, configuration dumps, logging controls, and more. While istioctl wraps some of this functionality in a nicer interface, the admin API gives you raw, unfiltered access that's invaluable during debugging.

## Accessing the Admin Interface

The admin interface listens on localhost inside the proxy container. There are several ways to access it.

### Through istioctl dashboard

The easiest method:

```bash
istioctl dashboard envoy productpage-v1-abc123.default
```

This sets up port forwarding and opens your browser to the admin page.

### Through kubectl exec

For scripting and automation:

```bash
kubectl exec productpage-v1-abc123 -c istio-proxy -- curl -s localhost:15000/help
```

### Through kubectl port-forward

For browsing the admin UI manually:

```bash
kubectl port-forward productpage-v1-abc123 15000:15000
```

Then open `http://localhost:15000` in your browser.

## Key Admin Endpoints

The admin interface has dozens of endpoints. Here are the ones you'll use most.

### /config_dump

Dumps the entire Envoy configuration:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/config_dump
```

This is massive output. Filter by config type:

```bash
# Just listeners
kubectl exec my-pod -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=dynamic_listeners"

# Just routes
kubectl exec my-pod -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=dynamic_route_configs"

# Just clusters
kubectl exec my-pod -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=dynamic_active_clusters"
```

You can also include or exclude specific configs:

```bash
# Include only config matching a name pattern
kubectl exec my-pod -c istio-proxy -- curl -s "localhost:15000/config_dump?name_regex=reviews"
```

### /stats

This is the statistics powerhouse. Envoy tracks metrics for everything:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats
```

The output is huge. Filter with grep patterns:

```bash
# HTTP request stats
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats | grep http

# Stats for a specific cluster
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats | grep "cluster.outbound|9080||reviews"

# Connection stats
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_cx"
```

For Prometheus format:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats/prometheus
```

Key stats to watch:

```text
# Active connections to upstream
cluster.outbound|9080||reviews.default.svc.cluster.local.upstream_cx_active: 5

# Total requests
cluster.outbound|9080||reviews.default.svc.cluster.local.upstream_rq_total: 1234

# 5xx errors
cluster.outbound|9080||reviews.default.svc.cluster.local.upstream_rq_5xx: 12

# Circuit breaker state
cluster.outbound|9080||reviews.default.svc.cluster.local.circuit_breakers.default.cx_open: 0

# Request retry count
cluster.outbound|9080||reviews.default.svc.cluster.local.retry.upstream_rq: 3

# Outlier detection ejections
cluster.outbound|9080||reviews.default.svc.cluster.local.outlier_detection.ejections_active: 1
```

### /clusters

Shows detailed per-cluster, per-endpoint statistics:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/clusters
```

Output:

```text
outbound|9080||reviews.default.svc.cluster.local::10.244.0.15:9080::cx_active::2
outbound|9080||reviews.default.svc.cluster.local::10.244.0.15:9080::cx_total::45
outbound|9080||reviews.default.svc.cluster.local::10.244.0.15:9080::rq_active::0
outbound|9080||reviews.default.svc.cluster.local::10.244.0.15:9080::rq_total::89
outbound|9080||reviews.default.svc.cluster.local::10.244.0.15:9080::health_flags::healthy
outbound|9080||reviews.default.svc.cluster.local::10.244.0.16:9080::cx_active::1
outbound|9080||reviews.default.svc.cluster.local::10.244.0.16:9080::health_flags::/failed_outlier_check
```

The `health_flags` field is particularly useful. Possible values:
- `healthy` - Everything is fine
- `/failed_active_hc` - Active health check failed
- `/failed_outlier_check` - Outlier detection ejected this endpoint
- `/failed_eds_health` - EDS reported unhealthy

### /server_info

Shows Envoy build and runtime info:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/server_info | python3 -m json.tool
```

```json
{
  "version": "1.28.0/1.20.0-dev/Clean/RELEASE/BoringSSL",
  "state": "LIVE",
  "uptime_all_epochs": "123456s",
  "uptime_current_epoch": "123456s",
  "hot_restart_version": "11.104",
  "command_line_options": { ... }
}
```

The `state` field tells you if Envoy is healthy:
- `LIVE` - Normal operation
- `DRAINING` - Shutting down gracefully
- `PRE_INITIALIZING` / `INITIALIZING` - Still starting up

### /logging

View and change log levels at runtime:

```bash
# See current log levels
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/logging

# Set all loggers to debug
kubectl exec my-pod -c istio-proxy -- curl -s -X POST "localhost:15000/logging?level=debug"

# Set specific logger
kubectl exec my-pod -c istio-proxy -- curl -s -X POST "localhost:15000/logging?http=debug"

# Set multiple loggers
kubectl exec my-pod -c istio-proxy -- curl -s -X POST "localhost:15000/logging?http=debug&router=debug&connection=debug"

# Reset to warning
kubectl exec my-pod -c istio-proxy -- curl -s -X POST "localhost:15000/logging?level=warning"
```

### /ready

Simple readiness check:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s -o /dev/null -w "%{http_code}" localhost:15000/ready
```

Returns 200 if Envoy is ready, 503 if not. This is used by Kubernetes readiness probes.

### /certs

Lists all TLS certificates loaded by Envoy:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/certs | python3 -m json.tool
```

Shows certificate details including expiry dates, which is useful for debugging mTLS issues.

## Practical Debugging Scenarios

### Finding Why Requests Are Failing

Check response code stats for the target cluster:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats | grep "outbound|9080||reviews" | grep "rq_"
```

Look for:
- `upstream_rq_5xx` - Server errors from upstream
- `upstream_rq_4xx` - Client errors
- `upstream_rq_timeout` - Request timeouts
- `upstream_rq_retry` - Retried requests

### Checking If Circuit Breaker Is Tripping

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats | grep "circuit_breakers"
```

If `cx_open: 1` or `rq_open: 1`, the circuit breaker is actively rejecting requests. Check `remaining_cx`, `remaining_pending`, and `remaining_rq` to see how close you are to the limits.

### Monitoring Connection Pools

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_cx"
```

```text
cluster.outbound|9080||reviews.upstream_cx_active: 10
cluster.outbound|9080||reviews.upstream_cx_connect_fail: 2
cluster.outbound|9080||reviews.upstream_cx_destroy: 45
cluster.outbound|9080||reviews.upstream_cx_overflow: 0
cluster.outbound|9080||reviews.upstream_cx_total: 57
```

`upstream_cx_overflow` means connection pool exhaustion. `upstream_cx_connect_fail` means TCP connection failures to the upstream.

### Resetting Stats

During a debugging session, it helps to reset stats and watch fresh data:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s -X POST localhost:15000/reset_counters
```

This resets all counters to zero so you can see what happens during a specific test.

### Draining for Debugging

If you need to stop a proxy from accepting new connections (for debugging without affecting traffic):

```bash
kubectl exec my-pod -c istio-proxy -- curl -s -X POST localhost:15000/drain_listeners
```

This gracefully stops the proxy from accepting new connections while keeping existing ones alive.

## Security Note

The admin interface can modify the proxy's behavior (change log levels, drain connections, etc.). It's bound to localhost by default, which means it's only accessible from within the pod. Don't expose it externally.

If you need remote access, use kubectl port-forward or istioctl dashboard, which both create temporary tunnels.

## Summary

The Envoy admin interface is a real-time window into the proxy. Stats tell you what's happening right now. Config dumps tell you what the proxy is configured to do. Logging controls let you get more detail on the fly. For production debugging, this is often faster than digging through log files, because you can see exact counts of errors, connection states, and circuit breaker status without waiting for log aggregation.
