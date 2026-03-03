# How to Configure JWT Token Location in Istio Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Token Location, RequestAuthentication, Headers

Description: How to configure where Istio looks for JWT tokens in incoming requests including headers, query parameters, and custom locations.

---

By default, Istio looks for JWTs in the `Authorization` header with a `Bearer` prefix. But not every API follows that convention. Some APIs pass tokens in custom headers, others use query parameters, and some legacy systems use cookies. Istio's RequestAuthentication supports configuring custom token locations through `fromHeaders` and `fromParams`.

## Default Behavior

When you don't specify `fromHeaders` or `fromParams`, Istio looks for the JWT in:

```text
Authorization: Bearer <token>
```

This is standard OAuth 2.0 bearer token usage. The proxy strips the `Bearer ` prefix and validates the remaining string as a JWT.

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: default-location
  namespace: backend
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      # No fromHeaders or fromParams - uses Authorization: Bearer by default
```

## Custom Header Location

To read the JWT from a different header, use `fromHeaders`:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: custom-header
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: x-jwt-token
```

Now Istio looks for the JWT in the `x-jwt-token` header, with no prefix expected:

```bash
curl -H "x-jwt-token: eyJhbGciOiJSUzI1NiJ9..." http://api-server/endpoint
```

## Header with a Custom Prefix

Some APIs use a custom prefix instead of `Bearer`. Use the `prefix` field:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: custom-prefix
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: Authorization
          prefix: "Token "
```

Now the expected format is:

```bash
curl -H "Authorization: Token eyJhbGciOiJSUzI1NiJ9..." http://api-server/endpoint
```

Note the space after "Token " in the prefix - this is important. The prefix is stripped before the remaining string is parsed as a JWT.

## Query Parameter Location

For APIs that accept tokens in query parameters (common in WebSocket or download URLs):

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: query-param
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromParams:
        - "access_token"
```

Now Istio extracts the JWT from the query string:

```bash
curl "http://api-server/endpoint?access_token=eyJhbGciOiJSUzI1NiJ9..."
```

## Multiple Locations

You can specify multiple headers and parameters. Istio checks them in order and uses the first one that contains a token:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: multi-location
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "
        - name: x-jwt-token
        - name: x-api-token
      fromParams:
        - "access_token"
        - "token"
```

This configuration checks in order:
1. `Authorization: Bearer <token>`
2. `x-jwt-token: <token>`
3. `x-api-token: <token>`
4. Query parameter `access_token`
5. Query parameter `token`

## When You Set fromHeaders, the Default Is Replaced

This is an important detail. When you specify `fromHeaders`, the default `Authorization: Bearer` behavior is replaced, not augmented. If you want to keep the default while adding a custom header, you must include it explicitly:

```yaml
# This ONLY checks x-jwt-token, NOT Authorization: Bearer
fromHeaders:
  - name: x-jwt-token

# This checks BOTH Authorization: Bearer AND x-jwt-token
fromHeaders:
  - name: Authorization
    prefix: "Bearer "
  - name: x-jwt-token
```

## Cookie-Based Tokens

Istio doesn't have native cookie extraction for JWTs, but you can use a header that your reverse proxy or gateway sets from a cookie. For example, if your gateway extracts the JWT from a cookie and puts it in a header:

```yaml
# Gateway or EnvoyFilter extracts cookie to header
# Then RequestAuthentication reads from that header
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: cookie-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: x-jwt-from-cookie
```

You'd need an EnvoyFilter or Lua filter at the gateway to copy the cookie value to the `x-jwt-from-cookie` header before it reaches the RequestAuthentication logic.

## Practical Example: API with Multiple Auth Methods

Many real APIs support multiple authentication methods. Here's a setup for an API that accepts:

1. Standard Bearer tokens in the Authorization header
2. API tokens in a custom header (for backward compatibility)
3. Tokens in query parameters (for WebSocket connections)

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: multi-auth-location
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "api.example.com"
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "
        - name: x-api-key
      fromParams:
        - "token"
      forwardOriginalToken: true
```

## Testing Different Locations

```bash
# Test with Authorization header
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://api-server.backend:8080/api/data

# Test with custom header
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $TOKEN" \
  http://api-server.backend:8080/api/data

# Test with query parameter
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  "http://api-server.backend:8080/api/data?token=$TOKEN"
```

All three should return 200 if the token is valid.

## Debugging Token Location Issues

If Istio isn't finding your token:

```bash
# Check the RequestAuthentication config
kubectl get requestauthentication -n backend -o yaml

# Check proxy logs for JWT processing
kubectl logs <pod> -c istio-proxy --tail=100 | grep -i jwt

# Verify the token is being sent correctly
kubectl exec deploy/sleep -c sleep -- \
  curl -v -H "x-jwt-token: $TOKEN" http://api-server.backend:8080/api/data 2>&1 | head -30
```

Common mistakes:
- Forgetting the space in the prefix (e.g., `"Bearer"` instead of `"Bearer "`)
- Not including the default `Authorization: Bearer` when adding custom headers
- Using the wrong header name (case-sensitive)
- Using `fromHeaders` when the token is in a query parameter

## Security Considerations

Passing JWTs in query parameters is convenient but has security implications:

- Query parameters may be logged in web server access logs.
- They can appear in browser history.
- They might be cached by proxies.

Use query parameter tokens only when necessary (like WebSocket upgrades) and prefer header-based tokens for regular API calls. If you must use query parameters, make sure your tokens are short-lived.

Token location configuration gives you the flexibility to integrate Istio with any API pattern. Just remember that setting `fromHeaders` replaces the default, and always test with your actual token format before deploying.
