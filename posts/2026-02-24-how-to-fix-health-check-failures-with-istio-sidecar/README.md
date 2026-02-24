# How to Fix Health Check Failures with Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Checks, Kubernetes, Sidecar, Troubleshooting

Description: How to resolve health check failures that occur when Istio sidecar proxies interfere with Kubernetes health probes.

---

Health checks are a critical part of Kubernetes. Liveness probes determine if a container needs to be restarted, and readiness probes decide if a pod should receive traffic. When you add an Istio sidecar, these probes can break in unexpected ways. The kubelet sends health check requests directly to the pod, and the sidecar can intercept or interfere with them.

## How Istio Handles Health Probes

By default, Istio rewrites health check probes. When the sidecar injector adds the proxy to your pod, it modifies the probe configuration so that health checks go through the sidecar's pilot-agent process instead of directly to your application.

The original probe:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
```

Gets rewritten to:

```yaml
livenessProbe:
  httpGet:
    path: /app-health/my-app/livez
    port: 15021
```

Pilot-agent then forwards the request to the original path and port. This rewriting happens automatically and usually works fine. But when it breaks, here's how to fix it.

## Check If Probe Rewriting Is Working

Look at the actual pod spec to see what the probe was rewritten to:

```bash
kubectl get pod <pod-name> -n my-namespace -o yaml | grep -A 5 "livenessProbe\|readinessProbe"
```

If you see probes pointing to port 15021 with paths like `/app-health/...`, the rewriting is active.

Test the health endpoint manually:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15021/app-health/my-app/livez
```

If this returns an error, the problem is in the forwarding between pilot-agent and your application.

## mTLS Blocking Health Checks

When you have STRICT mTLS enabled, the kubelet (which doesn't have an Istio certificate) can't make direct HTTPS/HTTP calls to the pod's application port. This is why Istio rewrites probes to go through the pilot-agent on port 15021, which is excluded from mTLS.

If probe rewriting is disabled (either globally or per pod), health checks will fail with STRICT mTLS because the kubelet sends plaintext HTTP but the sidecar expects mTLS.

Check if probe rewriting is enabled globally:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml | grep rewriteAppHTTPProbe
```

If it's set to `false`, enable it:

```yaml
data:
  values: |
    sidecarInjectorWebhook:
      rewriteAppHTTPProbe: true
```

Or enable it per pod with an annotation:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "true"
```

## TCP Probes and Istio

TCP probes are handled differently. The kubelet opens a TCP connection to the specified port. With Istio, this connection goes through the sidecar's iptables rules.

```yaml
livenessProbe:
  tcpSocket:
    port: 8080
```

TCP probes usually work fine with Istio because the kubelet connects from localhost and the sidecar's inbound listener handles the connection. But if the sidecar isn't ready yet (during startup), TCP probes to application ports will fail because the iptables rules redirect the connection to the sidecar, which isn't listening.

The fix is to use startup probes with generous timeouts:

```yaml
startupProbe:
  tcpSocket:
    port: 8080
  failureThreshold: 30
  periodSeconds: 2
```

## gRPC Probes and Istio

Kubernetes supports native gRPC health probes. These work with Istio, but the probe rewriting behaves differently:

```yaml
livenessProbe:
  grpc:
    port: 50051
```

With Istio's probe rewriting enabled, the gRPC probe goes through pilot-agent which forwards it to the application. Make sure your gRPC service implements the standard health checking protocol:

```protobuf
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
}
```

## Exec Probes: A Simple Workaround

If HTTP probes keep failing because of sidecar interference, you can switch to exec probes that bypass the network entirely:

```yaml
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health | grep 200
  initialDelaySeconds: 10
  periodSeconds: 10
```

Since this runs inside the container, it uses localhost and bypasses the iptables rules (usually). However, exec probes have higher overhead because they spawn a new process each time.

## Port Exclusion for Health Checks

You can tell Istio to exclude specific ports from sidecar interception. If your health check port is separate from your application port, exclude it:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "8081"
```

Now port 8081 bypasses the sidecar entirely. Configure your health check to use that port:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8081
readinessProbe:
  httpGet:
    path: /ready
    port: 8081
```

## The Sidecar Readiness Problem

There's a chicken-and-egg problem with readiness probes. The pod's readiness depends on both the application container and the sidecar container being ready. If the application container becomes ready but the sidecar isn't, traffic reaches the pod but can't be processed.

Istio adds a readiness probe to the sidecar container:

```yaml
readinessProbe:
  httpGet:
    path: /healthz/ready
    port: 15021
```

You can check sidecar readiness directly:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15021/healthz/ready
```

If this returns a non-200 response, the sidecar isn't ready. Common reasons:
- Still connecting to Istiod
- Waiting for initial configuration
- Certificate provisioning in progress

## Health Check Timeouts

When health checks go through the sidecar, they add a small amount of latency. If your probe timeout is very tight, this extra latency might push it over:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  timeoutSeconds: 1  # Might be too tight with sidecar overhead
```

Increase the timeout:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  timeoutSeconds: 5
  periodSeconds: 10
```

## Debugging Health Check Failures

When health checks fail and you're not sure why, check the kubelet events:

```bash
kubectl describe pod <pod-name> -n my-namespace | grep -A 5 "Unhealthy\|Liveness\|Readiness"
```

Also check the pilot-agent logs for health check forwarding errors:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i "health\|probe\|app-health"
```

## Summary

Health check failures with Istio sidecars are usually caused by mTLS blocking the kubelet's plaintext requests. The solution is Istio's probe rewriting feature, which routes health checks through pilot-agent. Make sure `rewriteAppHTTPProbers` is enabled, give probes generous timeouts to account for sidecar overhead, and consider using startup probes to handle the initial sidecar bootstrap delay. If all else fails, exec probes or port exclusions are reliable workarounds.
