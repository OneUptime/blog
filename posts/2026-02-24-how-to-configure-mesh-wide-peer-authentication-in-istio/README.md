# How to Configure Mesh-Wide Peer Authentication in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, PeerAuthentication, Service Mesh, Security

Description: A practical guide to configuring mesh-wide PeerAuthentication in Istio to set a default mTLS mode across your entire service mesh.

---

When you install Istio, the default mTLS behavior across the mesh is PERMISSIVE. That means every sidecar proxy accepts both encrypted (mTLS) and unencrypted connections. This is fine for getting started, but eventually you'll want to lock things down. A mesh-wide PeerAuthentication policy lets you set a single default mTLS mode that applies to every namespace and every workload in the mesh.

## How Mesh-Wide Policies Work

A PeerAuthentication policy becomes mesh-wide when two conditions are met:

1. It's created in the Istio root namespace (usually `istio-system`).
2. It has no `selector` field, so it doesn't target any specific workload.

The root namespace is defined in your Istio installation config. You can check which namespace is the root by looking at the MeshConfig:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep rootNamespace
```

If this returns nothing, the default root namespace is `istio-system`.

## Creating a Mesh-Wide Policy

Here is a mesh-wide PeerAuthentication policy that sets PERMISSIVE mode across the entire mesh:

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

And here is one that enforces STRICT mTLS across the mesh:

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

Apply it like any Kubernetes resource:

```bash
kubectl apply -f mesh-wide-policy.yaml
```

The name `default` is a convention, not a requirement. You can name it anything, but `default` makes it clear that this is the baseline policy.

## Why You'd Want Mesh-Wide STRICT mTLS

Setting STRICT mTLS at the mesh level means every service-to-service connection must be encrypted and mutually authenticated. No exceptions unless you override with a more specific policy. The benefits are clear:

- All traffic between sidecars is encrypted.
- Every connection is mutually authenticated using X.509 certificates.
- Services without sidecars cannot communicate with mesh services (this can also be a drawback - more on that later).
- You get a strong security baseline that compliance teams love.

## The Migration Path

Jumping straight to STRICT mTLS across the mesh is risky if you have services that aren't part of the mesh yet. Here is a practical migration path.

**Step 1: Audit your mesh coverage.**

Check which namespaces have sidecar injection enabled:

```bash
kubectl get namespaces -L istio-injection
```

For namespaces using the newer revision labels:

```bash
kubectl get namespaces -L istio.io/rev
```

Any namespace without injection enabled probably has pods that can't do mTLS.

**Step 2: Start with PERMISSIVE at the mesh level.**

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

This is actually the default behavior, so this step is mostly about being explicit.

**Step 3: Enable STRICT in namespaces where all pods have sidecars.**

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-namespace
spec:
  mtls:
    mode: STRICT
```

Namespace-level policies override the mesh-wide policy for that namespace. So you can tighten things up incrementally.

**Step 4: Once all namespaces are strict, flip the mesh-wide policy to STRICT.**

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

Now the mesh default is STRICT. Any new namespace automatically gets STRICT mTLS unless it explicitly sets PERMISSIVE.

## Verifying the Mesh-Wide Policy

Check that the policy exists:

```bash
kubectl get peerauthentication -n istio-system
```

Verify its effect on a specific pod:

```bash
istioctl x describe pod <pod-name> -n <namespace>
```

The output will show which PeerAuthentication policies apply and the effective mTLS mode.

You can also check the proxy configuration directly:

```bash
istioctl proxy-config listener <pod-name> -n <namespace> -o json | grep -A5 "transport_socket"
```

## Handling Non-Mesh Traffic

One thing that catches people off guard with mesh-wide STRICT mTLS is that anything outside the mesh gets blocked. This includes:

- **Kubernetes health checks from the kubelet.** Istio handles this by default - the sidecar allows plain text health probes from the kubelet. So this usually isn't a problem.
- **External load balancers or ingress controllers.** If your ingress controller doesn't have a sidecar, it won't be able to reach services in the mesh. Use an Istio ingress gateway instead, or run the ingress controller with a sidecar.
- **Monitoring tools like Prometheus.** If Prometheus scrapes metrics directly from pods and doesn't have a sidecar, strict mTLS blocks it. You can either add a sidecar to Prometheus or use port-level exceptions.
- **Jobs and CronJobs.** Short-lived pods sometimes finish before the sidecar is ready. This is a known pain point. Consider using `holdApplicationUntilProxyStarts` in your Istio config.

For any of these cases, you can create a more specific PeerAuthentication policy that overrides the mesh-wide setting:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: allow-prometheus-scrape
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  portLevelMtls:
    15090:
      mode: PERMISSIVE
```

## Multiple Mesh-Wide Policies

You should only have one mesh-wide PeerAuthentication policy - one policy in the root namespace without a selector. If you accidentally create more than one, Istio will use the oldest one and ignore the rest. This can lead to confusing behavior.

Check for duplicates:

```bash
kubectl get peerauthentication -n istio-system
```

If you see more than one policy without a selector, delete the extras.

## Interaction with DestinationRules

PeerAuthentication controls the server side - what the sidecar accepts for incoming connections. DestinationRules can control the client side - what the sidecar sends for outgoing connections. With Istio's auto mTLS feature (enabled by default), the client sidecar automatically uses mTLS when the destination has a sidecar. So in most cases, you don't need to configure DestinationRules for mTLS at all.

However, if you have a DestinationRule with explicit `trafficPolicy.tls` settings, those override auto mTLS. Be careful not to set `tls.mode: DISABLE` in a DestinationRule while the target requires STRICT mTLS - that will break things.

## Monitoring mTLS Adoption

Once you have a mesh-wide policy in place, keep an eye on connection failures. Kiali is a great tool for this:

```bash
istioctl dashboard kiali
```

Kiali shows you which connections are using mTLS (indicated by a lock icon) and which are not. It also highlights any connections that are failing due to mTLS mismatches.

You can also check Envoy metrics for mTLS-related failures:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep ssl
```

Look for `ssl.connection_error` and `ssl.handshake` counters. A high error rate suggests something is trying to connect without mTLS.

## Summary

Mesh-wide PeerAuthentication gives you a security baseline for your entire Istio mesh. Start with PERMISSIVE, migrate namespace by namespace to STRICT, and then flip the mesh-wide default. Handle exceptions with namespace-level or workload-level policies. Keep only one mesh-wide policy in the root namespace, and use `istioctl` and Kiali to verify everything is working as expected.
