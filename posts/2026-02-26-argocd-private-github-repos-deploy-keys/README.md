# How to Use ArgoCD with Private GitHub Repos Using Deploy Keys

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitHub, SSH Deploy Keys

Description: Learn how to configure ArgoCD to access private GitHub repositories using SSH deploy keys, including key generation, repository registration, and security best practices.

---

Deploy keys are SSH keys that grant read-only access to a single GitHub repository. Unlike personal access tokens (which grant access to all of a user's repositories) or GitHub App tokens, deploy keys are scoped to exactly one repository. This makes them the most secure option for connecting ArgoCD to private GitHub repos when you follow the principle of least privilege. This guide walks through the complete setup process.

## Why Deploy Keys Over Other Methods

ArgoCD supports multiple authentication methods for private repositories: HTTPS with tokens, SSH with user keys, SSH with deploy keys, and GitHub Apps. Each has different security characteristics.

| Method | Scope | Rotation | Security |
|--------|-------|----------|----------|
| Personal Access Token | All user repos | Manual | Low - broad access |
| SSH User Key | All user repos | Manual | Low - broad access |
| SSH Deploy Key | Single repo | Manual | High - minimal access |
| GitHub App | Org-configured repos | Automatic | High - scoped access |

Deploy keys are ideal when you need access to a specific repository and want to limit the blast radius if the key is compromised.

## Step 1: Generate an SSH Key Pair

Generate a dedicated SSH key pair for each repository. Never reuse keys across repositories.

```bash
# Generate an Ed25519 key pair (recommended)
ssh-keygen -t ed25519 -C "argocd-deploy-key-my-repo" -f /tmp/argocd-deploy-key -N ""

# This creates two files:
# /tmp/argocd-deploy-key (private key)
# /tmp/argocd-deploy-key.pub (public key)

# View the public key (you'll add this to GitHub)
cat /tmp/argocd-deploy-key.pub
```

Use Ed25519 keys instead of RSA. They are smaller, faster, and more secure. If your Git server requires RSA for compatibility, use at least 4096 bits.

```bash
# RSA fallback (only if Ed25519 is not supported)
ssh-keygen -t rsa -b 4096 -C "argocd-deploy-key-my-repo" -f /tmp/argocd-deploy-key -N ""
```

## Step 2: Add the Deploy Key to GitHub

Add the public key to your GitHub repository as a deploy key.

```bash
# Using the GitHub CLI
gh repo deploy-key add /tmp/argocd-deploy-key.pub \
  --repo org/my-repo \
  --title "ArgoCD Deploy Key"

# The key is read-only by default, which is what ArgoCD needs
# Do NOT enable write access unless you have a specific reason
```

Alternatively, add the key through the GitHub UI.

1. Go to your repository on GitHub
2. Navigate to Settings, then Deploy keys
3. Click "Add deploy key"
4. Paste the contents of `/tmp/argocd-deploy-key.pub`
5. Give it a descriptive title like "ArgoCD Deploy Key - Production"
6. Leave "Allow write access" unchecked
7. Click "Add key"

## Step 3: Register the Repository in ArgoCD

Now tell ArgoCD about the repository and its SSH key.

### Using the ArgoCD CLI

```bash
# Add the repository with the private key
argocd repo add git@github.com:org/my-repo.git \
  --ssh-private-key-path /tmp/argocd-deploy-key \
  --name my-repo

# Verify the connection
argocd repo list
argocd repo get git@github.com:org/my-repo.git
```

### Using a Kubernetes Secret (Declarative)

For a GitOps-friendly approach, create the repository secret declaratively.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-my-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: git@github.com:org/my-repo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-private-key-content-here>
    -----END OPENSSH PRIVATE KEY-----
```

```bash
# Apply the secret
kubectl apply -f repo-secret.yaml

# Verify the repository is connected
argocd repo list
```

**Important:** Never commit the Secret with the actual private key to Git. Use a secrets management solution like Sealed Secrets, External Secrets Operator, or Vault.

```bash
# Using Sealed Secrets
kubeseal --format yaml < repo-secret.yaml > repo-secret-sealed.yaml
# Now repo-secret-sealed.yaml is safe to commit to Git
```

### Using External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: repo-my-repo
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: repo-my-repo
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: git
        url: git@github.com:org/my-repo.git
        sshPrivateKey: "{{ .sshKey }}"
  data:
  - secretKey: sshKey
    remoteRef:
      key: argocd/deploy-keys/my-repo
      property: privateKey
```

## Step 4: Configure SSH Known Hosts

ArgoCD verifies the SSH host key to prevent man-in-the-middle attacks. GitHub's SSH host key should be added to ArgoCD's known hosts.

```bash
# ArgoCD ships with GitHub's host keys by default
# Verify they are present
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml | grep github.com

# If missing, add GitHub's SSH host keys
ssh-keyscan github.com 2>/dev/null | kubectl -n argocd create configmap argocd-ssh-known-hosts-cm --from-file=ssh_known_hosts=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -
```

For GitHub Enterprise or self-hosted Git servers, add the host key manually.

```bash
# Scan and add the host key
ssh-keyscan git.internal.example.com >> /tmp/known_hosts

# Update the ConfigMap
kubectl create configmap argocd-ssh-known-hosts-cm -n argocd \
  --from-file=ssh_known_hosts=/tmp/known_hosts \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 5: Create an Application Using the Private Repo

Now create an ArgoCD Application that references the private repository.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-private-app
  namespace: argocd
spec:
  project: default
  source:
    # Use the SSH URL format
    repoURL: git@github.com:org/my-repo.git
    path: kubernetes/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

```bash
# Apply and verify
kubectl apply -f application.yaml
argocd app get my-private-app
```

## Managing Multiple Private Repos

When you have many private repositories, managing individual deploy keys becomes tedious. Here are some strategies.

### Credential Templates

ArgoCD supports credential templates that match multiple repositories by URL pattern.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: git@github.com:org/
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-org-wide-ssh-key>
    -----END OPENSSH PRIVATE KEY-----
```

With this credential template, any repository matching `git@github.com:org/` will use the provided SSH key. However, this requires a single key with access to all matching repositories, which means you cannot use deploy keys (they are per-repo). You would need an SSH key associated with a machine user that has access to the org.

### Per-Repo Deploy Keys with Automation

For better security, automate deploy key management.

```bash
#!/bin/bash
# Script to set up a deploy key for a new repo

REPO=$1  # e.g., org/my-new-repo
KEY_NAME="argocd-$(echo $REPO | tr '/' '-')"

# Generate key
ssh-keygen -t ed25519 -C "$KEY_NAME" -f "/tmp/$KEY_NAME" -N ""

# Add to GitHub
gh repo deploy-key add "/tmp/$KEY_NAME.pub" --repo "$REPO" --title "ArgoCD"

# Add to ArgoCD
argocd repo add "git@github.com:$REPO.git" \
  --ssh-private-key-path "/tmp/$KEY_NAME"

# Clean up local key files
rm "/tmp/$KEY_NAME" "/tmp/$KEY_NAME.pub"

echo "Deploy key configured for $REPO"
```

## Troubleshooting

### Permission Denied (publickey)

```bash
# Verify the key is registered in ArgoCD
argocd repo list
argocd repo get git@github.com:org/my-repo.git

# Test SSH connectivity from the repo server
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -T -i /tmp/test-key git@github.com 2>&1

# Common causes:
# 1. Wrong private key in the ArgoCD secret
# 2. Deploy key not added to the correct repo
# 3. SSH known hosts not configured
```

### Host Key Verification Failed

```bash
# Check known hosts
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml

# Add the missing host key
ssh-keyscan github.com 2>/dev/null >> /tmp/known_hosts
kubectl create configmap argocd-ssh-known-hosts-cm -n argocd \
  --from-file=ssh_known_hosts=/tmp/known_hosts \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart repo server
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

### Using HTTPS URL Instead of SSH

A common mistake is using the HTTPS URL with an SSH key.

```yaml
# Wrong: HTTPS URL with SSH credentials
repoURL: https://github.com/org/my-repo.git

# Correct: SSH URL with SSH credentials
repoURL: git@github.com:org/my-repo.git
```

## Security Best Practices

1. **One key per repository** - never share deploy keys across repositories
2. **Read-only access** - do not enable write access unless required
3. **Use Ed25519** - stronger and smaller than RSA
4. **Store keys in a secrets manager** - never commit private keys to Git
5. **Rotate keys periodically** - generate new keys on a schedule (quarterly or yearly)
6. **Audit key access** - regularly review which deploy keys are active on each repository
7. **Remove unused keys** - when decommissioning an application, remove its deploy key

## Summary

Deploy keys are the most secure option for connecting ArgoCD to individual private GitHub repositories. Generate an Ed25519 key pair, add the public key to GitHub as a read-only deploy key, register the private key in ArgoCD, and ensure SSH known hosts are configured. Use Sealed Secrets or External Secrets Operator to manage the private keys in a GitOps-friendly way. For organizations with many repos, consider credential templates with a machine user key as a practical middle ground.
