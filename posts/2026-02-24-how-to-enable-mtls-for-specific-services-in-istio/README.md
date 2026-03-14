# How to Enable mTLS for Specific Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Service Security, Kubernetes, PeerAuthentication

Description: How to apply mutual TLS selectively to individual services in Istio using workload-specific PeerAuthentication policies.

---

Not every service in your mesh needs the same security posture from day one. Maybe you are running a multi-team cluster where one team is ready for strict mTLS and another is still migrating. Or maybe you have a critical payment service that needs strict mTLS now, while the rest of the mesh stays permissive.

Istio lets you target mTLS settings at individual services using the `selector` field in PeerAuthentication. This gives you fine-grained control over which services require mTLS and which accept plain text.

## Using Workload Selectors

The `selector` field in a PeerAuthentication resource uses label selectors to target specific pods. Any pod matching the labels gets the specified mTLS policy.

Here is a PeerAuthentication that applies strict mTLS only to the payment service:

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

And here is the corresponding Deployment for reference:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        version: v1
    spec:
      containers:
      - name: payment-service
        image: myregistry/payment-service:latest
        ports:
        - containerPort: 8080
```

The labels in the PeerAuthentication `selector` must match labels on the pod template, not on the Deployment itself.

## Multiple Services with Different Policies

You can create multiple PeerAuthentication resources in the same namespace, each targeting different services:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-strict
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: notification-strict
  namespace: production
spec:
  selector:
    matchLabels:
      app: notification-service
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-api-permissive
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-api
  mtls:
    mode: PERMISSIVE
```

This configuration makes the payment and notification services require strict mTLS while the legacy API continues to accept plain text connections.

## Policy Priority Rules

When multiple PeerAuthentication policies could apply to a pod, Istio follows a priority order:

1. **Workload-specific policy** (with selector) - highest priority
2. **Namespace-wide policy** (without selector, in the same namespace)
3. **Mesh-wide policy** (without selector, in istio-system)

So if you have a mesh-wide PERMISSIVE policy and a workload-specific STRICT policy, the workload uses STRICT. This is the mechanism that lets you selectively harden individual services.

Here is a concrete example showing all three levels:

```yaml
# Mesh-wide: permissive (in istio-system)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
---
# Namespace: strict (in production)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# Workload: permissive (for legacy-api in production)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-api-exception
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-api
  mtls:
    mode: PERMISSIVE
```

In this setup:
- All services across the mesh default to PERMISSIVE
- All services in the production namespace use STRICT (overrides mesh default)
- The legacy-api in production uses PERMISSIVE (overrides namespace default)

## Adding Port-Level Exceptions

Sometimes a service needs strict mTLS on its main ports but needs to allow plain text on specific ports (like a metrics endpoint):

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
    15014:
      mode: DISABLE
```

This configuration:
- Requires mTLS on all ports by default
- Allows both mTLS and plain text on port 9090 (metrics)
- Disables mTLS entirely on port 15014 (Istio control plane port)

## Verifying Service-Specific Policies

After applying a workload-specific policy, verify it took effect:

```bash
# Check what policies exist
kubectl get peerauthentication -n production

# Describe the effective policy for a specific pod
istioctl x describe pod <payment-pod-name> -n production
```

The describe output will show you which PeerAuthentication policy is effective for that pod.

Test from another service in the mesh:

```bash
# This should work (sidecar-to-sidecar uses mTLS automatically)
kubectl exec deploy/order-service -n production -c order-service -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/health
```

Test from a pod without a sidecar:

```bash
# This should fail if payment-service is STRICT
kubectl run test --image=curlimages/curl -n production \
  --labels="sidecar.istio.io/inject=false" --restart=Never -it --rm -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/health
```

## Using Multiple Labels for Targeting

The selector supports multiple labels for more precise targeting:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-v2-strict
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
      version: v2
  mtls:
    mode: STRICT
```

This applies strict mTLS only to v2 of the payment service. The v1 pods keep whatever the namespace or mesh default is. This is handy during canary deployments where you want to test strict mTLS on the new version before applying it to the old one.

## Common Patterns

### Protect High-Value Services First

Start with services that handle sensitive data:

```bash
# Apply strict to all sensitive services at once
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: sensitive-services
  namespace: production
spec:
  selector:
    matchLabels:
      security-tier: high
  mtls:
    mode: STRICT
EOF
```

Then label your sensitive services:

```bash
kubectl label deployment payment-service -n production security-tier=high
kubectl label deployment user-service -n production security-tier=high
kubectl label deployment auth-service -n production security-tier=high
```

### Gradual Rollout by Team

If different teams own different services, let each team control their own mTLS rollout:

```yaml
# Team A's services
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: team-a-strict
  namespace: production
spec:
  selector:
    matchLabels:
      team: team-a
  mtls:
    mode: STRICT
```

Teams can apply their own policies as they are ready, without affecting other teams.

## Troubleshooting

If a service-specific strict mTLS policy causes connection failures:

1. Check that the calling service has a sidecar
2. Verify auto mTLS is enabled (it is by default)
3. Look for DestinationRules that might override the TLS settings
4. Check the proxy logs on both source and destination for TLS errors

```bash
# Check destination proxy logs
kubectl logs <payment-pod> -c istio-proxy --tail=50 | grep -i "tls\|ssl"

# Check source proxy logs
kubectl logs <order-pod> -c istio-proxy --tail=50 | grep -i "tls\|ssl"
```

Service-specific mTLS policies give you the flexibility to secure your most important services immediately while giving the rest of the mesh time to catch up. Use this as a stepping stone toward full mesh-wide strict mTLS.
