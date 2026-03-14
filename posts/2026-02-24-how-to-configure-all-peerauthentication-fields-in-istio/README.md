# How to Configure All PeerAuthentication Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PeerAuthentication, MTLS, Security, Kubernetes

Description: Complete reference for all PeerAuthentication fields in Istio including mTLS modes, port-level overrides, and workload selectors for mesh security.

---

PeerAuthentication controls mutual TLS (mTLS) settings between workloads in your Istio mesh. It determines whether sidecars require, allow, or reject mTLS connections from other services. Getting this right is critical when you are migrating to Istio or running a mixed environment where some workloads have sidecars and others do not.

## How PeerAuthentication Works

When two sidecars communicate, they can establish mTLS automatically using certificates managed by Istio's certificate authority (istiod). PeerAuthentication controls the server side of this - it tells a sidecar how to handle incoming connections. The corresponding client-side setting lives in DestinationRule's TLS configuration.

There is a hierarchy of PeerAuthentication policies:

1. Mesh-wide policy (in istio-system, no selector)
2. Namespace-wide policy (in a namespace, no selector)
3. Workload-specific policy (in a namespace, with selector)

More specific policies override broader ones.

## Top-Level Structure

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: my-peer-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    3306:
      mode: DISABLE
```

The spec has three fields: `selector`, `mtls`, and `portLevelMtls`. That is it. PeerAuthentication is one of the simpler Istio resources in terms of field count, but understanding each option is important.

## Selector

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
      version: v2
```

The `selector` field determines which workloads this policy applies to. It matches against pod labels. The matching rules are:

- If `selector` is omitted and the policy is in `istio-system`, it becomes the mesh-wide default
- If `selector` is omitted and the policy is in any other namespace, it becomes the namespace default
- If `selector` is present, it applies only to matching workloads in that namespace
- Only one mesh-wide and one namespace-wide policy is allowed (no selector); having multiple causes undefined behavior

```yaml
# Mesh-wide default
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

```yaml
# Namespace default
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: bookinfo
spec:
  mtls:
    mode: PERMISSIVE
```

```yaml
# Workload-specific
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: reviews-policy
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      app: reviews
  mtls:
    mode: STRICT
```

## mTLS Mode

```yaml
spec:
  mtls:
    mode: STRICT
```

The `mtls.mode` field is the core of PeerAuthentication. It has four options:

### UNSET

```yaml
mtls:
  mode: UNSET
```

Inherits the setting from the parent scope. A workload-specific policy with `UNSET` inherits from the namespace policy. A namespace policy with `UNSET` inherits from the mesh-wide policy. The mesh-wide default is `PERMISSIVE` if no policy is set.

### DISABLE

```yaml
mtls:
  mode: DISABLE
```

Disables mTLS entirely. The sidecar accepts only plaintext connections. This is useful for workloads that receive traffic from non-mesh sources that cannot do mTLS.

Be careful with this one. If you disable mTLS but the calling side is configured to send mTLS (via DestinationRule), connections will fail. Both sides need to agree.

### PERMISSIVE

```yaml
mtls:
  mode: PERMISSIVE
```

The sidecar accepts both plaintext and mTLS connections. This is the default mode and the recommended setting during migration. It allows mesh workloads to communicate with mTLS while still accepting traffic from non-mesh services.

PERMISSIVE mode is great for gradual rollouts. You can add sidecars to workloads one at a time without breaking anything. Once all workloads have sidecars, you switch to STRICT.

### STRICT

```yaml
mtls:
  mode: STRICT
```

Only mTLS connections are accepted. Plaintext connections are rejected. This is the most secure option and what you want in production once all workloads have sidecars.

If a workload without a sidecar tries to reach a STRICT service, the connection will be refused. So make sure everything that needs to talk to the service either has a sidecar or goes through a gateway.

## Port-Level mTLS

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    9090:
      mode: DISABLE
    3306:
      mode: STRICT
```

The `portLevelMtls` field lets you override the top-level mTLS mode for specific ports. The key is the port number (as an integer), and the value is a mode object.

This is really useful when a service exposes multiple ports with different security requirements. For example:

- Port 8080 is the main HTTP API that receives traffic from both mesh and non-mesh clients, so PERMISSIVE
- Port 9090 is a health check endpoint that Kubernetes probes hit directly, so DISABLE
- Port 3306 is an internal database port that should only accept mesh traffic, so STRICT

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: mixed-service
  namespace: default
spec:
  selector:
    matchLabels:
      app: mixed-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    15021:
      mode: DISABLE
```

Port 15021 is the Istio health check port, and you sometimes need to disable mTLS there so that Kubernetes liveness and readiness probes work correctly.

## Migration Strategy

The typical migration path from no mTLS to full STRICT mTLS looks like this:

### Step 1: Start with mesh-wide PERMISSIVE

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

### Step 2: Add sidecars to all workloads

Deploy sidecars across your mesh. Since the mode is PERMISSIVE, nothing breaks during the rollout.

### Step 3: Switch namespaces to STRICT one at a time

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: bookinfo
spec:
  mtls:
    mode: STRICT
```

Test each namespace after switching. If something breaks, you can quickly roll back to PERMISSIVE.

### Step 4: Set mesh-wide STRICT

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

### Step 5: Add exceptions as needed

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: legacy-exception
  namespace: legacy-apps
spec:
  selector:
    matchLabels:
      app: legacy-service
  mtls:
    mode: PERMISSIVE
```

## Checking the Effective Policy

You can verify what mTLS mode is actually in effect for a workload:

```bash
istioctl x describe pod <pod-name> -n <namespace>
```

This shows you which PeerAuthentication policies apply and the resulting mTLS mode.

You can also check if mTLS is actually being used for a connection:

```bash
istioctl proxy-config listeners <pod-name> -n <namespace> --port 8080
```

Look for the `transport_socket` in the listener configuration to confirm TLS is active.

## Common Pitfalls

One mistake people make is setting STRICT mode on the server side without ensuring the client side is configured for mTLS. If you have a DestinationRule with `tls.mode: DISABLE` pointing at a STRICT service, connections will fail.

Another common issue is forgetting about non-mesh traffic sources. Kubernetes health probes, Prometheus scraping, and external load balancers typically do not have Istio certificates. You need PERMISSIVE mode or port-level exceptions for those.

Finally, when using headless services, PeerAuthentication can behave differently because traffic goes directly to pod IPs rather than through the service VIP. Make sure your policies account for this.

PeerAuthentication might only have a handful of fields, but it is one of the most impactful Istio resources for security. Getting mTLS right protects all service-to-service communication in your mesh with strong identity-based authentication and encryption.
