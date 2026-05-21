# How to Configure JWT Issuer and JWKS in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, JWKS, RequestAuthentication, Token Issuer

Description: How to properly configure JWT issuers and JWKS endpoints in Istio RequestAuthentication for reliable token validation.

---

Getting the JWT issuer and JWKS configuration right is the foundation of request authentication in Istio. If the issuer doesn't match what's in the token, or the JWKS endpoint isn't reachable, token validation fails silently or noisily depending on the scenario. Here's everything you need to know about configuring these two critical fields.

## The Issuer Field

The `issuer` field in a RequestAuthentication `jwtRules` entry tells Istio which tokens to validate. It must exactly match the `iss` claim in the JWT.

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-config
  namespace: api
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

When a request comes in with a JWT, Istio extracts the `iss` claim from the token payload and compares it to the configured issuers. If there's a match, Istio uses the corresponding JWKS to validate the signature. If there's no match, the JWT is rejected because the issuer is not configured.

## Issuer Matching Rules

The issuer comparison is an **exact string match**. There's no wildcard support, no regex. These are different issuers:

- `https://auth.example.com` (with trailing slash is different from without)
- `https://auth.example.com/`
- `http://auth.example.com` (different scheme)
- `auth.example.com` (no scheme)

Check what your token actually contains:

```bash
# Decode a JWT to see the issuer

python3 -c 'import base64,json,sys; part=sys.argv[1].split(".")[1]; part += "=" * (-len(part) % 4); print(json.dumps(json.loads(base64.urlsafe_b64decode(part)), indent=2))' "<your-jwt-token>"
```

Look at the `iss` field in the output and use that exact string in your RequestAuthentication.

## The JWKS URI

The `jwksUri` field points to a URL that serves the JSON Web Key Set. This endpoint contains the public keys used to verify JWT signatures.

```yaml
jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

Common JWKS URIs for popular providers:

| Provider | JWKS URI |
|----------|----------|
| Auth0 | `https://<tenant>.auth0.com/.well-known/jwks.json` |
| Keycloak | `https://<host>/realms/<realm>/protocol/openid-connect/certs` |
| Google | `https://www.googleapis.com/oauth2/v3/certs` |
| Firebase | `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` |
| Okta | `https://<org>.okta.com/oauth2/default/v1/keys` |
| Azure AD | `https://login.microsoftonline.com/<tenant-id>/discovery/v2.0/keys` |

## JWKS URI Requirements

The JWKS endpoint must:

1. **Be reachable by the component that fetches JWKS.** Istio fetches JWKS through istiod by default. If `PILOT_JWT_ENABLE_REMOTE_JWKS` is set to `envoy`, `true`, or `hybrid`, Envoy may fetch keys at runtime. If the JWKS endpoint is behind a firewall or VPN that the fetcher can't access, validation fails.
2. **Serve valid JSON.** The response must be a properly formatted JWKS document.
3. **Use HTTPS.** While HTTP technically works, production setups should always use HTTPS.
4. **Respond reasonably fast.** Slow JWKS endpoints can delay configuration updates or, when Envoy remote JWKS fetching is enabled, add request latency the first time keys are fetched.

Test reachability from inside the cluster, and make sure istiod or the proxy can use the same network path your Istio configuration relies on:

```bash
kubectl exec deploy/sleep -c sleep -- curl -s https://auth.example.com/.well-known/jwks.json | python3 -m json.tool
```

## Using Inline JWKS

If your JWKS endpoint isn't reachable from the cluster, you can embed the keys directly using the `jwks` field instead of `jwksUri`:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: inline-jwks
  namespace: api
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwks: |
        {
          "keys": [
            {
              "kty": "RSA",
              "kid": "my-key-id",
              "use": "sig",
              "alg": "RS256",
              "n": "sXchDaQebHnPiGvhGPEUBq...",
              "e": "AQAB"
            }
          ]
        }
```

This approach has tradeoffs:

- **Pro:** No external dependency. Works even if the JWKS endpoint is unreachable.
- **Pro:** Useful for development and testing.
- **Con:** You need to manually update the Kubernetes resource whenever keys rotate.
- **Con:** More YAML to manage.

## Fetching Keys for Inline JWKS

To get the current keys from a JWKS endpoint for inline use:

```bash
curl -s https://auth.example.com/.well-known/jwks.json | python3 -m json.tool
```

Copy the output into your `jwks` field. Keep both `jwksUri` and `jwks` out of the same rule - use one or the other.

## Multiple Issuers

You can configure multiple issuers in a single RequestAuthentication. Each issuer has its own JWKS:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: multi-issuer
  namespace: api
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
    - issuer: "https://partner-auth.example.com"
      jwksUri: "https://partner-auth.example.com/.well-known/jwks.json"
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
```

When a JWT arrives, Istio matches the `iss` claim against the configured issuers and uses the corresponding JWKS. If the issuer doesn't match any configured entry, the request is rejected. A request with no authentication credentials is accepted by RequestAuthentication alone, but no principal is set unless a valid token is provided.

## OpenID Connect Discovery

Many identity providers support OpenID Connect Discovery, which publishes the JWKS URI at a well-known location:

```text
https://<issuer>/.well-known/openid-configuration
```

This document includes a `jwks_uri` field that tells you where the JWKS endpoint is:

```bash
curl -s https://auth.example.com/.well-known/openid-configuration | python3 -m json.tool | grep jwks_uri
```

Output:

```json
"jwks_uri": "https://auth.example.com/.well-known/jwks.json"
```

Use the value from `jwks_uri` in your RequestAuthentication's `jwksUri` field.

## JWKS Caching Behavior

Istio caches JWKS to avoid fetching it on every request. The cache behavior depends on which component fetches the keys:

- By default, istiod fetches JWKS from `jwksUri` and refreshes the public keys on its `PILOT_JWT_PUB_KEY_REFRESH_INTERVAL`, which defaults to 20 minutes.
- If Envoy remote JWKS fetching is enabled with `PILOT_JWT_ENABLE_REMOTE_JWKS`, Envoy can fetch keys on demand and cache them according to its remote JWKS cache duration.
- If the JWKS endpoint becomes unreachable after an initial fetch, the last cached keys may continue to be used until the cache expires or the next refresh fails.

This means there's a window during key rotation where old tokens might still be accepted or new tokens might be rejected until refreshed keys are available. Plan your key rotation accordingly - keep old keys in the JWKS for at least as long as your JWKS refresh interval and token lifetime require.

## Debugging Issuer and JWKS Issues

**Issuer mismatch:**

```bash
# Check what issuer the token has
python3 -c 'import base64,json,sys; part=sys.argv[1].split(".")[1]; part += "=" * (-len(part) % 4); print(json.loads(base64.urlsafe_b64decode(part))["iss"])' "<token>"

# Compare with configured issuer
kubectl get requestauthentication -n api -o jsonpath='{.items[*].spec.jwtRules[*].issuer}'
```

**JWKS fetch failure:**

```bash
# Check proxy logs for JWKS errors
kubectl logs <pod> -c istio-proxy --tail=100 | grep -i "jwks\|jwt"

# Check Envoy stats
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep jwt
```

Look for `jwks_fetch_success` and `jwks_fetch_failed` counters.

**Key ID mismatch:**

```bash
# Check the kid in the token header
python3 -c 'import base64,json,sys; part=sys.argv[1].split(".")[0]; part += "=" * (-len(part) % 4); print(json.dumps(json.loads(base64.urlsafe_b64decode(part)), indent=2))' "<token>"

# Check available kids in the JWKS
curl -s https://auth.example.com/.well-known/jwks.json | python3 -c "import json,sys; [print(k['kid']) for k in json.load(sys.stdin)['keys']]"
```

If the `kid` in the token doesn't match any key in the JWKS, validation fails.

## Best Practices

1. **Always use `jwksUri` in production** - it handles key rotation automatically.
2. **Verify the issuer string exactly** - copy it from a decoded token, don't guess.
3. **Test JWKS reachability from inside the cluster** before deploying the RequestAuthentication.
4. **Keep old keys in JWKS during rotation** for at least as long as your JWKS refresh interval and token lifetime require.
5. **Use OpenID Connect Discovery** to find the correct JWKS URI for your provider.

Getting the issuer and JWKS configuration right means JWT validation just works. Get it wrong and you'll spend hours wondering why perfectly good tokens are being rejected. Take the time to verify both values before deploying.
