# How to Use flux create secret git for Git Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, git, secret, authentication, gitops, kubernetes, ssh, https

Description: A practical guide to creating Git authentication secrets with the flux create secret git command for secure repository access.

---

## Introduction

When Flux needs to access private Git repositories, it requires authentication credentials stored as Kubernetes secrets. The `flux create secret git` command simplifies the creation of these secrets, supporting both SSH key-based and HTTPS token-based authentication methods.

This guide covers all authentication scenarios, from basic HTTPS tokens to SSH deploy keys, including provider-specific configurations for GitHub, GitLab, and Bitbucket.

## Prerequisites

- Flux CLI v2.0 or later installed
- kubectl configured with cluster access
- Flux installed on your Kubernetes cluster
- Access credentials for your Git provider

```bash
# Verify Flux is running in your cluster
flux check

# Verify kubectl access
kubectl get namespaces
```

## Authentication Methods Overview

```mermaid
graph TD
    A[flux create secret git] --> B[SSH Authentication]
    A --> C[HTTPS Authentication]
    B --> D[SSH Private Key]
    B --> E[SSH Key + Password]
    C --> F[Username + Password]
    C --> G[Personal Access Token]
    C --> H[OAuth Token]
```

## HTTPS Authentication

### Basic Username and Password

```bash
# Create a secret with username and password for HTTPS access
# This creates a Kubernetes secret in the flux-system namespace
flux create secret git my-repo-auth \
  --url=https://github.com/myorg/myrepo \
  --username=myuser \
  --password=mypassword \
  --namespace=flux-system
```

### Personal Access Token (PAT)

```bash
# Create a secret using a GitHub Personal Access Token
# The username can be anything for token-based auth; "git" is conventional
flux create secret git github-auth \
  --url=https://github.com/myorg/myrepo \
  --username=git \
  --password=${GITHUB_TOKEN} \
  --namespace=flux-system
```

### GitLab Access Token

```bash
# Create a secret using a GitLab project or personal access token
flux create secret git gitlab-auth \
  --url=https://gitlab.com/myorg/myrepo \
  --username=oauth2 \
  --password=${GITLAB_TOKEN} \
  --namespace=flux-system
```

### Bitbucket App Password

```bash
# Create a secret for Bitbucket using an app password
flux create secret git bitbucket-auth \
  --url=https://bitbucket.org/myorg/myrepo \
  --username=myuser \
  --password=${BITBUCKET_APP_PASSWORD} \
  --namespace=flux-system
```

## SSH Authentication

### Using an Existing SSH Key

```bash
# Create a secret using an existing SSH private key file
flux create secret git ssh-auth \
  --url=ssh://git@github.com/myorg/myrepo \
  --private-key-file=~/.ssh/id_ed25519 \
  --namespace=flux-system
```

### Generating a New SSH Key

```bash
# Generate a new ED25519 SSH key pair specifically for Flux
ssh-keygen -t ed25519 -C "flux-deploy-key" -f ./flux-deploy-key -N ""

# Create the secret using the generated private key
flux create secret git ssh-deploy-key \
  --url=ssh://git@github.com/myorg/myrepo \
  --private-key-file=./flux-deploy-key \
  --namespace=flux-system

# Add the public key as a deploy key in your Git provider
cat ./flux-deploy-key.pub
# Copy this output and add it to your repository's deploy keys

# Clean up the local key files
rm ./flux-deploy-key ./flux-deploy-key.pub
```

### SSH Key with Passphrase

```bash
# Create a secret with a password-protected SSH key
flux create secret git ssh-protected \
  --url=ssh://git@github.com/myorg/myrepo \
  --private-key-file=~/.ssh/id_ed25519_protected \
  --password="${SSH_KEY_PASSPHRASE}" \
  --namespace=flux-system
```

### RSA SSH Key

```bash
# Generate an RSA key if ED25519 is not supported
ssh-keygen -t rsa -b 4096 -C "flux-deploy-key" -f ./flux-rsa-key -N ""

# Create the secret
flux create secret git rsa-auth \
  --url=ssh://git@github.com/myorg/myrepo \
  --private-key-file=./flux-rsa-key \
  --namespace=flux-system

# Clean up
rm ./flux-rsa-key ./flux-rsa-key.pub
```

## Provider-Specific Configurations

### GitHub

```bash
# Using a fine-grained personal access token (recommended)
# Token needs: Contents (read), Metadata (read) permissions
flux create secret git github-pat \
  --url=https://github.com/myorg/myrepo \
  --username=git \
  --password=${GITHUB_FINE_GRAINED_TOKEN} \
  --namespace=flux-system

# Using SSH with GitHub
flux create secret git github-ssh \
  --url=ssh://git@github.com/myorg/myrepo \
  --private-key-file=~/.ssh/github_deploy_key \
  --namespace=flux-system
```

### GitLab

```bash
# Using a GitLab deploy token
# Create a deploy token in GitLab: Settings > Repository > Deploy Tokens
flux create secret git gitlab-deploy-token \
  --url=https://gitlab.com/myorg/myrepo \
  --username=${DEPLOY_TOKEN_USERNAME} \
  --password=${DEPLOY_TOKEN_PASSWORD} \
  --namespace=flux-system

# Using SSH with GitLab
flux create secret git gitlab-ssh \
  --url=ssh://git@gitlab.com/myorg/myrepo \
  --private-key-file=~/.ssh/gitlab_deploy_key \
  --namespace=flux-system
```

### Self-Hosted Git Servers

```bash
# For self-hosted GitLab or Gitea instances
flux create secret git self-hosted-auth \
  --url=https://git.internal.company.com/myorg/myrepo \
  --username=deploy-user \
  --password=${DEPLOY_PASSWORD} \
  --namespace=flux-system

# For self-hosted with SSH on a custom port
flux create secret git self-hosted-ssh \
  --url=ssh://git@git.internal.company.com:2222/myorg/myrepo \
  --private-key-file=~/.ssh/internal_deploy_key \
  --namespace=flux-system
```

## Using the Secret with GitRepository

After creating the secret, reference it in your GitRepository resource.

```yaml
# git-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/myrepo
  ref:
    branch: main
  secretRef:
    # Reference the secret created with flux create secret git
    name: github-pat
```

```bash
# Apply the GitRepository resource
kubectl apply -f git-repository.yaml

# Verify the source is syncing
flux get sources git
```

## Exporting Secrets as YAML

```bash
# Export the secret creation command as a YAML manifest
# Useful for storing in version control (encrypt before committing)
flux create secret git github-auth \
  --url=https://github.com/myorg/myrepo \
  --username=git \
  --password=${GITHUB_TOKEN} \
  --namespace=flux-system \
  --export > git-secret.yaml

# View the generated YAML
cat git-secret.yaml

# Encrypt with SOPS before committing
sops --encrypt --in-place git-secret.yaml
```

## Managing Secrets

### Listing Git Secrets

```bash
# List all secrets in the flux-system namespace
kubectl get secrets -n flux-system

# Describe a specific secret (shows metadata, not values)
kubectl describe secret github-auth -n flux-system
```

### Updating a Secret

```bash
# Recreate the secret with updated credentials
# The --export flag followed by kubectl apply handles updates
flux create secret git github-auth \
  --url=https://github.com/myorg/myrepo \
  --username=git \
  --password=${NEW_GITHUB_TOKEN} \
  --namespace=flux-system \
  --export | kubectl apply -f -

# Force Flux to reconcile with the new credentials
flux reconcile source git myapp
```

### Deleting a Secret

```bash
# Delete a git secret
kubectl delete secret github-auth -n flux-system
```

## Troubleshooting

### Authentication Failures

```bash
# Check if the secret exists
kubectl get secret github-auth -n flux-system

# Check the GitRepository status for errors
flux get sources git

# Get detailed events
kubectl describe gitrepository myapp -n flux-system

# Common error: "authentication required"
# Solution: Verify the token has correct permissions

# Common error: "host key verification failed"
# Solution: For SSH, ensure the known_hosts are configured correctly
flux create secret git ssh-auth \
  --url=ssh://git@github.com/myorg/myrepo \
  --private-key-file=~/.ssh/deploy_key \
  --namespace=flux-system
```

### Token Permission Issues

```bash
# GitHub PAT minimum permissions needed:
# - repo (full control of private repositories)
# OR for fine-grained tokens:
# - Contents: Read
# - Metadata: Read

# GitLab token minimum scopes:
# - read_repository

# Test your token manually
git clone https://oauth2:${TOKEN}@gitlab.com/myorg/myrepo.git /tmp/test-clone
rm -rf /tmp/test-clone
```

## Best Practices

1. **Use deploy keys over personal tokens** when possible, as they are scoped to a single repository.
2. **Rotate credentials regularly** by updating secrets with new tokens.
3. **Use fine-grained tokens** with minimal permissions required for read-only access.
4. **Encrypt secrets** with SOPS or Sealed Secrets before storing in version control.
5. **Use separate credentials** for each repository or environment.
6. **Prefer ED25519 SSH keys** over RSA for better security and shorter key lengths.

## Summary

The `flux create secret git` command provides a straightforward way to configure Git authentication for Flux. Whether you are using HTTPS tokens or SSH keys, the command handles the creation of properly formatted Kubernetes secrets that Flux controllers can use to access private repositories. By following the patterns in this guide, you can securely configure Git access for your GitOps workflows across any Git provider.
