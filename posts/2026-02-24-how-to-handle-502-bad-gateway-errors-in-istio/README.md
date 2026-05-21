# How to Handle 502 Bad Gateway Errors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, 502 Error, Troubleshooting, Kubernetes, Envoy

Description: A troubleshooting guide for diagnosing and fixing 502 Bad Gateway errors in Istio service mesh with practical debugging steps and configuration fixes.

---

502 Bad Gateway errors in Istio are one of the most common and frustrating issues you will encounter. The error means the Envoy sidecar proxy received an invalid response from the upstream service, or could not connect to it at all. The tricky part is that "502" in Istio can mean several different things depending on what triggered it.

This guide walks through the most common causes and how to fix each one.

## Understanding What Causes 502 in Istio

When Envoy returns a gateway or upstream error such as 502 or 503, it adds a response flag that tells you what happened. You can see this flag in the access logs. Here are the common ones:

- `UF` - Upstream connection failure (could not connect at all)
- `UH` - No healthy upstream hosts
- `UC` - Upstream connection termination
- `UR` - Upstream remote reset (connection reset by the upstream)
- `UO` - Upstream overflow (circuit breaking)
- `DF` - DNS resolution failure
- `NR` - No route configured, which usually returns 404 rather than 502

Enable access logs if you have not already:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Then check the logs:

```bash
kubectl logs <pod-name> -c istio-proxy | grep -E " 5[0-9][0-9] "
```

The response flag in the access log will tell you which category of upstream failure you are dealing with.

## Cause 1: Pod Not Ready During Deployment

The most common cause of 502 errors is traffic being sent to a pod that is not ready yet. During a rolling deployment, Kubernetes adds the new pod to the Service endpoints as soon as the readiness probe passes. But the Envoy sidecar might not have caught up yet, or the application might not be fully initialized.

Fix this by configuring a proper readiness probe:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          image: my-service:latest
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
```

Also configure the application container to wait until the Istio sidecar proxy has started:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
        - name: my-service
          image: my-service:latest
```

Or set it globally in the mesh config:

```bash
istioctl install --set meshConfig.defaultConfig.holdApplicationUntilProxyStarts=true
```

## Cause 2: Connection Reset During Scale-Down

When a pod is being terminated, it receives a SIGTERM signal. If the application does not handle this gracefully, existing connections get reset, causing 502 errors.

Make sure your application handles graceful shutdown, and add a `preStop` hook to give Envoy time to drain connections:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          image: my-service:latest
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
      terminationGracePeriodSeconds: 30
```

The 5-second sleep gives endpoint updates and Envoy clients time to stop sending new requests to the pod before the application starts shutting down.

## Cause 3: Upstream Connection Pool Exhaustion

If your service gets more traffic than it can handle, the Envoy connection pool fills up and new requests can fail with upstream overflow. Check if this is happening:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep -E "upstream_cx_overflow|upstream_rq_pending_overflow"
```

If you see non-zero values, increase the connection pool:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
        maxRequestsPerConnection: 0
```

Setting `maxRequestsPerConnection: 0` means unlimited requests per connection, which reduces connection churn.

## Cause 4: Idle Connection Timeout Mismatch

This is a subtle but very common cause. If your application closes idle connections before Envoy does, Envoy will try to reuse a connection that the application has already closed, resulting in a 502.

The fix is to make sure the application's idle timeout is longer than Envoy's:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: idle-timeout
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        idleTimeout: 60s
```

Make sure your application's keep-alive timeout is set to something longer than 60 seconds (or whatever you configure here).

## Cause 5: Missing or Wrong Service Port Names

Istio uses the port name or Kubernetes `appProtocol` field in your Kubernetes Service to determine the protocol. If neither value identifies the protocol, Istio might handle the traffic incorrectly:

```yaml
# Wrong - no protocol prefix

apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - name: web
      port: 80
      targetPort: 8080

# Correct - has protocol prefix
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - name: http-web
      port: 80
      targetPort: 8080
```

Valid protocol prefixes include `http`, `http2`, `https`, `grpc`, `grpc-web`, `tcp`, and `tls`.

## Cause 6: mTLS Configuration Mismatch

If some services have mTLS enabled and others do not, you can get 502 errors when a service tries to connect using TLS to a service that expects plain text, or vice versa.

Check the mTLS status:

```bash
istioctl x describe service my-service.default.svc.cluster.local
```

Make sure your PeerAuthentication policy matches what your services are actually using:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

Use `STRICT` when callers are in the mesh and send mTLS, and `PERMISSIVE` when the workload must accept both plaintext and mTLS traffic.

## Cause 7: DNS Resolution Failures

If the upstream service hostname cannot be resolved, requests can fail with a 5xx and the `DF` response flag. This can happen with external services or when ServiceEntry resources are missing:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "dns"
```

For external services, make sure you have a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external-service.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Quick Debugging Checklist

When you see 502 errors, run through this checklist:

```bash
# 1. Check access logs for response flags
kubectl logs <pod-name> -c istio-proxy --tail=50

# 2. Check Envoy stats for connection issues
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep -E "upstream_cx|upstream_rq"

# 3. Check if the upstream pods are healthy
kubectl get pods -l app=my-service
kubectl describe pod <upstream-pod>

# 4. Check Envoy clusters
istioctl proxy-config clusters <pod-name> -n default

# 5. Check for config errors
istioctl analyze -n default

# 6. Check if the upstream endpoints are registered
istioctl proxy-config endpoints <pod-name> -n default | grep my-service
```

## Summary

Gateway and upstream errors in Istio are often caused by one of these issues: pods not ready during deployment, connection resets during scale-down, connection pool exhaustion, idle timeout mismatches, wrong port names, mTLS misconfigurations, or DNS failures. The access log response flags are your best friend for narrowing down the cause. Start there, then use `istioctl proxy-config` and Envoy stats to dig deeper.
