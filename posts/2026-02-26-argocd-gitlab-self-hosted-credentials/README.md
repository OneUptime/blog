# How to Configure Git Credentials for GitLab Self-Hosted in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitLab, Self-Hosted

Description: Learn how to configure ArgoCD to connect to GitLab self-hosted instances using personal access tokens, deploy tokens, SSH keys, and group-level access tokens.

---

GitLab self-hosted (also known as GitLab CE/EE) is widely used in enterprises that need control over their source code infrastructure. Connecting ArgoCD to a self-hosted GitLab instance involves handling custom domains, internal TLS certificates, and GitLab-specific authentication mechanisms. This guide covers every method you can use.

## GitLab Authentication Methods Overview

GitLab offers several authentication options, each with different trade-offs:

```mermaid
graph TD
    A[GitLab Auth Methods] --> B[Personal Access Token]
    A --> C[Deploy Token]
    A --> D[SSH Key]
    A --> E[Group Access Token]
    A --> F[Project Access Token]
    B --> B1[User-tied, broad scope]
    C --> C1[Project/group level, read-only capable]
    D --> D1[Key-based, per-repo deploy keys]
    E --> E1[Group level, bot user]
    F --> F1[Project level, bot user]
```

For ArgoCD, Deploy Tokens and Group Access Tokens are generally the best choices because they are not tied to individual user accounts.

## Method 1: Personal Access Token

Create a PAT in GitLab at User Settings > Access Tokens. Grant the `read_repository` scope.

```yaml
# gitlab-pat-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-self-hosted-pat
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.company.com
  username: argocd-user
  password: glpat-your_personal_access_token
```

Apply the credential template:

```bash
kubectl apply -f gitlab-pat-credentials.yaml
```

This covers all repositories under `https://gitlab.company.com` that the user has access to.

## Method 2: Deploy Token (Recommended for Read-Only)

Deploy tokens are ideal for ArgoCD because they can be scoped to a project or group and do not expire (or have configurable expiry). They also do not count against your license seats.

Create a deploy token at Project/Group > Settings > Repository > Deploy tokens with the `read_repository` scope.

```yaml
# gitlab-deploy-token.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-deploy-token-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.company.com/platform-team
  username: gitlab+deploy-token-42
  password: deploy-token-password-here
```

The username for deploy tokens follows the format `gitlab+deploy-token-{ID}`. GitLab shows you the exact username when you create the token.

## Method 3: Group Access Token

Group access tokens create a bot user for the group, providing authentication that is not tied to any individual:

```yaml
# gitlab-group-token.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-group-access-token
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.company.com/infrastructure
  username: group_42_bot
  password: glpat-group_access_token_value
```

Create group access tokens at Group > Settings > Access Tokens. The bot username is shown during creation.

## Method 4: Project Access Token

Similar to group tokens but scoped to a single project:

```yaml
# gitlab-project-token.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-project-token
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://gitlab.company.com/infrastructure/k8s-manifests.git
  username: project_123_bot
  password: glpat-project_access_token_value
```

## Method 5: SSH Keys

For SSH-based access, generate a key pair and add the public key as a deploy key in GitLab:

```bash
# Generate a dedicated key for ArgoCD
ssh-keygen -t ed25519 -C "argocd@company.com" -f argocd-gitlab-key -N ""

# Display the public key to add as deploy key in GitLab
cat argocd-gitlab-key.pub
```

Add the public key at Project > Settings > Repository > Deploy keys.

Configure ArgoCD:

```yaml
# gitlab-ssh-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@gitlab.company.com:infrastructure
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

Add the GitLab server's SSH host key:

```bash
# Scan the host key
ssh-keyscan -t ed25519 gitlab.company.com

# Update ArgoCD's known hosts
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml > known-hosts.yaml
```

Edit the ConfigMap to include your GitLab server's key:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    gitlab.company.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

## Handling Self-Signed TLS Certificates

Most self-hosted GitLab instances use internal CA certificates. Configure ArgoCD to trust your CA:

```yaml
# argocd-tls-certs-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  gitlab.company.com: |
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUK...
    -----END CERTIFICATE-----
```

```bash
kubectl apply -f argocd-tls-certs-cm.yaml

# Restart the repo-server to pick up the new certificates
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

If your certificate chain has intermediate certificates, include the full chain:

```yaml
data:
  gitlab.company.com: |
    -----BEGIN CERTIFICATE-----
    (intermediate cert)
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    (root CA cert)
    -----END CERTIFICATE-----
```

## GitLab Subgroups

GitLab supports nested subgroups, which affects how you structure credential templates. Each subgroup level is part of the URL path:

```yaml
# Template for a top-level group
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-infra-group
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.company.com/infrastructure
  username: group_bot
  password: glpat-token
---
# More specific template for a subgroup
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-infra-prod-subgroup
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.company.com/infrastructure/production
  username: prod-group-bot
  password: glpat-different-token
```

Repositories under `infrastructure/production/` will use the more specific credential template while other repositories under `infrastructure/` will use the broader template.

## Using the ArgoCD CLI

```bash
# Add GitLab repo with PAT via CLI
argocd repo add https://gitlab.company.com/infrastructure/k8s-manifests.git \
  --username argocd-user \
  --password glpat-your_token

# Add credential template via CLI
argocd repocreds add https://gitlab.company.com/infrastructure \
  --username group_bot \
  --password glpat-group_token

# Verify connection
argocd repo list
```

## Configuring Webhooks for Faster Sync

Instead of waiting for ArgoCD's polling interval, configure a webhook in GitLab to notify ArgoCD of pushes:

```yaml
# In argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  webhook.gitlab.secret: your-webhook-secret
```

In GitLab, go to Project > Settings > Webhooks, and add:
- URL: `https://argocd.company.com/api/webhook`
- Secret token: The same value as `webhook.gitlab.secret`
- Trigger: Push events

## Troubleshooting

### Certificate Errors

```bash
# Test TLS connectivity from the repo-server
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v https://gitlab.company.com 2>&1 | grep -i "ssl\|tls\|cert"

# Verify the CA cert is loaded
kubectl get cm argocd-tls-certs-cm -n argocd -o yaml
```

### Authentication Failures

```bash
# Check repo-server logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=100

# Test credentials manually
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://user:token@gitlab.company.com/org/repo.git
```

### Token Expiry

Deploy tokens and access tokens can be configured with expiration dates. If your ArgoCD suddenly stops syncing, check if your tokens have expired:

```bash
# Check the error message
argocd repo list

# Look for "401 Unauthorized" or "403 Forbidden" in the status
```

Set calendar reminders to rotate tokens before they expire, or use tokens without expiration dates for service accounts.

For a broader overview of repository credential management in ArgoCD, see the [repository credentials guide](https://oneuptime.com/blog/post/2026-01-25-repository-credentials-argocd/view).
