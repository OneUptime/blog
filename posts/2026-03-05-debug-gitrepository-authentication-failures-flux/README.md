# How to Debug GitRepository Authentication Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GitRepository, Authentication, SSH, HTTPS, Debugging

Description: A step-by-step guide to diagnosing and resolving GitRepository authentication failures in Flux CD for both HTTPS and SSH protocols.

---

Authentication failures are among the most common reasons a Flux GitRepository enters a Not Ready state. The error messages can sometimes be cryptic, and the root cause can range from expired tokens to misconfigured SSH keys. This guide provides a structured approach to debugging authentication issues for both HTTPS and SSH-based GitRepository sources.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- The Flux CLI (`flux`) installed locally
- `kubectl` access to your cluster
- Access to your Git hosting provider (GitHub, GitLab, Bitbucket, etc.)

## Step 1: Identify the Authentication Error

Start by checking the GitRepository status for the specific error message.

```bash
# Get the status of the failing GitRepository
flux get source git my-app

# Get the detailed error message
kubectl get gitrepository my-app -n flux-system \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'
```

Common authentication error messages include:

- `authentication required`
- `invalid credentials`
- `403 Forbidden`
- `Permission denied (publickey)`
- `Host key verification failed`
- `could not read Username`

## Step 2: Verify the Secret Exists and Is Referenced

Confirm that the GitRepository references a secret and that the secret exists.

```bash
# Check which secret the GitRepository references
kubectl get gitrepository my-app -n flux-system \
  -o jsonpath='{.spec.secretRef.name}'

# Verify the secret exists in the same namespace
kubectl get secret -n flux-system
```

If no `secretRef` is configured but your repository is private, that is the problem. Add one.

```yaml
# Add secretRef to a GitRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-private-app.git
  ref:
    branch: main
  # Reference the authentication secret
  secretRef:
    name: git-credentials
```

## Step 3: Debug HTTPS Authentication

For GitRepository sources using HTTPS URLs, the secret should contain `username` and `password` fields.

```bash
# Check the secret keys (do not print values in shared environments)
kubectl get secret git-credentials -n flux-system \
  -o jsonpath='{.data}' | jq 'keys'
```

Expected keys for HTTPS: `["password", "username"]`

Verify the credentials are not empty or corrupted.

```bash
# Check that the username is set correctly
kubectl get secret git-credentials -n flux-system \
  -o jsonpath='{.data.username}' | base64 -d

# Check that the password/token length looks reasonable (do not print full token)
kubectl get secret git-credentials -n flux-system \
  -o jsonpath='{.data.password}' | base64 -d | wc -c
```

### Common HTTPS Issues

**Expired or revoked token**: Personal access tokens and app tokens expire. Regenerate the token and update the secret.

```bash
# Update the secret with a new token
kubectl create secret generic git-credentials \
  --namespace=flux-system \
  --from-literal=username=git \
  --from-literal=password=<new-token> \
  --dry-run=client -o yaml | kubectl apply -f -

# Force reconciliation to test the new credentials
flux reconcile source git my-app
```

**Insufficient token permissions**: The token must have read access to the repository. For GitHub, the token needs at least the `repo` scope (classic tokens) or `Contents: read` permission (fine-grained tokens).

**Wrong username**: For GitHub, the username should be `git` or your GitHub username. For GitLab, use `oauth2` as the username when using an access token.

```yaml
# Correct secret format for GitHub
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```yaml
# Correct secret format for GitLab with access token
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: oauth2
  password: glpat-xxxxxxxxxxxxxxxxxxxx
```

## Step 4: Debug SSH Authentication

For GitRepository sources using SSH URLs (e.g., `ssh://git@github.com/...`), the secret should contain `identity` and `known_hosts` fields.

```bash
# Check the secret keys for SSH
kubectl get secret git-ssh-credentials -n flux-system \
  -o jsonpath='{.data}' | jq 'keys'
```

Expected keys for SSH: `["identity", "known_hosts"]`

### Verify the SSH Key

```bash
# Check that the identity key is a valid SSH private key
kubectl get secret git-ssh-credentials -n flux-system \
  -o jsonpath='{.data.identity}' | base64 -d | head -1
```

The output should be a valid key header like `-----BEGIN OPENSSH PRIVATE KEY-----`.

### Verify known_hosts

A missing or incorrect `known_hosts` entry causes "Host key verification failed" errors.

```bash
# Check the known_hosts content
kubectl get secret git-ssh-credentials -n flux-system \
  -o jsonpath='{.data.known_hosts}' | base64 -d
```

Generate the correct known_hosts entry for your Git host.

```bash
# Scan the Git host for its SSH host keys
ssh-keyscan github.com 2>/dev/null
ssh-keyscan gitlab.com 2>/dev/null
```

### Recreate the SSH Secret

If the SSH key or known_hosts is incorrect, recreate the secret.

```bash
# Generate a new SSH key pair for Flux
ssh-keygen -t ed25519 -f flux-deploy-key -N "" -C "flux"

# Scan the Git host for known_hosts
ssh-keyscan github.com > known_hosts 2>/dev/null

# Create the secret
kubectl create secret generic git-ssh-credentials \
  --namespace=flux-system \
  --from-file=identity=flux-deploy-key \
  --from-file=known_hosts=known_hosts \
  --dry-run=client -o yaml | kubectl apply -f -

# Force reconciliation
flux reconcile source git my-app
```

Remember to add the public key (`flux-deploy-key.pub`) as a deploy key in your Git hosting provider.

## Step 5: Debug with the Flux CLI

The Flux CLI can help test authentication during source creation.

```bash
# Test HTTPS authentication by creating a source
flux create source git test-auth \
  --url=https://github.com/your-org/my-app.git \
  --branch=main \
  --secret-ref=git-credentials \
  --interval=5m

# Check if it succeeds
flux get source git test-auth

# Clean up the test source
flux delete source git test-auth
```

## Step 6: Check Source Controller Logs

The source controller logs contain the most detailed error information.

```bash
# View authentication-related errors in the source controller
kubectl logs -n flux-system deployment/source-controller --since=5m | \
  grep -i "auth\|credentials\|permission\|denied\|forbidden\|publickey"
```

## Step 7: Test Credentials Outside the Cluster

Verify that your credentials work independently of Flux.

For HTTPS:

```bash
# Test HTTPS clone with the same credentials
git clone https://<username>:<token>@github.com/your-org/my-app.git /tmp/test-clone
rm -rf /tmp/test-clone
```

For SSH:

```bash
# Test SSH connection to the Git host
ssh -i flux-deploy-key -T git@github.com
```

## Debugging Checklist

Use this checklist to systematically rule out common causes.

```bash
# 1. Does the secret exist?
kubectl get secret git-credentials -n flux-system

# 2. Does the GitRepository reference the correct secret?
kubectl get gitrepository my-app -n flux-system -o jsonpath='{.spec.secretRef.name}'

# 3. Is the URL format correct for the auth method?
# HTTPS: https://github.com/your-org/repo.git
# SSH: ssh://git@github.com/your-org/repo.git
kubectl get gitrepository my-app -n flux-system -o jsonpath='{.spec.url}'

# 4. Are the secret keys correct?
kubectl get secret git-credentials -n flux-system -o jsonpath='{.data}' | jq 'keys'

# 5. Has the token expired?
# Check your Git provider's token management page

# 6. Does the token have sufficient permissions?
# Check your Git provider's token scopes/permissions

# 7. For SSH: is the public key registered as a deploy key?
# Check your repository's deploy key settings

# 8. For SSH: is known_hosts correct?
kubectl get secret git-ssh-credentials -n flux-system -o jsonpath='{.data.known_hosts}' | base64 -d
```

## Summary

Debugging GitRepository authentication failures in Flux requires checking the secret configuration, verifying credentials are valid and have the correct permissions, and ensuring the URL format matches the authentication method. For HTTPS, focus on token validity and permissions. For SSH, verify the private key format, known_hosts entries, and deploy key registration. Always test credentials outside the cluster to rule out Flux-specific issues, and check the source controller logs for detailed error messages.
