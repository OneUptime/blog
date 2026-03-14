# How to Follow Istio Security Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, mTLS, Authorization, Best Practices

Description: Security best practices for Istio service mesh covering mTLS, authorization policies, certificate management, and zero-trust networking.

---

Security is one of the main reasons teams adopt Istio. Automatic mTLS, fine-grained authorization policies, and identity-based access control are all built in. But having these features available is not the same as having them properly configured. A misconfigured Istio mesh can give you a false sense of security while leaving real gaps.

Here are the security best practices you should follow to get the most out of Istio's security features.

## Enable Strict mTLS Mesh-Wide

The single most important security configuration. Set strict mTLS at the mesh level:

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

Strict mode means all traffic between mesh services must be encrypted with mutual TLS. If a service tries to send plaintext, it gets rejected.

Some teams start with PERMISSIVE mode to avoid breaking things during migration. That is fine as a temporary step, but you should not stay there. PERMISSIVE mode accepts both plaintext and mTLS traffic, which means an attacker on the network can intercept plaintext requests.

To migrate safely:

1. Start with PERMISSIVE globally
2. Monitor for plaintext connections using `istio_tcp_connections_opened_total` with the `connection_security_policy` label
3. Fix any services still sending plaintext
4. Switch to STRICT

## Apply Authorization Policies

mTLS gives you encryption and identity. Authorization policies let you control who can talk to whom. Start with a deny-all policy and explicitly allow what you need:

```yaml
# Deny all traffic by default
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
---
# Allow specific traffic
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/production/sa/frontend"
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

This approach follows the principle of least privilege. Each service only accepts traffic from the specific sources it needs.

## Use Service Accounts for Identity

Istio uses Kubernetes service accounts as the basis for workload identity. Give each service its own service account:

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
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: payment-service
      containers:
        - name: payment-service
          image: payment-service:v1
```

Never use the `default` service account for production workloads. The default account makes it impossible to write meaningful authorization policies because every workload shares the same identity.

## Secure Ingress Traffic

The ingress gateway is your mesh's front door. Lock it down:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ingress-policy
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - to:
        - operation:
            methods: ["GET", "POST", "PUT", "DELETE"]
            paths: ["/api/*", "/health"]
    - from:
        - source:
            ipBlocks: ["10.0.0.0/8"]
      to:
        - operation:
            paths: ["/internal/*"]
```

This allows public access to `/api/*` and `/health`, but restricts `/internal/*` to internal IP ranges.

## Configure JWT Authentication

For user-facing APIs, validate JWT tokens at the mesh level:

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
            requestPrincipals: ["https://auth.example.com/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin", "user"]
```

The RequestAuthentication resource validates the token. The AuthorizationPolicy resource enforces that only authenticated requests with the right claims are allowed.

## Rotate Certificates Regularly

Istio automatically rotates workload certificates. The default lifetime is 24 hours. You can check certificate status:

```bash
istioctl proxy-config secret deploy/my-service -n production
```

For the control plane certificates, ensure your root CA is properly managed. If you are using the default self-signed CA, consider switching to a production CA:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        PILOT_CERT_PROVIDER: "istiod"
```

For enterprise deployments, integrate with an external CA like cert-manager or HashiCorp Vault:

```bash
# Using cert-manager as the CA
istioctl install --set values.pilot.env.EXTERNAL_CA=ISTIOD_RA_KUBERNETES_API
```

## Limit External Access

By default, Istio allows all outbound traffic from the mesh. Lock this down:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

With `REGISTRY_ONLY`, pods can only access services that are registered in the mesh (via ServiceEntry or Kubernetes Services). Any attempt to reach an unregistered external service is blocked.

Then explicitly allow the external services you need:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-payment-api
  namespace: production
spec:
  hosts:
    - api.stripe.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Enable Access Logging for Security Events

Log security-relevant events:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: security-logs
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code == 403 || response.code == 401 || connection.mtls == false"
```

This logs all forbidden and unauthorized responses, plus any plaintext connections. These logs are essential for detecting security incidents.

## Audit Your Policies Regularly

Regularly review your security configuration:

```bash
# Check all authorization policies
kubectl get authorizationpolicy --all-namespaces

# Check peer authentication
kubectl get peerauthentication --all-namespaces

# Run Istio analysis
istioctl analyze --all-namespaces

# Check for PERMISSIVE mode (should be temporary only)
kubectl get peerauthentication --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.mtls.mode}{"\n"}{end}'

# Verify mTLS is active between services
istioctl proxy-config secret deploy/my-service -n production
```

## Avoid Common Security Mistakes

1. **Do not leave PERMISSIVE mode in production** - It is only for migration
2. **Do not use wildcard principals** - Be specific about which service accounts can access what
3. **Do not skip authorization policies** - mTLS authenticates but does not authorize
4. **Do not use the default service account** - It is shared across all workloads without explicit accounts
5. **Do not forget about egress** - ALLOW_ANY for outbound traffic lets compromised pods talk to anything
6. **Do not ignore `istioctl analyze` warnings** - Security-related warnings are often the most critical

Security in Istio is layered: encryption (mTLS), authentication (PeerAuthentication, RequestAuthentication), authorization (AuthorizationPolicy), and auditing (access logs). All four layers need to be configured properly for a truly secure mesh.
