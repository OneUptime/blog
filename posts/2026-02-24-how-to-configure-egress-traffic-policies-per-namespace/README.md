# How to Configure Egress Traffic Policies per Namespace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Namespace, Kubernetes, Network Policy

Description: Learn how to set up different egress traffic rules for different namespaces in Istio using Sidecar resources and ServiceEntry visibility.

---

In a multi-team Kubernetes cluster, different namespaces have different needs for external access. Your payments namespace needs to reach Stripe and your bank's API. Your analytics namespace needs to reach a data warehouse. Your frontend namespace should not be reaching any external APIs at all. Istio gives you the tools to enforce these boundaries, but the configuration is not obvious at first glance.

This guide covers how to control which namespaces can access which external services using Istio's Sidecar resource, ServiceEntry visibility controls, and Istio's `REGISTRY_ONLY` outbound traffic mode.

## The Problem with Mesh-Wide ServiceEntries

When you create a ServiceEntry without specifying `exportTo`, it follows the default visibility rules. Depending on your Istio configuration, this might mean the ServiceEntry is visible to all namespaces or just the one where it was created.

Check your default visibility setting:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep defaultServiceExportTo
```

If this is set to `["*"]` (the default), every ServiceEntry is visible mesh-wide. This means any namespace can reach any external service you have registered. That is probably not what you want.

## Approach 1: Using exportTo on ServiceEntries

The simplest way to restrict egress per namespace is to use the `exportTo` field on your ServiceEntry resources.

For a ServiceEntry that should only be accessible from the `payments` namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payments
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."
```

The `"."` value means "only this namespace." Pods in other namespaces will not be able to see or use this ServiceEntry. To make that a blocking egress policy rather than just a visibility rule, use `REGISTRY_ONLY` outbound traffic mode or another enforcement layer such as Kubernetes NetworkPolicy.

If you want to share a ServiceEntry between specific namespaces, list them explicitly:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: datadog-api
  namespace: monitoring
spec:
  hosts:
  - api.datadoghq.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."
  - "backend"
  - "frontend"
```

This makes the Datadog API accessible from the monitoring, backend, and frontend namespaces, but not from anywhere else.

## Approach 2: Using the Sidecar Resource

The Sidecar resource lets you define what each namespace's sidecars can see. This is a more powerful visibility-scoping approach because it controls which service and routing configuration is imported by the proxy rather than only controlling visibility at the service definition level.

Here is a Sidecar resource that restricts the `frontend` namespace to only see services in its own namespace and the `backend` namespace. When combined with `REGISTRY_ONLY` outbound traffic mode, this also prevents access to external services that are not in the imported configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: frontend-sidecar
  namespace: frontend
spec:
  egress:
  - hosts:
    - "./*"
    - "backend/*"
    - "istio-system/*"
```

The frontend namespace can now only reach:
- Services in its own namespace (`"./*"`)
- Services in the backend namespace (`"backend/*"`)
- Istio system services (`"istio-system/*"`)

External ServiceEntries will not be visible to this namespace unless they match one of the imported host patterns. In `ALLOW_ANY` mode, traffic to a destination that is not visible in the sidecar configuration may still be treated as unknown outbound traffic and allowed, so use `REGISTRY_ONLY` when you need the missing configuration to fail closed.

For the payments namespace, you might want to allow access to specific external services:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: payments-sidecar
  namespace: payments
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
  - hosts:
    - "*/api.stripe.com"
    - "*/api.paypal.com"
    port:
      number: 443
      protocol: TLS
      name: tls
```

This configuration lets the payments namespace import configuration for its own services, Istio system, and specifically the Stripe and PayPal external APIs on port 443. In `REGISTRY_ONLY` mode, other unknown external destinations are dropped.

## Approach 3: Changing the Default Mesh Policy

Instead of configuring each namespace individually, you can change the default behavior at the mesh level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
    defaultServiceExportTo:
    - "."
    defaultVirtualServiceExportTo:
    - "."
    defaultDestinationRuleExportTo:
    - "."
```

With these defaults:
- Unknown outbound traffic is dropped unless explicitly registered
- All ServiceEntries, VirtualServices, and DestinationRules are only visible within their own namespace

Apply this with:

```bash
istioctl install -f mesh-config.yaml
```

Now every namespace is isolated by default, and you explicitly open things up by changing `exportTo` on individual resources.

## Combining Approaches for Maximum Control

The best practice is to combine all three approaches:

1. Set `REGISTRY_ONLY` and namespace-scoped defaults at the mesh level
2. Use Sidecar resources to define what each namespace can see
3. Use `exportTo` on ServiceEntries for fine-grained sharing

Here is a complete example for a cluster with three namespaces:

```yaml
# Mesh-wide Sidecar default (applied to istio-system namespace as root config)

apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: istio-system
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
---
# Override for the payments namespace
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: payments
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "*/api.stripe.com"
---
# External service registration, only visible in payments
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payments
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."
```

## Verifying Your Configuration

After applying namespace-specific egress policies, verify they work correctly.

Test from a namespace that should have access:

```bash
kubectl exec -n payments deploy/payment-service -c payment-service -- curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com
# Expected: 200 or appropriate API response
```

Test from a namespace that should NOT have access:

```bash
kubectl exec -n frontend deploy/frontend-app -c frontend-app -- curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com
# Expected: 502 or connection refused
```

Check the proxy configuration for a pod to see what it knows about:

```bash
istioctl proxy-config cluster deploy/frontend-app -n frontend | grep stripe
# Should return nothing if properly restricted
```

## Gotchas

**Sidecar resource naming**: There can only be one Sidecar resource per namespace without a workloadSelector. If you define multiple, behavior is undefined. Use workloadSelector if you need different rules for different pods in the same namespace.

**Root namespace**: A Sidecar resource in the root namespace (usually istio-system) acts as the default for all namespaces that do not have their own Sidecar resource.

**DNS proxying interaction**: Even if a ServiceEntry is not visible to a namespace, DNS proxying might still resolve the hostname. The connection will still fail at the routing layer, but it can cause confusing behavior during debugging.

**Ordering matters**: If both a Sidecar resource and exportTo restrictions apply, both must allow access. If the Sidecar says a namespace can see a service but the ServiceEntry's exportTo excludes that namespace, the service will not be accessible.

These tools together give you namespace-scoped egress visibility and fail-closed routing for registered destinations. For hard network enforcement, combine them with Kubernetes NetworkPolicy or route external traffic through a controlled egress gateway.
