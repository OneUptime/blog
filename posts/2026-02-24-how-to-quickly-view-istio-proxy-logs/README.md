# How to Quickly View Istio Proxy Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Logging, Debugging, Kubernetes, Service Mesh

Description: How to view, filter, and configure Istio sidecar proxy logs for effective debugging and troubleshooting in your service mesh.

---

When something goes wrong in your Istio service mesh, the proxy logs are often the first place to look. Every sidecar proxy (Envoy) generates logs about the requests it handles, the connections it makes, and any errors it encounters. Knowing how to access, read, and configure these logs will save you a lot of time during troubleshooting.

Here is a practical guide to working with Istio proxy logs.

## Viewing Proxy Logs for a Pod

The sidecar proxy runs as a container named `istio-proxy` in every meshed pod. View its logs with kubectl:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy
```

For real-time streaming:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy -f
```

To see only the last N lines:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy --tail=100
```

If the pod has been restarted, check the previous container's logs:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy --previous
```

## Understanding the Access Log Format

By default, Istio configures Envoy to log each request in a text format. A typical log line looks like:

```
[2024-03-15T10:30:45.123Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 15 14 "-" "curl/7.88.1" "abc-def-123" "my-service.default.svc.cluster.local:8080" "10.244.1.15:8080" inbound|8080|| 10.244.2.20:54321 10.244.1.15:8080 10.244.2.20:0 - default
```

Breaking that down:

- `[2024-03-15T10:30:45.123Z]` - Timestamp
- `"GET /api/users HTTP/1.1"` - Request method, path, and protocol
- `200` - Response status code
- `via_upstream` - Response flags
- `0` - Bytes received
- `1234` - Bytes sent
- `15` - Duration in milliseconds
- `14` - Upstream service time in milliseconds
- `"curl/7.88.1"` - User agent
- `"abc-def-123"` - Request ID (for tracing)
- `"my-service.default..."` - Upstream host
- `"10.244.1.15:8080"` - Upstream cluster address
- `inbound|8080||` - Route name

## Important Response Flags

The response flags field is one of the most useful parts of the log. Here are the ones you will see most often:

| Flag | Meaning |
|------|---------|
| `-` | Normal response, no issues |
| `DC` | Downstream connection termination |
| `DI` | Request delayed (fault injection) |
| `FI` | Request aborted (fault injection) |
| `LH` | Local service failed health check |
| `LR` | Connection local reset |
| `NR` | No route configured |
| `RL` | Rate limited |
| `UF` | Upstream connection failure |
| `UH` | No healthy upstream |
| `UO` | Upstream overflow (circuit breaking) |
| `UR` | Upstream remote reset |
| `URX` | Upstream retry limit exceeded |
| `UC` | Upstream connection termination |

If you see `NR` (no route), your VirtualService is probably misconfigured. `UH` (no healthy upstream) means all endpoints are down or ejected by outlier detection. `UO` means circuit breaking kicked in.

## Enabling Access Logging

If access logs are not showing up, you might need to enable them. Create a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

This enables access logging mesh-wide. For a specific namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Or for a specific workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  accessLogging:
    - providers:
        - name: envoy
```

## Changing the Log Level

Envoy has different log levels for different components. Change the log level dynamically without restarting the pod:

```bash
istioctl proxy-config log deploy/my-app -n default --level debug
```

This sets all components to debug level, which is very verbose. For more targeted debugging, set specific component levels:

```bash
istioctl proxy-config log deploy/my-app -n default \
  --level connection:debug,router:debug,http:debug
```

Available components include: `admin`, `aws`, `assert`, `backtrace`, `client`, `config`, `connection`, `conn_handler`, `dubbo`, `file`, `filter`, `forward_proxy`, `grpc`, `http`, `http2`, `init`, `io`, `jwt`, `kafka`, `lua`, `main`, `misc`, `pool`, `quic`, `rbac`, `redis`, `router`, `runtime`, `stats`, `secret`, `tap`, `testing`, `tracing`, `upstream`, `udp`, `wasm`.

Reset to the default level:

```bash
istioctl proxy-config log deploy/my-app -n default --level warning
```

## Filtering Logs

When proxy logs are noisy, use grep to filter for what you need:

```bash
# Show only error responses (5xx)
kubectl logs deploy/my-app -n default -c istio-proxy | grep '" 5[0-9][0-9] '

# Show only a specific path
kubectl logs deploy/my-app -n default -c istio-proxy | grep "/api/users"

# Show only requests with response flags (errors)
kubectl logs deploy/my-app -n default -c istio-proxy | grep -v '" - "'

# Show requests that took longer than 1 second
kubectl logs deploy/my-app -n default -c istio-proxy | awk '{if ($(NF-5) > 1000) print $0}'
```

## JSON Log Format

For better parsing, you can configure Envoy to output logs in JSON format. This is done through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogEncoding: JSON
    accessLogFile: /dev/stdout
```

JSON logs are easier to parse with tools like `jq`:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy | \
  jq 'select(.response_code >= 500)'
```

```bash
kubectl logs deploy/my-app -n default -c istio-proxy | \
  jq '{method: .method, path: .path, status: .response_code, duration: .duration}'
```

## Viewing istiod Logs

Do not forget about the control plane logs. If sidecars are not getting configuration updates or there are XDS errors, check istiod:

```bash
kubectl logs deploy/istiod -n istio-system --tail=100
```

For debug-level control plane logs:

```bash
kubectl logs deploy/istiod -n istio-system --tail=100 | grep -i error
```

## Checking Specific Error Patterns

Here are some common patterns to look for:

```bash
# Connection refused - upstream service not reachable
kubectl logs deploy/my-app -n default -c istio-proxy | grep "connection_refused"

# TLS handshake failures
kubectl logs deploy/my-app -n default -c istio-proxy | grep -i "tls\|ssl\|handshake"

# Upstream timeouts
kubectl logs deploy/my-app -n default -c istio-proxy | grep "timeout"

# RBAC denials
kubectl logs deploy/my-app -n default -c istio-proxy | grep "rbac"

# No healthy upstream
kubectl logs deploy/my-app -n default -c istio-proxy | grep "no_healthy_upstream"
```

## Aggregating Logs Across Pods

When a deployment has multiple replicas, you want logs from all of them:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy --all-containers=false --prefix=true
```

The `--prefix=true` flag adds the pod name to each log line, so you can tell which pod generated each message.

For a broader view across all pods in a namespace:

```bash
kubectl logs -n default -l app=my-app -c istio-proxy --tail=50
```

## Quick Log Diagnostic Script

Here is a handy script for quick log diagnostics:

```bash
#!/bin/bash
DEPLOY=${1:-my-app}
NS=${2:-default}
LINES=${3:-200}

echo "=== Last $LINES proxy log lines for $DEPLOY in $NS ==="
echo ""

echo "--- Error responses (4xx/5xx) ---"
kubectl logs deploy/$DEPLOY -n $NS -c istio-proxy --tail=$LINES | grep -E '" [45][0-9][0-9] ' | tail -10

echo ""
echo "--- Response flags (non-normal) ---"
kubectl logs deploy/$DEPLOY -n $NS -c istio-proxy --tail=$LINES | grep -vE '" - "|- via_upstream -' | tail -10

echo ""
echo "--- Slow requests (>1s) ---"
kubectl logs deploy/$DEPLOY -n $NS -c istio-proxy --tail=$LINES | awk '{for(i=1;i<=NF;i++) if ($i ~ /^[0-9]+$/ && $i > 1000) {print; break}}' | tail -10
```

Save it as `proxy-logs.sh` and run with `./proxy-logs.sh my-app default 500`. This gives you a focused view of problematic requests from the proxy logs.
