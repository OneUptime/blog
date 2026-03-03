# How to Debug Envoy Proxy with Admin Interface

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Debugging, Admin Interface, Kubernetes

Description: How to use the Envoy admin interface in Istio sidecars for debugging configuration, connectivity, and performance issues.

---

Every Envoy sidecar in Istio runs an admin interface on port 15000. This interface is your best friend when debugging mesh issues. It exposes the full Envoy configuration, runtime statistics, cluster health, and several debugging tools. Knowing how to use it effectively can save you hours of troubleshooting.

## Accessing the Admin Interface

The admin interface is only accessible from within the pod (it binds to localhost). Use kubectl exec or port-forward to access it:

```bash
# Direct access from the pod
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/help

# Port forward for browser access
kubectl port-forward <pod-name> 15000:15000
```

Open `http://localhost:15000` in your browser for a clickable HTML interface with all available endpoints.

## Key Admin Endpoints

Here are the most useful endpoints for debugging:

### /config_dump - Full Configuration

This dumps the entire Envoy configuration including listeners, routes, clusters, and secrets:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/config_dump
```

The output is large. Filter it:

```bash
# Only bootstrap config
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=bootstrap"

# Only listeners
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=dynamic_listeners"

# Only routes
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=dynamic_route_configs"

# Only clusters
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=dynamic_active_clusters"
```

You can also filter by name:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/config_dump?resource=dynamic_active_clusters&name_regex=.*my-service.*"
```

### /clusters - Upstream Cluster Status

This shows all upstream clusters with their endpoints and health status:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/clusters
```

The output shows each cluster with its endpoints:

```text
outbound|8080||my-service.default.svc.cluster.local::10.0.1.5:8080::health_flags::/failed_active_hc/failed_outlier_check
outbound|8080||my-service.default.svc.cluster.local::10.0.1.6:8080::health_flags::healthy
```

For a more structured output:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/clusters?format=json" | jq '.cluster_statuses[] | select(.name | contains("my-service"))'
```

### /listeners - Active Listeners

Shows what ports Envoy is listening on:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/listeners
```

### /stats - Statistics

Envoy tracks thousands of statistics. This is where you find detailed metrics about requests, connections, and errors:

```bash
# All stats
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats

# Filter by prefix
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/stats?filter=cluster.outbound.*my-service"

# Prometheus format
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats/prometheus

# Only non-zero stats
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep -v ": 0"
```

### /ready - Readiness Status

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/ready
```

Returns `LIVE` if Envoy is ready, or an error if it is not.

### /server_info - Server Information

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/server_info | jq
```

Shows Envoy version, uptime, hot restart version, and state.

## Debugging Common Issues

### Request Returns 503 NR (No Route)

The NR flag means Envoy could not find a matching route. Check the routes:

```bash
# See all routes
istioctl proxy-config routes <pod-name>

# Check a specific route
istioctl proxy-config routes <pod-name> --name "8080" -o json
```

Compare the request's Host header and path against the route configuration. A mismatch means no route matches.

### Request Returns 503 UH (No Healthy Upstream)

All endpoints in the upstream cluster are unhealthy:

```bash
# Check endpoint health
istioctl proxy-config endpoints <pod-name> --cluster "outbound|8080||my-service.default.svc.cluster.local"

# Check cluster details
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/clusters?format=json" | jq '.cluster_statuses[] | select(.name | contains("my-service"))'
```

Look at the health flags. Endpoints might be ejected due to outlier detection or failed health checks.

### Request Returns 503 UF (Upstream Connection Failure)

Envoy could not connect to the upstream endpoint:

```bash
# Check connection stats
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*cx_connect_fail"

# Check if mTLS is the issue
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*ssl"
```

This often happens when mTLS settings are mismatched between the client and server.

### Request Returns 504 (Timeout)

```bash
# Check timeout configuration
istioctl proxy-config routes <pod-name> -o json | jq '.[].virtualHosts[].routes[].route.timeout'

# Check upstream response times
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/stats?filter=upstream_rq_time"
```

### Debugging TLS Issues

```bash
# Check TLS certificates
istioctl proxy-config secret <pod-name>

# Check TLS handshake errors
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "ssl.*handshake\|ssl.*fail"
```

## Changing Log Level at Runtime

You can change Envoy's log level without restarting the proxy:

```bash
# Set all loggers to debug
kubectl exec <pod-name> -c istio-proxy -- curl -s -X POST "localhost:15000/logging?level=debug"

# Set specific logger to debug
kubectl exec <pod-name> -c istio-proxy -- curl -s -X POST "localhost:15000/logging?connection=debug"
kubectl exec <pod-name> -c istio-proxy -- curl -s -X POST "localhost:15000/logging?http=debug"
kubectl exec <pod-name> -c istio-proxy -- curl -s -X POST "localhost:15000/logging?upstream=debug"

# See current log levels
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/logging

# Reset to warning level
kubectl exec <pod-name> -c istio-proxy -- curl -s -X POST "localhost:15000/logging?level=warning"
```

Be careful with debug logging in production. It generates enormous amounts of output and can impact performance.

## Memory and Connection Information

```bash
# Memory usage
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/memory

# Active connections
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "downstream_cx_active\|upstream_cx_active"

# Connection pool stats
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "cx_pool"
```

## Using istioctl as a Shortcut

While the admin interface is powerful, `istioctl proxy-config` provides a more user-friendly view of the same data:

```bash
istioctl proxy-config listeners <pod-name>
istioctl proxy-config routes <pod-name>
istioctl proxy-config clusters <pod-name>
istioctl proxy-config endpoints <pod-name>
istioctl proxy-config secret <pod-name>
istioctl proxy-config bootstrap <pod-name>
istioctl proxy-config all <pod-name>

# JSON output for detailed inspection
istioctl proxy-config all <pod-name> -o json
```

The admin interface is the ultimate debugging tool for Envoy in Istio. Most connectivity and routing issues can be diagnosed by checking the config dump, cluster health, and stats. When you combine it with istioctl's proxy-config commands, you have complete visibility into what the sidecar is doing and why.
