# How to Configure Tenant-Specific Security Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Multi-Tenancy, PeerAuthentication, Authorization

Description: Configure different security policies per tenant in Istio including mTLS modes, JWT requirements, and custom authorization rules for each tenant namespace.

---

Not all tenants have the same security requirements. One tenant might need strict mTLS everywhere, while another has legacy services that cannot handle it yet. One tenant might require JWT validation on every request, while another uses API keys. Istio lets you set different security policies per namespace, which means you can tailor security to each tenant without affecting the others.

This guide covers the main types of security policies you can customize per tenant.

## Per-Tenant mTLS Configuration

Istio supports a mesh-wide PeerAuthentication policy, but you can override it per namespace. Start with a strict mesh-wide policy:

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

Now suppose tenant-b has a legacy service that cannot do mTLS. You can relax the policy just for that namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: tenant-b
spec:
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode accepts both mTLS and plaintext traffic, so the legacy service can still communicate while other services in the same namespace use mTLS.

You can be even more granular and set the mTLS mode per port for a specific workload:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-service-policy
  namespace: tenant-b
spec:
  selector:
    matchLabels:
      app: legacy-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8443:
      mode: STRICT
    8080:
      mode: DISABLE
```

This keeps mTLS strict on port 8443 but disables it on port 8080 for that specific workload. Port-level control is useful when a service exposes both a modern HTTPS endpoint and a legacy HTTP endpoint.

## Per-Tenant JWT Authentication

Different tenants might use different identity providers. Istio's RequestAuthentication lets you configure JWT validation per namespace.

Tenant A uses Auth0:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: tenant-a
spec:
  jwtRules:
  - issuer: "https://tenant-a.auth0.com/"
    jwksUri: "https://tenant-a.auth0.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

Tenant B uses their own Keycloak instance:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: tenant-b
spec:
  jwtRules:
  - issuer: "https://keycloak.tenant-b.com/realms/production"
    jwksUri: "https://keycloak.tenant-b.com/realms/production/protocol/openid-connect/certs"
    forwardOriginalToken: true
    outputPayloadToHeader: x-jwt-payload
```

The `outputPayloadToHeader` option decodes the JWT payload and puts it in a header, which downstream services can read without doing their own JWT parsing.

Note that RequestAuthentication only validates tokens that are present. It does not require a token to be present. To enforce that every request must have a valid JWT, pair it with an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals:
        - "*"
```

The `requestPrincipals: ["*"]` means "allow any valid request principal," which effectively means "require a valid JWT." Requests without a token or with an invalid token get denied.

## Role-Based Authorization Per Tenant

Some tenants need fine-grained role-based access control within their namespace. You can use JWT claims to enforce RBAC:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-only-api
  namespace: tenant-a
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals:
        - "*"
    when:
    - key: request.auth.claims[role]
      values:
      - "admin"
      - "superadmin"
```

This policy only allows requests to the `admin-api` service if the JWT contains a `role` claim with the value `admin` or `superadmin`.

Another tenant might have a simpler model where they just need to restrict access based on IP ranges:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ip-allowlist
  namespace: tenant-b
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks:
        - "10.0.0.0/8"
        - "172.16.0.0/12"
    - source:
        namespaces:
        - tenant-b
```

## Per-Tenant Rate Limiting Policies

Tie rate limiting to tenant security policies. A tenant with a higher security tier might get more relaxed limits, while free-tier tenants get tighter restrictions.

Create per-tenant rate limit authorization that denies traffic when custom conditions are met:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-unauthenticated-high-volume
  namespace: tenant-a
spec:
  action: DENY
  rules:
  - from:
    - source:
        notRequestPrincipals:
        - "*"
    to:
    - operation:
        paths:
        - "/api/bulk/*"
        - "/api/export/*"
```

This denies unauthenticated requests to high-volume API endpoints, while allowing authenticated requests through.

## Audit Logging Per Tenant

Some tenants, especially those in regulated industries, need detailed audit logs. Istio's telemetry can be configured per namespace to capture more detail:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: detailed-logging
  namespace: tenant-a
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "true"
```

For tenants that do not need detailed logging, you can skip this or only log errors:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-only-logging
  namespace: tenant-b
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

## Restricting Outbound Traffic Per Tenant

Some tenants should be restricted in what external services they can reach. Use Istio's Sidecar resource and ServiceEntry to control egress:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: restricted-egress
  namespace: tenant-a
spec:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

With `REGISTRY_ONLY`, the tenant can only reach services that are registered in the mesh. Any attempt to call an external API will fail unless you explicitly create a ServiceEntry for it:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allowed-external-apis
  namespace: tenant-a
spec:
  hosts:
  - "api.stripe.com"
  - "api.twilio.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

This whitelisting approach gives you control over data exfiltration risks. Tenant A can reach Stripe and Twilio, but nothing else outside the mesh.

## Combining Policies for Defense in Depth

The real power comes from layering these policies. Here is what a well-secured tenant namespace looks like:

1. PeerAuthentication with STRICT mTLS
2. RequestAuthentication with JWT validation
3. AuthorizationPolicy requiring valid JWT and specific claims
4. Sidecar with REGISTRY_ONLY egress
5. ServiceEntry whitelisting allowed external services
6. Telemetry with full access logging

```bash
# Verify all policies are in place
kubectl get peerauthentication -n tenant-a
kubectl get requestauthentication -n tenant-a
kubectl get authorizationpolicy -n tenant-a
kubectl get sidecar -n tenant-a
kubectl get serviceentry -n tenant-a
kubectl get telemetry -n tenant-a
```

Each layer catches things that the other layers might miss. mTLS protects against spoofing at the transport layer. JWT validation protects against unauthorized users at the application layer. Authorization policies enforce business rules. Egress restrictions prevent data leaks. And audit logging gives you a trail for compliance.

## Summary

Istio's namespace-scoped resources let you treat each tenant as a separate security zone. You can mix and match mTLS modes, JWT providers, authorization rules, egress restrictions, and logging levels to match each tenant's specific needs. The key is to start with strong mesh-wide defaults and then customize per tenant where needed. This gives you a secure baseline that no tenant can accidentally weaken, with the flexibility to accommodate different requirements.
