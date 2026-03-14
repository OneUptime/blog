# How to Write PeerAuthentication YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PeerAuthentication, MTLS, YAML, Cheat Sheet, Security

Description: Complete cheat sheet for writing Istio PeerAuthentication YAML to configure mutual TLS modes across your service mesh.

---

PeerAuthentication controls how mutual TLS (mTLS) is configured between services in your Istio mesh. It determines whether a service requires encrypted connections, accepts both encrypted and plaintext, or disables mTLS entirely. Getting PeerAuthentication right is critical for both security and compatibility.

Here is a complete reference with YAML examples for every configuration scenario.

## Basic Structure

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-peer-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
```

## mTLS Modes

There are four mTLS modes:

| Mode | Description |
|------|-------------|
| `STRICT` | Only accept mTLS connections |
| `PERMISSIVE` | Accept both mTLS and plaintext |
| `DISABLE` | Do not use mTLS for connections |
| `UNSET` | Inherit from parent scope |

## Mesh-Wide Strict mTLS

Apply strict mTLS to the entire mesh by placing the policy in `istio-system` with the name `default`:

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
kubectl apply -f mesh-strict-mtls.yaml
```

After applying this, every service-to-service connection in the mesh must use mTLS. Any plaintext traffic will be rejected.

## Mesh-Wide Permissive mTLS

Permissive mode is the default when Istio is installed. It accepts both mTLS and plaintext:

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

This is useful during migration when not all services have sidecars yet.

## Namespace-Level Policy

Override the mesh-wide policy for a specific namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: backend
spec:
  mtls:
    mode: STRICT
```

This sets strict mTLS for all workloads in the `backend` namespace, regardless of the mesh-wide setting.

## Workload-Level Policy

Target a specific workload using a selector:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: api-server-mtls
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  mtls:
    mode: STRICT
```

This only affects pods with the label `app: api-server` in the `backend` namespace.

## Port-Level Configuration

Different ports can have different mTLS modes. This is useful when a service has some ports that need to accept plaintext (like health check endpoints) while others should require mTLS:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mixed-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    9090:
      mode: DISABLE
```

In this example:
- All ports default to STRICT mTLS
- Port 8080 accepts both mTLS and plaintext
- Port 9090 does not use mTLS at all

## Disable mTLS for a Specific Workload

If a workload cannot support mTLS (maybe it is a legacy service or a third-party tool):

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: disable-mtls-legacy
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-service
  mtls:
    mode: DISABLE
```

Use this sparingly. Disabling mTLS means traffic to this workload is unencrypted and unauthenticated.

## Gradual Migration to Strict mTLS

When migrating from no mTLS to strict mTLS, follow this progression:

### Step 1: Start with mesh-wide PERMISSIVE

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

### Step 2: Enable STRICT per namespace as services are ready

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: backend
spec:
  mtls:
    mode: STRICT
```

### Step 3: Move to mesh-wide STRICT when all namespaces are verified

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

## Policy Precedence

PeerAuthentication policies have a hierarchy:

1. **Workload-level** (highest priority): Has a `selector`
2. **Namespace-level**: Named `default` in a specific namespace, no selector
3. **Mesh-wide** (lowest priority): Named `default` in `istio-system`, no selector

A more specific policy overrides a less specific one. For example, if the mesh is STRICT but a workload has PERMISSIVE, that workload accepts plaintext.

To see what policies are in effect:

```bash
kubectl get peerauthentication -A
```

## Handling Services Without Sidecars

If some services do not have Istio sidecars and the mesh is in STRICT mode, those services cannot communicate with meshed services. You have two options:

### Option 1: Set the target service to PERMISSIVE

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: allow-plaintext
  namespace: default
spec:
  selector:
    matchLabels:
      app: shared-service
  mtls:
    mode: PERMISSIVE
```

### Option 2: Add a sidecar to the calling service

```bash
kubectl label namespace legacy-ns istio-injection=enabled
kubectl rollout restart deployment -n legacy-ns
```

## Handling Health Checks

Kubernetes liveness and readiness probes come from the kubelet, which does not use mTLS. Istio handles this automatically by rewriting probe paths to go through the sidecar. But if you have custom health check setups, you might need port-level exceptions:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: health-check-exception
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  mtls:
    mode: STRICT
  portLevelMtls:
    15021:
      mode: PERMISSIVE
```

Port 15021 is the Istio sidecar's health check port.

## Validating PeerAuthentication

Check that your policy is applied correctly:

```bash
# List all policies
kubectl get peerauthentication -A

# Check specific policy
kubectl get peerauthentication default -n istio-system -o yaml

# Verify mTLS between services
istioctl authn tls-check deploy/frontend.default

# Run analysis
istioctl analyze -n default
```

## Common Mistakes

### Multiple policies with the same selector

If two policies target the same workload, behavior is undefined. Always have one policy per workload:

```bash
# Check for duplicate selectors
kubectl get peerauthentication -n default -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
selectors = {}
for p in data['items']:
    sel = str(p.get('spec',{}).get('selector',{}))
    name = p['metadata']['name']
    if sel in selectors:
        print(f'Conflict: {name} and {selectors[sel]} have the same selector')
    selectors[sel] = name
"
```

### Forgetting the DestinationRule

PeerAuthentication controls the server side (what the service accepts). If you have a DestinationRule that disables TLS on the client side, mTLS will not work even with STRICT mode:

```yaml
# BAD: This breaks mTLS
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: bad-dr
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: DISABLE  # Client will send plaintext
```

Make sure DestinationRules either use `ISTIO_MUTUAL` or do not set a TLS mode at all.

## Full Production Example

```yaml
# Mesh-wide strict mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Exception for legacy service that receives external plaintext traffic
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-exception
  namespace: legacy
spec:
  selector:
    matchLabels:
      app: legacy-receiver
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    8443:
      mode: STRICT
    8080:
      mode: PERMISSIVE
```

This setup enforces strict mTLS mesh-wide while allowing a specific legacy service to accept plaintext on port 8080 and requiring mTLS on port 8443. It is a practical pattern for organizations that are gradually migrating all services to full mTLS.
