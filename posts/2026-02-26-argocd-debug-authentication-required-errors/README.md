# How to Debug 'Authentication Required' Errors for Repos in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Authentication

Description: Learn how to diagnose and fix authentication errors when ArgoCD tries to access Git repositories, covering token issues, SSH key problems, and credential template mismatches.

---

The "authentication required" error in ArgoCD means the repo-server can reach the Git server but is being rejected because the credentials are missing, invalid, or expired. Unlike "repository not accessible" which can be a network problem, this error specifically points to an authentication failure. Let us walk through the systematic debugging process.

## Common Error Messages

The error manifests in several forms:

```
# HTTPS authentication failure
rpc error: code = Unknown desc = authentication required

# SSH authentication failure
rpc error: code = Unknown desc = error creating SSH agent: "SSH agent requested but SSH_AUTH_SOCK not-specified"

# GitHub specific
rpc error: code = Unknown desc = remote: Repository not found.

# GitLab specific
rpc error: code = Unknown desc = remote: HTTP Basic: Access denied.

# Expired token
rpc error: code = Unknown desc = remote: Invalid username or password.
```

Note that "Repository not found" from GitHub often actually means "authentication failed". GitHub returns 404 instead of 401 for private repos when unauthenticated, as a security measure to not reveal the existence of private repositories.

## Step 1: Verify Credentials Exist

First, check that ArgoCD has credentials configured for the repository:

```bash
# List all configured repositories
argocd repo list

# List credential templates
argocd repocreds list

# Check secrets directly in Kubernetes
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repo-creds
```

If no credentials are found for your repository URL, that is your problem. Create the appropriate credential secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/my-org/my-repo.git
  username: argocd
  password: ghp_your_token
```

## Step 2: Verify Credentials Are Correct

If credentials exist, verify they actually work:

### For HTTPS Tokens

```bash
# Test the token directly against the Git provider's API
# GitHub
curl -H "Authorization: token ghp_your_token" https://api.github.com/user

# GitLab
curl -H "PRIVATE-TOKEN: glpat-your_token" https://gitlab.com/api/v4/user

# Test Git access from the repo-server pod
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://argocd:ghp_your_token@github.com/org/repo.git 2>&1
```

### For SSH Keys

```bash
# Test SSH connectivity from the repo-server
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -T -o StrictHostKeyChecking=no git@github.com 2>&1

# Check if the SSH key is properly mounted
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ls -la /app/config/ssh/

# Test with verbose SSH output
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -vvv git@github.com 2>&1 | tail -30
```

### For GitHub App Credentials

```bash
# Check the repo-server logs for GitHub App specific errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -i "github\|app\|jwt\|token"

# Verify the App ID and Installation ID
# Navigate to: https://github.com/organizations/ORG/settings/installations/INSTALLATION_ID
```

## Step 3: Check Credential Template Matching

If you are using credential templates, the URL prefix matching might not be working as expected:

```bash
# List all credential templates and their URL patterns
argocd repocreds list
```

```mermaid
flowchart TD
    A["Repo URL: https://github.com/my-org/repo.git"] --> B{Match template?}
    B -->|Template: https://github.com/my-org| C[Match! Uses these creds]
    B -->|Template: https://github.com/other-org| D[No match]
    B -->|Template: https://github.com| E[Match! But less specific]
```

Common matching issues:

```bash
# Template URL ends with trailing slash
# Template: https://github.com/my-org/
# Repo:     https://github.com/my-org/repo.git
# This might NOT match. Remove the trailing slash.

# Template URL includes .git
# Template: https://github.com/my-org/repo.git
# This is too specific for a template. Use: https://github.com/my-org

# SSH vs HTTPS mismatch
# Template: https://github.com/my-org
# Repo:     git@github.com:my-org/repo.git
# These use different protocols and won't match
```

## Step 4: Check Token Expiration

Tokens expire. This is the most common cause of "it was working yesterday" auth failures:

```bash
# GitHub PATs - check if the token is still valid
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ghp_your_token" https://api.github.com/user
# 200 = valid, 401 = expired/invalid

# GitLab PATs - check validity
curl -s -o /dev/null -w "%{http_code}" -H "PRIVATE-TOKEN: glpat_token" https://gitlab.com/api/v4/user
# 200 = valid, 401 = expired/invalid
```

If the token has expired, generate a new one and update the ArgoCD secret:

```bash
# Update the secret in place
kubectl patch secret my-repo-creds -n argocd \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/password", "value": "'$(echo -n "new_token" | base64)'"}]'
```

## Step 5: Check Token Scopes

Even valid tokens can fail if they lack the required permissions:

**GitHub**:
- Required scope: `repo` (for private repos)
- For fine-grained tokens: `Contents: Read`

**GitLab**:
- Required scope: `read_repository`

**Bitbucket Server**:
- Required permission: `Repository read`

**Azure DevOps**:
- Required scope: `Code (Read)`

## Step 6: Check for Secret Encoding Issues

A common mistake is double-encoding base64 data in secrets:

```bash
# Check the actual stored value
kubectl get secret my-repo-creds -n argocd -o jsonpath='{.data.password}' | base64 -d

# If you see something like "Z2hwX3h4eHh4eA==" (base64 of base64), it's double-encoded
# Use stringData instead of data to avoid this:
```

```yaml
# Correct - using stringData (no manual base64 encoding needed)
apiVersion: v1
kind: Secret
metadata:
  name: my-repo-creds
  namespace: argocd
stringData:
  password: ghp_actual_token_value

# Wrong - double-encoded with data field
apiVersion: v1
kind: Secret
metadata:
  name: my-repo-creds
  namespace: argocd
data:
  password: WjJod1gzaGhlSGg0ZUEVK   # This is base64 of base64
```

## Step 7: Check Repo Server Logs

The repo-server logs contain the most detailed error information:

```bash
# Get logs with timestamps
kubectl logs -n argocd deployment/argocd-repo-server --tail=200 --timestamps

# Filter for auth-related messages
kubectl logs -n argocd deployment/argocd-repo-server --tail=200 | grep -i "auth\|denied\|forbidden\|credential\|token\|permission"

# Watch logs in real-time while triggering a sync
kubectl logs -n argocd deployment/argocd-repo-server -f &
argocd app sync my-app --force
```

## Step 8: Test from a Fresh Pod

Sometimes the repo-server's cache gets into a bad state. Delete the pod and let it restart:

```bash
# Delete the repo-server pod (deployment recreates it)
kubectl delete pod -n argocd -l app.kubernetes.io/name=argocd-repo-server

# Watch the new pod come up
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-repo-server -w

# Test the repository connection
argocd repo get https://github.com/org/repo.git --refresh
```

## Step 9: Re-add the Repository

If all else fails, remove and re-add the repository:

```bash
# Remove the repository
argocd repo rm https://github.com/org/repo.git

# Re-add with credentials
argocd repo add https://github.com/org/repo.git \
  --username argocd \
  --password ghp_new_token

# Verify
argocd repo list
```

## Quick Debugging Commands

Here is a cheat sheet for rapid debugging:

```bash
# Full status check
argocd repo list

# Repo-server health
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-repo-server

# All secrets for repos
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository -o jsonpath='{range .items[*]}{.metadata.name}: {.data.url}{"\n"}{end}' | while read line; do echo "$line" | awk -F': ' '{print $1": "; system("echo "$2" | base64 -d; echo")}'; done

# Repo-server recent errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=50 --since=5m 2>/dev/null | grep -i error

# Force refresh a repository
argocd repo get https://github.com/org/repo.git --refresh
```

Authentication errors are the second most common ArgoCD issue after sync failures. Most of the time it comes down to expired tokens, wrong URL patterns in credential templates, or missing scopes. The systematic approach in this guide should help you identify the root cause quickly.
