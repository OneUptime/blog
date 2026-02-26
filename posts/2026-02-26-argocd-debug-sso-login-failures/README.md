# How to Debug SSO Login Failures in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, SSO, Troubleshooting

Description: A comprehensive troubleshooting guide for diagnosing and fixing SSO login failures in ArgoCD, covering OIDC errors, Dex issues, token problems, and callback failures.

---

SSO login failures in ArgoCD are frustrating because the error messages are often vague. You click the login button, get redirected to your identity provider, authenticate successfully, and then something breaks on the way back. Sometimes you get a generic "Login Failed" message, sometimes a redirect loop, and sometimes a blank page.

This guide provides a systematic approach to diagnosing and fixing SSO login failures in ArgoCD.

## Common SSO Failure Symptoms

Before diving into debugging, identify your symptom:

| Symptom | Likely Area |
|---|---|
| "Login Failed" after IdP authentication | Callback URL mismatch, token issue |
| Redirect loop between ArgoCD and IdP | URL configuration, cookie issues |
| "Failed to query provider" | ArgoCD cannot reach IdP, certificate issue |
| "Invalid client_id" | Wrong client ID in ArgoCD config |
| "Unauthorized" | Wrong client secret |
| Blank page after redirect | JavaScript error, CORS issue |
| "No groups found" | Groups claim not in token |
| Login works but user has no permissions | RBAC misconfiguration |
| "Certificate signed by unknown authority" | TLS trust issue |

## Step 1: Check the Logs

The most informative debugging step. Check both the ArgoCD server and Dex server logs.

### ArgoCD Server Logs

```bash
# Stream ArgoCD server logs
kubectl -n argocd logs -f deploy/argocd-server

# Filter for auth-related messages
kubectl -n argocd logs deploy/argocd-server | grep -i "oidc\|auth\|login\|sso\|token\|callback"
```

### Dex Server Logs (if using Dex)

```bash
# Stream Dex logs
kubectl -n argocd logs -f deploy/argocd-dex-server

# Filter for connector-related messages
kubectl -n argocd logs deploy/argocd-dex-server | grep -i "connector\|error\|fail\|auth"
```

### Increase Log Verbosity

For more detail:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.log.level: debug
  dexserver.log.level: debug
```

Restart both components:

```bash
kubectl -n argocd rollout restart deployment argocd-server argocd-dex-server
```

## Step 2: Verify the Configuration

### Check argocd-cm

```bash
kubectl -n argocd get configmap argocd-cm -o yaml
```

Verify these fields:

```yaml
data:
  # Must match your external URL exactly
  url: https://argocd.example.com

  # For OIDC
  oidc.config: |
    name: Your IdP
    issuer: https://idp.example.com
    clientID: your-client-id
    clientSecret: $oidc.clientSecret
    requestedScopes:
      - openid
      - profile
      - email

  # OR for Dex
  dex.config: |
    connectors:
      - type: github
        ...
```

Common configuration mistakes:

1. **url field missing or wrong** - Must be the external URL of ArgoCD, not an internal service URL
2. **Trailing slash mismatch** - `https://argocd.example.com` vs `https://argocd.example.com/`
3. **Wrong issuer URL** - Must match the IdP's actual issuer exactly
4. **YAML indentation** - The OIDC or Dex config is a YAML string inside a YAML field, so indentation matters

### Check argocd-secret

Verify the client secret is stored:

```bash
# Check if the secret key exists
kubectl -n argocd get secret argocd-secret -o jsonpath='{.data}' | python3 -c "import json,sys; data=json.load(sys.stdin); print(list(data.keys()))"
```

You should see keys like `oidc.clientSecret` or `dex.github.clientSecret`.

## Step 3: Test the OIDC Discovery Endpoint

ArgoCD needs to reach the IdP's OIDC discovery endpoint:

```bash
# Test from the ArgoCD server pod
kubectl -n argocd exec -it deploy/argocd-server -- \
  curl -s https://idp.example.com/.well-known/openid-configuration | head -20
```

If this fails, the ArgoCD server cannot reach the IdP. Common causes:
- DNS resolution failure inside the cluster
- Network policies blocking egress
- Firewall rules
- Proxy configuration needed

### For Dex

If using Dex, also test Dex's own OIDC endpoint:

```bash
# Test Dex's endpoint from the ArgoCD server
kubectl -n argocd exec -it deploy/argocd-server -- \
  curl -s https://argocd.example.com/api/dex/.well-known/openid-configuration

# Or test internally
kubectl -n argocd exec -it deploy/argocd-server -- \
  curl -s http://argocd-dex-server:5556/api/dex/.well-known/openid-configuration
```

## Step 4: Verify Callback URLs

The callback URL must match exactly between ArgoCD and the identity provider.

### For Built-in OIDC

- ArgoCD sends users to: `<argocd-url>/auth/callback`
- The IdP must have this exact URL registered as an allowed redirect URI
- Check: `https://argocd.example.com/auth/callback`

### For Dex

- ArgoCD sends users to: `<argocd-url>/api/dex/callback`
- The IdP must have this exact URL registered
- Check: `https://argocd.example.com/api/dex/callback`

### Common Callback URL Problems

```bash
# These are all DIFFERENT and must match exactly:
https://argocd.example.com/auth/callback    # correct for OIDC
https://argocd.example.com/auth/callback/   # trailing slash - DIFFERENT
http://argocd.example.com/auth/callback     # http vs https - DIFFERENT
https://ARGOCD.example.com/auth/callback    # case - may be DIFFERENT
```

## Step 5: Debug Token Issues

### Decode the Token

If authentication succeeds but authorization fails, decode the JWT token to see what claims ArgoCD receives:

```bash
# After logging in via CLI
argocd account get-user-info

# Or decode a JWT manually
echo "eyJhbGciOiJSUzI1..." | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Check for:
- **email** - Is the email present?
- **groups** - Are groups present? What format are they in?
- **sub** - Is the subject (user identifier) present?
- **exp** - Has the token expired?
- **aud** - Does the audience match the client ID?

### Common Token Issues

1. **No groups claim** - The IdP is not configured to include groups in the token
2. **Groups as GUIDs** - Azure AD sends GUIDs instead of names by default
3. **Namespaced claims** - Auth0 uses `https://domain/groups` instead of `groups`
4. **Token too large** - Azure AD's group overage (200+ groups causes issues)

## Step 6: Debug TLS/Certificate Issues

### "Certificate signed by unknown authority"

The ArgoCD server does not trust the IdP's TLS certificate:

```bash
# Check the IdP's certificate
echo | openssl s_client -connect idp.example.com:443 2>/dev/null | openssl x509 -text -noout | grep "Issuer"

# Add the CA to ArgoCD's trust store
kubectl -n argocd create configmap argocd-tls-certs-cm \
  --from-file=idp.example.com=/path/to/idp-ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n argocd rollout restart deployment argocd-server
```

For Dex, you may also need to add the CA to the Dex trust store by mounting it as a volume.

### Check Certificate Chain

```bash
# Download the full certificate chain
echo | openssl s_client -connect idp.example.com:443 -showcerts 2>/dev/null
```

If intermediate certificates are missing, the TLS handshake will fail even if the root CA is trusted.

## Step 7: Debug Dex-Specific Issues

### Dex Not Starting

```bash
# Check Dex pod status
kubectl -n argocd get pods -l app.kubernetes.io/component=dex-server

# Check Dex logs for startup errors
kubectl -n argocd logs deploy/argocd-dex-server | head -50
```

Common Dex startup failures:
- Invalid connector configuration in `argocd-cm`
- Missing client secret in `argocd-secret`
- Cannot reach the upstream IdP

### "Failed to authenticate: connector not found"

The connector ID in the Dex configuration does not match. Check:
- The `id` field in the connector configuration
- That the Dex server has restarted after configuration changes

### Dex Callback Returns 404

If the Dex callback URL returns 404:
- Verify the Dex server is running
- Check that the ArgoCD server can route to the Dex server
- Verify the `url` in `argocd-cm` matches the external URL

## Step 8: Debug Ingress Issues

Many SSO problems are actually ingress misconfigurations.

### gRPC and HTTPS Issues

ArgoCD uses both gRPC and HTTPS. Make sure your ingress handles both:

```yaml
# Nginx Ingress example
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

### Redirect Loop Through Ingress

If you get a redirect loop:
1. Check if the ingress is terminating TLS but ArgoCD expects TLS passthrough
2. Try running ArgoCD in insecure mode behind the ingress:

```bash
kubectl -n argocd patch deployment argocd-server --type json -p '[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--insecure"
  }
]'
```

## Quick Diagnostic Checklist

Run through this checklist when SSO is broken:

```bash
#!/bin/bash
echo "=== ArgoCD SSO Diagnostic ==="

echo ""
echo "1. ArgoCD Server Status:"
kubectl -n argocd get pods -l app.kubernetes.io/component=server

echo ""
echo "2. Dex Server Status:"
kubectl -n argocd get pods -l app.kubernetes.io/component=dex-server

echo ""
echo "3. ArgoCD URL Configuration:"
kubectl -n argocd get configmap argocd-cm -o jsonpath='{.data.url}'
echo ""

echo ""
echo "4. OIDC Configuration Exists:"
kubectl -n argocd get configmap argocd-cm -o jsonpath='{.data.oidc\.config}' 2>/dev/null && echo "Yes" || echo "No"

echo ""
echo "5. Dex Configuration Exists:"
kubectl -n argocd get configmap argocd-cm -o jsonpath='{.data.dex\.config}' 2>/dev/null && echo "Yes" || echo "No"

echo ""
echo "6. Client Secret Exists:"
kubectl -n argocd get secret argocd-secret -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
keys = [k for k in data.get('data', {}).keys() if 'oidc' in k or 'dex' in k]
print(keys if keys else 'No SSO secrets found')
"

echo ""
echo "7. Recent Auth Errors (ArgoCD Server):"
kubectl -n argocd logs deploy/argocd-server --tail=100 | grep -i "error.*auth\|error.*oidc\|error.*login" | tail -5

echo ""
echo "8. Recent Errors (Dex Server):"
kubectl -n argocd logs deploy/argocd-dex-server --tail=100 2>/dev/null | grep -i "error" | tail -5

echo ""
echo "9. TLS Certificates ConfigMap:"
kubectl -n argocd get configmap argocd-tls-certs-cm -o yaml 2>/dev/null | head -5 || echo "Not configured"
```

## Summary

Debugging SSO login failures in ArgoCD is a systematic process. Start with logs (both ArgoCD server and Dex), verify the configuration matches between ArgoCD and the identity provider, check network connectivity to the IdP, validate callback URLs, and inspect token claims. Most failures fall into one of these categories: wrong callback URL, missing client secret, network/TLS issues, or missing group claims. The diagnostic checklist above covers the most common failure points and will resolve the majority of SSO issues.

For setting up SSO correctly from the start, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view) and the provider-specific guides like [How to Configure SSO with Okta in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-sso-okta/view).
