# How to Configure GitRepository with HTTPS Authentication in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Source Controller, GitRepository, HTTPS, Authentication

Description: Learn how to configure Flux CD GitRepository sources to authenticate with private Git repositories using HTTPS credentials and personal access tokens.

---

## Introduction

HTTPS authentication is one of the simplest ways to grant Flux CD access to private Git repositories. Instead of managing SSH key pairs, you provide a username and a personal access token (PAT) stored in a Kubernetes Secret. The Flux Source Controller uses these credentials when cloning and fetching from the repository.

This guide covers creating a personal access token, storing it in a Kubernetes Secret, configuring the GitRepository resource, and handling self-signed TLS certificates.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and the `flux` CLI installed locally
- Access to a private Git repository
- A personal access token or service account token from your Git provider

## Step 1: Create a Personal Access Token

Each Git provider has its own process for generating tokens. The token needs read access to the repository contents.

**GitHub**: Go to **Settings > Developer settings > Personal access tokens > Fine-grained tokens**. Create a token with **Contents: Read-only** permission scoped to the specific repository.

**GitLab**: Go to **Settings > Access Tokens**. Create a token with the `read_repository` scope.

**Bitbucket**: Go to **Personal settings > App passwords**. Create a password with **Repositories: Read** permission.

Store the token securely. You will need it in the next step.

## Step 2: Create the Kubernetes Secret

Create a Secret in the `flux-system` namespace containing your username and token. Flux expects the keys `username` and `password` in the Secret data.

```bash
# Create the HTTPS authentication Secret
kubectl create secret generic my-app-git-https \
  --namespace=flux-system \
  --from-literal=username=my-github-username \
  --from-literal=password=ghp_YOUR_PERSONAL_ACCESS_TOKEN
```

For GitHub, the username can be any non-empty string when using a fine-grained PAT, but it is conventional to use your GitHub username. For GitLab, use `oauth2` as the username when using a project or personal access token.

You can also use the Flux CLI to create the Secret.

```bash
# Use the Flux CLI to create the HTTPS Secret
flux create secret git my-app-git-https \
  --namespace=flux-system \
  --url=https://github.com/my-org/my-app \
  --username=my-github-username \
  --password=ghp_YOUR_PERSONAL_ACCESS_TOKEN
```

Here is the equivalent declarative YAML manifest.

```yaml
# git-https-secret.yaml - HTTPS authentication Secret
apiVersion: v1
kind: Secret
metadata:
  name: my-app-git-https
  namespace: flux-system
type: Opaque
stringData:
  # Your Git provider username
  username: my-github-username
  # Your personal access token
  password: ghp_YOUR_PERSONAL_ACCESS_TOKEN
```

## Step 3: Configure the GitRepository Resource

Create a GitRepository resource that references the Secret. The URL must use the HTTPS protocol.

```yaml
# gitrepository-https.yaml - GitRepository with HTTPS authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # HTTPS URL of the private repository
  url: https://github.com/my-org/my-app
  ref:
    branch: main
  # Reference the Secret containing HTTPS credentials
  secretRef:
    name: my-app-git-https
```

Apply the manifest to your cluster.

```bash
# Apply the GitRepository resource
kubectl apply -f gitrepository-https.yaml
```

## Step 4: Verify the Configuration

Check that the GitRepository reconciles successfully.

```bash
# Check the status of the GitRepository
flux get sources git my-app -n flux-system
```

You should see the resource in a ready state with an artifact revision.

```bash
# Get events related to the GitRepository
kubectl events -n flux-system --for gitrepository/my-app
```

## Handling Self-Signed TLS Certificates

If your Git server uses a self-signed certificate or an internal certificate authority, Flux will fail to connect by default because the certificate cannot be verified. You can provide the CA certificate to Flux through the same Secret or a separate one.

First, add the CA certificate to the Secret.

```bash
# Create a Secret with HTTPS credentials and a custom CA certificate
kubectl create secret generic my-app-git-https \
  --namespace=flux-system \
  --from-literal=username=my-username \
  --from-literal=password=my-token \
  --from-file=caFile=./ca-cert.pem
```

The GitRepository manifest remains the same. The Source Controller automatically picks up the `caFile` field from the referenced Secret.

```yaml
# gitrepository-self-signed.yaml - GitRepository with self-signed cert support
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.example.com/my-org/my-app
  ref:
    branch: main
  secretRef:
    name: my-app-git-https
```

## Provider-Specific Configurations

Different Git providers use slightly different credential formats. Here are examples for the most common providers.

### GitHub

```yaml
# GitHub HTTPS Secret
apiVersion: v1
kind: Secret
metadata:
  name: github-https
  namespace: flux-system
type: Opaque
stringData:
  username: my-github-user
  # Use a fine-grained personal access token
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### GitLab

```yaml
# GitLab HTTPS Secret - use oauth2 as username with access tokens
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-https
  namespace: flux-system
type: Opaque
stringData:
  # GitLab requires 'oauth2' as username when using access tokens
  username: oauth2
  # Use a project or personal access token
  password: glpat-xxxxxxxxxxxxxxxxxxxx
```

### Bitbucket

```yaml
# Bitbucket HTTPS Secret
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-https
  namespace: flux-system
type: Opaque
stringData:
  username: my-bitbucket-user
  # Use an app password
  password: xxxxxxxxxxxxxxxxxxxx
```

## Token Rotation

Personal access tokens have expiration dates. You should plan for token rotation to avoid service disruptions. When a token expires, update the Secret with the new token.

```bash
# Update the Secret with a new token without downtime
kubectl create secret generic my-app-git-https \
  --namespace=flux-system \
  --from-literal=username=my-github-username \
  --from-literal=password=ghp_NEW_TOKEN_VALUE \
  --dry-run=client -o yaml | kubectl apply -f -
```

After updating the Secret, trigger a reconciliation to verify the new credentials work.

```bash
# Force reconciliation to test the new credentials
flux reconcile source git my-app -n flux-system
```

## Troubleshooting

If the GitRepository fails to reconcile, inspect the errors.

```bash
# Check Source Controller logs for authentication errors
kubectl logs -n flux-system deployment/source-controller | grep -i "auth\|401\|403\|tls"
```

Common issues include:

- **401 Unauthorized**: The token is invalid, expired, or does not have the required scopes. Regenerate the token and update the Secret.
- **403 Forbidden**: The token does not have permission to access the specific repository. Check the token scopes and repository permissions.
- **TLS certificate verification failed**: The Git server uses a self-signed certificate. Add the CA certificate to the Secret as described above.
- **Secret not found**: Ensure the Secret is in the same namespace as the GitRepository resource (typically `flux-system`).

## Conclusion

HTTPS authentication provides a straightforward way to connect Flux CD to private Git repositories. By storing credentials in a Kubernetes Secret and referencing it from the GitRepository resource, you enable secure access without managing SSH key pairs. Remember to set appropriate token scopes, plan for token rotation, and use custom CA certificates when working with self-hosted Git servers.
