# How to Debug 'permission denied' Errors in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Troubleshooting

Description: A systematic guide to diagnosing and fixing ArgoCD permission denied errors, covering RBAC policies, group claims, token issues, and common misconfigurations.

---

"Permission denied" is probably the most common error you will encounter when working with ArgoCD RBAC. The error message tells you the action was blocked, but it does not always tell you why. Maybe the RBAC policy is wrong, maybe the SSO group claim is missing, maybe the token expired, or maybe the project name has a typo.

This guide gives you a systematic approach to diagnosing and fixing permission denied errors.

## Understanding the Error Message

ArgoCD permission denied errors include useful details. Here is a typical error:

```
FATA[0000] permission denied: applications, sync, production/web-app, sub: developer@company.com, iat: 2024-01-15T10:00:00Z
```

Breaking this down:
- **applications** - The resource type
- **sync** - The action that was attempted
- **production/web-app** - The target (project/application)
- **sub: developer@company.com** - The authenticated user
- **iat** - The token issue time

This tells you exactly what was tried and who tried it. Now you need to figure out why the policy blocked it.

## Step 1: Check the Current RBAC Policy

Start by viewing the active RBAC configuration:

```bash
# View the RBAC ConfigMap
kubectl get configmap argocd-rbac-cm -n argocd -o yaml
```

Look for:
- Does the user's role include the required action?
- Is the user mapped to the correct role?
- Does the object pattern match the target application?
- Is there a deny rule blocking the action?

```yaml
# Example: this policy would cause the error above
policy.csv: |
  p, role:deployer, applications, get, */*, allow
  p, role:deployer, applications, sync, staging/*, allow  # Only staging!
  g, developer@company.com, role:deployer
```

The user has sync permission for `staging/*` but tried to sync `production/web-app`, which does not match.

## Step 2: Verify User Identity and Groups

Check what ArgoCD knows about the logged-in user:

```bash
# Check current user info
argocd account get-user-info
```

This shows the username and groups that ArgoCD received from the OIDC token. If the groups look wrong or missing, the issue is with your SSO configuration, not RBAC.

Common issues:
- The groups claim is empty (IdP not sending groups)
- Group names do not match RBAC policy (case sensitivity, path format)
- The wrong groups scope is configured

## Step 3: Test the Policy Offline

Use the RBAC testing command to check if the policy should allow the action:

```bash
# Test the exact scenario from the error message
argocd admin settings rbac can developer@company.com sync applications 'production/web-app' \
  --namespace argocd
```

If this returns "No," the policy is correctly blocking the action. You need to update the policy.

If this returns "Yes," the issue might be with token claims, group mappings, or a stale cache.

## Step 4: Check Group Mappings

If the user authenticates via SSO, verify that their groups map to the expected roles:

```bash
# Test if the group name matches
argocd admin settings rbac can my-sso-group sync applications 'production/web-app' \
  --namespace argocd

# Test the role directly
argocd admin settings rbac can role:deployer sync applications 'production/web-app' \
  --namespace argocd
```

If the role works but the group does not, the problem is in the group-to-role mapping:

```yaml
# Check this line in your policy
g, my-sso-group, role:deployer

# Common mistakes:
# Wrong group name (case sensitive!)
g, My-SSO-Group, role:deployer  # Wrong case
g, my-sso-group, role:deployer  # Correct

# Missing group mapping entirely
# (no g line for the group)
```

## Step 5: Check the Default Policy

The `policy.default` setting might be interfering:

```bash
# Check what the default policy is
kubectl get configmap argocd-rbac-cm -n argocd -o jsonpath='{.data.policy\.default}'
```

If `policy.default` is empty or not set, users without explicit role mappings get no permissions at all. If it is set to `role:readonly`, all users can view but not modify.

## Step 6: Inspect OIDC Token Claims

If SSO groups are not working, decode the OIDC token to see what claims are included:

```bash
# After logging in, check the token
# The token is stored in ~/.config/argocd/config or ~/.argocd/config

# Decode the JWT (base64 decode the payload)
cat ~/.config/argocd/config | grep auth-token | awk '{print $2}' | \
  cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Look for:
- `groups` claim - should contain your group names
- `email` claim - should match the expected username
- `exp` claim - should not be expired

If the `groups` claim is missing, check your OIDC configuration in `argocd-cm`:

```yaml
# Ensure groups scope is requested
oidc.config: |
  requestedScopes:
    - openid
    - profile
    - email
    - groups  # This must be present
```

## Step 7: Check ArgoCD Server Logs

The ArgoCD server logs contain detailed information about permission checks:

```bash
# View recent permission denied entries
kubectl logs -n argocd deployment/argocd-server --tail=100 | grep "permission denied"

# View RBAC evaluation details (with debug logging)
kubectl logs -n argocd deployment/argocd-server --tail=100 | grep -i "rbac"
```

For more verbose logging, increase the log level:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.log.level: debug
```

After changing the log level, restart the ArgoCD server and reproduce the error. The debug logs will show the RBAC evaluation process.

## Common Causes and Fixes

### Cause 1: Object Pattern Mismatch

```yaml
# Policy says:
p, role:deployer, applications, sync, frontend/*, allow

# User tries to sync:
# production/web-app  --> No match! Wrong project name.
```

**Fix:** Update the policy to include the correct project name, or use `*/web-app` for all projects.

### Cause 2: Missing Action

```yaml
# Policy only has get and sync:
p, role:deployer, applications, get, */*, allow
p, role:deployer, applications, sync, */*, allow

# User tries to update app settings (not sync):
# applications, update, production/web-app --> No match!
```

**Fix:** Add the `update` action to the role if that is intended.

### Cause 3: Deny Rule Blocking

```yaml
# Allow rule exists:
p, role:deployer, applications, *, production/*, allow
# But deny rule takes precedence:
p, role:deployer, applications, delete, production/*, deny
```

**Fix:** If the deny is intentional, the policy is working correctly. If not, remove the deny rule.

### Cause 4: Empty or Wrong Group Name

```yaml
# Policy expects this group:
g, frontend-developers, role:deployer

# But OIDC sends this group:
# "Frontend-Developers"  (different case!)
```

**Fix:** Match the exact group name from your IdP. Group names are case-sensitive.

### Cause 5: Token Expired

```
sub: ci-bot, iat: 2023-06-15T10:00:00Z
```

If the token was issued a long time ago and has expired, ArgoCD rejects it.

**Fix:** Generate a new token:
```bash
argocd account generate-token --account ci-bot --expires-in 2160h
```

### Cause 6: Account Disabled

```yaml
# Check if the account is disabled
kubectl get configmap argocd-cm -n argocd -o yaml | grep accounts
```

**Fix:** Ensure the account exists and has the correct capabilities:
```yaml
accounts.ci-bot: apiKey
```

## Quick Diagnostic Checklist

Run through this checklist when you hit a permission denied error:

1. Read the exact error message to identify user, action, resource, and object
2. View `argocd-rbac-cm` and check for matching policy rules
3. Verify the user's groups with `argocd account get-user-info`
4. Test the policy with `argocd admin settings rbac can`
5. Check the default policy setting
6. Inspect OIDC token claims if using SSO
7. Check ArgoCD server logs for additional detail
8. Verify the account exists and is not disabled
9. Check for deny rules that might be overriding allow rules
10. Verify the token is not expired

## Summary

Debugging permission denied errors in ArgoCD follows a systematic process: read the error details, check the RBAC policy, verify user identity and groups, test offline with the rbac can command, and inspect logs when needed. Most issues come down to typos in group names, incorrect project patterns, missing actions, or OIDC misconfiguration. Always use `argocd admin settings rbac can` as your primary diagnostic tool.
