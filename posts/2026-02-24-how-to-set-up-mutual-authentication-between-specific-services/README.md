# How to Set Up Mutual Authentication Between Specific Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Mutual Authentication, PeerAuthentication, Security

Description: Configure mutual TLS authentication between specific services in Istio using PeerAuthentication and DestinationRule for targeted mTLS enforcement.

---

By default, Istio can enable mTLS across your entire mesh. But sometimes you want more granular control. Maybe you need strict mutual authentication between your payment service and order service, but other services can use permissive mode. Or maybe you are migrating to the mesh incrementally and need to enforce mTLS only between services that are fully onboarded.

This post covers how to set up mutual authentication between specific pairs of services, not just mesh-wide.

## Understanding Istio mTLS Modes

Istio has three mTLS modes:

- **DISABLE** - No mTLS, plaintext only
- **PERMISSIVE** - Accepts both mTLS and plaintext (good for migration)
- **STRICT** - Requires mTLS, rejects plaintext

The default installation sets PERMISSIVE mode mesh-wide. This means services can communicate with or without mTLS. For mutual authentication between specific services, you want STRICT mode on those services.

## Scenario Setup

Say you have four services:
- `frontend` - Serves the web UI
- `order-service` - Handles orders
- `payment-service` - Processes payments
- `notification-service` - Sends notifications

You want strict mTLS between `order-service` and `payment-service` because payment data is sensitive. The other services can stay in permissive mode during migration.

## Step 1: Set Mesh-Wide Permissive Mode

Start with permissive mode as the baseline:

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
kubectl apply -f mesh-peer-auth.yaml
```

## Step 2: Enforce STRICT mTLS on Target Services

Apply STRICT PeerAuthentication to the specific services that need mutual authentication:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-strict-mtls
  namespace: default
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
  name: order-strict-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f strict-mtls-policies.yaml
```

Now both `payment-service` and `order-service` require mTLS for all incoming connections. Any service calling them without a valid mesh certificate gets rejected.

## Step 3: Verify Mutual Authentication

Check that both services are using mTLS:

```bash
# Check if mTLS is active between order-service and payment-service
istioctl authn tls-check deploy/order-service -n default payment-service.default.svc.cluster.local
```

You should see `STRICT` in the output. You can also verify by looking at the connection details:

```bash
# Check the TLS configuration on the proxy
istioctl proxy-config cluster deploy/order-service -n default --fqdn payment-service.default.svc.cluster.local -o json | grep -A5 "transportSocket"
```

## Step 4: Restrict Which Services Can Authenticate

STRICT mTLS ensures that only mesh services (with valid certificates) can connect, but any mesh service can still call payment-service. To restrict it to only order-service, add an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-callers
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/order-service"
              - "cluster.local/ns/default/sa/payment-service"
```

This allows only `order-service` and `payment-service` itself (for health checks, etc.) to reach the payment service. All other services are denied.

```bash
kubectl apply -f payment-auth-policy.yaml
```

## Port-Level mTLS Configuration

You can configure mTLS on specific ports. This is useful when a service has some ports that need strict authentication and others that do not:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-port-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: STRICT
    9090:
      mode: PERMISSIVE
```

Port 8080 (the main API port) requires mTLS. Port 9090 (maybe a metrics port) allows both mTLS and plaintext. This is useful when external monitoring tools need to scrape metrics but do not support mTLS.

## DestinationRule for Client-Side mTLS

While PeerAuthentication controls the server side (what the receiving service requires), DestinationRule controls the client side (what the calling service sends). In most cases, Istio's automatic mTLS detection handles this. But if you want to be explicit:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: default
spec:
  host: payment-service.default.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

`ISTIO_MUTUAL` tells the client sidecar to use Istio's built-in certificates for mTLS. This is the default behavior when mTLS is enabled, but being explicit prevents any ambiguity.

## Bidirectional Strict Authentication

For truly mutual authentication between two specific services, apply STRICT policies on both sides and restrict callers on both sides:

```yaml
# Payment service: only accepts from order-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/order-service"]
---
# Order service: only accepts from frontend and payment-service (for callbacks)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/frontend"
              - "cluster.local/ns/default/sa/payment-service"
```

This creates a tightly controlled communication pattern:
- Only `order-service` can call `payment-service`
- Only `frontend` and `payment-service` can call `order-service`
- All connections must use mTLS (STRICT mode on both)

## Testing the Setup

Verify that allowed communication works:

```bash
# order-service -> payment-service (should succeed)
kubectl exec deploy/order-service -n default -c order-service -- curl -s -o /dev/null -w "%{http_code}" http://payment-service.default.svc.cluster.local/health
# Expected: 200
```

Verify that unauthorized communication is blocked:

```bash
# frontend -> payment-service (should be denied)
kubectl exec deploy/frontend -n default -c frontend -- curl -s -o /dev/null -w "%{http_code}" http://payment-service.default.svc.cluster.local/health
# Expected: 403

# notification-service -> payment-service (should be denied)
kubectl exec deploy/notification-service -n default -c notification-service -- curl -s -o /dev/null -w "%{http_code}" http://payment-service.default.svc.cluster.local/health
# Expected: 403
```

Verify that non-mesh traffic is rejected:

```bash
# Pod without sidecar -> payment-service (should be rejected at TLS level)
kubectl run no-sidecar --image=curlimages/curl --restart=Never --labels="sidecar.istio.io/inject=false" -- curl -s -o /dev/null -w "%{http_code}" http://payment-service.default.svc.cluster.local/health
kubectl logs no-sidecar
# Expected: Connection reset or TLS error
kubectl delete pod no-sidecar
```

## Monitoring mTLS Status

Keep an eye on your mTLS status across the mesh:

```bash
# Check all mTLS configurations
istioctl proxy-config all deploy/payment-service -n default | grep -i tls

# Use the Kiali dashboard to see mTLS indicators
istioctl dashboard kiali
```

Kiali shows a padlock icon on connections that use mTLS, making it easy to spot services that are not using mutual authentication.

## Common Mistakes

**Forgetting the service account.** AuthorizationPolicy principals reference Kubernetes service accounts. If your deployment uses the `default` service account, you cannot distinguish it from other services using the same account.

**PeerAuthentication without AuthorizationPolicy.** STRICT mTLS alone only proves the caller is in the mesh. It does not restrict which mesh service can connect. You need AuthorizationPolicy for that.

**Client-side DestinationRule conflicts.** If you have a DestinationRule that sets `tls.mode: DISABLE` for a service that requires STRICT mTLS, connections will fail. Make sure client-side and server-side configurations are compatible.

## Summary

Mutual authentication between specific services in Istio requires combining PeerAuthentication (for transport-level mTLS) with AuthorizationPolicy (for identity-based access control). PeerAuthentication ensures connections are encrypted and authenticated. AuthorizationPolicy ensures only the right services can connect. Apply these at the workload level using selectors, and use dedicated service accounts to give each service a distinct identity that policies can reference.
