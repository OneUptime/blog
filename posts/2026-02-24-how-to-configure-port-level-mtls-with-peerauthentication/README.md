# How to Configure Port-Level mTLS with PeerAuthentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, PeerAuthentication, Port Configuration, Security

Description: Learn how to set different mTLS modes for different ports on the same workload using Istio PeerAuthentication portLevelMtls.

---

Not every port on a service needs the same mTLS treatment. Maybe your main application port needs strict mTLS, but your metrics port needs to accept plain text from Prometheus. Or maybe you have a health check endpoint that external load balancers hit without TLS. Istio's `portLevelMtls` field in PeerAuthentication lets you set different mTLS modes for individual ports on a workload.

## The portLevelMtls Field

The `portLevelMtls` field is a map where keys are port numbers (as integers) and values are objects with a `mode` field. It sits alongside the top-level `mtls` field:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
    15014:
      mode: DISABLE
```

In this example:
- Port 9090 accepts both mTLS and plain text (PERMISSIVE).
- Port 15014 accepts only plain text (DISABLE).
- All other ports require mTLS (STRICT, from the top-level `mtls.mode`).

## When to Use Port-Level mTLS

**Prometheus metrics scraping.** If Prometheus runs outside the mesh (no sidecar), it can't do mTLS. You can disable mTLS on the metrics port while keeping everything else strict:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: app-with-metrics
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: DISABLE
```

**Health check endpoints.** Some external health checkers (outside the mesh) need plain text access:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: app-with-health
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

**gRPC vs HTTP ports.** If a service exposes both gRPC (requiring mTLS) and a plain HTTP debug endpoint:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: grpc-service
  namespace: backend
spec:
  selector:
    matchLabels:
      app: grpc-service
  mtls:
    mode: STRICT
  portLevelMtls:
    50051:
      mode: STRICT
    8080:
      mode: PERMISSIVE
```

## Port Numbers Must Match Container Ports

The port numbers in `portLevelMtls` refer to the actual container port numbers, not Kubernetes Service ports. If your Service maps port 80 to container port 8080, use 8080 in the PeerAuthentication:

```yaml
# Service definition
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - name: http
      port: 80          # Service port
      targetPort: 8080   # Container port
    - name: metrics
      port: 9090
      targetPort: 9090
```

```yaml
# PeerAuthentication - use container port
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:        # Container port, NOT Service port 80
      mode: STRICT
    9090:
      mode: DISABLE
```

## Namespace-Wide Port-Level Overrides

Port-level overrides work on namespace-wide policies too, not just workload-specific ones:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: backend
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: DISABLE
```

This makes every workload in the `backend` namespace use STRICT mTLS except on port 9090, which is open for plain text. This is useful when all services in a namespace expose metrics on the same port.

## Port-Level Overrides and Precedence

There's an important precedence detail: port-level overrides only apply within the winning policy. They don't carry over from lower-precedence policies.

Example:

```yaml
# Namespace-wide policy
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: backend
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: DISABLE
---
# Workload-specific policy (wins for this workload)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: special-service
  namespace: backend
spec:
  selector:
    matchLabels:
      app: special-service
  mtls:
    mode: PERMISSIVE
```

For `special-service`:
- Port 9090: PERMISSIVE (not DISABLE! The namespace policy's portLevelMtls doesn't carry over)
- All other ports: PERMISSIVE

The workload-specific policy completely replaces the namespace policy for that workload. If you want port 9090 to be DISABLE for `special-service`, you need to add it to the workload-specific policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: special-service
  namespace: backend
spec:
  selector:
    matchLabels:
      app: special-service
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    9090:
      mode: DISABLE
```

## A Complete Real-World Setup

Here's a production-like example with multiple services:

```yaml
# Namespace default: STRICT with metrics exception
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
---
# API gateway: STRICT on all ports, metrics handled by namespace default
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: api-gateway
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  mtls:
    mode: STRICT
  portLevelMtls:
    8443:
      mode: STRICT
    9090:
      mode: PERMISSIVE
    15021:
      mode: DISABLE
---
# Database proxy: different ports for different protocols
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: db-proxy
  namespace: production
spec:
  selector:
    matchLabels:
      app: db-proxy
  mtls:
    mode: STRICT
  portLevelMtls:
    5432:
      mode: STRICT
    6379:
      mode: STRICT
    9090:
      mode: PERMISSIVE
    8081:
      mode: DISABLE
```

## Verifying Port-Level Configuration

Check the proxy configuration for a specific pod to see how ports are configured:

```bash
istioctl proxy-config listener my-service-abc123 -n backend
```

For detailed JSON output showing TLS settings per port:

```bash
istioctl proxy-config listener my-service-abc123 -n backend -o json | \
  python3 -m json.tool | grep -A10 "transport_socket"
```

You can also use `istioctl x describe` to get a summary:

```bash
istioctl x describe pod my-service-abc123 -n backend
```

## Testing Port-Level Settings

Test from a pod without a sidecar to verify which ports accept plain text:

```bash
# Deploy a test pod without sidecar
kubectl run test-no-sidecar --image=curlimages/curl \
  --labels="sidecar.istio.io/inject=false" \
  --restart=Never -- sleep 3600

# Test the STRICT port (should fail from non-mesh pod)
kubectl exec test-no-sidecar -- curl -s http://my-service.backend:8080/health

# Test the DISABLE/PERMISSIVE port (should succeed from non-mesh pod)
kubectl exec test-no-sidecar -- curl -s http://my-service.backend:9090/metrics
```

## Common Pitfalls

**Using Service ports instead of container ports.** The portLevelMtls field uses container ports. Double-check your pod spec.

**Forgetting that workload policies don't inherit parent portLevelMtls.** If you create a workload-specific policy, you need to re-specify any port-level overrides you want.

**Setting DISABLE on sensitive ports.** Disabling mTLS on a port means anyone who can reach that port gets in without authentication. Only use DISABLE for ports that genuinely need unauthenticated access.

Port-level mTLS gives you the fine-grained control needed for real production workloads. Use it for metrics, health checks, and any port that needs different security treatment from the rest of the workload.
