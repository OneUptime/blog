# How to Use Selector Fields in Peer Authentication Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PeerAuthentication, Selectors, Kubernetes, mTLS

Description: A detailed look at how selector fields work in Istio PeerAuthentication policies and how to use them effectively for targeting workloads.

---

The `selector` field in an Istio PeerAuthentication policy determines which workloads the policy applies to. Without a selector, the policy covers the entire namespace (or the entire mesh if it's in the root namespace). With a selector, you can narrow things down to specific pods. Sounds simple enough, but there are a few nuances that trip people up.

## The Selector Syntax

The selector in a PeerAuthentication policy uses `matchLabels`, which is the same pattern you see in Kubernetes Services, Deployments, and NetworkPolicies. Here's the basic structure:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
```

The `matchLabels` field is a map of key-value pairs. A pod must have ALL the specified labels to be matched by the selector. This is an AND operation, not OR.

## Matching a Single Label

The most common pattern is matching on the `app` label:

```yaml
spec:
  selector:
    matchLabels:
      app: payment-service
```

This matches any pod with the label `app=payment-service`. It doesn't matter what other labels the pod has - as long as `app=payment-service` is present, the policy applies.

## Matching Multiple Labels

When you specify multiple labels, the pod must have every single one:

```yaml
spec:
  selector:
    matchLabels:
      app: payment-service
      version: v2
      environment: production
```

This only matches pods that have ALL three labels: `app=payment-service`, `version=v2`, and `environment=production`. A pod with just `app=payment-service` and `version=v2` but no `environment` label won't match.

This is useful for targeting specific versions during canary deployments:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-v2-strict
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-service
      version: v2
  mtls:
    mode: STRICT
```

## What Labels Can You Use?

You can use any label that exists on the pod. Common labels include:

- `app` - The application name (from Deployment template)
- `version` - Often used by Istio for traffic management
- `component` - A component of a larger application
- Custom labels specific to your organization

To see what labels your pods have:

```bash
kubectl get pods -n backend --show-labels
```

Important: the selector matches labels on the **pod**, not on the Deployment, Service, or any other resource. If you're looking at a Deployment spec, the relevant labels are under `spec.template.metadata.labels`, because those are the labels that get applied to the pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  labels:
    app: payment-service  # These labels are on the Deployment, NOT the pods
spec:
  template:
    metadata:
      labels:
        app: payment-service  # THESE are the pod labels that the selector matches
        version: v2
    spec:
      containers:
        - name: payment-service
          image: payment-service:v2
```

## No matchExpressions Support

Unlike some Kubernetes resources (like NetworkPolicy), PeerAuthentication does NOT support `matchExpressions`. You can only use `matchLabels`. So you can't do things like "match all pods where version is NOT v1" or "match pods where app is IN (service-a, service-b)".

If you need that kind of flexibility, you'll have to create separate PeerAuthentication policies for each label set.

```yaml
# Can't do this:
spec:
  selector:
    matchExpressions:
      - key: version
        operator: NotIn
        values: ["v1"]

# Instead, create explicit policies for each version:
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-v2
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-service
      version: v2
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-v3
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-service
      version: v3
  mtls:
    mode: STRICT
```

## Empty Selector vs No Selector

There's an important distinction:

**No selector at all** - The policy applies to the entire namespace (or mesh if in root namespace):

```yaml
spec:
  mtls:
    mode: STRICT
```

**Empty selector** - This also applies to all workloads in the namespace, same as no selector:

```yaml
spec:
  selector: {}
  mtls:
    mode: STRICT
```

**Empty matchLabels** - Also applies to all workloads:

```yaml
spec:
  selector:
    matchLabels: {}
  mtls:
    mode: STRICT
```

All three of these behave the same way. But for clarity, if you want a namespace-wide policy, just omit the selector entirely.

## Selector Scope Is Limited to the Namespace

The selector only matches pods within the same namespace as the PeerAuthentication resource. You can't create a policy in namespace `A` that targets pods in namespace `B`.

```yaml
# This policy in the "backend" namespace...
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: cross-namespace-attempt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: frontend  # Only matches "frontend" pods in "backend", NOT in other namespaces
  mtls:
    mode: STRICT
```

If you need the same policy in multiple namespaces, you need to create separate policies in each namespace:

```bash
for ns in backend frontend payments; do
  kubectl apply -n $ns -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-policy
spec:
  selector:
    matchLabels:
      app: api-server
  mtls:
    mode: STRICT
EOF
done
```

## Overlapping Selectors

What happens when two workload-specific policies match the same pod? For example:

```yaml
# Policy 1
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
---
# Policy 2
spec:
  selector:
    matchLabels:
      app: payment-service
      version: v2
  mtls:
    mode: PERMISSIVE
```

If a pod has both `app=payment-service` and `version=v2`, both policies match. Istio doesn't have a well-defined rule for this case - the behavior can be unpredictable. The best practice is to avoid overlapping selectors. If you need different behavior for v2, make sure Policy 1 doesn't also match v2 pods, or use a single policy with port-level overrides.

## Practical Example: Microservices with Mixed Security

Here's a practical setup for a typical microservices architecture:

```yaml
# Namespace-wide default: STRICT
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: app
spec:
  mtls:
    mode: STRICT
---
# Exception for the legacy adapter that receives plain HTTP from an external system
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-adapter
  namespace: app
spec:
  selector:
    matchLabels:
      app: legacy-adapter
  mtls:
    mode: PERMISSIVE
---
# Exception for the metrics exporter that Prometheus scrapes
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: metrics-exporter
  namespace: app
spec:
  selector:
    matchLabels:
      app: metrics-exporter
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
```

This gives you STRICT mTLS across the namespace with targeted exceptions where needed.

## Verifying Selector Matches

To confirm which pods a selector would match:

```bash
kubectl get pods -n app -l app=legacy-adapter
```

To see which policies affect a specific pod:

```bash
istioctl x describe pod legacy-adapter-abc123 -n app
```

The output tells you exactly which PeerAuthentication policy applies and the effective mTLS mode.

Selectors in PeerAuthentication are straightforward but the details matter. Use `matchLabels` with exact key-value pairs, check that your pod labels match, avoid overlapping selectors, and remember that scope is always limited to the policy's namespace.
