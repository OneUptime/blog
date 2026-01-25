# How to Configure Repository Credentials in ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Git, Credentials, SSH, HTTPS, Security, Authentication

Description: Learn how to configure ArgoCD to access Git repositories using SSH keys, HTTPS credentials, GitHub Apps, and credential templates for secure and scalable repository management.

---

ArgoCD needs access to your Git repositories to fetch manifests and track changes. Whether your repos are public, private, or behind corporate firewalls, there is a way to configure access. This guide covers all authentication methods from simple HTTPS to enterprise GitHub Apps.

## Repository Authentication Methods

ArgoCD supports multiple authentication methods:

```mermaid
flowchart TB
    ArgoCD[ArgoCD] --> HTTPS[HTTPS + Token]
    ArgoCD --> SSH[SSH Keys]
    ArgoCD --> GHA[GitHub App]
    ArgoCD --> Template[Credential Template]

    HTTPS --> Private1[Private Repo]
    SSH --> Private2[Private Repo]
    GHA --> Private3[GitHub Repo]
    Template --> Multiple[Multiple Repos]
```

## HTTPS with Username and Password

The simplest method uses a personal access token or app password.

### Using the CLI

```bash
argocd repo add https://github.com/myorg/myrepo.git \
  --username your-username \
  --password ghp_xxxxxxxxxxxx
```

### Using a Kubernetes Secret

```yaml
# repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: myrepo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/myrepo.git
  username: your-username
  password: ghp_xxxxxxxxxxxx
```

Apply the secret:

```bash
kubectl apply -f repo-secret.yaml
```

### GitHub Personal Access Token

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with `repo` scope
3. Use the token as the password

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/private-repo.git
  username: git
  password: ghp_your_personal_access_token
```

## SSH Key Authentication

SSH is more secure and does not require storing passwords.

### Generate an SSH Key

```bash
# Generate a new ED25519 key
ssh-keygen -t ed25519 -C "argocd@myorg.com" -f argocd-key -N ""

# Or RSA for older systems
ssh-keygen -t rsa -b 4096 -C "argocd@myorg.com" -f argocd-key -N ""
```

### Add the Public Key to Your Git Provider

For GitHub:
1. Go to Repository Settings > Deploy keys
2. Add the contents of `argocd-key.pub`
3. Enable write access if ArgoCD needs to write back

### Configure ArgoCD with SSH

Using the CLI:

```bash
argocd repo add git@github.com:myorg/myrepo.git \
  --ssh-private-key-path ./argocd-key
```

Using a Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@github.com:myorg/myrepo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA...
    -----END OPENSSH PRIVATE KEY-----
```

### Known Hosts

ArgoCD validates SSH host keys. Add trusted hosts:

```bash
# Get GitHub's host key
ssh-keyscan github.com >> known_hosts

# Add to ArgoCD ConfigMap
kubectl edit configmap argocd-ssh-known-hosts-cm -n argocd
```

Or include in the secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@github.com:myorg/myrepo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
  # Skip host key verification (not recommended for production)
  insecure: "true"
```

## GitHub App Authentication

GitHub Apps provide fine-grained permissions and better audit trails.

### Create a GitHub App

1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Create a new app with these permissions:
   - Repository contents: Read
   - Metadata: Read
3. Generate a private key
4. Install the app on your organization/repositories
5. Note the App ID and Installation ID

### Configure ArgoCD

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/myrepo.git
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
```

## Credential Templates

Configure credentials once for multiple repositories matching a pattern.

### URL Pattern Matching

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-creds
  namespace: argocd
  labels:
    # Note: credential template, not repository
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  # Pattern matches all repos in the org
  url: https://github.com/myorg
  username: git
  password: ghp_xxxxxxxxxxxx
```

Now any repository under `https://github.com/myorg/` will use these credentials automatically.

### SSH Credential Template

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:myorg
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

### Multiple Credential Templates

```yaml
# For GitHub org
apiVersion: v1
kind: Secret
metadata:
  name: github-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/myorg
  username: git
  password: ghp_github_token

---
# For GitLab group
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.com/mygroup
  username: oauth2
  password: glpat_gitlab_token

---
# For self-hosted Gitea
apiVersion: v1
kind: Secret
metadata:
  name: gitea-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://git.internal.example.com
  username: argocd-service
  password: gitea_access_token
```

## Helm Repository Credentials

For private Helm repositories:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: my-charts
  url: https://charts.example.com
  username: admin
  password: secret
```

### OCI Registry for Helm

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: oci-helm-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: ghcr-charts
  url: ghcr.io/myorg/charts
  enableOCI: "true"
  username: myuser
  password: ghp_token
```

## TLS Certificates

For repositories with custom CA certificates:

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
  url: https://git.internal.example.com/myrepo.git
  username: argocd
  password: token
  tlsClientCertData: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  tlsClientCertKey: |
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
```

Or add custom CA to the trust store:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  git.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
```

## Managing Credentials

### List Repositories

```bash
argocd repo list
```

### Remove a Repository

```bash
argocd repo rm https://github.com/myorg/myrepo.git
```

### Update Credentials

Delete and recreate the secret:

```bash
kubectl delete secret myrepo-creds -n argocd
kubectl apply -f repo-secret.yaml
```

## Troubleshooting

### Connection Test

```bash
# Test repository connection
argocd repo add https://github.com/myorg/myrepo.git \
  --username git \
  --password token \
  --dry-run
```

### Check Repo Server Logs

```bash
kubectl logs -n argocd deployment/argocd-repo-server
```

### Common Issues

**Authentication failed:**
- Verify token has correct scopes
- Check username is correct (often `git` or `oauth2`)
- Ensure URL matches exactly

**SSH host key verification failed:**
- Add host to known_hosts ConfigMap
- Or set `insecure: "true"` (not recommended)

**SSL certificate problem:**
- Add custom CA to ConfigMap
- Or set `insecure: "true"` for testing

```bash
# Debug SSL issues
curl -v https://git.internal.example.com
```

## Best Practices

### Use Credential Templates

Instead of per-repo credentials:

```yaml
# Good: one template for all org repos
url: https://github.com/myorg

# Avoid: credentials per repo
# url: https://github.com/myorg/repo1
# url: https://github.com/myorg/repo2
```

### Rotate Credentials Regularly

```bash
# Script to rotate tokens
for secret in $(kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repo-creds -o name); do
  # Update with new token
  kubectl patch $secret -n argocd --type='json' -p='[{"op":"replace","path":"/stringData/password","value":"new-token"}]'
done
```

### Use Least Privilege

- GitHub tokens: only `repo` scope needed
- Deploy keys: read-only unless write-back needed
- GitHub Apps: minimal permissions

### Seal Your Secrets

Use Sealed Secrets or External Secrets Operator:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: repo-creds
  namespace: argocd
spec:
  encryptedData:
    password: AgBy3i4OJSWK+...
```

Repository credentials are the keys to your GitOps workflow. Start with credential templates for easier management, use SSH or GitHub Apps for better security, and rotate credentials regularly to limit exposure from compromised tokens.
