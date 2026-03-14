# How to Configure Workload-Specific Peer Authentication in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, PeerAuthentication, Kubernetes, Workload Security

Description: How to target specific workloads with PeerAuthentication policies in Istio using label selectors for fine-grained mTLS control.

---

Sometimes you need one specific service to behave differently from everything else in the namespace. Maybe it's a legacy service that can't handle mTLS yet, or maybe it's a particularly sensitive service that needs strict encryption even when the namespace default is permissive. Workload-specific PeerAuthentication policies are exactly what you need for these situations.

## What Makes a Policy Workload-Specific?

A PeerAuthentication policy becomes workload-specific when it includes a `selector` field with `matchLabels`. The selector targets pods based on their Kubernetes labels, similar to how a Service selects pods.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-api-strict
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-api
  mtls:
    mode: STRICT
```

This policy only applies to pods in the `backend` namespace that have the label `app: payment-api`. All other pods in the namespace are unaffected.

## When You'd Use Workload-Specific Policies

**Exceptions to a namespace default.** Your namespace is STRICT, but one service needs PERMISSIVE because it receives traffic from outside the mesh.

**Tightening a specific workload.** Your namespace is PERMISSIVE, but your payment processing service absolutely needs STRICT mTLS.

**Port-level overrides.** A service exposes multiple ports, and some need different mTLS settings than others.

**Gradual rollout.** You're migrating to STRICT mTLS and want to test one workload at a time before changing the namespace default.

## Creating a Workload-Specific Policy

Here's a typical scenario: the `backend` namespace is using PERMISSIVE mTLS, but you want to enforce STRICT on the `order-service`:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: order-service-strict
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  mtls:
    mode: STRICT
```

Apply it:

```bash
kubectl apply -f order-service-auth.yaml
```

Now verify that the pods have the matching labels:

```bash
kubectl get pods -n backend -l app=order-service --show-labels
```

If no pods match the selector, the policy exists but has no effect. This is a silent failure that won't produce any error messages.

## Checking Your Pod Labels

Before creating a workload-specific policy, always confirm what labels your pods actually have:

```bash
kubectl get pods -n backend --show-labels
```

Or for a specific deployment:

```bash
kubectl get deployment order-service -n backend -o jsonpath='{.spec.template.metadata.labels}'
```

The labels in the PeerAuthentication selector must match labels on the pod template, not the deployment itself.

## Multiple Labels in the Selector

You can use multiple labels in the `matchLabels` field. The policy only applies to pods that match ALL the specified labels:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: order-service-v2-strict
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
      version: v2
  mtls:
    mode: STRICT
```

This targets only the v2 pods of the order-service. The v1 pods (with `version: v1`) are unaffected. This is useful when you're doing canary deployments and want to test mTLS behavior on the new version first.

## Combining with Port-Level mTLS

Workload-specific policies can include port-level mTLS overrides. This is handy when a workload has some ports that need encryption and others that don't:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: api-gateway-auth
  namespace: backend
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
    15014:
      mode: DISABLE
```

In this policy:
- The default for the workload is STRICT.
- Port 8443 is explicitly STRICT (redundant but documenting intent).
- Port 9090 accepts both mTLS and plain text (maybe for a health check endpoint).
- Port 15014 has mTLS disabled (maybe for Prometheus metrics scraping).

## Precedence Rules

Workload-specific policies have the highest precedence in Istio's PeerAuthentication hierarchy:

1. **Workload-specific** (with selector) - highest priority
2. **Namespace-wide** (no selector, non-root namespace) - medium priority
3. **Mesh-wide** (no selector, root namespace) - lowest priority

Within workload-specific policies, if multiple policies match the same workload, Istio picks the oldest one. This is not well-defined behavior and you should avoid having overlapping selectors.

## A Real-World Example

Suppose you have a microservices app with these requirements:

- The `frontend` pod talks to clients outside the mesh (needs PERMISSIVE).
- The `api-server` handles internal API calls (needs STRICT).
- The `database-proxy` accepts connections from both mesh and non-mesh clients (needs PERMISSIVE on the client port and STRICT on the admin port).

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: frontend-permissive
  namespace: app
spec:
  selector:
    matchLabels:
      app: frontend
  mtls:
    mode: PERMISSIVE
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: api-server-strict
  namespace: app
spec:
  selector:
    matchLabels:
      app: api-server
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: db-proxy-mixed
  namespace: app
spec:
  selector:
    matchLabels:
      app: database-proxy
  mtls:
    mode: STRICT
  portLevelMtls:
    5432:
      mode: PERMISSIVE
    9090:
      mode: STRICT
```

## Verifying the Policies

Check all PeerAuthentication policies in a namespace:

```bash
kubectl get peerauthentication -n app
```

For a specific workload, use `istioctl`:

```bash
istioctl x describe pod api-server-abc123 -n app
```

This shows which policies affect the pod and the effective mTLS mode.

To check the Envoy configuration directly:

```bash
istioctl proxy-config listener api-server-abc123 -n app
```

## Debugging When Things Go Wrong

If a workload-specific policy isn't working:

1. **Check the selector labels match.** This is the most common issue. Double-check that the labels in the policy match the labels on the pod (not the deployment or service).

```bash
kubectl get pods -n app -l app=api-server
```

2. **Check for conflicting policies.** If multiple workload-specific policies match the same pod, behavior is unpredictable.

```bash
kubectl get peerauthentication -n app -o yaml
```

3. **Check that the sidecar is injected.** PeerAuthentication only works on pods with the Istio sidecar.

```bash
kubectl get pod api-server-abc123 -n app -o jsonpath='{.spec.containers[*].name}'
```

You should see `istio-proxy` in the container list.

4. **Check the Envoy logs.** If connections are failing:

```bash
kubectl logs api-server-abc123 -n app -c istio-proxy --tail=50
```

Look for TLS handshake errors or connection resets.

## Cleanup

To remove a workload-specific policy:

```bash
kubectl delete peerauthentication frontend-permissive -n app
```

Once removed, the workload falls back to the namespace-wide or mesh-wide default.

Workload-specific PeerAuthentication is your most granular control for mTLS in Istio. Use it sparingly for exceptions and special cases, and rely on namespace-wide policies for the baseline. Keep your selectors tight, avoid overlaps, and always verify that your labels actually match running pods.
