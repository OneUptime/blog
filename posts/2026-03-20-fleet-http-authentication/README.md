# How to Configure Fleet HTTP Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Authentication

Description: Learn how to configure HTTP-based authentication in Fleet for accessing private Git repositories using personal access tokens, deploy tokens, and basic credentials.

## Introduction

HTTP authentication is the simplest way to configure Fleet for accessing private Git repositories. Using HTTPS URLs with username/token credentials, you can quickly connect Fleet to GitHub, GitLab, Bitbucket, Azure DevOps, or any Git server that supports HTTP Basic Auth.

This guide covers creating credentials, storing them securely as Kubernetes secrets, and configuring GitRepo resources to use them.

## Prerequisites

- Fleet installed in Rancher
- A private Git repository
- Personal Access Token or deploy token from your Git provider
- `kubectl` access to Fleet manager

## Understanding HTTP Authentication in Fleet

Fleet uses Kubernetes secrets of type `kubernetes.io/basic-auth` to store HTTP credentials. The secret contains:
- `username`: Your Git username or token name
- `password`: Your personal access token or password

Fleet passes these credentials using HTTP Basic Authentication when cloning and pulling from the repository.

## Generating Access Tokens

### GitHub Personal Access Token (Classic)

1. Go to **GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)**
2. Click **Generate new token (classic)**
3. Add a note: `fleet-gitops-production`
4. Set expiration: 90 days or custom
5. Select scopes:
   - `repo` (for private repositories)
6. Click **Generate token**
7. **Copy the token immediately** - you won't see it again

### GitHub Fine-Grained Personal Access Token (Recommended)

1. Go to **Settings > Developer settings > Personal access tokens > Fine-grained tokens**
2. Click **Generate new token**
3. Set repository access to specific repositories
4. Set permissions: **Contents: Read-only**
5. Generate and copy the token

### GitLab Personal Access Token

1. Go to **Edit profile > Access > Personal access tokens**
2. From **Generate token**, select **Legacy token**
3. Add name: `fleet-gitops`
4. Set expiration date
5. Select scope: `read_repository`
6. Click **Create personal access token**

### GitLab Project Deploy Token

1. Navigate to **Settings > Repository > Deploy tokens**
2. Create token with `read_repository` scope
3. Note both the username and token value

### Azure DevOps Personal Access Token

1. Go to **User Settings > Personal access tokens**
2. Click **New Token**
3. Set name and expiration
4. Set scope: **Code (Read)**
5. Create and copy the token

## Creating Kubernetes Secrets for HTTP Auth

### Method 1: kubectl create secret

```bash
# GitHub Personal Access Token

kubectl create secret generic github-http-auth \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=my-github-username \
  --from-literal=password=ghp_xxxxxxxxxxxxxxxxxxxx \
  -n fleet-default

# GitLab Personal Access Token
kubectl create secret generic gitlab-http-auth \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=my-gitlab-username \
  --from-literal=password=glpat-xxxxxxxxxxxxxxxxxxxx \
  -n fleet-default

# GitLab Deploy Token (uses token-specific username)
kubectl create secret generic gitlab-deploy-token \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=gitlab+deploy-token-123456 \
  --from-literal=password=DeployTokenValue \
  -n fleet-default

# Azure DevOps (username can be any non-empty string)
kubectl create secret generic azure-devops-auth \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=fleet \
  --from-literal=password=AzureDevOpsPAT \
  -n fleet-default
```

### Method 2: YAML Secret Manifest

```yaml
# http-auth-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-http-credentials
  namespace: fleet-default
  labels:
    managed-by: fleet
# Using the standard basic-auth type
type: kubernetes.io/basic-auth
stringData:
  username: my-git-username
  # Personal access token (never commit real tokens to Git!)
  password: your-personal-access-token
```

```bash
# Apply the secret from a manifest
# (Use a values file or environment variable for the actual token)
kubectl apply -f http-auth-secret.yaml
```

## Configuring GitRepo with HTTP Authentication

```yaml
# gitrepo-http-github.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: private-app-github
  namespace: fleet-default
spec:
  # HTTPS URL for HTTP authentication
  repo: https://github.com/my-org/private-app

  branch: main

  # Reference the HTTP credentials secret
  clientSecretName: github-http-auth

  paths:
    - /

  targets:
    - clusterSelector: {}
```

```bash
kubectl apply -f gitrepo-http-github.yaml
```

### GitLab Configuration

```yaml
# gitrepo-gitlab.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: private-app-gitlab
  namespace: fleet-default
spec:
  repo: https://gitlab.com/my-group/private-app.git
  branch: main
  clientSecretName: gitlab-http-auth
  targets:
    - clusterSelector: {}
```

### Azure DevOps Configuration

```yaml
# gitrepo-azure-devops.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: private-app-azure
  namespace: fleet-default
spec:
  # Azure DevOps HTTPS URL format
  repo: https://dev.azure.com/my-org/my-project/_git/my-repo
  branch: main
  clientSecretName: azure-devops-auth
  targets:
    - clusterSelector: {}
```

## Handling TLS for Self-Hosted Git Servers

For Git servers with corporate CA certificates:

```bash
# Base64-encode the CA certificate bundle for GitRepo.spec.caBundle
cat /path/to/corporate-ca.crt | base64 -w 0
```

```yaml
# gitrepo-self-hosted.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: self-hosted-app
  namespace: fleet-default
spec:
  repo: https://git.corp.example.com/team/app.git
  branch: main
  clientSecretName: git-http-credentials

  # Provide the CA bundle as base64-encoded PEM data
  caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCg...

  targets:
    - clusterSelector: {}
```

## Rotating HTTP Credentials

```bash
# Create new PAT on your Git provider first, then update the secret
kubectl create secret generic github-http-auth \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=my-github-username \
  --from-literal=password=ghp_new_token_here \
  -n fleet-default \
  --dry-run=client -o yaml | kubectl apply -f -

# Verify Fleet picks up the new credentials
kubectl describe gitrepo private-app-github -n fleet-default
```

## Verifying HTTP Authentication

```bash
# Check the GitRepo status for authentication errors
kubectl get gitrepo private-app-github -n fleet-default -o wide

# Look for authentication-related error messages
kubectl describe gitrepo private-app-github -n fleet-default \
  | grep -i "auth\|credential\|401\|403"

# Check gitjob pod logs for HTTP auth errors
kubectl logs -n cattle-fleet-system \
  -l app=gitjob \
  | grep -i "http\|auth\|token"
```

## Conclusion

HTTP authentication with personal access tokens or deploy tokens provides a simple and effective way to secure Fleet's access to private Git repositories. By using fine-grained access tokens with read-only repository permissions, you minimize security exposure. Store all credentials as Kubernetes secrets, never embed them in GitRepo manifests or commit them to version control, and establish a regular token rotation schedule to maintain security over time.
