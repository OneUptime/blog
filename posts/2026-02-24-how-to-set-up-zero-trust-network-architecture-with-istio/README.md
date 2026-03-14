# How to Set Up Zero-Trust Network Architecture with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Zero Trust, Kubernetes, Security, Service Mesh, MTLS

Description: A hands-on guide to building a zero-trust network architecture in Kubernetes using Istio for identity verification, encryption, and authorization.

---

Zero trust is one of those security buzzwords that actually means something useful. The core idea is simple: don't trust any network connection by default, even if it comes from inside your cluster. Every request must be authenticated, authorized, and encrypted. Istio is one of the best tools for implementing zero trust in a Kubernetes environment because it handles all three of those requirements at the infrastructure layer.

## What Zero Trust Looks Like in Practice

In a traditional network model, you have a perimeter (firewall, VPN) and everything inside is trusted. Zero trust throws that out. Every service-to-service call needs to prove its identity, and every connection needs to be encrypted. There's no concept of "inside the network means safe."

For Kubernetes, this means:

- All traffic between pods is encrypted with mTLS
- Every service has a verifiable cryptographic identity
- Access is granted based on identity, not network location
- Every request is authorized against explicit policies
- Nothing is allowed by default

## Step 1: Enable Strict Mutual TLS

The foundation of zero trust in Istio is mutual TLS. Both sides of every connection present certificates and verify each other. Enable it mesh-wide:

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

With `STRICT` mode, any connection attempt without a valid mTLS certificate is rejected. This means services outside the mesh (without Istio sidecars) can't communicate with services inside the mesh.

Verify it's working:

```bash
istioctl proxy-config secret deploy/my-service -n default
```

This shows the certificates loaded by the proxy. You should see the root CA certificate and the workload certificate.

## Step 2: Assign Service Identities

Istio automatically assigns SPIFFE identities to every workload based on the Kubernetes service account. The identity format is:

```text
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

Create dedicated service accounts for each of your services instead of using the `default` service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: backend
spec:
  template:
    spec:
      serviceAccountName: order-service
      containers:
      - name: order-service
        image: myregistry/order-service:v1
```

This is important because Istio's authorization policies use these identities to make access decisions. If all your services share the `default` service account, you lose granularity.

## Step 3: Implement Default Deny

Zero trust requires explicit permission for every connection. Apply a mesh-wide default-deny policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: istio-system
spec:
  {}
```

Placing this in the `istio-system` namespace with a root scope means it applies to the entire mesh. After applying this, all service-to-service traffic is blocked until you create explicit allow rules.

```bash
kubectl apply -f deny-all.yaml
```

You'll immediately see errors across your cluster. That's expected. Now you need to explicitly allow every legitimate communication path.

## Step 4: Create Explicit Allow Rules

Build up your access rules one service at a time. For each service, define exactly what can call it, from where, and using which methods:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/web-app"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/orders", "/api/orders/*"]
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/payment-service"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/orders/*"]
```

This policy says: the web-app can create and read orders, and the payment-service can only read them. Nobody else gets access.

## Step 5: Add Request-Level Authentication

mTLS handles service-to-service authentication, but you also need to authenticate end users. Use `RequestAuthentication` to validate JWT tokens:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: frontend
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

Then combine it with an authorization policy that checks JWT claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: frontend
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    when:
    - key: request.auth.claims[groups]
      values: ["admin", "user"]
```

## Step 6: Encrypt Everything

With strict mTLS, all in-mesh traffic is already encrypted. But you also need to handle traffic entering and leaving the mesh.

For ingress, use an Istio `Gateway` with TLS termination:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: tls-secret
    hosts:
    - "api.example.com"
```

For egress, use Istio's egress gateway to control and encrypt outbound traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: backend
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Step 7: Monitor and Audit

Zero trust isn't a set-and-forget thing. You need continuous monitoring to verify your policies are working and detect anomalies.

Enable access logging:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

Monitor authorization decisions with Prometheus:

```bash
istio_requests_total{response_code="403",reporter="destination"}
```

Set up alerts for unexpected 403 spikes (could indicate misconfiguration) and unexpected 200s to services that should be restricted.

## Step 8: Verify Your Zero Trust Posture

Regularly test your zero trust implementation. Try to make unauthorized calls and verify they're blocked:

```bash
# From a pod that shouldn't have access
kubectl exec -it deploy/rogue-service -n test -- curl -v http://order-service.backend:8080/api/orders
```

You should get a 403. If you get a 200, something is wrong with your policies.

Use `istioctl analyze` to check for misconfigurations:

```bash
istioctl analyze --all-namespaces
```

Zero trust with Istio takes effort to set up, but once it's in place, you have a strong security foundation that doesn't depend on network location or perimeter defenses. Every connection is verified, every request is authorized, and everything is encrypted. That's a much better position to be in than hoping your firewall catches everything.
