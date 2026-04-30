# How to Set Up Fleet with Private Git Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Authentication

Description: Learn how to configure Fleet to access private Git repositories using SSH keys, HTTP credentials, or deploy tokens for secure GitOps deployments.

## Introduction

Most production Git repositories are private and require authentication to access. Fleet supports multiple authentication methods for private repositories, including SSH auth keys, HTTP basic authentication, and GitHub Apps. This guide focuses on the most common secret-based approaches and a GitLab deploy token example for secure GitOps deployments in Fleet.

## Prerequisites

- Fleet installed in Rancher
- A private Git repository (GitHub, GitLab, Bitbucket, or self-hosted)
- `kubectl` access to Fleet manager
- SSH key pair or HTTP credentials

## Authentication Methods Overview

This guide covers three common ways to supply credentials to Fleet:

1. **SSH Key Authentication**: Uses an SSH key pair (recommended for production)
2. **HTTP Basic Authentication**: Uses username and password/token
3. **GitLab Deploy Tokens**: Provider-specific HTTP credentials that can be scoped for read-only repository access

## Method 1: SSH Key Authentication

### Step 1: Generate an SSH Key Pair

```bash
# Generate a new RSA SSH key pair in PEM format for Fleet

ssh-keygen -t rsa -b 4096 -m PEM \
  -C "fleet-gitops@example.com" \
  -f ~/.ssh/fleet_gitops_key \
  -N ""  # No passphrase (Fleet does not support passphrase-protected keys)

# View the public key to add to Git provider
cat ~/.ssh/fleet_gitops_key.pub
```

### Step 2: Add the Public Key to Your Repository

**GitHub:**
1. Go to repository **Settings > Deploy keys**
2. Click **Add deploy key**
3. Paste the public key content
4. Enable **Allow write access** only if Fleet needs to write back to the repo

**GitLab:**
1. Go to **Repository > Settings > Repository > Deploy keys**
2. Add the public key

**Bitbucket:**
1. Go to **Repository settings > Access keys**
2. Add the public key

### Step 3: Create the Kubernetes Secret

```bash
# Create a secret with the SSH private key
kubectl create secret generic git-ssh-auth \
  --from-file=ssh-privatekey=~/.ssh/fleet_gitops_key \
  --type=kubernetes.io/ssh-auth \
  -n fleet-default

# Verify the secret was created
kubectl get secret git-ssh-auth -n fleet-default
```

### Step 4: Configure the GitRepo to Use SSH

```yaml
# gitrepo-ssh-auth.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: private-app
  namespace: fleet-default
spec:
  # Use SSH URL format (not HTTPS)
  repo: git@github.com:my-org/private-app.git
  branch: main

  # Reference the SSH key secret
  clientSecretName: git-ssh-auth

  targets:
    - clusterSelector: {}
```

```bash
kubectl apply -f gitrepo-ssh-auth.yaml
```

## Method 2: HTTP Basic Authentication

### Using Personal Access Token (Recommended)

```bash
# Create secret with username and token
kubectl create secret generic git-http-credentials \
  --from-literal=username=my-username \
  --from-literal=password=your_personal_access_token \
  --type=kubernetes.io/basic-auth \
  -n fleet-default
```

### Using the Fleet Secret Format

```yaml
# git-http-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-http-credentials
  namespace: fleet-default
type: kubernetes.io/basic-auth
stringData:
  # GitHub username
  username: my-github-username
  # GitHub token with read access to the repository
  password: your_personal_access_token
```

```bash
kubectl apply -f git-http-secret.yaml
```

### Configure GitRepo with HTTP Auth

```yaml
# gitrepo-http-auth.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: private-app-http
  namespace: fleet-default
spec:
  # HTTPS URL for HTTP authentication
  repo: https://github.com/my-org/private-app
  branch: main

  # Reference the HTTP credentials secret
  clientSecretName: git-http-credentials

  targets:
    - clusterSelector: {}
```

## Method 3: GitLab Deploy Token over HTTPS

```bash
# GitLab deploy tokens authenticate over HTTPS using username/token
kubectl create secret generic gitlab-deploy-token \
  --from-literal=username=gitlab+deploy-token-12345 \
  --from-literal=password=your-gitlab-deploy-token \
  --type=kubernetes.io/basic-auth \
  -n fleet-default
```

```yaml
# gitrepo-gitlab.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: gitlab-private-app
  namespace: fleet-default
spec:
  repo: https://gitlab.com/my-org/private-app.git
  branch: main
  clientSecretName: gitlab-deploy-token
  targets:
    - clusterSelector: {}
```

## Handling Self-Signed Certificates

For self-hosted Git servers with self-signed TLS certificates:

```yaml
# gitrepo-self-signed.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: self-hosted-app
  namespace: fleet-default
spec:
  repo: https://git.internal.example.com/my-org/app.git
  branch: main
  clientSecretName: git-credentials

  # Base64-encoded PEM CA bundle for the Git server certificate
  caBundle: <base64-encoded-ca-pem>

  # Keep TLS verification enabled when providing a CA bundle
  insecureSkipTLSVerify: false

  targets:
    - clusterSelector: {}
```

```bash
# Base64-encode the CA certificate for use in spec.caBundle
base64 < ca.crt | tr -d '\n'
```

## Using Rancher UI for Private Repo Authentication

1. Navigate to **Continuous Delivery > Git Repos**
2. Click **Add Repository**
3. Enter the repository URL
4. Under **Authentication**, choose the type:
   - **SSH**: Paste your private key
   - **HTTP**: Enter username and token
5. Rancher will create the secret automatically

## Rotating Credentials

```bash
# Update SSH key secret with new private key
kubectl create secret generic git-ssh-auth \
  --from-file=ssh-privatekey=~/.ssh/new_fleet_key \
  --type=kubernetes.io/ssh-auth \
  -n fleet-default \
  --dry-run=client -o yaml | kubectl apply -f -

# Force Fleet to re-sync with new credentials
CURRENT=$(kubectl get gitrepo private-app -n fleet-default -o jsonpath='{.spec.forceSyncGeneration}')
CURRENT=${CURRENT:-0}
kubectl patch gitrepo private-app \
  -n fleet-default \
  --type=merge \
  -p "{\"spec\":{\"forceSyncGeneration\":$((CURRENT + 1))}}"
```

## Verifying Authentication

```bash
# Check if Fleet can access the repository
kubectl describe gitrepo private-app -n fleet-default

# Inspect recent events in the GitRepo namespace
kubectl get events -n fleet-default --sort-by='.lastTimestamp'

# Check gitjob logs for authentication issues
kubectl logs -n cattle-fleet-system \
  -l app=gitjob \
  | grep -i "auth\|credential\|permission"
```

## Conclusion

Properly configuring authentication for private Git repositories is essential for production Fleet deployments. SSH key authentication provides the best security profile with deploy keys that offer read-only access to specific repositories. For environments using HTTPS, Personal Access Tokens with minimal scopes are the recommended approach. Whichever method you choose, always store credentials as Kubernetes secrets, rotate them regularly, and never embed sensitive values directly in GitRepo manifests.
