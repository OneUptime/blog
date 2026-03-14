# How to Build Zero-Trust Architecture with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Zero Trust, Security, mTLS, Authorization

Description: Implement a complete zero-trust security architecture using Istio with identity verification, encryption, and fine-grained access control.

---

Zero trust means "never trust, always verify." In a traditional network, traffic inside the perimeter is trusted. In a zero-trust model, every request must be authenticated and authorized, regardless of where it comes from. Istio provides the building blocks to implement zero trust at the network layer without changing your application code. Here's how to do it properly.

## Zero-Trust Principles

A zero-trust architecture in a Kubernetes/Istio environment follows these principles:

1. **Encrypt everything**: All traffic is encrypted, even between services in the same cluster
2. **Verify identity**: Every request carries a cryptographic identity that's verified
3. **Least privilege**: Services can only access what they explicitly need
4. **Assume breach**: Design as if the attacker is already inside the network
5. **Continuous verification**: Don't cache trust decisions; verify on every request

## Step 1: Establish Strong Identity

Istio issues SPIFFE-compliant X.509 certificates to every workload. The identity is derived from the Kubernetes service account:

```text
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

Create dedicated service accounts for every service:

```yaml
# Don't share service accounts between services
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: user-service
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: notification-service
  namespace: production
```

Reference them in your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: payment-service  # Unique identity
      automountServiceAccountToken: false   # Don't mount the k8s token
      containers:
      - name: payment-service
        image: payment-service:v1
```

Setting `automountServiceAccountToken: false` prevents the Kubernetes API token from being mounted. This reduces the blast radius if a container is compromised. Istio provides its own identity through the sidecar.

## Step 2: Encrypt All Traffic

Enable strict mTLS mesh-wide:

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

Also make sure DestinationRules don't accidentally disable mTLS:

```yaml
# Make sure all destination rules use ISTIO_MUTUAL
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: default
  namespace: production
spec:
  host: "*.production.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

Verify encryption is active:

```bash
# Check mTLS status
istioctl proxy-config endpoints deploy/payment-service -n production | head -20

# Look for "mTLS" in the output
# All entries should show STRICT or mTLS

# Test that plain text is rejected
kubectl exec deploy/test-client -n production -- \
  curl -v --max-time 5 http://payment-service:8080/health 2>&1
# This should work because the proxy handles mTLS transparently

# From outside the mesh (without sidecar), plain text should fail
kubectl run test --image=curlimages/curl --annotations="sidecar.istio.io/inject=false" \
  -n production --rm -it -- curl -v http://payment-service:8080/health
# This should fail because there's no sidecar to do mTLS
```

## Step 3: Default Deny Authorization

The most important step in zero trust is default deny. Without explicit permission, no communication is allowed:

```yaml
# Deny all traffic in the namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
```

Now nothing works. That's intentional. You build up access from zero.

## Step 4: Build the Access Graph

Map out which services need to communicate with which, and what operations they need:

```text
frontend -> user-service (GET /api/users, POST /api/login)
frontend -> product-service (GET /api/products)
frontend -> cart-service (GET, POST, DELETE /api/cart)
frontend -> order-service (POST /api/orders, GET /api/orders)
order-service -> payment-service (POST /api/payments)
order-service -> product-service (GET /api/products)
order-service -> notification-service (POST /api/notify)
```

Now create authorization policies for each allowed path:

```yaml
# Frontend can access user-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: user-service-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: user-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/users", "/api/users/*"]
    - operation:
        methods: ["POST"]
        paths: ["/api/login"]

---
# Order-service can access payment-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/order-service"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments"]

---
# Order and notification services need access to product-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: product-service-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: product-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/frontend"
        - "cluster.local/ns/production/sa/order-service"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/products", "/api/products/*"]

---
# Health check access for all pods (kubelet needs this)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: production
spec:
  action: ALLOW
  rules:
  - to:
    - operation:
        paths: ["/healthz", "/ready", "/live"]
```

## Step 5: Secure External Access

External traffic enters through the ingress gateway. Apply authentication there:

```yaml
# JWT authentication at the gateway
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: external-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true

---
# Require JWT for external requests (except public endpoints)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: external-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  # Public endpoints
  - to:
    - operation:
        paths: ["/v1/products*", "/health"]
        methods: ["GET"]
  # Authenticated endpoints
  - from:
    - source:
        requestPrincipals: ["*"]
    to:
    - operation:
        paths: ["/v1/*"]
```

## Step 6: Network Policies as Defense in Depth

Istio operates at L7, but add L3/L4 network policies too. If the sidecar is somehow bypassed, network policies still block unauthorized traffic:

```yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress

---
# Allow only specific pod-to-pod communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: order-service
    ports:
    - port: 8080
      protocol: TCP
```

## Step 7: Audit Everything

Zero trust requires visibility into every access decision. Enable access logging:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: audit-logging
  namespace: production
spec:
  accessLogging:
  - providers:
    - name: otel
```

Monitor for denied requests, which might indicate:
- Misconfigured policies
- Compromise attempts
- Services trying to access resources they shouldn't

```bash
# Look for RBAC denied messages in proxy logs
kubectl logs deploy/payment-service -c istio-proxy -n production | grep "rbac_access_denied"
```

## Verification Checklist

Run through this checklist to verify your zero-trust setup:

```bash
# 1. Verify all traffic is encrypted
istioctl proxy-config endpoints deploy/frontend -n production | grep -c "STRICT"

# 2. Verify default deny is in place
kubectl get authorizationpolicy -n production

# 3. Test unauthorized access is denied
kubectl exec deploy/notification-service -n production -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/payments
# Should return 403

# 4. Test authorized access works
kubectl exec deploy/order-service -n production -- \
  curl -s -o /dev/null -w "%{http_code}" -X POST http://payment-service:8080/api/payments
# Should return 200

# 5. Check for configuration issues
istioctl analyze -n production

# 6. Verify no pods are running without sidecars
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep -v istio-proxy
# Should return nothing
```

Zero trust is not something you set up once and forget. It requires ongoing attention: reviewing access policies as services change, monitoring for anomalies, rotating credentials, and keeping Istio up to date. But with Istio handling the heavy lifting at the infrastructure layer, the operational burden is manageable, and the security benefits are substantial.
