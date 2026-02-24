# How to Debug JWT Validation Failures in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Debugging, RequestAuthentication, Troubleshooting

Description: A practical debugging guide for resolving JWT validation failures in Istio including common errors and step-by-step diagnostic techniques.

---

JWT validation failures in Istio can be frustrating because the error messages are often vague. You get a 401 status code but no clear explanation of what went wrong. Was it the signature? The issuer? The expiration? Here's a systematic approach to tracking down JWT validation issues in Istio.

## Common Error Responses

When JWT validation fails, you typically see one of these:

- **401 Unauthorized** - The token was present but failed validation.
- **403 Forbidden** - An AuthorizationPolicy blocked the request (usually because no valid principal was set).
- **200 OK but no principal set** - The token's issuer didn't match any configured rule, so it was ignored.

The distinction between 401 and 403 is important:
- 401 means RequestAuthentication rejected the token.
- 403 means AuthorizationPolicy rejected the request.

## Step 1: Decode the Token

Before blaming Istio, check the token itself:

```bash
# Decode the header
echo "$TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null | python3 -m json.tool

# Decode the payload
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Check these fields in the payload:
- `iss` - Does it match the issuer in your RequestAuthentication?
- `aud` - Does it match the audiences (if configured)?
- `exp` - Is the token expired? (Compare with `date +%s`)
- `nbf` - Is the token valid yet?

Check the header:
- `alg` - Is it a supported algorithm (RS256, ES256, etc.)?
- `kid` - Does a matching key exist in the JWKS?

## Step 2: Check the RequestAuthentication Configuration

```bash
kubectl get requestauthentication -n <namespace> -o yaml
```

Compare the configured issuer with the token's `iss` claim. Remember it's an exact string match - trailing slashes, scheme differences, and capitalization all matter.

```bash
# Extract configured issuers
kubectl get requestauthentication -n <namespace> -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.jwtRules[*]}{.issuer}{", "}{end}{"\n"}{end}'
```

## Step 3: Verify JWKS Reachability

The Envoy sidecar needs to fetch the JWKS from the configured URL. Test from inside the cluster:

```bash
kubectl exec deploy/sleep -c sleep -- curl -s <jwks-uri>
```

If this fails, the proxy can't validate any tokens. Common causes:

- DNS resolution failure (the JWKS endpoint isn't reachable from the cluster).
- Firewall or egress policies blocking HTTPS to the JWKS endpoint.
- TLS certificate issues on the JWKS endpoint.

## Step 4: Check Key ID Matching

The token's `kid` (Key ID) header must match a key in the JWKS:

```bash
# Get the kid from the token
echo "$TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('kid', 'NO KID'))"

# Get available kids from JWKS
curl -s <jwks-uri> | python3 -c "import json,sys; [print(k.get('kid', 'NO KID')) for k in json.load(sys.stdin)['keys']]"
```

If the kid doesn't match, the token was signed with a key that's not in the JWKS. This happens after key rotation when the old key has been removed but cached tokens still reference it.

## Step 5: Check Proxy Logs

The Envoy proxy logs contain detailed JWT error messages:

```bash
kubectl logs <pod> -c istio-proxy --tail=200 | grep -i "jwt\|jwks"
```

Common error messages and what they mean:

| Error Message | Cause |
|---------------|-------|
| `Jwt is expired` | Token's `exp` is in the past |
| `Jwt verification fails` | Signature doesn't match (wrong key or tampered token) |
| `Jwks doesn't have key to match kid` | Token's `kid` not found in JWKS |
| `Jwt issuer is not configured` | Token's `iss` doesn't match any rule |
| `Jwks remote fetch is failed` | Can't reach the JWKS endpoint |
| `Jwt is not in the form of Header.Payload.Signature` | Token format is wrong |
| `Jwt audiences doesn't matched` | Token's `aud` doesn't match configured audiences |

## Step 6: Check Envoy Stats

```bash
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep jwt_authn
```

Look for counters like:
- `jwt_authn.allowed` - Requests that passed JWT validation
- `jwt_authn.denied` - Requests denied due to JWT validation
- `jwt_authn.jwks_fetch_success` - Successful JWKS fetches
- `jwt_authn.jwks_fetch_failed` - Failed JWKS fetches

## Step 7: Enable Debug Logging

For more detailed logs, increase the log level:

```bash
istioctl proxy-config log <pod> -n <namespace> --level jwt:debug,rbac:debug
```

Then reproduce the issue and check the logs:

```bash
kubectl logs <pod> -c istio-proxy --tail=200 | grep -i "jwt\|rbac"
```

Reset the log level when done:

```bash
istioctl proxy-config log <pod> -n <namespace> --level jwt:warning,rbac:warning
```

## Common Scenarios and Fixes

### Scenario 1: Token Works in Development but Not in Cluster

**Cause:** JWKS endpoint isn't reachable from within the cluster.

**Fix:** Check if the endpoint is accessible:

```bash
kubectl exec deploy/sleep -c sleep -- curl -v https://auth.example.com/.well-known/jwks.json
```

If it fails, check your NetworkPolicy and Istio egress rules.

### Scenario 2: Intermittent 401 Errors

**Cause:** Clock skew between the token issuer and Kubernetes nodes.

**Fix:** Check the time on your nodes:

```bash
kubectl get nodes -o wide
kubectl debug node/<node-name> -it --image=busybox -- date
```

Compare with the token's `exp` and `iat` claims. If there's skew, fix NTP on your nodes.

### Scenario 3: 401 After Key Rotation

**Cause:** The old key was removed from the JWKS before all cached keys expired.

**Fix:** During key rotation, keep old keys in the JWKS for at least 10 minutes. Envoy's JWKS cache refreshes approximately every 5 minutes.

### Scenario 4: Valid Token Returns 403 Instead of 200

**Cause:** The token validates fine (no 401), but an AuthorizationPolicy blocks the request.

**Fix:** This is an authorization issue, not an authentication issue. Check your AuthorizationPolicies:

```bash
kubectl get authorizationpolicy -n <namespace> -o yaml
```

Verify the request principal format matches what you expect:

```bash
# The principal will be: <issuer>/<subject>
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(f\"{d['iss']}/{d['sub']}\")
"
```

### Scenario 5: Token with Unknown Issuer Passes Through

**Cause:** RequestAuthentication only validates tokens from configured issuers. Unknown issuers are ignored.

**Fix:** This is by design. If you want to reject unknown tokens, add an AuthorizationPolicy that requires a valid principal:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-known-token
spec:
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
```

## Quick Debugging Checklist

```bash
# 1. Decode and inspect the token
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool

# 2. Check RequestAuthentication config
kubectl get requestauthentication -n <namespace> -o yaml

# 3. Test JWKS reachability
kubectl exec deploy/sleep -c sleep -- curl -s <jwks-uri> | head -5

# 4. Check kid matching
echo "$TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null | python3 -m json.tool

# 5. Check proxy logs
kubectl logs <pod> -c istio-proxy --tail=100 | grep -i jwt

# 6. Check Envoy stats
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep jwt

# 7. Check AuthorizationPolicies
kubectl get authorizationpolicy -n <namespace> -o yaml

# 8. Run istioctl analyze
istioctl analyze -n <namespace>
```

Work through this list top to bottom. Most JWT issues are found in the first three steps: the token itself is wrong, the issuer doesn't match, or the JWKS endpoint isn't reachable.
