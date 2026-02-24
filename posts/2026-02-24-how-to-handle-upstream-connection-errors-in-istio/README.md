# How to Handle Upstream Connection Errors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Errors, Troubleshooting, Envoy, Kubernetes

Description: How to diagnose and fix upstream connection errors in Istio service mesh including connection refused, reset, and timeout issues with practical debugging commands.

---

Upstream connection errors in Istio show up as 503 errors with response flags like `UF` (upstream connection failure), `UH` (no healthy upstream), or `UC` (upstream connection termination). These errors mean the Envoy sidecar proxy could not establish or maintain a connection to the service it was trying to reach. They are different from application-level errors because the request never even made it to your code.

Understanding the different types of upstream connection errors and how to fix them will save you hours of debugging.

## Types of Upstream Connection Errors

Envoy tracks several distinct connection error conditions. Each one has a different response flag in the access logs:

- **UF** - Upstream connection failure. TCP connection could not be established.
- **UH** - No healthy upstream. All endpoints are ejected by outlier detection.
- **UC** - Upstream connection termination. Connection was established but then closed unexpectedly.
- **UR** - Upstream remote reset. The upstream sent a TCP RST.
- **UO** - Upstream overflow. The connection pool is full.

## Diagnosing the Error

First, enable access logging and check the response flags:

```bash
kubectl logs <pod-name> -c istio-proxy --tail=100
```

Look for lines with 503 status codes. The response flag tells you what happened. A typical log line looks like:

```
[2026-02-24T10:00:00.000Z] "GET /api/data HTTP/1.1" 503 UF 0 91 5 - "-" "curl/7.68.0" "abc-123" "my-service.default.svc.cluster.local:8080" "-" - - 10.0.0.5:8080 10.0.0.3:45678 - default
```

The `UF` after `503` tells you this was an upstream connection failure.

## Fixing UF - Upstream Connection Failure

The most common reasons for UF errors:

**1. The upstream pod is not listening on the expected port:**

```bash
# Check what port the service expects
kubectl get svc my-service -o yaml | grep -A3 ports

# Check what port the container actually listens on
kubectl exec <pod-name> -c my-service -- ss -tlnp
```

Make sure the Service `targetPort` matches the port your application actually listens on.

**2. The pod is not ready:**

```bash
kubectl get pods -l app=my-service -o wide
kubectl describe pod <pod-name>
```

Look for pods in CrashLoopBackOff or containers that are not passing readiness probes.

**3. Network policy is blocking the connection:**

```bash
kubectl get networkpolicies -n default
```

If you have NetworkPolicies, make sure they allow traffic from the Envoy sidecar (source port can vary) to the application port.

**4. The sidecar is not injected on the target pod:**

```bash
kubectl get pod <target-pod> -o jsonpath='{.spec.containers[*].name}'
```

If you do not see `istio-proxy` in the container list, sidecar injection is missing. Add the label to the namespace:

```bash
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment my-service -n default
```

## Fixing UH - No Healthy Upstream

UH means the outlier detection has ejected all endpoints. This happens when all pods are returning errors:

```bash
# Check how many endpoints are healthy
istioctl proxy-config endpoints <calling-pod> -n default | grep my-service

# Check outlier detection stats
kubectl exec <calling-pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "outlier_detection"
```

If outlier detection is too aggressive, it might eject pods that are only temporarily having issues. Tune the settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 15s
      maxEjectionPercent: 30
```

Increasing `consecutive5xxErrors` from 5 to 10 gives pods more room for transient errors before being ejected. Setting `maxEjectionPercent: 30` ensures at least 70% of your pods are always in the pool.

## Fixing UC - Upstream Connection Termination

UC errors happen when the connection is established but then the upstream closes it. Common causes:

**1. Application crashes while processing the request:**

```bash
kubectl logs <pod-name> -c my-service --previous
```

Check for panic/crash logs. The `--previous` flag shows logs from the previous container if it crashed.

**2. Keep-alive timeout mismatch:**

If the application closes idle connections before Envoy does, Envoy might try to use a closed connection. Fix this by adjusting the idle timeout:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 1
```

Setting `maxRequestsPerConnection: 1` forces a new connection for every request, which avoids the keep-alive issue entirely. This adds some overhead but eliminates connection reuse errors. For a less aggressive fix, make sure your application's keep-alive timeout is longer than Envoy's.

**3. Resource limits causing OOMKill:**

```bash
kubectl describe pod <pod-name> | grep -A5 "Last State"
```

If the container is being OOM-killed, increase memory limits.

## Fixing UO - Upstream Overflow

UO means the connection pool or pending request queue is full:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_pending_overflow"
```

Increase the connection pool limits:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 500
```

But also investigate why you need so many connections. High connection counts often indicate the upstream is slow and requests are piling up. Fixing the slowness is better than just raising limits.

## Fixing UR - Upstream Remote Reset

UR means the upstream sent a TCP RST. This often happens during pod termination:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
        - name: my-service
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
      terminationGracePeriodSeconds: 30
```

The `preStop` sleep gives Envoy time to stop routing new requests to the pod before the application starts shutting down.

## Connection Retry Configuration

For transient connection errors, configure retries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: connect-failure,reset,refused-stream
```

The `connect-failure` retry policy handles UF errors, and `reset` handles UR errors. These are safe to retry because the request never reached the application.

## Comprehensive Debugging Script

Here is a sequence of commands that covers the most common debugging steps:

```bash
# Check the calling pod's Envoy stats
kubectl exec <calling-pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_cx"

# Check endpoint health
istioctl proxy-config endpoints <calling-pod> -n default --cluster "outbound|80||my-service.default.svc.cluster.local"

# Check cluster configuration
istioctl proxy-config clusters <calling-pod> -n default | grep my-service

# Check for configuration errors
istioctl analyze -n default

# Check the target service's Envoy listener
istioctl proxy-config listeners <target-pod> -n default

# Verify mTLS configuration
istioctl x describe pod <target-pod>.default
```

## Summary

Upstream connection errors in Istio come in several flavors, and each one has a different root cause and fix. The response flags in the access logs are the most important diagnostic tool. UF means the connection could not be established (check ports and pods), UH means all endpoints are ejected (tune outlier detection), UC means the connection was terminated (check keep-alive settings), and UO means the pool is full (increase limits or fix slowness). Always configure retries for `connect-failure` and `reset` since those errors are safe to retry automatically.
