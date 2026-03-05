# How to Configure GitRepository for Private Repositories in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GitRepository, Private Repository, SSH, HTTPS, Authentication, Deploy Keys

Description: A complete guide to configuring Flux CD GitRepository resources for private Git repositories using HTTPS tokens, SSH deploy keys, and provider-specific authentication.

---

Most production Git repositories are private, requiring authentication to clone. Flux CD supports multiple authentication methods for GitRepository sources, including HTTPS with personal access tokens, SSH with deploy keys, and provider-specific mechanisms. This guide covers each method step by step with examples for GitHub, GitLab, and Bitbucket.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- The Flux CLI (`flux`) installed locally
- `kubectl` access to your cluster
- Admin or maintainer access to your private Git repository

## Authentication Methods Overview

Flux supports two primary protocols for accessing private repositories.

```mermaid
flowchart TD
    A[Private Repository] --> B{Which protocol?}
    B --> C[HTTPS]
    B --> D[SSH]
    C --> E[Personal Access Token]
    C --> F[App Token]
    D --> G[Deploy Key]
    D --> H[SSH Key]
```

Choose HTTPS when your organization uses token-based authentication or when SSH is blocked by firewall rules. Choose SSH when you prefer deploy keys with repository-scoped access.

## Method 1: HTTPS with Personal Access Token

This is the most common method. Create a token in your Git provider and store it in a Kubernetes Secret.

### GitHub

Generate a fine-grained personal access token with `Contents: read` permission for the target repository.

```bash
# Create the secret for GitHub HTTPS authentication
kubectl create secret generic github-credentials \
  --namespace=flux-system \
  --from-literal=username=git \
  --from-literal=password=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Create the GitRepository referencing the secret.

```yaml
# github-private-repo.yaml
# GitRepository for a private GitHub repository using HTTPS
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-private-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-private-app.git
  ref:
    branch: main
  # Reference the HTTPS credentials secret
  secretRef:
    name: github-credentials
```

### GitLab

For GitLab, use a project access token or personal access token with `read_repository` scope. The username must be `oauth2` when using access tokens.

```bash
# Create the secret for GitLab HTTPS authentication
kubectl create secret generic gitlab-credentials \
  --namespace=flux-system \
  --from-literal=username=oauth2 \
  --from-literal=password=glpat-xxxxxxxxxxxxxxxxxxxx
```

```yaml
# gitlab-private-repo.yaml
# GitRepository for a private GitLab repository using HTTPS
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-gitlab-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://gitlab.com/your-org/my-private-app.git
  ref:
    branch: main
  secretRef:
    name: gitlab-credentials
```

### Bitbucket

For Bitbucket, use an app password with `Repositories: Read` permission.

```bash
# Create the secret for Bitbucket HTTPS authentication
kubectl create secret generic bitbucket-credentials \
  --namespace=flux-system \
  --from-literal=username=your-bitbucket-username \
  --from-literal=password=your-app-password
```

```yaml
# bitbucket-private-repo.yaml
# GitRepository for a private Bitbucket repository using HTTPS
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-bitbucket-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://bitbucket.org/your-org/my-private-app.git
  ref:
    branch: main
  secretRef:
    name: bitbucket-credentials
```

## Method 2: SSH with Deploy Keys

SSH deploy keys provide repository-scoped, read-only access without requiring a personal account token. This is the recommended approach for production environments.

### Step 1: Generate an SSH Key Pair

```bash
# Generate an ED25519 SSH key pair for Flux
ssh-keygen -t ed25519 -f flux-deploy-key -N "" -C "flux-cd"
```

This creates two files: `flux-deploy-key` (private key) and `flux-deploy-key.pub` (public key).

### Step 2: Add the Public Key as a Deploy Key

Add the contents of `flux-deploy-key.pub` to your repository's deploy key settings:

- **GitHub**: Repository Settings > Deploy keys > Add deploy key
- **GitLab**: Repository Settings > Repository > Deploy keys
- **Bitbucket**: Repository Settings > Access keys > Add key

Read-only access is sufficient for Flux to clone the repository.

### Step 3: Create the SSH Secret

```bash
# Scan the Git host for its SSH fingerprint
ssh-keyscan github.com > known_hosts 2>/dev/null

# Create the Kubernetes secret with the private key and known_hosts
kubectl create secret generic git-ssh-credentials \
  --namespace=flux-system \
  --from-file=identity=flux-deploy-key \
  --from-file=known_hosts=known_hosts
```

For other Git hosts, replace `github.com` with the appropriate hostname.

```bash
# Known hosts for GitLab
ssh-keyscan gitlab.com > known_hosts 2>/dev/null

# Known hosts for Bitbucket
ssh-keyscan bitbucket.org > known_hosts 2>/dev/null

# Known hosts for self-hosted Git server
ssh-keyscan git.internal.example.com > known_hosts 2>/dev/null
```

### Step 4: Create the GitRepository with SSH

Note that the URL must use the `ssh://` scheme.

```yaml
# gitrepository-ssh.yaml
# GitRepository for a private repository using SSH deploy key
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-private-app
  namespace: flux-system
spec:
  interval: 5m
  # SSH URL format is required
  url: ssh://git@github.com/your-org/my-private-app.git
  ref:
    branch: main
  # Reference the SSH credentials secret
  secretRef:
    name: git-ssh-credentials
```

```bash
# Apply the GitRepository
kubectl apply -f gitrepository-ssh.yaml
```

## Method 3: Using the Flux CLI for Bootstrap

The Flux CLI can handle credential setup automatically during bootstrap.

```bash
# Bootstrap with HTTPS and a personal access token
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

flux bootstrap github \
  --owner=your-org \
  --repository=fleet-config \
  --branch=main \
  --path=clusters/production \
  --personal
```

```bash
# Bootstrap with SSH (Flux generates and displays the deploy key)
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-config \
  --branch=main \
  --path=clusters/production \
  --ssh-key-algorithm=ed25519
```

When using SSH bootstrap, Flux generates the key pair, creates the Kubernetes secret, and displays the public key for you to add as a deploy key.

## Self-Hosted Git Servers

For self-hosted Git servers with custom CA certificates, include the CA in the credentials secret.

```yaml
# self-hosted-git-credentials.yaml
# Credentials for a self-hosted Git server with custom CA
apiVersion: v1
kind: Secret
metadata:
  name: self-hosted-git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <your-token>
  # Custom CA certificate for the self-hosted Git server
  caFile: |
    -----BEGIN CERTIFICATE-----
    <your-ca-certificate-content>
    -----END CERTIFICATE-----
```

```yaml
# gitrepository-self-hosted.yaml
# GitRepository for a self-hosted Git server
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: self-hosted-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.example.com/your-org/my-app.git
  ref:
    branch: main
  secretRef:
    name: self-hosted-git-credentials
```

## Verify the Configuration

After setting up authentication, verify that Flux can access the private repository.

```bash
# Check the GitRepository status
flux get source git my-private-app

# For detailed error messages if it fails
kubectl describe gitrepository my-private-app -n flux-system
```

A successful setup shows the source as ready.

```text
NAME             REVISION              SUSPENDED   READY   MESSAGE
my-private-app   main@sha1:abc123def   False       True    stored artifact for revision 'main@sha1:abc123def'
```

## Security Best Practices

Follow these practices to keep your private repository credentials secure.

- **Use deploy keys over personal access tokens** when possible. Deploy keys are scoped to a single repository and can be read-only.
- **Rotate credentials regularly**. Set calendar reminders to rotate tokens and SSH keys before they expire.
- **Use fine-grained tokens** with the minimum required permissions. Avoid tokens with broad organization-wide access.
- **Seal secrets with Sealed Secrets or SOPS** if you store credential manifests in Git. Never commit plain-text secrets to a repository.
- **Use separate credentials per repository** rather than a single token with access to all repositories.

```bash
# Example: Rotate credentials by updating the secret
kubectl create secret generic github-credentials \
  --namespace=flux-system \
  --from-literal=username=git \
  --from-literal=password=ghp_NEW_TOKEN_HERE \
  --dry-run=client -o yaml | kubectl apply -f -

# Force reconciliation with the new credentials
flux reconcile source git my-private-app
```

## Summary

Configuring Flux GitRepository resources for private repositories requires creating a Kubernetes Secret with the appropriate credentials and referencing it via `spec.secretRef`. HTTPS authentication uses username and token pairs, while SSH authentication uses deploy keys with known_hosts verification. Each Git hosting provider has slightly different token formats and username conventions. For production environments, prefer SSH deploy keys for their repository-scoped access, rotate credentials regularly, and never store plain-text secrets in Git.
