# How to Integrate Istio with Auth0 for Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Auth0, Authentication, JWT, Security

Description: How to configure Istio service mesh to validate Auth0 JWTs for authentication and authorization across all your microservices.

---

Auth0 is one of the most widely used managed identity platforms. If you are already using Auth0 for your web or mobile applications, extending it to your Istio service mesh makes total sense. You get one identity system across your frontend and backend, with Istio handling token validation at the proxy level.

The integration is actually one of the simpler ones because Auth0 is a fully managed OIDC provider. You do not need to deploy anything extra in your cluster. You just point Istio at Auth0's JWKS endpoint and set up the right policies.

## Setting Up Auth0

If you do not already have an Auth0 tenant, create one at auth0.com. Then set up the resources you need.

Create an API in Auth0's dashboard. Go to Applications > APIs and create a new API:

- **Name**: Mesh Services
- **Identifier**: `https://api.mycompany.com` (this becomes the `audience` in token requests)
- **Signing Algorithm**: RS256

Create an application for machine-to-machine communication. Go to Applications > Applications and create:

- **Name**: Service Mesh Client
- **Application Type**: Machine to Machine
- **Authorized API**: Select the API you just created

Note down the Client ID, Client Secret, and your Auth0 domain (something like `mycompany.auth0.com`).

## Configuring Istio JWT Authentication

Create a RequestAuthentication resource that tells Istio how to validate Auth0 tokens:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: auth0-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://mycompany.auth0.com/"
      jwksUri: "https://mycompany.auth0.com/.well-known/jwks.json"
      audiences:
        - "https://api.mycompany.com"
      forwardOriginalToken: true
```

A few things to note:

- The `issuer` must include the trailing slash. Auth0 includes it in the `iss` claim, and if your config does not match exactly, validation will fail.
- The `audiences` field restricts which tokens are accepted. Only tokens issued for your specific API audience will pass validation.
- `forwardOriginalToken` passes the JWT to your backend services so they can read user claims.

Apply this to the mesh:

```bash
kubectl apply -f auth0-jwt.yaml
```

## Enforcing Authentication

Create an AuthorizationPolicy that requires a valid token:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-auth0-token
  namespace: default
spec:
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
      to:
        - operation:
            notPaths: ["/healthz", "/readyz", "/public/*"]
```

This denies all requests without a valid JWT, except for health checks and public paths.

## Using Auth0 Permissions and Roles

Auth0 supports RBAC through its Authorization Extension or the newer Auth0 Authorization Core. Permissions are included in the token as custom claims.

In Auth0's dashboard, go to your API settings and enable "Enable RBAC" and "Add Permissions in the Access Token". Then create permissions:

- `read:data`
- `write:data`
- `admin:manage`

Create roles and assign permissions:

- **Viewer**: `read:data`
- **Editor**: `read:data`, `write:data`
- **Admin**: `read:data`, `write:data`, `admin:manage`

Auth0 includes these in the token under the `permissions` claim. Use Istio authorization policies to check them:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: write-access
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://mycompany.auth0.com/*"]
      to:
        - operation:
            methods: ["POST", "PUT", "DELETE"]
            paths: ["/api/*"]
      when:
        - key: request.auth.claims[permissions]
          values: ["write:data"]
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-access
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://mycompany.auth0.com/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[permissions]
          values: ["admin:manage"]
```

## Custom Claims with Auth0 Actions

Auth0 Actions let you add custom claims to tokens. This is useful when you need to include data that Istio can use for authorization decisions.

Create an Auth0 Action (in the Auth0 dashboard under Actions > Library):

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://mycompany.com';

  api.accessToken.setCustomClaim(`${namespace}/team`, event.user.app_metadata.team);
  api.accessToken.setCustomClaim(`${namespace}/department`, event.user.app_metadata.department);
};
```

Then reference these claims in Istio policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: team-access
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://mycompany.auth0.com/*"]
      to:
        - operation:
            paths: ["/api/team-data/*"]
      when:
        - key: request.auth.claims[https://mycompany.com/team]
          values: ["engineering"]
```

## Machine-to-Machine Authentication

For service-to-service calls within the mesh, use Auth0's client credentials flow:

```bash
TOKEN=$(curl -s -X POST "https://mycompany.auth0.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "audience": "https://api.mycompany.com",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')
```

In Kubernetes, store the credentials as a secret and have your services fetch tokens:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth0-credentials
  namespace: default
type: Opaque
stringData:
  client-id: "your-client-id"
  client-secret: "your-client-secret"
  audience: "https://api.mycompany.com"
  domain: "mycompany.auth0.com"
```

## Testing the Integration

Verify the setup end to end:

```bash
# Get a token
TOKEN=$(curl -s -X POST "https://mycompany.auth0.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "audience": "https://api.mycompany.com",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')

# Should succeed
curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  https://app.mycompany.com/api/data

# Should fail (no token)
curl -s -w "\n%{http_code}" https://app.mycompany.com/api/data

# Should succeed (public path)
curl -s -w "\n%{http_code}" https://app.mycompany.com/public/info
```

Inspect the token to see what claims it contains:

```bash
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

## Handling Token Refresh

Auth0 access tokens have an expiration time (configurable in the API settings, default is 86400 seconds). Your services need to handle token refresh.

For machine-to-machine tokens, simply request a new token before the current one expires. For user-facing applications, use refresh tokens:

```bash
curl -s -X POST "https://mycompany.auth0.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "grant_type": "refresh_token",
    "refresh_token": "your-refresh-token"
  }'
```

## Troubleshooting

The most common issues:

1. **Trailing slash mismatch**: Auth0's issuer URL includes a trailing slash. Make sure your Istio config matches.
2. **Audience mismatch**: The token must be issued for the audience specified in your RequestAuthentication.
3. **JWKS fetch failures**: Check that istiod can reach `mycompany.auth0.com` over HTTPS. Network policies or egress restrictions might block it.

```bash
# Check istiod logs for JWT errors
kubectl logs -n istio-system deploy/istiod | grep -i jwt

# Verify JWKS endpoint is reachable
kubectl exec -n istio-system deploy/istiod -- curl -s https://mycompany.auth0.com/.well-known/jwks.json | jq .
```

Auth0 with Istio is a production-ready authentication setup that gets you managed identity without the operational overhead of running your own identity provider. The managed OIDC endpoints, built-in rate limiting, and enterprise features like anomaly detection make it a strong choice for teams that want to focus on building their product rather than managing identity infrastructure.
