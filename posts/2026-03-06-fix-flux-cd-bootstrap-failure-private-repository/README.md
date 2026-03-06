# How to Fix Flux CD Bootstrap Failure on Private Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, bootstrap, private repository, gitops, kubernetes, troubleshooting, ssh, deploy keys

Description: A practical guide to resolving Flux CD bootstrap failures when working with private Git repositories, covering SSH keys, personal access tokens, and team permissions.

---

Running `flux bootstrap` against a private repository is one of the first steps in setting up GitOps, and it is also one of the most common places where things go wrong. This guide covers every failure scenario and how to fix it.

## Understanding the Bootstrap Process

When you run `flux bootstrap`, Flux performs these steps:

1. Connects to the Git repository (creating it if needed)
2. Pushes Flux component manifests to the repository
3. Applies the manifests to the cluster
4. Creates a deploy key (for SSH) or uses a token (for HTTPS) for ongoing access

Each step can fail differently with a private repository.

## Step 1: Identify the Error

Run the bootstrap command and carefully read the error output.

```bash
# SSH bootstrap (most common)
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal

# HTTPS bootstrap
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --token-auth
```

## Step 2: Fix SSH Authentication Failures

### Error: "Permission denied (publickey)"

This means SSH cannot authenticate with the Git provider.

```bash
# Verify SSH connectivity to GitHub
ssh -T git@github.com

# Verify SSH connectivity to GitLab
ssh -T git@gitlab.com

# If using a custom SSH key, specify it
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --private-key-file=/path/to/private/key \
  --personal
```

### Error: "Repository not found" with SSH

This usually means the SSH key does not have access to the repository.

```bash
# For personal repositories, use --personal flag
flux bootstrap github \
  --owner=your-username \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal

# For organization repositories, ensure the SSH key has org access
# GitHub requires SSO authorization for org-level SSH keys
```

### Specifying SSH Key Algorithm

Some Git providers require specific key algorithms:

```bash
# Use ECDSA key (recommended for GitHub)
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --ssh-key-algorithm=ecdsa \
  --ssh-ecdsa-curve=p521

# Use ED25519 key
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --ssh-key-algorithm=ed25519

# Use RSA key (older systems)
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --ssh-key-algorithm=rsa \
  --ssh-rsa-bits=4096
```

## Step 3: Fix Personal Access Token Authentication

### Error: "Authentication failed" with HTTPS

When using token-based auth, the token must have the correct scopes.

```bash
# Bootstrap with a personal access token
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --token-auth
```

### Required Token Scopes by Provider

#### GitHub (Classic Token)

```bash
# Required scopes for GitHub classic personal access tokens:
# - repo (Full control of private repositories)
#   This is the minimum required scope

# For organization repositories, also need:
# - admin:org > read:org (Read organization membership)
```

#### GitHub (Fine-Grained Token)

```bash
# Required permissions for fine-grained tokens:
# - Repository access: select the specific repository
# - Repository permissions:
#   - Contents: Read and Write
#   - Metadata: Read-only
#   - Administration: Read and Write (for deploy key creation)
```

#### GitLab

```bash
# Required scopes for GitLab personal access tokens:
# - api (Full API access)
# Or more restrictive:
# - read_repository
# - write_repository

export GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

flux bootstrap gitlab \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --token-auth
```

## Step 4: Fix Organization and Team Permission Issues

### Error: "Resource not accessible by personal access token"

This GitHub error means the token lacks organization permissions.

```bash
# For GitHub organizations using SSO:
# 1. Go to GitHub Settings > Developer settings > Personal access tokens
# 2. Click "Configure SSO" next to your token
# 3. Authorize the token for the organization

# For GitHub Apps, ensure the app is installed on the organization
# and has repository access
```

### Error: "Could not create repository"

If the bootstrap needs to create the repository:

```bash
# Ensure your account has permission to create repos in the org
# Or create the repository manually first, then bootstrap

# Step 1: Create the repo manually via GitHub CLI
gh repo create myorg/fleet-infra --private

# Step 2: Bootstrap into the existing repo
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production
```

## Step 5: Fix Deploy Key Issues During Bootstrap

### Error: "Deploy key already exists"

If a previous bootstrap attempt left a deploy key:

```bash
# Remove existing deploy keys from the repository
# GitHub: Settings > Deploy keys > Delete

# Then retry bootstrap
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production
```

### Providing Your Own Deploy Key

Instead of letting Flux generate a key, provide your own:

```bash
# Generate an SSH key pair
ssh-keygen -t ecdsa -b 521 -f flux-deploy-key -N ""

# Add the public key to your repository as a deploy key with WRITE access
# GitHub: Settings > Deploy keys > Add deploy key > Allow write access

# Bootstrap with the private key
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --private-key-file=./flux-deploy-key
```

## Step 6: Fix Self-Hosted Git Provider Issues

For GitHub Enterprise, GitLab self-managed, or Gitea:

```bash
# GitHub Enterprise
flux bootstrap github \
  --hostname=github.mycompany.com \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production

# GitLab self-managed
flux bootstrap gitlab \
  --hostname=gitlab.mycompany.com \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --token-auth

# Gitea
flux bootstrap git \
  --url=ssh://git@gitea.mycompany.com/myorg/fleet-infra.git \
  --branch=main \
  --path=clusters/production
```

### Custom SSH Known Hosts

For self-hosted providers, you may need custom SSH known hosts:

```bash
# Scan the SSH host key
ssh-keyscan github.mycompany.com > known_hosts

# Bootstrap with custom known hosts
flux bootstrap github \
  --hostname=github.mycompany.com \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --ssh-hostname=github.mycompany.com
```

## Step 7: Fix Cluster-Side Bootstrap Failures

Sometimes the Git authentication works but the cluster-side installation fails.

```bash
# Check Flux component status after bootstrap
flux check

# If components are not ready, check the pods
kubectl get pods -n flux-system

# Check source-controller logs for Git access issues
kubectl logs -n flux-system deployment/source-controller

# Verify the GitRepository source is healthy
kubectl get gitrepositories -n flux-system
```

### Fix: Recreate the Git Secret

If the bootstrap partially succeeded but the Git secret is wrong:

```bash
# Delete the existing secret
kubectl delete secret flux-system -n flux-system

# Recreate it with SSH
flux create secret git flux-system \
  --url=ssh://git@github.com/myorg/fleet-infra \
  --ssh-key-algorithm=ecdsa \
  --ssh-ecdsa-curve=p521

# Or recreate with HTTPS token
flux create secret git flux-system \
  --url=https://github.com/myorg/fleet-infra \
  --username=git \
  --password=${GITHUB_TOKEN}

# Reconcile to pick up the new secret
flux reconcile source git flux-system
```

## Step 8: Bootstrap with Existing Repository Content

If the repository already has content and you do not want Flux to overwrite it:

```bash
# Use --path to isolate Flux manifests in a subdirectory
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production

# This writes Flux manifests ONLY to clusters/production/flux-system/
# and does not modify other files in the repository
```

## Step 9: Full Debugging Checklist

```bash
# 1. Verify Git provider connectivity
ssh -T git@github.com
# or
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# 2. Check token/key permissions
# GitHub: Settings > Developer settings > Personal access tokens
# Verify "repo" scope is present

# 3. Check organization access
# GitHub: Token > Configure SSO > Authorize for organization

# 4. Verify repository exists and is accessible
gh repo view myorg/fleet-infra

# 5. Check for existing deploy keys
gh repo deploy-key list -R myorg/fleet-infra

# 6. Run bootstrap with verbose output
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --log-level=debug

# 7. Check cluster state after partial bootstrap
flux check
kubectl get pods -n flux-system
kubectl get gitrepositories -n flux-system
```

## Summary

Flux CD bootstrap failures on private repositories come down to these root causes:

- **SSH key not authorized** - key missing from repository deploy keys or not SSO-authorized
- **Token missing required scopes** - needs `repo` scope for GitHub classic tokens
- **Organization permissions** - token not authorized for SSO-protected organizations
- **Self-hosted provider** - need to specify `--hostname` and possibly custom SSH known hosts
- **Deploy key conflicts** - leftover keys from previous bootstrap attempts

Always use `--log-level=debug` on the bootstrap command to get the most detailed error information.
