# How to Access Envoy Admin Dashboard in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Admin Dashboard, Debugging, Kubernetes

Description: How to access and use the Envoy admin dashboard in Istio sidecars for real-time proxy inspection, stats monitoring, and debugging.

---

Every Envoy sidecar proxy in Istio runs an admin interface on port 15000. This dashboard gives you direct access to the proxy's internal state: configuration, statistics, health check status, connection pools, and more. While `istioctl proxy-config` commands give you formatted summaries, the admin dashboard gives you the raw, unfiltered view of everything the proxy is doing.

The admin interface is bound to localhost (127.0.0.1) by default, so it is not directly accessible from outside the pod. Here is how to reach it and what you can do with it.

## Accessing the Admin Dashboard

### Method 1: Port Forwarding

The simplest way to access the dashboard is with kubectl port-forward:

```bash
kubectl port-forward productpage-v1-6b746f74dc-9rlmh -n bookinfo 15000:15000
```

Then open http://localhost:15000 in your browser. You will see the Envoy admin dashboard with links to all available endpoints.

### Method 2: Using istioctl dashboard

Istio provides a convenience command:

```bash
istioctl dashboard envoy productpage-v1-6b746f74dc-9rlmh.bookinfo
```

This automatically sets up the port forwarding and opens your browser.

### Method 3: Using pilot-agent request

From within the pod itself, you can make requests to the admin interface using pilot-agent:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /
```

This is useful in scripts and automation where you cannot port-forward.

## Key Admin Endpoints

### /config_dump

This is the most comprehensive endpoint. It shows the complete Envoy configuration including all clusters, listeners, routes, and endpoints:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /config_dump
```

The output is large (often megabytes). Filter by config type:

```bash
# Only listener configuration
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET "/config_dump?resource=dynamic_listeners"

# Only cluster configuration
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET "/config_dump?resource=dynamic_active_clusters"

# Only route configuration
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET "/config_dump?resource=dynamic_route_configs"
```

### /stats

Get real-time statistics from the proxy:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /stats
```

This returns thousands of stats. Filter for what you need:

```bash
# HTTP stats
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "http."

# Upstream connection stats
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "upstream_cx"

# Circuit breaker stats
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "circuit_breaker"

# TLS/mTLS stats
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "ssl"

# Retry stats
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "retry"
```

### /stats/prometheus

Get stats in Prometheus format:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /stats/prometheus | head -50
```

This is the endpoint that Prometheus scrapes for Istio metrics.

### /clusters

Show all upstream clusters and their member endpoints with health status:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /clusters
```

Output includes:

```
outbound|9080||reviews.bookinfo.svc.cluster.local::10.244.0.17:9080::health_flags::healthy
outbound|9080||reviews.bookinfo.svc.cluster.local::10.244.0.17:9080::weight::1
outbound|9080||reviews.bookinfo.svc.cluster.local::10.244.0.17:9080::region::
outbound|9080||reviews.bookinfo.svc.cluster.local::10.244.0.17:9080::zone::
outbound|9080||reviews.bookinfo.svc.cluster.local::10.244.0.17:9080::cx_active::3
outbound|9080||reviews.bookinfo.svc.cluster.local::10.244.0.17:9080::rq_active::0
outbound|9080||reviews.bookinfo.svc.cluster.local::10.244.0.17:9080::rq_total::1523
```

This tells you per-endpoint connection and request counts, which is very useful for understanding load distribution.

### /server_info

Get information about the Envoy binary version and build:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /server_info
```

This shows the Envoy version, build date, and uptime. Useful for verifying that the correct Envoy version is running after an Istio upgrade.

### /ready

Check if the proxy is ready to receive traffic:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /ready
```

Returns `LIVE` when the proxy is healthy and ready.

### /logging

View and change log levels (same as `istioctl proxy-config log`):

```bash
# View current log levels
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /logging

# Set a specific logger to debug
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request POST "/logging?router=debug"

# Set all loggers to debug
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request POST "/logging?level=debug"
```

### /certs

List all TLS certificates loaded in the proxy:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /certs
```

Shows certificate details including subject, issuer, and expiration dates.

### /listeners

Show all active listeners:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /listeners
```

### /reset_counters

Reset all stat counters to zero. Useful when you want to measure activity during a specific time window:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request POST /reset_counters
```

Then run your test, and check stats again to see only the activity that happened after the reset.

## Practical Debugging Examples

### Finding Why Requests Return 503

Check the upstream request stats:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "upstream_rq_5xx\|upstream_rq_pending_overflow\|upstream_rq_retry"
```

- `upstream_rq_5xx`: Upstream returned 5xx errors
- `upstream_rq_pending_overflow`: Circuit breaker rejected requests
- `upstream_rq_retry`: Requests that were retried

### Checking Connection Pool Usage

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "reviews.*cx_active\|reviews.*rq_active\|reviews.*rq_pending"
```

This shows how many connections are in use, how many requests are active, and how many are pending.

### Verifying mTLS is Active

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep "ssl.handshake\|ssl.connection_error"
```

- `ssl.handshake`: Number of successful TLS handshakes
- `ssl.connection_error`: Number of failed TLS connections

## Web Dashboard vs Command Line

The web dashboard (via port-forward or `istioctl dashboard envoy`) is great for browsing and exploration. The command-line approach (via `pilot-agent request`) is better for:

- Scripted health checks
- CI/CD pipelines
- Monitoring automation
- Quick one-off checks without setting up port forwarding

Both access the same admin interface. Use whichever fits your workflow.

## Security Considerations

The admin interface is powerful and includes endpoints that can modify proxy behavior (like `/logging` and `/reset_counters`). It is bound to localhost by default, which means it is only accessible from within the pod or via kubectl exec/port-forward. Do not change this binding to expose it externally, as it would allow anyone to modify your proxy configuration.

The Envoy admin dashboard is one of the most useful debugging tools in the Istio ecosystem. It gives you direct, unfiltered access to the proxy's internal state. Combine it with `istioctl proxy-config` commands for formatted output and the admin dashboard for raw data when you need to dig deeper.
