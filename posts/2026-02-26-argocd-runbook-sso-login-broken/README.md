# ArgoCD Runbook: SSO Login Broken

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, SSO, Runbook

Description: A step-by-step operational runbook for diagnosing and fixing broken SSO login in ArgoCD, covering Dex configuration, OIDC issues, redirect URI mismatches, and certificate problems.

---

When SSO login breaks in ArgoCD, developers cannot access the UI or CLI through their corporate identity provider. This is particularly disruptive when the local admin password has been disabled or forgotten. This runbook walks through the systematic diagnosis of SSO failures in ArgoCD.

## Symptoms

- Clicking "Log In via SSO" results in an error page
- Authentication redirects to the identity provider but returns an error
- Login succeeds at the identity provider but ArgoCD shows "login failed"
- The browser shows "Failed to get token" or "invalid redirect URI"
- Users are logged in but have no permissions (RBAC mapping failure)

## Impact Assessment

**Severity:** P2

**Impact:** All users who rely on SSO cannot log in. The local admin account still works if it has not been disabled. API tokens issued before the outage continue to work.

## Diagnostic Steps

### Step 1: Identify the SSO Method

ArgoCD supports two SSO methods: built-in Dex and direct OIDC. Check which one is configured.

```bash
# Check ArgoCD configuration
kubectl get configmap argocd-cm -n argocd -o yaml | grep -A 20 "dex.config\|oidc.config"

# If dex.config is present: using Dex
# If oidc.config is present: using direct OIDC
```

### Step 2: Check Dex Server (if using Dex)

```bash
# Check Dex pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-dex-server

# Check Dex logs for errors
kubectl logs -n argocd deployment/argocd-dex-server --tail=200

# Common errors to look for:
# - "failed to initialize connector"
# - "invalid redirect_uri"
# - "failed to get token"
# - "tls: failed to verify certificate"

# Test Dex health
kubectl exec -n argocd deployment/argocd-dex-server -- wget -qO- http://localhost:5558/healthz
```

### Step 3: Verify the Callback URL

The most common SSO issue is a mismatched callback URL.

```bash
# Get the configured ArgoCD URL
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.url}'

# The callback URL must be exactly:
# https://<argocd-url>/api/dex/callback (for Dex)
# https://<argocd-url>/auth/callback (for OIDC)

# Verify this matches what is registered in your identity provider
```

### Step 4: Check Certificates

```bash
# If Dex connects to an LDAP server or an OIDC provider with a self-signed cert
kubectl logs -n argocd deployment/argocd-dex-server --tail=200 | grep -i "certificate\|tls"

# Check if custom CA certificates are mounted
kubectl get deployment argocd-dex-server -n argocd -o yaml | grep -A 5 volumeMounts
```

### Step 5: Verify OIDC Configuration (if using direct OIDC)

```bash
# Get the OIDC configuration
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.oidc\.config}' | head -20

# Test the OIDC discovery endpoint
kubectl exec -n argocd deployment/argocd-server -- \
  curl -sk https://your-idp.example.com/.well-known/openid-configuration | jq .
```

## Root Causes and Resolutions

### Cause 1: Callback URL Mismatch

The redirect URI registered in the identity provider does not match ArgoCD's expected callback URL.

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # This URL MUST match the external URL users access
  url: https://argocd.example.com

  # For Dex, the callback is: https://argocd.example.com/api/dex/callback
  # For OIDC, the callback is: https://argocd.example.com/auth/callback

  # Register the correct callback URL in your identity provider
```

```bash
# After fixing the URL, restart the API server and Dex
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout restart deployment/argocd-dex-server -n argocd
```

### Cause 2: Dex Configuration Error

A syntax error or invalid connector configuration in Dex prevents it from starting.

```yaml
# Example correct Dex configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  dex.config: |
    connectors:
    - type: github
      id: github
      name: GitHub
      config:
        clientID: your-client-id
        clientSecret: $dex.github.clientSecret
        orgs:
        - name: your-org
```

```bash
# Verify the config is valid YAML
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.dex\.config}' | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin.read()); print('Valid YAML')"

# Check Dex logs after applying changes
kubectl rollout restart deployment/argocd-dex-server -n argocd
sleep 10
kubectl logs -n argocd deployment/argocd-dex-server --tail=50
```

### Cause 3: Client Secret Expired or Wrong

OAuth client secrets can expire or get rotated in the identity provider.

```bash
# Check if the secret is configured in argocd-secret
kubectl get secret argocd-secret -n argocd -o jsonpath='{.data.dex\.github\.clientSecret}' | base64 -d

# Update the client secret
kubectl patch secret argocd-secret -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/data/dex.github.clientSecret", "value": "'$(echo -n "new-secret" | base64)'"}]'

# Restart Dex to pick up the new secret
kubectl rollout restart deployment/argocd-dex-server -n argocd
```

### Cause 4: TLS Certificate Issues

Dex or the OIDC client cannot verify the identity provider's TLS certificate.

```bash
# Add a custom CA certificate
# Create a ConfigMap with the CA cert
kubectl create configmap argocd-tls-certs-cm -n argocd \
  --from-file=your-idp.example.com=/path/to/ca-cert.pem

# Or if connecting to an LDAP server
kubectl get configmap argocd-cm -n argocd -o yaml
# Ensure the Dex config includes:
# config:
#   rootCA: /path/to/ca.pem
#   Or
#   insecureSkipVerify: true  # Not recommended for production
```

### Cause 5: RBAC Group Mapping Failure

Users can log in but see no applications because their group memberships are not mapped correctly.

```bash
# Check what groups the user belongs to
# After login, the JWT token contains group claims
# Decode it in the browser: jwt.io

# Check RBAC configuration
kubectl get configmap argocd-rbac-cm -n argocd -o yaml

# The group names in policy.csv must match the groups in the JWT token exactly
```

```yaml
# argocd-rbac-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Map SSO groups to ArgoCD roles
    g, your-org:developers, role:readonly
    g, your-org:platform-team, role:admin

  # For OIDC, specify which claim contains the groups
  scopes: "[groups, email]"
```

### Cause 6: Dex Pod Crash Loop

Dex crashes on startup due to configuration issues.

```bash
# Check previous logs (before crash)
kubectl logs -n argocd deployment/argocd-dex-server --previous --tail=100

# Common causes:
# 1. Invalid YAML in dex.config
# 2. Missing secrets referenced in config
# 3. Unable to reach the identity provider

# Emergency workaround: use local admin account
# Get the admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Login with admin account
argocd login argocd.example.com --username admin --password <password>
```

## Verification

```bash
# Verify Dex is healthy
kubectl exec -n argocd deployment/argocd-dex-server -- wget -qO- http://localhost:5558/healthz
# Should return: ok

# Test the SSO flow
# 1. Open ArgoCD UI in an incognito window
# 2. Click "Log In via SSO"
# 3. Authenticate with the identity provider
# 4. Verify you are redirected back to ArgoCD
# 5. Verify you can see your applications

# Test CLI SSO
argocd login argocd.example.com --sso
```

## Emergency Workaround

If SSO cannot be fixed immediately, enable the local admin account.

```bash
# Check if admin account is disabled
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.admin\.enabled}'

# Enable admin account
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p='{"data":{"admin.enabled":"true"}}'

# Get or reset the admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# If the initial admin secret was deleted, reset the password
argocd account update-password --account admin --new-password <new-password>
```

## Prevention

1. Store OAuth client secrets in a secret manager and sync them to Kubernetes
2. Set up monitoring on the Dex health endpoint
3. Document the exact callback URLs registered in each identity provider
4. Test SSO login in staging before changing production configuration
5. Keep the local admin account available (even if disabled) for emergency access

## Escalation

If SSO cannot be restored:

- Check the identity provider's admin console for any configuration changes
- Verify the OAuth application has not been deleted or modified
- Contact the identity team if the identity provider itself is having issues
- Use the local admin account as a workaround while investigating
