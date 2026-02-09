# How to Configure Ambassador Edge Stack with OAuth2 Filter for Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ambassador, OAuth2

Description: Learn how to configure Ambassador Edge Stack OAuth2 filter for secure authentication, including integration with identity providers, token validation, and session management in Kubernetes environments.

---

Ambassador Edge Stack is a Kubernetes-native API gateway built on Envoy Proxy that provides sophisticated authentication capabilities. The OAuth2 filter enables you to integrate with identity providers and secure your applications using industry-standard OAuth2 and OpenID Connect protocols. This guide will walk you through configuring OAuth2 authentication in Ambassador.

## Understanding Ambassador OAuth2 Filter

The OAuth2 filter in Ambassador Edge Stack provides:
- Integration with OAuth2 and OIDC identity providers
- Automatic token acquisition and refresh
- Session management with cookies
- Support for authorization code flow
- Token validation and claims verification
- Seamless integration with Mapping resources

The filter handles the OAuth2 dance automatically, redirecting unauthenticated users to the identity provider and managing tokens transparently.

## Prerequisites and Installation

First, install Ambassador Edge Stack if you haven't already:

```bash
# Add Ambassador Helm repository
helm repo add datawire https://app.getambassador.io
helm repo update

# Install Ambassador Edge Stack
kubectl create namespace ambassador
kubectl apply -f https://app.getambassador.io/yaml/edge-stack/latest/aes-crds.yaml
kubectl wait --timeout=90s --for=condition=available deployment emissary-apiext -n emissary-system

helm install edge-stack datawire/edge-stack \
  --namespace ambassador \
  --create-namespace \
  --set emissary-ingress.agent.cloudConnectToken=$CLOUD_CONNECT_TOKEN
```

Verify the installation:

```bash
kubectl get pods -n ambassador
kubectl get svc -n ambassador
```

## Setting Up an OAuth2 Provider

Before configuring the filter, you need an OAuth2 provider. We'll use examples for popular providers.

### Google OAuth2 Configuration

First, create OAuth2 credentials in the Google Cloud Console:

1. Go to Google Cloud Console > APIs & Credentials
2. Create OAuth2 Client ID
3. Set authorized redirect URIs: `https://your-domain.com/.ambassador/oauth2/redirection-endpoint`

Store the credentials as a Kubernetes Secret:

```yaml
# google-oauth-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: google-oauth-client
  namespace: ambassador
type: Opaque
stringData:
  client-id: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
  client-secret: YOUR_GOOGLE_CLIENT_SECRET
```

Apply the secret:

```bash
kubectl apply -f google-oauth-secret.yaml
```

### Auth0 OAuth2 Configuration

For Auth0, create an application in the Auth0 dashboard:

```yaml
# auth0-oauth-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth0-oauth-client
  namespace: ambassador
type: Opaque
stringData:
  client-id: YOUR_AUTH0_CLIENT_ID
  client-secret: YOUR_AUTH0_CLIENT_SECRET
```

## Configuring the OAuth2 Filter

Create a Filter resource to configure OAuth2 authentication:

```yaml
# oauth2-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-google
  namespace: ambassador
spec:
  OAuth2:
    # OAuth2 provider configuration
    authorizationURL: https://accounts.google.com/o/oauth2/v2/auth

    # Client credentials from secret
    clientID: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
    secret: google-oauth-client

    # Required scopes
    scopes:
    - "openid"
    - "email"
    - "profile"

    # Token endpoint
    accessTokenValidation: auto

    # Where tokens come from after authentication
    grantType: "AuthorizationCode"

    # Cookie configuration for session management
    cookieName: "ambassador_session"
    cookieDomain: ".example.com"

    # Maximum session duration (1 week)
    maxStale: "168h"

    # Inject user info into headers
    injectRequestHeaders:
    - name: "X-User-Email"
      value: "{{ .token.email }}"
    - name: "X-User-ID"
      value: "{{ .token.sub }}"
    - name: "X-User-Name"
      value: "{{ .token.name }}"
```

For Auth0, the configuration would be:

```yaml
# oauth2-auth0-filter.yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-auth0
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://YOUR_DOMAIN.auth0.com/authorize
    clientID: YOUR_AUTH0_CLIENT_ID
    secret: auth0-oauth-client
    scopes:
    - "openid"
    - "profile"
    - "email"
    grantType: "AuthorizationCode"

    # Auth0 specific configuration
    extraAuthorizationParameters:
      audience: "https://api.example.com"

    # Token endpoint
    accessTokenValidation: auto
    accessTokenJWTFilter:
      issuer: "https://YOUR_DOMAIN.auth0.com/"
      audience: "https://api.example.com"

    cookieName: "auth0_session"
    maxStale: "24h"
```

Apply the filter:

```bash
kubectl apply -f oauth2-filter.yaml
```

## Applying the Filter to Services

Use FilterPolicy to apply the OAuth2 filter to specific services:

```yaml
# filter-policy.yaml
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: require-authentication
  namespace: default
spec:
  # Apply to specific hosts or paths
  rules:
  - host: "api.example.com"
    path: "/protected/*"
    filters:
    - name: oauth2-google
      namespace: ambassador

  # Allow public endpoints
  - host: "api.example.com"
    path: "/public/*"
    filters: null
```

Or apply directly to a Mapping:

```yaml
# protected-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: protected-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80

  # Apply OAuth2 filter
  filters:
  - name: oauth2-google
    namespace: ambassador
```

## Advanced Configuration Options

### Token Validation and Claims

Configure JWT token validation with specific claims:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-with-validation
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
    clientID: YOUR_AZURE_CLIENT_ID
    secret: azure-oauth-client

    # Validate JWT tokens
    accessTokenValidation: jwt
    accessTokenJWTFilter:
      issuer: "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0"
      audience: "api://YOUR_API_ID"

      # Require specific claims
      requireClaims:
      - name: "roles"
        values:
        - "admin"
        - "user"

      # Validate token expiration
      requireExpiresAt: true
      requireIssuedAt: true

      # Allowed signing algorithms
      supportedAlgs:
      - "RS256"
      - "RS384"
      - "RS512"
```

### Custom Redirect URLs

Customize the OAuth2 callback handling:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-custom-redirect
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://oauth.provider.com/authorize
    clientID: YOUR_CLIENT_ID
    secret: oauth-client-secret

    # Custom redirect endpoint
    protectedOrigins:
    - origin: "https://app.example.com"
    - origin: "https://admin.example.com"

    # Where to redirect after authentication
    redirectURL: "https://app.example.com/.ambassador/oauth2/redirection-endpoint"

    # Allow specific return paths
    allowedRedirectURLs:
    - "https://app.example.com/dashboard"
    - "https://app.example.com/profile"
```

### Session Configuration

Fine-tune session management:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-session-config
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://accounts.google.com/o/oauth2/v2/auth
    clientID: YOUR_CLIENT_ID
    secret: google-oauth-client

    # Session cookie settings
    cookieName: "app_session"
    cookieDomain: ".example.com"
    cookiePath: "/"
    cookieHttpOnly: true
    cookieSecure: true
    cookieSameSite: "Lax"

    # Session duration
    maxStale: "24h"

    # Token refresh
    useRefreshToken: true
    refreshTokenExpiryBuffer: "5m"
```

### Multiple OAuth2 Providers

Support multiple identity providers:

```yaml
# Google OAuth2
---
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-google
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://accounts.google.com/o/oauth2/v2/auth
    clientID: GOOGLE_CLIENT_ID
    secret: google-oauth-client
    scopes: ["openid", "email", "profile"]

# GitHub OAuth2
---
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-github
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://github.com/login/oauth/authorize
    clientID: GITHUB_CLIENT_ID
    secret: github-oauth-client
    scopes: ["read:user", "user:email"]

# Apply different providers to different paths
---
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: multi-provider-policy
  namespace: default
spec:
  rules:
  - host: "app.example.com"
    path: "/google-login/*"
    filters:
    - name: oauth2-google
      namespace: ambassador
  - host: "app.example.com"
    path: "/github-login/*"
    filters:
    - name: oauth2-github
      namespace: ambassador
```

## Testing OAuth2 Configuration

Test the OAuth2 flow:

```bash
# Access a protected endpoint (should redirect to OAuth2 provider)
curl -L https://api.example.com/protected/resource

# After authentication, check injected headers
curl -H "Cookie: ambassador_session=YOUR_SESSION_TOKEN" \
  https://api.example.com/protected/resource -v
```

Verify the authentication flow:

1. Access protected resource in browser
2. Should redirect to OAuth2 provider
3. Complete authentication
4. Should redirect back with session cookie
5. Subsequent requests should be authenticated

## Debugging and Troubleshooting

Enable debug logging in Ambassador:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: ambassador
spec:
  config:
    diagnostics:
      enabled: true

    # Enable OAuth2 debug logs
    loglevel: debug
```

Check Ambassador logs:

```bash
kubectl logs -n ambassador -l app.kubernetes.io/name=edge-stack --follow
```

Common issues:
- **Redirect loop**: Check that `protectedOrigins` matches your actual domain
- **Invalid client**: Verify client ID and secret are correct
- **Token validation fails**: Ensure issuer and audience match your provider configuration
- **Cookie not set**: Check cookie domain and secure settings match your environment

Test OAuth2 configuration:

```bash
# Check Filter status
kubectl get filter oauth2-google -n ambassador -o yaml

# Verify FilterPolicy
kubectl describe filterpolicy require-authentication

# Check mapping configuration
kubectl get mapping protected-api -o yaml
```

## Conclusion

Ambassador Edge Stack's OAuth2 filter provides a powerful, declarative way to add authentication to your Kubernetes services. By integrating with standard OAuth2 and OIDC providers, you can secure your applications without modifying application code. The filter handles the complexity of token management, session handling, and claims validation, allowing you to focus on building features rather than authentication infrastructure.

Remember to always use HTTPS in production, configure appropriate session timeouts, and validate tokens thoroughly to ensure your applications remain secure.
