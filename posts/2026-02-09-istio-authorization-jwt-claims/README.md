# How to Create Fine-Grained Istio AuthorizationPolicies Based on JWT Claims in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, JWT, Authorization, Kubernetes, Security, OAuth

Description: Learn how to implement fine-grained authorization in Istio using JWT claims to control access based on user roles, scopes, and custom attributes for sophisticated access control policies.

---

JWT-based authorization lets you control service access based on user identity and attributes embedded in tokens. Istio can validate JWTs and enforce policies based on claims like user roles, departments, or subscription tiers. This guide shows you how to implement JWT-based authorization for sophisticated access control.

## Understanding JWT Authentication in Istio

Istio separates authentication from authorization. Authentication validates that a JWT is valid and from a trusted issuer. Authorization checks if the authenticated user has permission to access a resource.

The RequestAuthentication resource configures JWT validation. It specifies where to get public keys, which issuers to trust, and where to find JWTs in requests. Once authenticated, AuthorizationPolicy resources check JWT claims to make access decisions.

This two-step approach gives you flexibility. You can authenticate users from multiple identity providers and then apply consistent authorization logic across all of them.

## Prerequisites

You need a Kubernetes cluster with Istio installed and a JWT issuer. For testing, we'll use a sample JWT issuer, but in production you'd use Auth0, Keycloak, or your identity provider.

Deploy sample applications:

```yaml
# sample-apps.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: httpbin
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      serviceAccountName: httpbin
      containers:
      - name: httpbin
        image: kennethreitz/httpbin:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  namespace: default
spec:
  selector:
    app: httpbin
  ports:
  - port: 8000
    targetPort: 80
```

```bash
kubectl apply -f sample-apps.yaml
```

## Configuring JWT Authentication

Create a RequestAuthentication resource that validates JWTs from your identity provider:

```yaml
# requestauthentication-jwt.yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  - issuer: "https://your-auth-provider.com"
    # JWKS endpoint for public keys
    jwksUri: "https://your-auth-provider.com/.well-known/jwks.json"
    # Where to find JWT in request
    fromHeaders:
    - name: Authorization
      prefix: "Bearer "
    # JWT audience validation
    audiences:
    - "your-api-audience"
```

```bash
kubectl apply -f requestauthentication-jwt.yaml
```

This configures Istio to validate JWTs in the Authorization header from your issuer. If a request includes a JWT, Istio validates it. If validation fails, Istio rejects the request. If no JWT is present, Istio allows the request (authentication is optional unless you add authorization policies).

## Creating a Basic JWT Authorization Policy

Require valid JWTs for all requests to httpbin:

```yaml
# authorizationpolicy-require-jwt.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        # Require JWT authentication (not anonymous)
        requestPrincipals: ["*"]
```

```bash
kubectl apply -f authorizationpolicy-require-jwt.yaml
```

Now requests without valid JWTs are rejected. Test with curl:

```bash
# Request without JWT - should fail
kubectl run test-pod --image=curlimages/curl --rm -it -- curl -s http://httpbin:8000/get

# Request with JWT - should succeed
kubectl run test-pod --image=curlimages/curl --rm -it -- curl -H "Authorization: Bearer <your-jwt>" -s http://httpbin:8000/get
```

## Authorizing Based on JWT Scopes

OAuth 2.0 scopes define what actions a token can perform. Check for specific scopes in your authorization policy:

```yaml
# authorizationpolicy-scopes.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-read-scope
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Allow GET requests with read scope
  - to:
    - operation:
        methods: ["GET"]
    when:
    - key: request.auth.claims[scope]
      values: ["*read*"]
  # Allow POST requests with write scope
  - to:
    - operation:
        methods: ["POST", "PUT", "DELETE"]
    when:
    - key: request.auth.claims[scope]
      values: ["*write*"]
```

```bash
kubectl apply -f authorizationpolicy-scopes.yaml
```

This allows GET requests with tokens containing the read scope and POST/PUT/DELETE with the write scope. The wildcard pattern `*read*` matches "read", "read:all", or "api.read".

## Implementing Role-Based Access Control with JWT Claims

Map JWT roles to access permissions. Allow admins full access, readers GET only:

```yaml
# authorizationpolicy-rbac.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: rbac-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Admins can do anything
  - when:
    - key: request.auth.claims[role]
      values: ["admin"]
  # Readers can only GET
  - to:
    - operation:
        methods: ["GET", "HEAD", "OPTIONS"]
    when:
    - key: request.auth.claims[role]
      values: ["reader"]
  # Writers can GET and POST
  - to:
    - operation:
        methods: ["GET", "HEAD", "OPTIONS", "POST", "PUT"]
    when:
    - key: request.auth.claims[role]
      values: ["writer"]
```

```bash
kubectl apply -f authorizationpolicy-rbac.yaml
```

Users with the admin role in their JWT can access all methods. Readers only GET, writers GET and POST.

## Authorizing Based on Custom JWT Claims

Use custom claims for business logic authorization. Allow premium users to access special endpoints:

```yaml
# authorizationpolicy-custom-claims.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: premium-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Allow all users to access public endpoints
  - to:
    - operation:
        paths: ["/get", "/status/*"]
    when:
    - key: request.auth.claims[iss]
      values: ["https://your-auth-provider.com"]
  # Only premium users can access premium endpoints
  - to:
    - operation:
        paths: ["/premium/*"]
    when:
    - key: request.auth.claims[subscription_tier]
      values: ["premium", "enterprise"]
```

```bash
kubectl apply -f authorizationpolicy-custom-claims.yaml
```

This checks the custom `subscription_tier` claim in the JWT. Only tokens with premium or enterprise tier can access /premium/* paths.

## Combining Multiple JWT Claims

Create complex authorization rules combining multiple claims with AND/OR logic:

```yaml
# authorizationpolicy-complex.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: complex-authorization
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Allow if user is admin OR (in engineering department AND has write scope)
  - when:
    - key: request.auth.claims[role]
      values: ["admin"]
  - when:
    - key: request.auth.claims[department]
      values: ["engineering"]
    - key: request.auth.claims[scope]
      values: ["*write*"]
```

Multiple `when` conditions within a rule use AND logic. Multiple rules use OR logic. This policy allows admins or engineering users with write scope.

## Handling JWT Groups and Arrays

JWTs often include group memberships as arrays. Check if a user belongs to specific groups:

```yaml
# authorizationpolicy-groups.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: group-authorization
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Allow if user is in the developers group
  - when:
    - key: request.auth.claims[groups]
      values: ["developers"]
  # Or in the devops group
  - when:
    - key: request.auth.claims[groups]
      values: ["devops"]
```

```bash
kubectl apply -f authorizationpolicy-groups.yaml
```

Istio automatically handles array claims. If the groups claim is `["developers", "qa"]`, this policy allows access.

## Creating DENY Policies for Sensitive Operations

Use DENY actions for explicit denials that override ALLOW rules:

```yaml
# authorizationpolicy-deny.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-delete
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: DENY
  rules:
  # Deny DELETE unless user is admin
  - to:
    - operation:
        methods: ["DELETE"]
    when:
    - key: request.auth.claims[role]
      notValues: ["admin"]
```

```bash
kubectl apply -f authorizationpolicy-deny.yaml
```

DENY policies take precedence over ALLOW policies. This explicitly denies DELETE requests from non-admins even if another policy would allow them.

## Validating JWT Audience Claims

The audience claim specifies which API the token is intended for. Validate audience to prevent token reuse across different APIs:

```yaml
# requestauthentication-audience.yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-audience
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  - issuer: "https://your-auth-provider.com"
    jwksUri: "https://your-auth-provider.com/.well-known/jwks.json"
    audiences:
    - "httpbin-api"
    - "internal-services"
```

Only JWTs with audience "httpbin-api" or "internal-services" pass authentication. This prevents tokens for other APIs from being used.

## Implementing Time-Based Access Control

Combine JWT validation with time-based restrictions:

```yaml
# authorizationpolicy-time-based.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: time-based-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Regular users - business hours only (checked via JWT exp/iat claims)
  - when:
    - key: request.auth.claims[role]
      values: ["user"]
    - key: request.auth.claims[exp]
      values: ["*"]
  # Admins - anytime
  - when:
    - key: request.auth.claims[role]
      values: ["admin"]
```

The JWT exp (expiration) claim automatically enforces time limits. Issue shorter-lived tokens to non-admin users to restrict access windows.

## Debugging JWT Authorization

When authorization fails, check the logs to see why. Enable debug logging:

```bash
istioctl proxy-config log <pod-name> --level rbac:debug
```

Make a request and check proxy logs:

```bash
kubectl logs <pod-name> -c istio-proxy | grep rbac
```

You'll see which authorization policy matched and why. Common issues include:

- JWT claim name mismatches
- Incorrect claim values
- Missing claims
- Wrong selector labels

Use istioctl to validate your policies:

```bash
istioctl analyze -n default
```

## Testing JWT Authorization Policies

Generate test JWTs with specific claims to verify your policies. Use a JWT generation tool or library:

```python
# generate_test_jwt.py
import jwt
import datetime

def generate_jwt(role, scopes):
    payload = {
        'iss': 'https://your-auth-provider.com',
        'sub': 'test-user',
        'aud': 'httpbin-api',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        'iat': datetime.datetime.utcnow(),
        'role': role,
        'scope': scopes,
        'department': 'engineering'
    }

    # Use your private key
    token = jwt.encode(payload, 'your-private-key', algorithm='RS256')
    return token

# Generate tokens for testing
admin_token = generate_jwt('admin', 'read write')
reader_token = generate_jwt('reader', 'read')

print(f"Admin token: {admin_token}")
print(f"Reader token: {reader_token}")
```

Test each token against your policies:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://httpbin:8000/delete
curl -H "Authorization: Bearer $READER_TOKEN" http://httpbin:8000/get
```

## Conclusion

JWT-based authorization in Istio enables sophisticated access control based on user identity and attributes. Configure RequestAuthentication to validate JWTs from your identity provider, then create AuthorizationPolicies that check claims to make access decisions.

Use JWT scopes for API permission management, roles for RBAC, and custom claims for business logic authorization. Combine multiple claims to create complex rules matching your security requirements.

DENY policies provide explicit denials for sensitive operations. Always validate JWT audience claims to prevent token reuse across APIs. Test thoroughly with different token combinations to ensure your policies work as expected.

Start with simple role-based policies and add complexity as needed. Monitor authorization denials in your logs and adjust policies based on actual access patterns. This gives you production-grade authorization without modifying your application code.
