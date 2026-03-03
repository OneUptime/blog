# How to Get Envoy Access Logs for Debugging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Access Logs, Debugging, Troubleshooting

Description: Practical techniques for using Envoy access logs to debug request failures, routing issues, and latency problems in an Istio service mesh.

---

When something goes wrong in an Istio service mesh, Envoy access logs are often the fastest way to figure out what happened. They capture every request flowing through the sidecar proxies, including details about timing, routing decisions, upstream connections, and failure reasons that you will not find anywhere else.

This guide focuses on the practical side: how to get access logs quickly and use them to solve real problems.

## Quick Access Log Retrieval

### Get Logs from a Specific Pod

```bash
kubectl logs <pod-name> -c istio-proxy --tail=100
```

The `-c istio-proxy` flag targets the sidecar container. Without it, you would get the application container logs instead.

### Get Logs from a Deployment

```bash
kubectl logs deploy/my-service -c istio-proxy --tail=50
```

### Stream Logs in Real Time

```bash
kubectl logs -f deploy/my-service -c istio-proxy --tail=0
```

The `--tail=0` starts from the current moment instead of dumping the entire log history.

### Get Logs from All Pods of a Service

```bash
kubectl logs -l app=my-service -c istio-proxy --tail=20 --max-log-requests=10
```

The `--max-log-requests` flag is needed when there are many pods - kubectl limits concurrent log streams by default.

## Enabling Access Logs Temporarily

If access logs are not enabled in your cluster, you can enable them temporarily without changing the mesh-wide config. Use the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: problematic-service
  accessLogging:
    - providers:
        - name: envoy
```

Apply it, do your debugging, then delete it:

```bash
kubectl apply -f debug-logging.yaml
# ... debug ...
kubectl delete -f debug-logging.yaml
```

You can also enable debug-level logging on a specific proxy without access logs:

```bash
istioctl proxy-config log deploy/my-service --level debug
```

This produces much more output than access logs and should only be used for short periods.

## Reading Access Log Entries

A typical access log entry looks like this:

```text
[2026-02-24T10:30:45.123Z] "GET /api/users HTTP/1.1" 503 UF via_upstream - "-" 0 91 3005 - "-" "python-requests/2.28.0" "a1b2c3d4-e5f6-7890" "user-service.default.svc.cluster.local" "10.244.2.15:8080" outbound|8080||user-service.default.svc.cluster.local 10.244.1.12:44556 10.96.123.45:8080 10.244.1.12:33444 - default
```

Breaking this down:

- **Timestamp**: `[2026-02-24T10:30:45.123Z]`
- **Request**: `"GET /api/users HTTP/1.1"`
- **Response code**: `503`
- **Response flags**: `UF` (upstream connection failure)
- **Response code details**: `via_upstream`
- **Upstream failure reason**: `-`
- **Bytes received/sent**: `0` / `91`
- **Duration**: `3005` ms
- **Upstream service time**: `-` (not available because upstream failed)
- **Upstream host**: `"10.244.2.15:8080"` (the pod that was attempted)
- **Upstream cluster**: `outbound|8080||user-service.default.svc.cluster.local`

## Debugging Specific Problems

### Finding Failed Requests

Filter for non-200 responses:

```bash
kubectl logs deploy/my-service -c istio-proxy | grep -v '" 200 '
```

Or more specifically for 5xx errors:

```bash
kubectl logs deploy/my-service -c istio-proxy | grep -E '" 5[0-9]{2} '
```

### Debugging 503 Errors

503 errors in Istio usually come with response flags that tell you the cause. Look for the flags field:

```bash
kubectl logs deploy/my-service -c istio-proxy | grep '" 503 ' | awk '{print $7}'
```

Common 503 response flags:
- `UF` - Upstream connection failure (the destination pod could not be reached)
- `UH` - No healthy upstream (all pods are marked unhealthy)
- `UC` - Upstream connection termination (connection was reset)
- `UT` - Upstream request timeout
- `NR` - No route configured (missing VirtualService or DestinationRule)

### Debugging Latency Issues

Find slow requests by looking at the duration field:

```bash
# Find requests slower than 1 second (duration > 1000ms)
kubectl logs deploy/my-service -c istio-proxy | awk '{
  for(i=1;i<=NF;i++) {
    if($i ~ /^[0-9]+$/ && $(i-1) ~ /^[0-9]+$/) {
      duration=$i
      if(duration > 1000) print $0
    }
  }
}'
```

With JSON access logs, this is easier:

```bash
kubectl logs deploy/my-service -c istio-proxy | jq 'select(.duration > 1000)'
```

### Debugging Routing Issues

Check which upstream host is handling requests:

```bash
kubectl logs deploy/my-service -c istio-proxy | grep '/api/users' | awk '{for(i=1;i<=NF;i++) if($i ~ /^"[0-9]+\.[0-9]+/) print $i}'
```

If all requests are going to the same pod when you expect load balancing, check your DestinationRule for session affinity settings.

### Tracing a Request Across Services

Use the request ID to trace a single request across multiple services:

```bash
# Get the request ID from the initial log entry
# Example: "a1b2c3d4-e5f6-7890"

# Search for it in other services
kubectl logs -l app=user-service -c istio-proxy | grep "a1b2c3d4-e5f6-7890"
kubectl logs -l app=database-proxy -c istio-proxy | grep "a1b2c3d4-e5f6-7890"
```

The request ID is propagated by Istio through the `x-request-id` header, so you can follow a request through the entire call chain.

## Using istioctl for Log Analysis

The `istioctl` tool has some useful commands for proxy debugging:

```bash
# Check proxy configuration status
istioctl proxy-status

# Look at listener configuration
istioctl proxy-config listener deploy/my-service

# Check cluster (upstream) configuration
istioctl proxy-config cluster deploy/my-service

# Check routes
istioctl proxy-config route deploy/my-service

# Check endpoints
istioctl proxy-config endpoint deploy/my-service --cluster "outbound|8080||user-service.default.svc.cluster.local"
```

These commands show the Envoy configuration that determines how requests are routed. If access logs show unexpected routing behavior, comparing the proxy config with your Istio resources (VirtualService, DestinationRule) will reveal misconfigurations.

## JSON Logs for Easier Debugging

If you are doing a lot of debugging, switch to JSON access logs temporarily. They are much easier to filter and parse:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-json-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: problematic-service
  accessLogging:
    - providers:
        - name: envoy
```

Combined with mesh config for JSON encoding:

```yaml
meshConfig:
  accessLogEncoding: JSON
```

Then you can use `jq` for powerful filtering:

```bash
# Find all 503 errors with their response flags
kubectl logs deploy/my-service -c istio-proxy | jq 'select(.response_code == 503) | {path, response_code, response_flags, upstream_host, duration}'

# Find slow requests to a specific path
kubectl logs deploy/my-service -c istio-proxy | jq 'select(.duration > 2000 and .path | startswith("/api/"))'

# Get a summary of response codes
kubectl logs deploy/my-service -c istio-proxy | jq -s 'group_by(.response_code) | map({code: .[0].response_code, count: length})'
```

## Comparing Inbound vs Outbound Logs

Each sidecar generates both inbound logs (for requests arriving at the pod) and outbound logs (for requests leaving the pod). You can distinguish them by the upstream cluster name:

- Inbound: `inbound|8080||`
- Outbound: `outbound|8080||destination-service.namespace.svc.cluster.local`

When debugging a failing request:

1. Check the **outbound** log on the source service to see what was sent
2. Check the **inbound** log on the destination service to see what was received
3. Compare response codes and timing between the two

If the outbound log shows a 503 but there is no corresponding inbound log on the destination, the request never reached the destination pod. This points to network issues, pod crashes, or Envoy routing problems.

## Practical Debugging Workflow

When you get a report of failures:

1. Start with `kubectl logs deploy/failing-service -c istio-proxy --tail=100 | grep -v '" 200 '` to get a quick view of errors
2. Identify the response flags to narrow down the cause
3. Check the upstream host to see if a specific pod is the problem
4. Use the request ID to trace the request through the call chain
5. Use `istioctl proxy-config` if routing looks wrong
6. Check pod health and resource usage if upstream failures are happening

Access logs are the ground truth for what is happening in your mesh. They are more detailed than metrics (which are aggregated) and more reliable than application logs (which might not capture proxy-level failures). Make sure you know how to get them quickly when you need them.
