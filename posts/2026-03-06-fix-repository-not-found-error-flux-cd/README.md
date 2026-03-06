# How to Fix 'repository not found' Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, repository not found, GitRepository, Troubleshooting, Kubernetes, GitOps

Description: A comprehensive troubleshooting guide for resolving the 'repository not found' error in Flux CD GitRepository resources.

---

## Introduction

The "repository not found" error in Flux CD is a frustrating problem that can appear even when you are sure the repository exists. This error can be caused by URL typos, incorrect access permissions, or misconfigured authentication. This guide will help you systematically diagnose and fix the issue.

## Understanding the Error

When Flux CD cannot locate a Git repository, you will see an error like:

```text
failed to checkout and determine revision: repository not found
```

Or from GitHub specifically:

```python
ERROR: Repository not found.
fatal: Could not read from remote repository.
```

Check the current state with:

```bash
# View all GitRepository resources and their status
kubectl get gitrepositories -A

# Get detailed error message
flux get sources git -A

# Describe the specific resource for full details
kubectl describe gitrepository <name> -n flux-system
```

## Cause 1: URL Typos

The most common cause is simply a typo in the repository URL.

### Diagnosing

```bash
# Extract the current URL
kubectl get gitrepository <name> -n flux-system -o jsonpath='{.spec.url}'
```

Common URL mistakes include:
- Misspelled organization or repository name
- Wrong hosting platform (github.com vs gitlab.com)
- Extra or missing path segments
- Using HTTP instead of HTTPS

### Fix

```yaml
# Correct the URL in your GitRepository manifest
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Double check each segment: protocol, host, org, repo
  url: https://github.com/my-org/my-repo.git
  ref:
    branch: main
```

```bash
# Apply the corrected manifest
kubectl apply -f gitrepository.yaml

# Verify by triggering reconciliation
flux reconcile source git <name>
```

### Verifying the URL

```bash
# Test HTTPS URL accessibility (public repos)
git ls-remote https://github.com/my-org/my-repo.git

# Test SSH URL accessibility
ssh -T git@github.com
git ls-remote ssh://git@github.com/my-org/my-repo.git
```

## Cause 2: Private Repository Without Authentication

GitHub, GitLab, and other providers return "repository not found" instead of "access denied" when authentication is missing for a private repository. This is a security measure to avoid leaking the existence of private repos.

### Diagnosing

```bash
# Check if a secretRef is configured
kubectl get gitrepository <name> -n flux-system -o jsonpath='{.spec.secretRef}'

# If empty, no authentication is configured
# Check if the repository is actually private by trying to access it without auth
curl -s -o /dev/null -w "%{http_code}" https://github.com/my-org/my-repo
# 404 means private or non-existent
# 200 means public
```

### Fix

Create authentication credentials and reference them:

```yaml
# Step 1: Create the secret
apiVersion: v1
kind: Secret
metadata:
  name: repo-auth
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: ghp_your_token_here
---
# Step 2: Update the GitRepository to reference the secret
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-private-repo.git
  secretRef:
    name: repo-auth
  ref:
    branch: main
```

```bash
kubectl apply -f repo-with-auth.yaml
```

## Cause 3: Insufficient Token Permissions

Even with a valid token, the "repository not found" error can appear if the token does not have access to the specific repository.

### Diagnosing

```bash
# Test the token manually with the GitHub API
curl -H "Authorization: token ghp_your_token_here" \
  https://api.github.com/repos/my-org/my-repo

# A 404 response means the token cannot see the repo
# A 200 response means the token has access
```

### Fix for GitHub Classic PAT

Ensure the token has the `repo` scope and, for organization repositories, that SSO is authorized:

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Edit your token and ensure `repo` scope is checked
3. If using an organization with SAML SSO, click "Authorize" next to the organization

### Fix for GitHub Fine-Grained PAT

Fine-grained PATs are scoped to specific repositories:

1. Go to GitHub Settings > Developer settings > Fine-grained tokens
2. Edit the token
3. Under "Repository access", ensure your target repository is included
4. Under "Repository permissions", grant at least `Contents: Read-only`

### Fix for GitLab Project Access Token

```bash
# Verify the token has read_repository scope
# Create a new project access token if needed with:
# - Role: Reporter (minimum)
# - Scopes: read_repository
```

Update the secret with the new token:

```bash
kubectl create secret generic repo-auth \
  --from-literal=username=git \
  --from-literal=password=<new-token> \
  -n flux-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Cause 4: Repository Has Been Renamed or Moved

If a repository was renamed, moved to a different organization, or transferred, the old URL will return "not found".

### Diagnosing

```bash
# Check the current URL
kubectl get gitrepository <name> -n flux-system -o jsonpath='{.spec.url}'

# Try to verify the actual current URL of the repository
# GitHub sometimes redirects, but Git operations may not follow redirects
curl -sI https://github.com/my-org/old-repo-name | grep -i location
```

### Fix

Update the GitRepository URL to the new location:

```bash
# Patch the URL directly
kubectl patch gitrepository <name> -n flux-system \
  --type merge \
  -p '{"spec":{"url":"https://github.com/new-org/new-repo-name.git"}}'

# Trigger reconciliation
flux reconcile source git <name>
```

## Cause 5: SSH Deploy Key Not Added to Repository

When using SSH authentication, the deploy key must be added to the specific repository.

### Diagnosing

```bash
# Extract the public key from the secret
kubectl get secret git-ssh-auth -n flux-system \
  -o jsonpath='{.data.identity\.pub}' | base64 -d
```

### Fix

1. Copy the public key output from the command above
2. Go to your repository settings
3. Add it as a deploy key:
   - **GitHub**: Settings > Deploy keys > Add deploy key
   - **GitLab**: Settings > Repository > Deploy keys
4. Trigger reconciliation:

```bash
flux reconcile source git <name>
```

## Cause 6: Organization Access Restrictions

Some organizations restrict which applications and tokens can access their repositories.

### Diagnosing for GitHub Organizations with SSO

```bash
# Check if the organization uses SAML SSO
curl -H "Authorization: token ghp_your_token" \
  https://api.github.com/orgs/<org-name>
# Look for "saml" in the response
```

### Fix

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Find your token
3. Click "Configure SSO" next to the token
4. Authorize the token for the required organization

## Comprehensive Debugging Workflow

If none of the above causes match, follow this systematic debugging approach:

```bash
# Step 1: Get the full resource status
kubectl get gitrepository <name> -n flux-system -o yaml

# Step 2: Check source-controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50

# Step 3: Verify the secret data (keys only, not values)
kubectl get secret <secret-name> -n flux-system -o json | \
  python3 -c "import sys,json; print(list(json.load(sys.stdin)['data'].keys()))"

# Step 4: Check for network policies blocking egress
kubectl get networkpolicies -n flux-system -o yaml

# Step 5: Test connectivity from inside the cluster
kubectl run -it --rm test-git \
  --image=bitnami/git \
  --namespace=flux-system \
  -- git ls-remote https://github.com/my-org/my-repo.git
```

## Prevention Best Practices

To avoid "repository not found" errors in the future:

1. **Use infrastructure as code** for Flux resources so URLs are version controlled
2. **Set up monitoring** for Flux source reconciliation failures
3. **Use long-lived credentials** such as GitHub App tokens that auto-renew
4. **Document repository moves** and update all Flux references when renaming repos
5. **Test credentials** before applying them to the cluster

```bash
# Quick health check for all Git sources
flux get sources git -A --status-selector ready=false
```

## Summary

The "repository not found" error in Flux CD typically comes down to one of three things: the URL is wrong, authentication is missing or insufficient, or the repository has moved. By systematically checking the URL, verifying token permissions, and testing credentials manually, you can quickly pinpoint and resolve the issue.
