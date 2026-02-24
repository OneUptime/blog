# How to Create a PeerAuthentication Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, PeerAuthentication, Kubernetes, Service Mesh, Security

Description: Learn how to create and apply PeerAuthentication policies in Istio to enforce mutual TLS between services in your mesh.

---

If you're running services on Istio and want to control how your workloads authenticate each other, PeerAuthentication is the resource you need. It tells Istio's sidecar proxies whether to require, allow, or disable mutual TLS (mTLS) for incoming connections. Getting this right is a big deal - misconfigure it and services either can't talk to each other or they talk without any encryption at all.

## What Is PeerAuthentication?

PeerAuthentication is a custom resource in Istio's `security.istio.io/v1` API group. It controls the mTLS mode for incoming traffic to workloads that have the Envoy sidecar injected. There are four mTLS modes you can set:

- **UNSET** - Inherits the mode from the parent scope (namespace or mesh level).
- **DISABLE** - No mTLS. Plain text connections are accepted.
- **PERMISSIVE** - Accepts both mTLS and plain text connections. This is the default for Istio.
- **STRICT** - Only mTLS connections are accepted. Plain text gets rejected.

## Your First PeerAuthentication Policy

Here is the simplest PeerAuthentication policy you can create. This one applies strict mTLS to all workloads in the `default` namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default-strict
  namespace: default
spec:
  mtls:
    mode: STRICT
```

Save that to a file called `peer-auth.yaml` and apply it:

```bash
kubectl apply -f peer-auth.yaml
```

That's it. Every workload in the `default` namespace now requires mTLS for incoming connections.

## Breaking Down the Spec

The `spec` section of a PeerAuthentication policy has three optional fields:

1. **selector** - A label selector that targets specific workloads. If omitted, the policy applies to all workloads in the namespace.
2. **mtls** - The mTLS settings for the policy. Contains a single `mode` field.
3. **portLevelMtls** - Per-port mTLS overrides, useful when a single workload needs different mTLS modes on different ports.

Here is an example with all three:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-service-auth
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
```

This policy targets the `payment-service` workload in the `payments` namespace. It enforces strict mTLS on all ports except port 8080, which accepts both mTLS and plain text.

## Creating a Permissive Policy

When you're first adding a service to the mesh, you probably want PERMISSIVE mode. This way, existing clients that don't use mTLS can still reach the service while you migrate everything:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: gradual-migration
  namespace: default
spec:
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode is actually what Istio defaults to if you don't create any PeerAuthentication policy at all. But being explicit about it is good practice, especially when you're documenting your security posture.

## Verifying the Policy

After applying the policy, check that it was created:

```bash
kubectl get peerauthentication -n default
```

You should see output like:

```
NAME             MODE     AGE
default-strict   STRICT   30s
```

To see the full details:

```bash
kubectl describe peerauthentication default-strict -n default
```

## Testing the Policy

The best way to test a PeerAuthentication policy is to try connecting from a pod without a sidecar. If you set STRICT mode, that connection should fail.

First, deploy a test pod without sidecar injection:

```bash
kubectl run test-client --image=curlimages/curl \
  --labels="sidecar.istio.io/inject=false" \
  --restart=Never \
  --command -- sleep 3600
```

Then try calling a service in the namespace with STRICT mTLS:

```bash
kubectl exec test-client -- curl -s http://my-service.default.svc.cluster.local:8080/health
```

If the policy is working, this should fail with a connection reset or a timeout because the test pod doesn't have a sidecar and can't do mTLS.

Now test from a pod that does have a sidecar:

```bash
kubectl run test-mtls-client --image=curlimages/curl \
  --restart=Never \
  --command -- sleep 3600
```

Wait for the sidecar to inject and then:

```bash
kubectl exec test-mtls-client -c curl -- curl -s http://my-service.default.svc.cluster.local:8080/health
```

This should work because the sidecar handles the mTLS handshake automatically.

## Checking mTLS Status with istioctl

You can use `istioctl` to check the mTLS configuration for your workloads:

```bash
istioctl x describe pod <pod-name> -n default
```

This shows whether a pod is receiving mTLS traffic and which PeerAuthentication policies apply to it.

You can also check the authentication policy for a specific service:

```bash
istioctl authn tls-check <pod-name> my-service.default.svc.cluster.local
```

## Common Mistakes

**Forgetting that PeerAuthentication only controls incoming traffic.** It does not control whether your workload sends mTLS when calling other services. Istio's DestinationRule resource handles the outbound side. In most cases, Istio's auto mTLS feature takes care of this - if the destination has a sidecar, the source sidecar automatically uses mTLS. But if you're using DestinationRules with explicit TLS settings, those override auto mTLS.

**Applying STRICT mode before all clients have sidecars.** If a client pod doesn't have the Envoy sidecar, it can't do mTLS. Setting STRICT mode on the server side will break those connections. Always start with PERMISSIVE and migrate clients first.

**Creating multiple PeerAuthentication policies in the same namespace without selectors.** You should only have one namespace-wide policy (one without a selector) per namespace. If you create two, the behavior is undefined and Istio will pick one unpredictably.

## A Complete Example

Here is a realistic setup for a microservices application with multiple namespaces:

```yaml
# Mesh-wide default (applied in istio-system namespace)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
---
# Strict mTLS for the production namespace
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# Exception for a legacy service that needs plain text on one port
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-exception
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-api
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: DISABLE
```

This gives you a permissive mesh default, strict mTLS in production, and a port-level exception for a legacy service that receives non-mesh traffic on port 9090.

## Wrapping Up

PeerAuthentication is one of the simpler Istio resources to work with, but it has a big impact on your security posture. Start with PERMISSIVE mode, get all your services into the mesh with sidecars, verify connectivity, and then switch to STRICT. Use workload-specific selectors and port-level overrides to handle edge cases. And always test from both sidecar and non-sidecar pods to confirm the policy is doing what you expect.
