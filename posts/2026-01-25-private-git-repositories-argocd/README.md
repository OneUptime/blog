# How to Use Private Git Repositories with ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Git, Private Repositories, Security, SSH, HTTPS, GitOps

Description: A practical guide to connecting ArgoCD with private Git repositories on GitHub, GitLab, Bitbucket, and self-hosted Git servers using various authentication methods.

---

Most production ArgoCD setups work with private repositories. Your Kubernetes manifests contain configuration details you do not want public. This guide shows you how to connect ArgoCD to private repos across different Git providers and authentication scenarios.

## Overview of Authentication Methods

Different Git providers support different authentication methods:

| Provider | HTTPS Token | SSH Key | Deploy Key | OAuth App | GitHub App |
|----------|------------|---------|------------|-----------|------------|
| GitHub | Yes | Yes | Yes | Yes | Yes |
| GitLab | Yes | Yes | Yes | Yes | No |
| Bitbucket | Yes | Yes | Yes | Yes | No |
| Azure DevOps | Yes | Yes | No | Yes | No |
| Self-hosted | Yes | Yes | Yes | Depends | No |

## GitHub Private Repositories

### Method 1: Personal Access Token (Fine-grained)

GitHub's fine-grained tokens offer the best security:

1. Go to Settings > Developer settings > Personal access tokens > Fine-grained tokens
2. Create a new token with:
   - Resource owner: Your organization
   - Repository access: Only select repositories
   - Permissions: Contents (Read-only)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/private-repo.git
  username: x-access-token
  password: github_pat_xxxxxxxxxxxx
```

### Method 2: Deploy Keys (Repository-specific SSH)

Deploy keys are SSH keys limited to a single repository:

```bash
# Generate a key for this specific repo
ssh-keygen -t ed25519 -C "argocd-myrepo" -f deploy-key -N ""
```

Add the public key to GitHub:
1. Go to Repository > Settings > Deploy keys
2. Add the contents of `deploy-key.pub`
3. Do not enable write access unless needed

Configure ArgoCD:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-deploy-key
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@github.com:myorg/private-repo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

### Method 3: GitHub App (Organization-wide)

Best for organizations with many repositories:

1. Create a GitHub App at your organization settings
2. Permissions needed: Contents (Read-only)
3. Generate and download a private key
4. Install the app on selected repositories

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/private-repo.git
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

## GitLab Private Repositories

### Project Access Token

Create a project access token with `read_repository` scope:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://gitlab.com/mygroup/myproject.git
  username: oauth2
  password: glpat_xxxxxxxxxxxx
```

### Group Access Token

For multiple repositories in a group:

```yaml
# Credential template for all repos in the group
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-group-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.com/mygroup
  username: oauth2
  password: glpat_group_token
```

### GitLab Deploy Token

1. Go to Repository > Settings > Repository > Deploy Tokens
2. Create a token with `read_repository` scope

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-deploy-token
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://gitlab.com/mygroup/myproject.git
  username: gitlab+deploy-token-123456
  password: token_value
```

## Bitbucket Private Repositories

### App Password

Create an app password in Bitbucket settings:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://bitbucket.org/myworkspace/myrepo.git
  username: your-username
  password: app_password_here
```

### SSH Key

Add SSH key to your Bitbucket account settings:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@bitbucket.org:myworkspace/myrepo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

## Azure DevOps Repositories

### Personal Access Token

1. Go to User Settings > Personal Access Tokens
2. Create a token with Code (Read) scope

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-devops-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://dev.azure.com/myorg/myproject/_git/myrepo
  username: azure
  password: pat_token_here
```

### SSH Authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-devops-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@ssh.dev.azure.com:v3/myorg/myproject/myrepo
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

## Self-Hosted Git Servers

### Gitea/Gogs

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitea-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://git.internal.example.com/myorg/myrepo.git
  username: argocd-service
  password: access_token
```

### Custom SSL Certificates

For self-signed certificates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  git.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAJC1...
    -----END CERTIFICATE-----
```

Or disable TLS verification (not recommended):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: internal-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://git.internal.example.com/myorg/myrepo.git
  username: argocd
  password: token
  insecure: "true"
```

## SSH Known Hosts

ArgoCD validates SSH host keys by default. Add your Git server's host key:

```bash
# Get host keys
ssh-keyscan github.com >> known_hosts
ssh-keyscan gitlab.com >> known_hosts
ssh-keyscan git.internal.example.com >> known_hosts
```

Update the ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
    gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
    git.internal.example.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...
```

## Credential Templates for Multiple Repos

Configure credentials once for all repositories matching a pattern:

```yaml
# All GitHub org repos
apiVersion: v1
kind: Secret
metadata:
  name: github-org
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/myorg
  username: x-access-token
  password: github_pat_xxxx

---
# All internal Git repos
apiVersion: v1
kind: Secret
metadata:
  name: internal-git
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://git.internal.example.com
  username: argocd
  password: internal_token
```

## Testing Repository Access

### Using the CLI

```bash
# Test HTTPS connection
argocd repo add https://github.com/myorg/private-repo.git \
  --username x-access-token \
  --password ghp_xxxx

# Test SSH connection
argocd repo add git@github.com:myorg/private-repo.git \
  --ssh-private-key-path ./deploy-key
```

### Debugging Connection Issues

```bash
# Check repo server logs
kubectl logs -n argocd deployment/argocd-repo-server

# List configured repositories
argocd repo list

# Get repository details
argocd repo get https://github.com/myorg/private-repo.git
```

## Best Practices

### Use Credential Templates

```yaml
# Instead of per-repo secrets
argocd.argoproj.io/secret-type: repo-creds  # Template for URL prefix
```

### Limit Token Scope

- Use fine-grained tokens when available
- Read-only access is usually sufficient
- Scope to specific repositories

### Rotate Credentials

Set up a rotation schedule:

```bash
#!/bin/bash
# Rotate GitHub PAT quarterly
kubectl create secret generic github-creds \
  --from-literal=password="$NEW_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Separate Service Accounts

Create dedicated service accounts for ArgoCD, not personal tokens:

```yaml
# GitHub App or machine user, not personal PAT
username: argocd-service
password: service_account_token
```

Working with private repositories is straightforward once you understand the authentication options. Use credential templates for organizations with many repos, rotate tokens regularly, and always prefer least-privilege access. The extra setup effort pays off in security and maintainability.
