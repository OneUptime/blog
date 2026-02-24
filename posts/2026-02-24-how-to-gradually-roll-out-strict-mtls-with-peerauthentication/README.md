# How to Gradually Roll Out Strict mTLS with PeerAuthentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, PeerAuthentication, Migration, Security

Description: A step-by-step strategy for safely migrating from permissive to strict mTLS across your Istio service mesh without breaking anything.

---

Switching your entire mesh to strict mTLS in one shot is a recipe for outages. Services without sidecars, external integrations, legacy apps - all of these can break when you suddenly require mutual TLS everywhere. The smart approach is a gradual rollout where you validate at each step before moving forward.

## Why Gradual Rollout Matters

When you set STRICT mTLS, only connections that present a valid client certificate (issued by Istio's CA) are accepted. Anything else gets rejected. That includes:

- Pods without the Istio sidecar
- External services that call into the mesh
- Health checks from tools outside the mesh
- Monitoring agents like Prometheus (if running without a sidecar)
- Kubernetes Jobs and CronJobs that might not have sidecars

Breaking any of these silently can be worse than not having mTLS at all because the failure mode is "connection reset" with no obvious error message.

## The Rollout Plan

Here's a practical step-by-step plan for going from no mTLS policy to mesh-wide STRICT.

### Step 1: Audit Your Current State

Before changing anything, understand what you're working with.

Check which namespaces have sidecar injection:

```bash
kubectl get namespaces -L istio-injection -L istio.io/rev
```

List pods without the Istio sidecar:

```bash
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.containers | map(.name) | contains(["istio-proxy"]) | not) | "\(.metadata.namespace)/\(.metadata.name)"'
```

Check existing PeerAuthentication policies:

```bash
kubectl get peerauthentication --all-namespaces
```

Check DestinationRules that might have explicit TLS settings:

```bash
kubectl get destinationrules --all-namespaces -o json | \
  jq '.items[] | select(.spec.trafficPolicy.tls != null) | {name: .metadata.name, ns: .metadata.namespace, tls: .spec.trafficPolicy.tls}'
```

### Step 2: Set Mesh-Wide PERMISSIVE Explicitly

Even though PERMISSIVE is the default, create an explicit policy so everyone knows the baseline:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

```bash
kubectl apply -f mesh-permissive.yaml
```

### Step 3: Enable Sidecar Injection Everywhere

For each namespace that should be in the mesh:

```bash
kubectl label namespace backend istio-injection=enabled --overwrite
```

Then restart the deployments to pick up the sidecar:

```bash
kubectl rollout restart deployment -n backend
```

Wait for all pods to be ready with sidecars:

```bash
kubectl get pods -n backend -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}'
```

Every pod should show `istio-proxy` in its container list.

### Step 4: Start with One Low-Risk Namespace

Pick a namespace that's fully covered by sidecars and has low blast radius if something goes wrong. A staging or dev namespace is ideal.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: staging
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f staging-strict.yaml
```

### Step 5: Validate

After applying STRICT to the test namespace, check for issues:

```bash
# Check for connection errors in the proxy logs
kubectl logs -n staging -l app=my-service -c istio-proxy --tail=100 | grep -i "error\|reset\|refused"

# Check if services are responding
kubectl exec -n staging deploy/my-service -c my-service -- curl -s localhost:8080/health

# Use istioctl to verify
istioctl x describe pod <pod-name> -n staging
```

Monitor your error rates. If you have Prometheus, check for spikes in `istio_requests_total` with response code 503 or `istio_tcp_connections_closed_total` with connection errors.

### Step 6: Roll Out to More Namespaces

Once the test namespace is stable, move to production namespaces one at a time:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: backend
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: frontend
spec:
  mtls:
    mode: STRICT
```

Apply and validate each one before moving to the next.

### Step 7: Handle Exceptions

Some workloads might need exceptions. Create workload-specific or port-level overrides:

```yaml
# Prometheus metrics port needs plain text
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: metrics-exception
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
```

### Step 8: Flip the Mesh-Wide Default to STRICT

Once all namespaces are individually STRICT and validated:

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

```bash
kubectl apply -f mesh-strict.yaml
```

Now the mesh default is STRICT. Any new namespace automatically gets STRICT mTLS.

### Step 9: Clean Up Redundant Namespace Policies

With the mesh default set to STRICT, namespace-level STRICT policies are redundant. You can keep them for documentation purposes or remove them:

```bash
# Optional: remove redundant namespace policies
kubectl delete peerauthentication default -n backend
kubectl delete peerauthentication default -n frontend
```

Keep workload-specific exception policies in place.

## Rollback Plan

If something goes wrong at any step, rolling back is straightforward:

**Rollback a namespace policy:**

```bash
kubectl delete peerauthentication default -n backend
```

The namespace falls back to the mesh-wide default (PERMISSIVE, if you haven't changed it yet).

**Emergency rollback for the entire mesh:**

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

This immediately relaxes mTLS across the mesh. Namespace-level STRICT policies still apply, so you may need to delete those too for a complete rollback.

## Monitoring During Rollout

Keep an eye on these metrics during the rollout:

```bash
# Connection errors
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep -E "ssl\.(connection_error|handshake)"

# Request errors
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_5xx"
```

If you're using Kiali:

```bash
istioctl dashboard kiali
```

Kiali shows mTLS status with lock icons on the service graph. You can quickly spot which connections aren't using mTLS.

## Timeline

For a medium-sized mesh (10-50 services), a reasonable timeline looks like this:

- **Day 1**: Audit, set explicit PERMISSIVE, fix sidecar gaps
- **Day 2-3**: Enable STRICT in staging/dev namespaces, validate
- **Day 4-7**: Roll out to production namespaces one by one
- **Day 8**: Set mesh-wide STRICT
- **Day 9-10**: Clean up and document

Don't rush it. Each step should have at least a few hours of soak time to catch intermittent issues. The goal is zero-downtime migration, and patience is the cheapest way to achieve that.
