# How to Configure Strict mTLS Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Strict Mode, Security, Kubernetes

Description: Step-by-step instructions for configuring strict mutual TLS mode in Istio to reject all unencrypted service-to-service traffic.

---

Strict mTLS mode in Istio means every incoming connection to a sidecar-injected service must present a valid mTLS certificate. If a client does not have one, the connection is rejected. No exceptions, no fallback to plain text.

This is the gold standard for zero-trust networking in Kubernetes. Every service proves its identity on every connection, and all traffic is encrypted. But getting there requires some preparation, because flipping the switch without checking your dependencies first will cause outages.

## What Strict Mode Actually Does

In strict mode, the Envoy sidecar proxy on the receiving side of a connection requires TLS with client certificate authentication. Specifically:

- The incoming connection must use TLS
- The client must present a valid X.509 certificate
- The certificate must be signed by the mesh's trusted CA (istiod)
- The certificate must contain a valid SPIFFE identity

If any of these checks fail, the connection is terminated before any application data is exchanged.

Compare this with permissive mode, where the sidecar accepts both mTLS and plain text connections. Permissive mode is great for migration but does not provide the security guarantees you want in production.

## Applying Strict Mode Mesh-Wide

To enforce strict mTLS across the entire mesh, create a PeerAuthentication resource in the root namespace (istio-system):

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Apply it:

```bash
kubectl apply -f strict-mtls-mesh.yaml
```

This immediately affects all namespaces that do not have their own PeerAuthentication resource. Namespace-level policies override the mesh-level policy.

## Applying Strict Mode per Namespace

If you are not ready to go strict everywhere, start with individual namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

This only affects the `production` namespace. Other namespaces continue with whatever policy they have (or the mesh-wide default).

## Applying Strict Mode per Workload

You can even go more granular and apply strict mode to specific workloads using the `selector` field:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-service-strict
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
```

This applies strict mTLS only to pods with the label `app: payment-service` in the production namespace.

## Pre-Flight Checks Before Going Strict

Before enabling strict mode, run through these checks:

### 1. Verify All Pods Have Sidecars

Any pod without a sidecar cannot initiate mTLS connections. List pods without sidecars:

```bash
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.containers | length == 1) | "\(.metadata.namespace)/\(.metadata.name)"'
```

This is a rough check (it looks for single-container pods), but it catches most cases. A more accurate approach:

```bash
istioctl analyze --all-namespaces
```

The analyze command will warn you about pods without sidecars that might break with strict mTLS.

### 2. Check for Non-Mesh Clients

Are there services outside the mesh that call services inside the mesh? Common examples:

- Kubernetes Jobs or CronJobs without sidecars
- DaemonSets (like log collectors) that were not injected
- Services in namespaces without automatic injection
- External systems calling through a NodePort

These will all break with strict mTLS. Either add sidecars to them or create exceptions.

### 3. Verify Health Probes

Kubernetes health probes come from the kubelet, which does not participate in mTLS. Istio rewrites HTTP probes to go through the sidecar, but you should verify:

```bash
kubectl get pods -n production -o json | \
  jq '.items[].spec.containers[].livenessProbe'
```

If you see TCP probes or exec probes, those go directly to the container and are not affected by mTLS. HTTP probes are rewritten by Istio automatically.

### 4. Check Current mTLS Status

Before going strict, confirm that mTLS is already working in permissive mode:

```bash
istioctl x describe service my-service -n production
```

This shows you whether connections to the service are using mTLS. If they are already using mTLS (which is the default behavior with auto mTLS), switching to strict should be transparent.

## Handling Exceptions

Sometimes you need to allow plain text connections for specific ports or services. You can configure port-level exceptions within a strict policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    9090:
      mode: DISABLE
```

This sets the default to STRICT but allows port 8080 to accept both mTLS and plain text, and completely disables mTLS on port 9090.

This is useful for:
- Prometheus scraping on a metrics port (9090)
- Health check endpoints that non-mesh clients need to reach
- Legacy integrations that cannot use mTLS

## Monitoring After Enabling Strict Mode

After switching to strict mode, watch for connection failures:

```bash
# Check for connection resets in proxy logs
kubectl logs -l app=my-service -c istio-proxy --tail=200 | grep "connection_termination"

# Check Envoy stats for TLS errors
kubectl exec deploy/my-service -c istio-proxy -- pilot-agent request GET /stats | grep ssl.connection_error
```

Also monitor your application error rates. A spike in 503 errors right after enabling strict mode usually means something is trying to connect without mTLS.

In Prometheus, query:

```
rate(istio_requests_total{response_code="503", reporter="destination"}[5m])
```

## Rollback Plan

If strict mode causes problems, you can quickly revert to permissive:

```bash
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

Or delete the PeerAuthentication resource to go back to the default:

```bash
kubectl delete peerauthentication default -n istio-system
```

The change takes effect within a few seconds as Envoy proxies receive the updated configuration from istiod.

## Verifying Strict Mode is Enforced

To confirm that strict mode is actually rejecting plain text connections, test from a pod without a sidecar:

```bash
kubectl run test-no-mesh --image=curlimages/curl --labels="sidecar.istio.io/inject=false" --restart=Never -it --rm -- \
  curl -s -o /dev/null -w "%{http_code}" http://my-service.production.svc.cluster.local:8080
```

This should fail with a connection error (not return a 200) if strict mode is properly enforced.

## Policy Hierarchy

Remember that Istio's mTLS policies follow a hierarchy:

1. Workload-specific (selector) policy - highest priority
2. Namespace-level policy
3. Mesh-wide policy (in istio-system) - lowest priority

A workload-specific PERMISSIVE policy overrides a namespace-level STRICT policy. Keep this in mind when debugging unexpected behavior.

This hierarchy gives you the flexibility to roll out strict mode gradually while keeping exceptions where needed.
