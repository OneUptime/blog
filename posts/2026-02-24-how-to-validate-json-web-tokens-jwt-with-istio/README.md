# How to Validate JSON Web Tokens (JWT) with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Token Validation, RequestAuthentication, Security

Description: Detailed walkthrough of how Istio validates JWTs at the Envoy proxy level including signature verification, claims checking, and error handling.

---

When Istio validates a JWT, it's not just checking that the token looks right. The Envoy sidecar performs a series of checks on the token's signature, expiration, issuer, and audience - all before your application ever sees the request. Understanding what gets checked and in what order helps you configure things correctly and debug failures faster.

## What Gets Validated

When a request arrives with a JWT, Istio's Envoy proxy checks the following:

1. **Token format** - Is this a properly formatted JWT with three base64-encoded parts (header, payload, signature)?
2. **Signature** - Does the token's signature match using the public keys from the configured JWKS?
3. **Issuer (iss)** - Does the token's `iss` claim match the expected issuer in the RequestAuthentication?
4. **Audience (aud)** - If audiences are configured, does the token's `aud` claim match at least one?
5. **Expiration (exp)** - Has the token expired?
6. **Not Before (nbf)** - Is the token valid yet (for tokens with a future start time)?

If any of these checks fail, the request gets a 401 Unauthorized response.

## Setting Up Validation

Here's a RequestAuthentication that performs all of these checks:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: full-jwt-validation
  namespace: api
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
    - issuer: "https://auth.mycompany.com"
      jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
      audiences:
        - "api.mycompany.com"
```

## Signature Verification Deep Dive

The most critical part of JWT validation is the signature check. Here's how it works:

1. Istio fetches the JWKS from the `jwksUri` endpoint. This JSON document contains one or more public keys.
2. The JWT header contains a `kid` (Key ID) field that identifies which key was used to sign the token.
3. Istio finds the matching key in the JWKS and uses it to verify the signature.

The JWKS endpoint typically returns something like:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-id-1",
      "use": "sig",
      "n": "0vx7agoebGcQSuu...",
      "e": "AQAB",
      "alg": "RS256"
    }
  ]
}
```

Istio supports these signature algorithms:
- RS256, RS384, RS512 (RSA)
- ES256, ES384, ES512 (ECDSA)
- PS256, PS384, PS512 (RSA-PSS)

## Using Inline JWKS

If you can't expose a JWKS endpoint (maybe your auth server is behind a firewall), you can inline the keys directly in the RequestAuthentication:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: inline-jwks
  namespace: api
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
    - issuer: "https://auth.mycompany.com"
      jwks: |
        {
          "keys": [
            {
              "kty": "RSA",
              "kid": "key-1",
              "use": "sig",
              "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
              "e": "AQAB",
              "alg": "RS256"
            }
          ]
        }
```

The downside of inline JWKS is that you need to update the Kubernetes resource whenever keys rotate. With `jwksUri`, Envoy fetches fresh keys automatically.

## Validating Claims

Beyond the standard checks, you often want to validate custom claims. Istio's RequestAuthentication doesn't directly validate custom claims, but you can use it in combination with AuthorizationPolicy to enforce claim-based rules.

First, set up the RequestAuthentication:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: api
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
    - issuer: "https://auth.mycompany.com"
      jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
```

Then use an AuthorizationPolicy to check specific claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin-role
  namespace: api
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

This allows only requests where the JWT contains `"role": "admin"` in its payload.

## Handling Token Expiration

JWT expiration is checked automatically. The `exp` claim in the token is compared to the current time on the Envoy proxy. If the token has expired, the request gets a 401.

Common issues with expiration:

- **Short-lived tokens** - If your tokens expire in 5 minutes and there's even slight clock skew, you might see intermittent 401s.
- **Clock skew between nodes** - Different Kubernetes nodes might have slightly different clocks. Make sure NTP is configured across all nodes.

There's no built-in clock skew tolerance in Istio's JWT validation. If clock skew is a problem, your token issuer should add a small buffer to the `exp` claim.

## Testing Token Validation

Generate a test token using a tool like `jwt.io` or the `jwt` CLI, then test:

```bash
# Valid token
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0.eyJpc3MiOiJodHRwczovL2F1dGgubXljb21wYW55LmNvbSIsInN1YiI6InVzZXIxIiwiYXVkIjoiYXBpLm15Y29tcGFueS5jb20iLCJleHAiOjk5OTk5OTk5OTl9.signature" \
  http://api-gateway.api/endpoint

# Expired token
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <expired-token>" \
  http://api-gateway.api/endpoint

# Wrong issuer
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <wrong-issuer-token>" \
  http://api-gateway.api/endpoint
```

Expected results:
- Valid token: 200
- Expired token: 401
- Wrong issuer: 401
- No token: 200 (unless you have an AuthorizationPolicy blocking it)

## Debugging Validation Failures

When a token fails validation, the 401 response doesn't always tell you why. Check the Envoy proxy logs:

```bash
kubectl logs <pod-name> -c istio-proxy --tail=100 | grep -i "jwt"
```

Common error messages:

- `Jwt is expired` - Token's `exp` claim is in the past.
- `Jwks doesn't have key to match kid` - The token's `kid` header doesn't match any key in the JWKS.
- `Jwt issuer is not configured` - The token's `iss` claim doesn't match any issuer in the RequestAuthentication.
- `Jwt verification fails` - Signature verification failed (wrong key or tampered token).
- `Jwks remote fetch is failed` - Envoy couldn't reach the JWKS endpoint.

You can also check the stats:

```bash
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep jwt
```

## JWKS Caching and Key Rotation

Envoy caches JWKS keys to avoid fetching them on every request. The cache is refreshed periodically (approximately every 5 minutes by default). When you rotate keys at the issuer:

1. Add the new key to the JWKS endpoint while keeping the old one.
2. Start issuing tokens with the new key.
3. Wait for all Envoy proxies to refresh their cache (at least 5-10 minutes).
4. Remove the old key from the JWKS endpoint.

This overlap ensures tokens signed with either key are valid during the rotation window.

JWT validation in Istio is thorough and happens entirely at the proxy level. Your application gets clean, validated requests without implementing any JWT logic. Just make sure the JWKS endpoint is reachable, the issuer matches, and you pair RequestAuthentication with AuthorizationPolicy if you want to block unauthenticated requests.
