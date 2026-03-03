# How to Enable Debug Logging for Envoy Proxy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Logging, Debugging, Kubernetes, Service Mesh

Description: Learn how to enable and configure debug logging for Envoy sidecar proxies in Istio to troubleshoot traffic routing, TLS, and connectivity issues effectively.

---

When traffic isn't flowing the way you expect in your Istio mesh, the Envoy proxy logs are usually where you'll find the answer. Envoy is the data plane proxy that handles all the actual network traffic, and its logs can tell you exactly what's happening with every connection and request.

By default, Envoy runs with warning-level logging, which keeps things quiet but doesn't give you much to work with during troubleshooting. Bumping it up to debug level reveals a ton of useful information about connections, TLS handshakes, routing decisions, and upstream health.

## Envoy Logger Categories

Envoy doesn't just have a single log level. It has dozens of internal loggers, each covering a different subsystem. The most commonly useful ones are:

- `connection` - TCP connection events
- `http` - HTTP protocol handling
- `router` - Routing decisions
- `upstream` - Upstream cluster connectivity
- `filter` - Filter chain processing
- `pool` - Connection pool management
- `client` - HTTP client connections
- `jwt` - JWT authentication
- `rbac` - Role-based access control

You can set levels independently for each of these, which is really nice when you only care about one aspect of the proxy behavior.

## Quick Debug with istioctl

The fastest way to enable debug logging for an Envoy proxy is with `istioctl`:

```bash
# Enable debug for all loggers on a specific pod
istioctl proxy-config log my-pod -n my-namespace --level debug

# Enable debug for specific loggers only
istioctl proxy-config log my-pod -n my-namespace --level connection:debug,http:debug,router:debug

# Check current log levels
istioctl proxy-config log my-pod -n my-namespace
```

The output of the last command shows you every logger and its current level:

```text
active loggers:
  admin: warning
  alternate_protocols_cache: warning
  aws: warning
  cache_filter: warning
  client: warning
  config: warning
  connection: debug
  ...
```

## Using the Envoy Admin API Directly

Every Envoy sidecar exposes an admin interface on port 15000 inside the pod. You can hit it directly:

```bash
# Port-forward to the admin interface
kubectl port-forward my-pod -n my-namespace 15000:15000 &

# Change log level
curl -XPOST "localhost:15000/logging?level=debug"

# Change specific logger
curl -XPOST "localhost:15000/logging?connection=debug"

# View current levels
curl -s "localhost:15000/logging"
```

Or without port-forwarding, use kubectl exec:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s -XPOST "localhost:15000/logging?level=debug"
```

## Setting Debug Level at Pod Startup

If you need debug logging from the very beginning of a pod's lifecycle (to catch startup issues or initial connection problems), use pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/logLevel: debug
    spec:
      containers:
        - name: my-service
          image: my-service:v1
```

For more granular control over individual Envoy loggers at startup:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/componentLogLevel: "http:debug,router:debug,connection:debug"
    spec:
      containers:
        - name: my-service
          image: my-service:v1
```

After adding the annotation, you'll need to restart the pods for it to take effect:

```bash
kubectl rollout restart deployment/my-service -n my-namespace
```

## Setting Debug Level Globally

If you want every Envoy proxy in the mesh to run at a certain log level (not recommended for production, but useful for testing environments):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        logLevel: debug
        componentLogLevel: "misc:error,upstream:debug"
```

## Debugging Specific Scenarios

Here are the loggers you should enable for common troubleshooting scenarios.

**Requests returning 503 errors**: Focus on `upstream`, `router`, and `connection`. These will show you if the proxy can't connect to the upstream service:

```bash
istioctl proxy-config log my-pod -n my-namespace \
  --level upstream:debug,router:debug,connection:debug
```

Then check the logs:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy --tail=100
```

Look for lines mentioning "no healthy upstream" or "connection failure."

**TLS handshake failures**: The `connection` and `upstream` loggers will show TLS-related errors:

```bash
istioctl proxy-config log my-pod -n my-namespace --level connection:debug
```

You'll see messages about certificate verification, TLS version negotiation, and handshake results.

**Routing not working correctly**: The `http` and `router` loggers show which route was matched and why:

```bash
istioctl proxy-config log my-pod -n my-namespace --level http:debug,router:debug
```

Debug output will include the request headers, which virtual host was matched, and which cluster the request was routed to.

**RBAC/Authorization denied**: Enable the `rbac` logger:

```bash
istioctl proxy-config log my-pod -n my-namespace --level rbac:debug
```

This shows the evaluation of authorization policies, including which policy matched and whether it was an allow or deny.

## Reading Envoy Debug Logs

Envoy debug logs are pretty dense. Here's what a typical debug output looks like and how to parse it:

```bash
# Watch logs in real-time
kubectl logs my-pod -n my-namespace -c istio-proxy -f

# Filter for just connection events
kubectl logs my-pod -n my-namespace -c istio-proxy | grep "\[C\["

# Filter for HTTP events
kubectl logs my-pod -n my-namespace -c istio-proxy | grep "\[C\[" | grep "request\|response"
```

Envoy uses bracketed identifiers like `[C[123]]` for connections and `[S[456]]` for streams. You can trace a single request by following its connection and stream IDs through the log.

## Log Volume Considerations

Debug logging on Envoy generates a huge amount of data. For a service handling 1000 requests per second, debug-level logging could easily produce 10,000+ log lines per second. That's going to impact performance and storage.

Some practical advice:

- Only enable debug on the specific pods you're investigating
- Use targeted loggers instead of enabling debug for everything
- Keep a terminal watching the logs while you reproduce the issue
- Turn it off as soon as you have what you need

```bash
# Reset to default warning level
istioctl proxy-config log my-pod -n my-namespace --level warning
```

## Combining with Access Logs

Envoy debug logs and access logs serve different purposes. Access logs give you a one-line summary per request (status code, latency, upstream info). Debug logs give you the detailed internal workings. For most troubleshooting, you want both:

```bash
# Check access logs (if enabled)
kubectl logs my-pod -n my-namespace -c istio-proxy | grep "\[2"

# Check debug logs for the same timeframe
kubectl logs my-pod -n my-namespace -c istio-proxy --since=30s
```

Envoy debug logging is one of the most valuable troubleshooting tools in the Istio toolkit. The ability to dynamically change log levels without pod restarts makes it practical to use even in production. Just remember to be targeted about which loggers you enable and always clean up when you're done.
