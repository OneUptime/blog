# How to Fix 'authentication required' Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Authentication, SSH, HTTPS, GitHub, Troubleshooting, Kubernetes, GitOps

Description: Step-by-step guide to resolving the 'authentication required' error in Flux CD when accessing Git repositories and Helm registries.

---

## Introduction

The "authentication required" error in Flux CD occurs when the source-controller cannot authenticate with a remote Git repository or Helm registry. This guide covers all common authentication scenarios and provides concrete fixes for each one.

## Understanding the Error

You will typically see this error in the GitRepository or HelmRepository status:

```bash
# Check for authentication errors
kubectl get gitrepositories -A
kubectl describe gitrepository <name> -n flux-system
```

The error message usually looks like:

```text
failed to checkout and determine revision: authentication required
```

Or for Helm:

```text
failed to fetch Helm repository index: 401 Unauthorized
```

## Fix 1: HTTPS Personal Access Token (PAT)

The most common authentication method for HTTPS-based Git access.

### Creating the Secret

```yaml
# github-pat-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-pat
  namespace: flux-system
type: Opaque
stringData:
  # For GitHub, GitLab, and most providers
  username: git
  password: ghp_your_personal_access_token_here
```

```bash
# Apply the secret
kubectl apply -f github-pat-secret.yaml

# Alternatively, create the secret directly with kubectl
kubectl create secret generic github-pat \
  --from-literal=username=git \
  --from-literal=password=ghp_your_personal_access_token_here \
  -n flux-system
```

### Linking the Secret to GitRepository

```yaml
# git-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-private-repo.git
  # Reference the authentication secret
  secretRef:
    name: github-pat
  ref:
    branch: main
```

### Token Scope Requirements

For GitHub, your PAT needs these scopes:

- **Classic PAT**: `repo` (full repository access)
- **Fine-grained PAT**: `Contents` read access on the target repository

For GitLab:

- **Project Access Token**: `read_repository` scope
- **Personal Access Token**: `read_repository` scope

## Fix 2: SSH Key Authentication

SSH authentication is more secure and avoids token expiration issues.

### Generating an SSH Key

```bash
# Generate an Ed25519 key (recommended)
ssh-keygen -t ed25519 -f flux-identity -C "flux-cd" -q -N ""

# Get the known hosts entry for GitHub
ssh-keyscan github.com > known_hosts 2>/dev/null
```

### Creating the Kubernetes Secret

```bash
# Create the secret with the SSH key and known_hosts
kubectl create secret generic git-ssh-auth \
  --from-file=identity=./flux-identity \
  --from-file=identity.pub=./flux-identity.pub \
  --from-file=known_hosts=./known_hosts \
  -n flux-system
```

Or declaratively:

```yaml
# git-ssh-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-auth
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-private-key-content>
    -----END OPENSSH PRIVATE KEY-----
  identity.pub: "ssh-ed25519 AAAA... flux-cd"
  known_hosts: "github.com ssh-ed25519 AAAA..."
```

### Linking SSH Secret to GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Must use SSH URL format
  url: ssh://git@github.com/my-org/my-private-repo.git
  secretRef:
    name: git-ssh-auth
  ref:
    branch: main
```

### Adding the Deploy Key

```bash
# Display the public key to add as a deploy key
cat flux-identity.pub
```

Add this public key as a deploy key in your repository settings:
- **GitHub**: Settings > Deploy keys > Add deploy key
- **GitLab**: Settings > Repository > Deploy keys

## Fix 3: GitHub App Authentication

GitHub App tokens are more secure and offer better rate limits than PATs.

### Creating the GitHub App Secret

```bash
# Create the secret with GitHub App credentials
kubectl create secret generic github-app-auth \
  --from-literal=githubAppID=<app-id> \
  --from-literal=githubAppInstallationID=<installation-id> \
  --from-file=githubAppPrivateKey=./github-app-private-key.pem \
  -n flux-system
```

### Configuring the GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-private-repo.git
  secretRef:
    name: github-app-auth
  ref:
    branch: main
```

The GitHub App needs these permissions:
- **Repository Contents**: Read-only
- **Metadata**: Read-only

## Fix 4: Helm OCI Registry Authentication

For private Helm charts stored in OCI registries:

```bash
# Create a docker-registry type secret for OCI registries
kubectl create secret docker-registry helm-oci-auth \
  --docker-server=ghcr.io \
  --docker-username=flux \
  --docker-password=<your-token> \
  -n flux-system
```

```yaml
# helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  interval: 10m
  url: oci://ghcr.io/my-org/charts
  secretRef:
    name: helm-oci-auth
```

## Fix 5: Helm HTTP Registry Authentication

For traditional Helm chart repositories:

```yaml
# helm-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-auth
  namespace: flux-system
type: Opaque
stringData:
  username: admin
  password: <your-password>
```

```yaml
# helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-private-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.example.com
  secretRef:
    name: helm-repo-auth
```

## Debugging Authentication Issues

### Step 1: Verify the Secret Exists and Has Data

```bash
# List secrets in the flux-system namespace
kubectl get secrets -n flux-system

# Check that the secret has the expected keys (without showing values)
kubectl get secret <secret-name> -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

### Step 2: Check Secret Reference in the Resource

```bash
# Verify the secretRef is set correctly
kubectl get gitrepository <name> -n flux-system -o yaml | grep -A2 secretRef
```

### Step 3: Test Credentials Manually

```bash
# For HTTPS, test with git clone
git clone https://<username>:<token>@github.com/my-org/my-repo.git /tmp/test-clone

# For SSH, test the connection
ssh -i ./flux-identity -T git@github.com
```

### Step 4: Check Source Controller Logs

```bash
# View the source-controller logs for authentication errors
kubectl logs -n flux-system deploy/source-controller | grep -i "auth\|401\|403\|denied"
```

## Updating Expired Credentials

Tokens and keys can expire. Here is how to update them without downtime:

```bash
# Update an existing secret in place
kubectl create secret generic github-pat \
  --from-literal=username=git \
  --from-literal=password=ghp_new_token_here \
  -n flux-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Force Flux to re-authenticate immediately
flux reconcile source git <name>
```

## Common Pitfalls

1. **Wrong URL scheme**: SSH secrets only work with `ssh://` URLs, and HTTPS secrets only work with `https://` URLs
2. **Secret in wrong namespace**: The secret must be in the same namespace as the GitRepository resource
3. **Missing known_hosts**: SSH authentication requires the `known_hosts` entry or Flux will reject the connection
4. **Token without required scopes**: Ensure your PAT has sufficient permissions to read the repository contents
5. **Expired tokens**: GitHub PATs and GitLab tokens can expire, causing sudden auth failures

## Summary

Authentication errors in Flux CD are straightforward to resolve once you identify the authentication method and verify the credentials. Always ensure the secret exists in the correct namespace, contains the right keys, and is properly referenced by the source resource. After fixing credentials, force a reconciliation to verify the fix immediately.
