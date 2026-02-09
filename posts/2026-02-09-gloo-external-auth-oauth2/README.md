# How to Implement Gloo External Authentication with OAuth2 and OIDC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gloo, OAuth2, Authentication

Description: Learn how to configure Gloo Edge external authentication with OAuth2 and OpenID Connect, enabling secure API access with industry-standard identity providers like Auth0, Okta, and Keycloak.

---

Gloo Edge provides external authentication through the ExtAuth service, which intercepts requests and validates credentials before forwarding to backends. OAuth2 and OIDC support enables integration with enterprise identity providers, social login, and modern authentication flows while keeping backend services stateless and focused on business logic.

## Understanding Gloo ExtAuth

The ExtAuth service acts as an authentication gateway:

1. Client sends request with credentials (JWT, OAuth token, API key)
2. Gloo intercepts and forwards to ExtAuth service
3. ExtAuth validates credentials against configured provider
4. If valid, ExtAuth returns user context headers
5. Gloo forwards request to backend with added headers
6. If invalid, Gloo returns 401/403 to client

This centralizes authentication logic and enables consistent policies across all routes.

## Deploying ExtAuth Service

ExtAuth is included with Gloo Enterprise. For open-source Gloo, deploy manually:

```bash
kubectl apply -f https://raw.githubusercontent.com/solo-io/gloo/main/install/helm/gloo/templates/5-extauth-deployment.yaml
```

Or enable via Helm:

```yaml
# gloo-values.yaml
global:
  extensions:
    extAuth:
      enabled: true
      deployment:
        replicas: 2
```

## Configuring OAuth2 with Auth0

Create OAuth2 configuration for Auth0:

```yaml
# auth0-oauth-config.yaml
apiVersion: enterprise.gloo.solo.io/v1
kind: AuthConfig
metadata:
  name: auth0-oauth
  namespace: gloo-system
spec:
  configs:
  - oauth2:
      oidcAuthorizationCode:
        appUrl: https://api.example.com
        callbackPath: /callback
        clientId: your-auth0-client-id
        clientSecretRef:
          name: auth0-client-secret
          namespace: gloo-system
        issuerUrl: https://your-tenant.auth0.com/
        scopes:
        - openid
        - profile
        - email
        session:
          cookieOptions:
            maxAge: 3600
            secure: true
          redis:
            host: redis.default.svc.cluster.local:6379
```

Create the client secret:

```bash
kubectl create secret generic auth0-client-secret \
  -n gloo-system \
  --from-literal=oauth=your-auth0-client-secret
```

## Applying OAuth2 to VirtualService

Enable authentication on routes:

```yaml
# protected-virtualservice.yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: protected-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'api.example.com'
    options:
      extauth:
        configRef:
          name: auth0-oauth
          namespace: gloo-system
    routes:
    - matchers:
      - prefix: /api
      routeAction:
        single:
          upstream:
            name: backend-service
            namespace: gloo-system

    # Public route without auth
    - matchers:
      - prefix: /public
      routeAction:
        single:
          upstream:
            name: public-service
            namespace: gloo-system
      options:
        extauth:
          disable: true
```

## Configuring with Okta

Okta OIDC configuration:

```yaml
# okta-oidc-config.yaml
apiVersion: enterprise.gloo.solo.io/v1
kind: AuthConfig
metadata:
  name: okta-oidc
  namespace: gloo-system
spec:
  configs:
  - oauth2:
      oidcAuthorizationCode:
        appUrl: https://api.example.com
        callbackPath: /auth/callback
        clientId: 0oa2example
        clientSecretRef:
          name: okta-client-secret
          namespace: gloo-system
        issuerUrl: https://dev-123456.okta.com/oauth2/default
        scopes:
        - openid
        - profile
        - email
        - groups
        session:
          failOnFetchFailure: true
          redis:
            host: redis.default.svc.cluster.local:6379
```

## JWT Validation

Validate JWT tokens without full OAuth flow:

```yaml
# jwt-validation-config.yaml
apiVersion: enterprise.gloo.solo.io/v1
kind: AuthConfig
metadata:
  name: jwt-auth
  namespace: gloo-system
spec:
  configs:
  - jwt:
      providers:
        auth0:
          issuer: https://your-tenant.auth0.com/
          audiences:
          - your-api-audience
          jwks:
            remote:
              url: https://your-tenant.auth0.com/.well-known/jwks.json
              cacheDuration: 300s
        okta:
          issuer: https://dev-123456.okta.com/oauth2/default
          audiences:
          - api://default
          jwks:
            remote:
              url: https://dev-123456.okta.com/oauth2/default/v1/keys
```

## API Key Authentication

Simple API key validation:

```yaml
# apikey-config.yaml
apiVersion: enterprise.gloo.solo.io/v1
kind: AuthConfig
metadata:
  name: apikey-auth
  namespace: gloo-system
spec:
  configs:
  - apiKeyAuth:
      headerName: X-API-Key
      labelSelector:
        app: api-consumer
      headersFromMetadata:
        X-Consumer-ID:
          name: consumer-id
        X-Consumer-Name:
          name: consumer-name
```

Create API key secrets:

```bash
kubectl create secret generic api-consumer-1 \
  -n default \
  --from-literal=api-key=secret-key-123 \
  --from-literal=consumer-id=consumer-1 \
  --from-literal=consumer-name="Mobile App"

kubectl label secret api-consumer-1 -n default app=api-consumer
```

## Multi-Provider Configuration

Support multiple auth providers:

```yaml
# multi-provider-config.yaml
apiVersion: enterprise.gloo.solo.io/v1
kind: AuthConfig
metadata:
  name: multi-auth
  namespace: gloo-system
spec:
  configs:
  # Try OAuth2 first
  - oauth2:
      oidcAuthorizationCode:
        appUrl: https://api.example.com
        callbackPath: /callback
        clientId: oauth-client-id
        clientSecretRef:
          name: oauth-secret
          namespace: gloo-system
        issuerUrl: https://auth.example.com/

  # Fallback to API key
  - apiKeyAuth:
      headerName: X-API-Key
      labelSelector:
        app: api-consumer
```

## Role-Based Access Control

Add RBAC based on OAuth claims:

```yaml
# rbac-config.yaml
apiVersion: enterprise.gloo.solo.io/v1
kind: AuthConfig
metadata:
  name: oauth-rbac
  namespace: gloo-system
spec:
  configs:
  - oauth2:
      oidcAuthorizationCode:
        # ... OAuth config ...
  - rbac:
      policies:
        admin-only:
          principals:
          - jwtPrincipal:
              claims:
                role: admin
          permissions:
            methods:
            - GET
            - POST
            - PUT
            - DELETE
            pathPrefix: /admin

        user-read:
          principals:
          - jwtPrincipal:
              claims:
                role: user
          permissions:
            methods:
            - GET
            pathPrefix: /api
```

Apply to routes:

```yaml
routes:
- matchers:
  - prefix: /admin
  routeAction:
    single:
      upstream:
        name: admin-service
        namespace: gloo-system
  options:
    rbac:
      policies:
      - admin-only

- matchers:
  - prefix: /api
  routeAction:
    single:
      upstream:
        name: api-service
        namespace: gloo-system
  options:
    rbac:
      policies:
      - user-read
      - admin-only
```

## Session Management with Redis

Configure Redis for session storage:

```yaml
# redis-session-storage.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: default
spec:
  selector:
    app: redis
  ports:
  - port: 6379
```

## Custom Claims Extraction

Extract custom claims to headers:

```yaml
spec:
  configs:
  - jwt:
      providers:
        custom:
          issuer: https://auth.example.com/
          jwks:
            remote:
              url: https://auth.example.com/.well-known/jwks.json
          claimsToHeaders:
          - claim: sub
            header: X-User-ID
          - claim: email
            header: X-User-Email
          - claim: roles
            header: X-User-Roles
          - claim: tenant_id
            header: X-Tenant-ID
```

Backend receives headers:

```
X-User-ID: user-12345
X-User-Email: user@example.com
X-User-Roles: ["admin", "user"]
X-Tenant-ID: tenant-abc
```

## Testing OAuth2 Flow

Test the authentication:

```bash
GLOO_PROXY=$(kubectl get svc gateway-proxy -n gloo-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Access protected endpoint (will redirect to OAuth provider)
curl -i http://${GLOO_PROXY}/api/data

# After OAuth flow, request with session cookie
curl -i http://${GLOO_PROXY}/api/data \
  --cookie "session=<session-token>"

# With JWT token
curl -H "Authorization: Bearer <jwt-token>" \
  http://${GLOO_PROXY}/api/data
```

## Monitoring ExtAuth

View ExtAuth metrics:

```promql
# Authentication success rate
rate(gloo_extauth_authorized_total{result="ok"}[5m])

# Authentication latency
histogram_quantile(0.99,
  rate(gloo_extauth_duration_seconds_bucket[5m])
)

# Failed authentications
rate(gloo_extauth_authorized_total{result!="ok"}[5m])
```

## Best Practices

**Use HTTPS exclusively** - OAuth flows require HTTPS to prevent token interception.

**Configure short session TTLs** - Balance security and user experience with appropriate timeouts.

**Implement token refresh** - Use refresh tokens for long-lived sessions.

**Monitor failed auth attempts** - Track and alert on authentication failures indicating attacks.

**Use Redis clustering** - Deploy Redis in cluster mode for session storage high availability.

**Implement logout endpoints** - Provide proper session termination for users.

**Test provider connectivity** - Ensure JWKS endpoints are accessible and cached appropriately.

## Conclusion

Gloo's ExtAuth service provides enterprise-grade authentication with OAuth2 and OIDC support, enabling integration with modern identity providers while maintaining backend service simplicity. By centralizing authentication at the gateway layer, teams gain consistent security policies, simplified backend code, and flexibility to change identity providers without application updates. Combined with RBAC and custom claim extraction, Gloo ExtAuth delivers sophisticated authentication and authorization capabilities suitable for enterprise microservices architectures.
