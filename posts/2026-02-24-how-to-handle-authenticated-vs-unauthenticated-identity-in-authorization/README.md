# How to Handle Authenticated vs Unauthenticated Identity in Authorization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Authentication, Security, Kubernetes

Description: Understanding how Istio authorization policies behave differently for authenticated and unauthenticated identities, and how to write rules for both cases.

---

One of the trickier parts of Istio's authorization system is understanding how it handles identity. When a request arrives at your service, it might come from a workload with a verified mTLS identity, from an external client with a JWT token, or from something with no identity at all. How you write your authorization policies depends heavily on which of these cases you are dealing with.

## What Counts as an Authenticated Identity

In Istio, there are two types of authenticated identity:

**Peer identity (mTLS)** - When two services communicate within the mesh using mutual TLS, the sidecar proxies exchange certificates. The source workload's identity is its SPIFFE ID, which looks like `cluster.local/ns/my-namespace/sa/my-service-account`. This identity is cryptographically verified.

**Request identity (JWT)** - When a request carries a JWT token and you have a `RequestAuthentication` policy configured to validate it, the token's issuer and subject become the request identity. This looks like `https://accounts.google.com/sub-12345` (issuer/subject).

**Unauthenticated** - If a request arrives without mTLS (maybe the source has no sidecar) and without a valid JWT, the request has no identity. It is unauthenticated.

## How Permissive mTLS Affects Identity

By default, Istio uses `PERMISSIVE` mode for mTLS, which accepts both plaintext and mTLS traffic. This means your workload might receive some requests with verified peer identities and others without.

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

In permissive mode, if a request comes over plaintext (no mTLS), the source principal is empty. This matters for authorization because any policy that checks `principals` or `namespaces` will not match plaintext traffic, since there is no identity to match against.

## Writing Policies for Authenticated Sources

When you write an authorization policy with a `from.source.principals` field, it only matches requests from workloads with a verified mTLS identity:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-identity
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/api-server"
```

Plaintext traffic will never match this rule because it has no principal. So this policy implicitly rejects unauthenticated traffic (assuming no other ALLOW policies exist).

## Allowing Unauthenticated Traffic

Sometimes you genuinely need to allow traffic from sources without an identity. Maybe you have external traffic coming through the ingress gateway, or you have legacy services without sidecars.

To allow all traffic regardless of identity, write a rule without the `from` field:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-traffic
  namespace: default
spec:
  selector:
    matchLabels:
      app: public-api
  action: ALLOW
  rules:
  - to:
    - operation:
        paths:
        - "/health"
        methods:
        - "GET"
```

This allows GET requests to `/health` from anyone, authenticated or not. The absence of a `from` field means no source filtering is applied.

## Matching Any Authenticated Identity

If you want to allow any authenticated source (any valid mTLS identity) but reject unauthenticated traffic, use a wildcard principal:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-any-authenticated
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "*"
```

The `*` wildcard matches any non-empty principal. It will match `cluster.local/ns/foo/sa/bar` or any other valid SPIFFE identity, but it will not match an empty principal (unauthenticated traffic).

## Handling JWT-Based Identity

For request-level identity using JWTs, you first need a `RequestAuthentication` policy:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  jwtRules:
  - issuer: "https://accounts.example.com"
    jwksUri: "https://accounts.example.com/.well-known/jwks.json"
```

Important: `RequestAuthentication` only validates tokens that are present. It does NOT reject requests without tokens. A request with no JWT passes through just fine - it simply has no request identity.

To require a valid JWT, you need an authorization policy that checks for the request principal:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals:
        - "*"
```

This allows any request with a valid JWT (any non-empty request principal) and implicitly denies requests without a JWT.

## Mixing Authenticated and Unauthenticated Rules

A common pattern is to have public endpoints that anyone can access and protected endpoints that require authentication. You can handle this with multiple rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mixed-auth-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  # Public endpoints - no identity required
  - to:
    - operation:
        paths:
        - "/health"
        - "/public/*"
        methods:
        - "GET"
  # Protected endpoints - require JWT
  - from:
    - source:
        requestPrincipals:
        - "*"
    to:
    - operation:
        paths:
        - "/api/*"
```

The first rule allows GET requests to public paths from anyone. The second rule allows requests to `/api/*` only from sources with a valid JWT. The rules are ORed, so a request matches if it satisfies either rule.

## The Gotcha with Invalid Tokens

Here is something that catches people off guard. If a request carries an invalid JWT (expired, wrong signature, etc.), `RequestAuthentication` will reject it with a 401. But if a request carries no JWT at all, it passes through `RequestAuthentication` and arrives at the authorization policy with no identity.

This means the flow is:

1. Request has valid JWT -> Identity is set -> Authorization policy evaluates with identity
2. Request has invalid JWT -> Rejected at RequestAuthentication (401)
3. Request has no JWT -> No identity -> Authorization policy evaluates with empty identity

If your authorization policy requires `requestPrincipals: ["*"]`, case 3 will be denied. But if your policy has no `from` constraints, case 3 will be allowed.

## Checking Identity in Debugging

You can inspect what identity a proxy sees for incoming connections:

```bash
istioctl proxy-config secret <pod-name> -n default
```

This shows the certificates loaded in the sidecar, including the SPIFFE identity.

To see the request-level identity from JWTs, check the Envoy access logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n default
```

The access log can include the authenticated principal if you configure the log format to include `%DOWNSTREAM_PEER_SUBJECT%` and `%REQ(X-Forwarded-Client-Cert)%`.

## Best Practices

**Switch to STRICT mTLS in production.** Permissive mode is great during migration, but in production you want strict mTLS so that every in-mesh request has a verified identity.

**Always pair RequestAuthentication with AuthorizationPolicy.** RequestAuthentication alone does not enforce anything for requests without tokens. You need an authorization policy to actually require the identity.

**Use specific principals when possible.** Wildcards like `*` are useful but broad. When you can, specify exact service accounts or JWT subjects to limit the blast radius of any compromise.

**Test both happy and unhappy paths.** Send requests with valid tokens, invalid tokens, and no tokens to make sure your policies behave correctly in all three scenarios.

Understanding how authenticated and unauthenticated identities work in Istio is fundamental to getting authorization right. The distinction between "no identity" and "any identity" is subtle, but once you get it, writing correct policies becomes much more straightforward.
