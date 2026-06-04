# How to Configure Ambassador Edge Stack with OAuth2 Filter for Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ambassador, OAuth2

Description: Learn how to configure Ambassador Edge Stack OAuth2 filter for secure authentication, including integration with identity providers, token validation.

---

Ambassador Edge Stack is a Kubernetes-native API gateway built on Envoy Proxy that provides sophisticated authentication capabilities. The OAuth2 filter enables you to integrate with identity providers and secure your applications using industry-standard OAuth2 and OpenID Connect protocols. This guide will walk you through configuring OAuth2 authentication in Ambassador.

## Understanding Ambassador OAuth2 Filter

The OAuth2 filter in Ambassador Edge Stack provides:
- Integration with OAuth2 and OIDC identity providers
- Automatic token acquisition and refresh
- Session management with cookies
- Support for authorization code flow
- Token validation and claims verification
- Seamless integration with FilterPolicy and Mapping resources

The filter handles the OAuth2 dance automatically, redirecting unauthenticated users to the identity provider and managing tokens transparently.

## Prerequisites and Installation

First, install Ambassador Edge Stack if you haven't already:

```bash
# Add Ambassador Helm repository

helm repo add datawire https://app.getambassador.io
helm repo update

# Install Ambassador Edge Stack
kubectl create namespace ambassador
kubectl apply -f https://app.getambassador.io/yaml/edge-stack/3.13.1/aes-crds.yaml
kubectl wait --timeout=90s --for=condition=available deployment emissary-apiext -n emissary-system

helm install edge-stack datawire/edge-stack \
  --namespace ambassador \
  --set licenseKey.value=$LICENSE_KEY
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
  oauth2-client-secret: YOUR_GOOGLE_CLIENT_SECRET
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
  oauth2-client-secret: YOUR_AUTH0_CLIENT_SECRET
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
    authorizationURL: https://accounts.google.com

    # Client credentials from secret
    clientID: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
    secretName: google-oauth-client

    # The scheme and host that users access through Ambassador Edge Stack
    protectedOrigins:
    - origin: "https://your-domain.com"

    # Where tokens come from after authentication
    grantType: "AuthorizationCode"

    # Maximum idle session duration (1 week)
    clientSessionMaxIdle: "168h"

    # Cache OIDC discovery and JWKS responses for up to 1 week
    maxStale: "168h"

    # Inject user info into headers
    injectRequestHeaders:
    - name: "X-User-Email"
      value: "{{ index .idToken.Claims \"email\" }}"
    - name: "X-User-ID"
      value: "{{ index .idToken.Claims \"sub\" }}"
    - name: "X-User-Name"
      value: "{{ index .idToken.Claims \"name\" }}"
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
    authorizationURL: https://YOUR_DOMAIN.auth0.com
    clientID: YOUR_AUTH0_CLIENT_ID
    secretName: auth0-oauth-client
    protectedOrigins:
    - origin: "https://api.example.com"
    grantType: "AuthorizationCode"

    # Auth0 specific configuration
    extraAuthorizationParameters:
      audience: "https://api.example.com"

    # Token endpoint
    accessTokenValidation: auto
    clientSessionMaxIdle: "24h"
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
      arguments:
        scope:
        - "openid"
        - "email"
        - "profile"

  # Allow public endpoints
  - host: "api.example.com"
    path: "/public/*"
```

Create a Mapping for the protected service; the FilterPolicy above applies authentication based on the host and path:

```yaml
# protected-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: protected-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /protected/
  service: backend-service:80
```

## Advanced Configuration Options

### Token Validation and Claims

Configure JWT token validation with issuer, audience, timestamp, and signing algorithm checks:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: jwt-token-validation
  namespace: ambassador
spec:
  JWT:
    jwksURI: https://login.microsoftonline.com/YOUR_TENANT_ID/discovery/v2.0/keys
    issuer: "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0"
    requireIssuer: true
    audience: "api://YOUR_API_ID"
    requireAudience: true
    requireExpiresAt: true
    requireIssuedAt: true
    validAlgorithms:
    - "RS256"
    - "RS384"
    - "RS512"
---
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-with-validation
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0
    clientID: YOUR_AZURE_CLIENT_ID
    secretName: azure-oauth-client
    protectedOrigins:
    - origin: "https://api.example.com"

    # Validate access tokens with the JWT Filter above
    accessTokenValidation: jwt
    accessTokenJWTFilter:
      name: jwt-token-validation
```

### Multiple Protected Origins

Configure multiple external origins that share the same authentication system:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-custom-redirect
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://oauth.provider.com
    clientID: YOUR_CLIENT_ID
    secretName: oauth-client-secret

    # Register each origin as {{ORIGIN}}/.ambassador/oauth2/redirection-endpoint with the IdP
    protectedOrigins:
    - origin: "https://app.example.com"
    - origin: "https://admin.example.com"
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
    authorizationURL: https://accounts.google.com
    clientID: YOUR_CLIENT_ID
    secretName: google-oauth-client
    protectedOrigins:
    - origin: "https://app.example.com"

    # Use browser-session cookies instead of cookies with a fixed expiration time
    useSessionCookies:
      value: true

    # Maximum idle session duration
    clientSessionMaxIdle: "24h"

    # Cache OIDC discovery and JWKS responses for up to 24 hours
    maxStale: "24h"
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
    authorizationURL: https://accounts.google.com
    clientID: GOOGLE_CLIENT_ID
    secretName: google-oauth-client
    protectedOrigins:
    - origin: "https://app.example.com"

# Auth0 OAuth2
---
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: oauth2-auth0
  namespace: ambassador
spec:
  OAuth2:
    authorizationURL: https://YOUR_DOMAIN.auth0.com
    clientID: AUTH0_CLIENT_ID
    secretName: auth0-oauth-client
    extraAuthorizationParameters:
      audience: "https://api.example.com"
    protectedOrigins:
    - origin: "https://admin.example.com"

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
      arguments:
        scope:
        - "openid"
        - "email"
        - "profile"
  - host: "app.example.com"
    path: "/auth0-login/*"
    filters:
    - name: oauth2-auth0
      namespace: ambassador
      arguments:
        scope:
        - "openid"
```

## Testing OAuth2 Configuration

Test the OAuth2 flow:

```bash
# Access a protected endpoint (should redirect to OAuth2 provider)
curl -L https://api.example.com/protected/resource

# After authentication in a browser, copy the Ambassador Edge Stack session cookie
# from the browser dev tools and check the protected endpoint
curl -H "Cookie: ambassador_session.oauth2-google.ambassador=YOUR_SESSION_TOKEN" \
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
- **Cookie not set**: Check that `protectedOrigins` uses the same scheme and host that users access

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
