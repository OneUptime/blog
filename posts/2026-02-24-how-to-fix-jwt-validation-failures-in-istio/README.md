# How to Fix JWT Validation Failures in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Security, Authentication, Troubleshooting

Description: Practical guide to debugging and resolving JWT validation failures in Istio RequestAuthentication policies.

---

JWT validation in Istio is handled by RequestAuthentication resources. When they stop working, requests that should be authenticated get rejected, or worse, unauthenticated requests get through. Here's how to sort out the most common JWT validation problems.

## How Istio JWT Validation Works

Istio uses RequestAuthentication to define which JWT issuers are accepted. The actual enforcement is done separately through AuthorizationPolicy. This two-step process confuses people regularly.

A RequestAuthentication resource validates the JWT if one is present, but it does not reject requests without a JWT by default. You need an AuthorizationPolicy to require authentication.

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  jwtRules:
  - issuer: "https://accounts.google.com"
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
```

This validates tokens from Google, but doesn't block requests without tokens. To enforce authentication, add:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["*"]
```

The `requestPrincipals: ["*"]` means "any authenticated principal" - requests without a valid JWT will be denied.

## JWKS Fetch Failures

One of the most common issues is Istio failing to fetch the JWKS (JSON Web Key Set) from the issuer. If Istio can't reach the JWKS URI, all JWT validation fails.

Check the istiod logs for JWKS fetch errors:

```bash
kubectl logs -l app=istiod -n istio-system | grep -i jwks
```

Common reasons for fetch failures:

1. The JWKS URI is not reachable from the cluster (firewall rules, DNS issues)
2. The JWKS endpoint requires authentication itself
3. TLS certificate issues when fetching HTTPS endpoints

Test connectivity from inside the cluster:

```bash
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl -v https://www.googleapis.com/oauth2/v3/certs
```

If DNS doesn't resolve, check your cluster DNS configuration. If TLS fails, the JWKS endpoint might have a certificate that your cluster doesn't trust.

## Issuer Mismatch

The `issuer` field in your RequestAuthentication must match the `iss` claim in the JWT exactly. Even trailing slashes matter.

Decode your JWT to check the issuer (you can use jwt.io or the command line):

```bash
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .iss
```

If the token has `"iss": "https://my-auth.example.com/"` (with trailing slash) but your config has `issuer: "https://my-auth.example.com"` (without), validation will fail.

Make them match exactly:

```yaml
jwtRules:
- issuer: "https://my-auth.example.com/"
  jwksUri: "https://my-auth.example.com/.well-known/jwks.json"
```

## Audience Validation Failures

If you set the `audiences` field, the JWT must contain a matching `aud` claim:

```yaml
jwtRules:
- issuer: "https://my-auth.example.com"
  jwksUri: "https://my-auth.example.com/.well-known/jwks.json"
  audiences:
  - "my-service"
  - "my-api"
```

Check the audience in your token:

```bash
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .aud
```

If the token's `aud` is `"my-app"` but you only listed `"my-service"` and `"my-api"`, validation fails. Either update the audiences list or remove the field entirely (which skips audience validation).

## Token Expired

This seems obvious but it happens more than you'd think, especially in development. Check the token's expiration:

```bash
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .exp
```

The value is a Unix timestamp. Convert it to see if it's in the past:

```bash
date -d @1709251200
```

Expired tokens are always rejected. Make sure your token issuer is providing tokens with reasonable expiration times and that your client code refreshes them properly.

## Token Location

By default, Istio looks for the JWT in the Authorization header as a Bearer token:

```
Authorization: Bearer <token>
```

If your token is sent in a different header or as a query parameter, you need to configure that:

```yaml
jwtRules:
- issuer: "https://my-auth.example.com"
  jwksUri: "https://my-auth.example.com/.well-known/jwks.json"
  fromHeaders:
  - name: x-custom-auth
    prefix: "Bearer "
  fromParams:
  - "access_token"
```

This tells Istio to also look in the `x-custom-auth` header and the `access_token` query parameter.

## Key Rotation Issues

JWT issuers rotate their signing keys periodically. Istio caches the JWKS and refreshes it on a schedule. If the issuer rotated keys and Istio's cache is stale, tokens signed with the new key will fail validation.

Istio refreshes JWKS every 20 minutes by default. If you need to force a refresh, restart the istiod pod:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

A more graceful approach is to ensure your JWKS endpoint always includes both the old and new keys during rotation.

## Algorithm Mismatch

The signing algorithm in the JWT header must match what's in the JWKS. If your JWKS advertises RS256 keys but the token is signed with ES256, validation fails.

Check the token header:

```bash
echo "YOUR_JWT_TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null | jq .alg
```

And verify the JWKS has matching key types:

```bash
curl -s https://my-auth.example.com/.well-known/jwks.json | jq '.keys[] | .alg'
```

## Debugging with Envoy Logs

Enable debug logging on the JWT filter:

```bash
istioctl proxy-config log <pod-name> -n my-namespace --level jwt:debug
```

Then send a request and check:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep jwt
```

You'll see detailed messages about why the token was rejected.

## Multiple JWT Issuers

If you need to accept tokens from multiple issuers, add multiple jwtRules:

```yaml
spec:
  jwtRules:
  - issuer: "https://issuer-one.example.com"
    jwksUri: "https://issuer-one.example.com/.well-known/jwks.json"
  - issuer: "https://issuer-two.example.com"
    jwksUri: "https://issuer-two.example.com/.well-known/jwks.json"
```

Istio will try each issuer rule until one matches. If the token's `iss` claim doesn't match any configured issuer, the request is treated as unauthenticated (not rejected, unless you have an AuthorizationPolicy that requires authentication).

## Forwarding JWT Claims

If your application needs the JWT claims, configure Istio to forward them:

```yaml
jwtRules:
- issuer: "https://my-auth.example.com"
  jwksUri: "https://my-auth.example.com/.well-known/jwks.json"
  outputPayloadToHeader: "x-jwt-payload"
```

The decoded payload will be base64-encoded and sent in the `x-jwt-payload` header to your application.

## Summary

JWT validation issues in Istio usually come down to issuer mismatches, JWKS fetch failures, audience validation problems, or expired tokens. Start debugging by decoding the JWT to verify its claims, then check that Istio can reach the JWKS endpoint, and finally use Envoy debug logs to see the exact rejection reason. Remember that RequestAuthentication only validates tokens - you need an AuthorizationPolicy to actually require them.
