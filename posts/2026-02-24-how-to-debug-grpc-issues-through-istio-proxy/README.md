# How to Debug gRPC Issues Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC, Debugging, Envoy, Kubernetes, Troubleshooting

Description: A hands-on guide to debugging gRPC issues when traffic flows through Istio's Envoy proxy, covering access logs, stats, config dumps, and common failure modes.

---

Debugging gRPC through Istio can be frustrating. Your application logs might show a generic "UNAVAILABLE" error, but the actual problem could be a timeout, a TLS mismatch, a misconfigured VirtualService, or a dozen other things. The Envoy proxy has detailed information about what happened, but you need to know where to look.

## Enable Access Logging

The first thing to do is turn on Envoy access logs. By default, they might not be enabled or might only log to a file. Enable them in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

Or patch the existing config:

```bash
kubectl patch cm istio -n istio-system --type merge -p '{"data":{"mesh":"accessLogFile: /dev/stdout\naccessLogEncoding: JSON"}}'
```

After enabling, you will see access logs in the istio-proxy container:

```bash
kubectl logs <pod-name> -c istio-proxy
```

## Reading gRPC Access Logs

A gRPC access log entry looks something like this:

```json
{
  "authority": "grpc-backend.default.svc.cluster.local:50051",
  "method": "POST",
  "path": "/mypackage.MyService/GetItem",
  "protocol": "HTTP/2",
  "response_code": 200,
  "grpc_status": "0",
  "response_flags": "-",
  "duration": 45,
  "upstream_host": "10.244.1.5:50051",
  "upstream_cluster": "outbound|50051||grpc-backend.default.svc.cluster.local"
}
```

Key fields to focus on:

- `response_code` - HTTP status code (usually 200 for gRPC, even for errors)
- `grpc_status` - the actual gRPC status code
- `response_flags` - why the response was generated (see below)
- `duration` - total time in milliseconds
- `upstream_host` - which backend pod handled the request
- `upstream_cluster` - the Envoy cluster name

## Response Flags Explained

Response flags tell you what went wrong. For gRPC issues, the most common ones are:

- `-` - no flags, request completed normally
- `UF` - upstream connection failure
- `UO` - upstream overflow (circuit breaker tripped)
- `UT` - upstream request timeout
- `DC` - downstream connection termination
- `DT` - downstream request timed out (gRPC deadline exceeded)
- `NR` - no route configured
- `URX` - upstream retry limit exceeded
- `RL` - rate limited
- `UAEX` - unauthorized (external authorization denied)

If you see `NR`, there is no VirtualService or route matching the request. If you see `UF`, the upstream pod is unreachable.

## Checking Envoy Stats

Envoy exposes detailed statistics. Access them from inside the pod:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats
```

There are thousands of stats. Filter for what you need:

```bash
# gRPC-specific stats
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "grpc"

# Stats for a specific upstream
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "grpc-backend"

# Connection errors
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "cx_connect_fail"

# Timeout stats
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "timeout"

# Circuit breaker stats
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "overflow"
```

## Inspecting the Envoy Config

Sometimes the problem is in the Envoy configuration itself. Dump it and search for your service:

```bash
# Full config dump
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET config_dump > config.json

# Check route configuration
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET config_dump?resource=dynamic_route_configs

# Check cluster configuration
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET config_dump?resource=dynamic_active_clusters
```

Look for your gRPC service in the routes. If it is missing, the VirtualService is not being applied correctly. Check that the host matches and the namespace is right.

## Using istioctl for Debugging

`istioctl` has powerful debugging commands:

```bash
# Check if the proxy config is synced
istioctl proxy-status

# View the proxy configuration for a specific pod
istioctl proxy-config routes <pod-name>

# Check clusters (upstream destinations)
istioctl proxy-config clusters <pod-name>

# Check endpoints
istioctl proxy-config endpoints <pod-name> --cluster "outbound|50051||grpc-backend.default.svc.cluster.local"

# Check listeners
istioctl proxy-config listeners <pod-name>
```

The `proxy-config endpoints` command is especially useful. It shows you which backend pods Envoy knows about and their health status:

```bash
istioctl proxy-config endpoints <pod-name> | grep grpc-backend
```

If the endpoints list is empty, Envoy does not know about any backends. This usually means the Service selector does not match any pods, or the endpoints are not being propagated.

## Common gRPC Issues and Solutions

### Issue: UNAVAILABLE error immediately

The gRPC client gets `UNAVAILABLE` right away without any delay.

**Possible causes:**
1. No route to the backend (check with `istioctl proxy-config routes`)
2. Circuit breaker is tripped (check overflow stats)
3. All endpoints are ejected (check outlier detection stats)

```bash
# Check if endpoints exist
istioctl proxy-config endpoints <client-pod> | grep grpc-backend

# Check for circuit breaker overflow
kubectl exec -it <client-pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_pending_overflow"
```

### Issue: DEADLINE_EXCEEDED with no response

The client times out but the server never received the request.

**Possible causes:**
1. mTLS mismatch between client and server
2. Port name wrong (not recognized as gRPC)
3. Sidecar not injected on server side

```bash
# Check mTLS status
istioctl authn tls-check <client-pod> grpc-backend.default.svc.cluster.local

# Verify sidecar injection
kubectl get pod <server-pod> -o jsonpath='{.spec.containers[*].name}'
```

### Issue: Intermittent failures during deployments

Requests fail when pods are being rolled out.

**Possible causes:**
1. Pods receiving traffic before the application is ready
2. Pods removed from service before draining connections

Add a preStop hook and configure holdApplicationUntilProxyStarts:

```yaml
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
        - name: grpc-backend
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
```

### Issue: gRPC-specific errors are masked as HTTP 200

gRPC returns errors as HTTP 200 with the error in the `grpc-status` trailer. If you are monitoring only HTTP status codes, you will miss gRPC errors.

Check the access logs for the `grpc_status` field, and use Prometheus queries that filter on `grpc_response_status`:

```promql
sum(rate(istio_requests_total{request_protocol="grpc", grpc_response_status!="0"}[5m])) by (destination_service_name, grpc_response_status)
```

## Increasing Log Verbosity

If the access logs and stats are not enough, you can increase the Envoy log level:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request POST 'logging?level=debug'
```

Warning: debug logging is very verbose and can impact performance. Use it briefly and then reset:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request POST 'logging?level=warning'
```

For gRPC-specific debugging, set only the relevant loggers:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request POST 'logging?http2=debug&grpc=debug&connection=debug'
```

Debugging gRPC through Istio takes patience, but the tools are there. Start with access logs and response flags, move to Envoy stats and `istioctl proxy-config`, and only reach for debug logging as a last resort. Most gRPC issues in Istio come down to three things: wrong port naming, mTLS mismatches, or timeout misconfiguration.
