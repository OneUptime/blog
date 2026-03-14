# How to Build Secure Service-to-Service Communication with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, MTLS, Authorization, Zero Trust

Description: Implement secure communication between microservices using Istio's mTLS, authorization policies, and certificate management features.

---

One of the strongest reasons to use Istio is its security model. Out of the box, you get mutual TLS between services, fine-grained authorization policies, and automatic certificate rotation. Your application code doesn't need to know about any of it. Here's how to build a properly secured service mesh from the ground up.

## How Istio Security Works

Istio's security is built on a few key concepts:

1. **Identity**: Every workload gets a cryptographic identity through SPIFFE certificates. The identity is based on the Kubernetes service account.
2. **mTLS**: Both sides of every connection verify each other's identity using certificates.
3. **Authorization**: Policies define which identities can access which services.
4. **Certificate Management**: Istio's CA (part of istiod) automatically issues and rotates certificates.

The sidecar proxy handles all of this transparently. Your application sends plain HTTP, and the proxy encrypts it with mTLS before it leaves the pod.

## Step 1: Enable Strict mTLS

By default, Istio uses "permissive" mode, which accepts both plain text and mTLS connections. For production, switch to strict mode:

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
```

This applies to the entire mesh. Every service-to-service connection must now use mTLS.

You can also apply it per-namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

Or per-workload, if you need exceptions:

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
    8443:
      mode: STRICT
    9090:
      mode: PERMISSIVE  # Prometheus scraping port
```

Verify mTLS is working:

```bash
# Check mTLS status for all services
istioctl proxy-config endpoints deploy/my-service -n default | grep STRICT

# Verify a specific connection
istioctl authn tls-check my-service.default.svc.cluster.local

# Check certificates
istioctl proxy-config secret deploy/my-service -n default
```

## Step 2: Define Authorization Policies

mTLS ensures encryption and identity, but it doesn't control who can access what. That's where AuthorizationPolicy comes in.

### Default Deny

Start by denying all traffic, then explicitly allow what's needed:

```yaml
# Deny all traffic in the namespace by default
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}  # Empty spec means deny all
```

With this in place, no service can talk to any other service until you create ALLOW policies.

### Allow Specific Service-to-Service Communication

```yaml
# Allow frontend to reach product-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-products
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
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/products", "/api/products/*"]

---
# Allow order-service to reach payment-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-orders-to-payments
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/order-service"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments"]

---
# Allow all services to reach the health check endpoints
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
        paths: ["/healthz", "/ready"]
```

### Deny Specific Patterns

Sometimes it's easier to deny specific dangerous patterns:

```yaml
# Block access to admin endpoints from non-admin services
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-admin-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: DENY
  rules:
  - to:
    - operation:
        paths: ["/admin/*", "/internal/*"]
    from:
    - source:
        notPrincipals:
        - "cluster.local/ns/production/sa/admin-service"
```

## Step 3: External Request Authentication

For traffic entering the mesh from outside, use RequestAuthentication to validate JWT tokens:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
    outputPayloadToHeader: "x-jwt-payload"
---
# Require valid JWT for all requests to the API gateway
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["*"]  # Any authenticated user
    to:
    - operation:
        paths: ["/api/*"]
  - to:
    - operation:
        paths: ["/health", "/ready"]  # Health checks don't need auth
```

## Step 4: Certificate Management

Istio automatically handles certificate issuance and rotation, but you should still monitor it.

### Check Certificate Status

```bash
# View the certificates for a specific proxy
istioctl proxy-config secret deploy/my-service -n production

# Output shows:
# - ROOTCA: The root certificate
# - default: The workload certificate
# - Certificate validity period
```

### Custom Certificate Authority

If you need to use your own CA instead of Istio's built-in CA:

```bash
# Create a secret with your CA certificate and key
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=ca-cert.pem \
  --from-file=ca-key.pem=ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cert-chain.pem

# Restart istiod to pick up the new CA
kubectl rollout restart deployment istiod -n istio-system
```

### Certificate Rotation Settings

Istio rotates workload certificates automatically. You can customize the rotation settings:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "24h"  # Workload cert lifetime
```

## Step 5: Network Policies as Defense in Depth

Istio authorization policies work at L7 (application layer), but you should also have L3/L4 network policies as defense in depth:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-network-policy
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

This way, even if someone bypasses the Istio sidecar, the network policy still blocks unauthorized traffic.

## Step 6: Audit and Verify

Regularly audit your security configuration:

```bash
# Check for configuration issues
istioctl analyze -n production

# List all authorization policies
kubectl get authorizationpolicy -n production

# List all peer authentication policies
kubectl get peerauthentication -n production

# Verify mTLS is enforced
istioctl proxy-config endpoints deploy/my-service -n production

# Test that unauthorized access is actually denied
kubectl exec deploy/unauthorized-service -n production -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/payments
# Should return 403
```

## Common Pitfalls

**Forgetting health probe ports**: Kubernetes health probes bypass the sidecar in certain configurations. Make sure your PeerAuthentication allows this.

**Service accounts**: Authorization policies use Kubernetes service account identity. If all your pods use the default service account, you can't distinguish between services. Create dedicated service accounts:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service
  namespace: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    spec:
      serviceAccountName: payment-service  # Use dedicated SA
```

**Permissive to strict migration**: Don't switch from PERMISSIVE to STRICT mode all at once across the entire mesh. Do it namespace by namespace, verifying that nothing breaks at each step.

Security in a service mesh is layered. mTLS provides encryption and identity. Authorization policies provide access control. JWT validation handles external authentication. Network policies add defense in depth. Together, they create a security posture that's far stronger than what most applications implement on their own.
