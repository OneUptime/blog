# How to Configure GitRepository with Azure DevOps Repos in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Azure DevOps, Azure, CI/CD

Description: Learn how to configure Flux CD GitRepository resources to pull Kubernetes manifests from Azure DevOps Repos using SSH and HTTPS authentication.

---

Azure DevOps Repos is a widely used Git hosting service in enterprise environments, especially those already invested in the Microsoft ecosystem. Flux CD integrates with Azure DevOps through the GitRepository custom resource, supporting both HTTPS with personal access tokens and SSH with deploy keys. This guide covers both authentication methods and common configuration patterns.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- An Azure DevOps organization with at least one Git repository
- `kubectl` and `flux` CLI tools installed
- An Azure DevOps personal access token (PAT) or SSH key

## Understanding Azure DevOps Git URLs

Azure DevOps uses a specific URL format that differs from GitHub or GitLab. Knowing the correct format is critical.

Azure DevOps supports two URL formats:

```bash
# HTTPS format
https://dev.azure.com/{organization}/{project}/_git/{repository}

# SSH format
git@ssh.dev.azure.com:v3/{organization}/{project}/{repository}
```

## Step 1: Configure HTTPS Authentication with a PAT

The most straightforward approach is HTTPS with a personal access token. In Azure DevOps, go to User Settings > Personal Access Tokens and create a token with Code (Read) scope.

Create a Kubernetes secret with the Azure DevOps PAT:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-devops-credentials
  namespace: flux-system
type: Opaque
stringData:
  # For Azure DevOps PAT auth, the username can be any non-empty string
  username: flux
  password: your-azure-devops-personal-access-token
```

Apply the secret:

```bash
kubectl apply -f azure-devops-secret.yaml
```

## Step 2: Create the GitRepository Resource (HTTPS)

Define the GitRepository pointing to your Azure DevOps repo using HTTPS.

GitRepository configuration for Azure DevOps over HTTPS:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: azure-devops-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://dev.azure.com/my-organization/my-project/_git/my-repo
  ref:
    branch: main
  secretRef:
    # References the PAT credentials secret
    name: azure-devops-credentials
  timeout: 60s
```

Apply the GitRepository:

```bash
kubectl apply -f gitrepository.yaml
```

## Step 3: Configure SSH Authentication

SSH authentication provides a more secure alternative. Azure DevOps SSH uses a unique URL format with a `v3` path segment.

Generate an SSH key pair and add the public key to Azure DevOps:

```bash
# Generate an RSA key (Azure DevOps requires RSA, not ED25519 for some configurations)
ssh-keygen -t rsa -b 4096 -f azure-flux-key -N "" -C "flux@cluster"

# Scan the Azure DevOps SSH host key
ssh-keyscan ssh.dev.azure.com > known_hosts
```

Add the public key contents from `azure-flux-key.pub` to Azure DevOps under User Settings > SSH Public Keys.

Create the SSH secret:

```bash
kubectl create secret generic azure-devops-ssh \
  --from-file=identity=./azure-flux-key \
  --from-file=known_hosts=./known_hosts \
  --namespace=flux-system
```

## Step 4: Create the GitRepository Resource (SSH)

Configure the GitRepository to use the SSH URL format for Azure DevOps.

GitRepository configuration for Azure DevOps over SSH:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: azure-devops-repo-ssh
  namespace: flux-system
spec:
  interval: 5m
  # Note the v3 path format specific to Azure DevOps SSH
  url: ssh://git@ssh.dev.azure.com/v3/my-organization/my-project/my-repo
  ref:
    branch: main
  secretRef:
    name: azure-devops-ssh
```

## Step 5: Use Managed Identity with Azure Kubernetes Service

If your cluster runs on AKS, you can use Azure Workload Identity to authenticate to Azure DevOps without managing secrets manually.

First, configure your Flux source-controller with workload identity. Then create a GitRepository that leverages the managed identity:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: azure-devops-managed
  namespace: flux-system
spec:
  interval: 10m
  url: https://dev.azure.com/my-organization/my-project/_git/my-repo
  ref:
    branch: main
  provider: azure
```

The `provider: azure` field tells Flux to use Azure-specific authentication mechanisms. This requires the source-controller to be configured with the appropriate Azure identity bindings.

## Step 6: Configure Webhook Notifications

Azure DevOps supports service hooks that can notify Flux when code is pushed. This reduces polling frequency.

Create a Flux Receiver for Azure DevOps webhooks:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: azure-devops-webhook
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: azure-webhook-secret
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: azure-devops-repo
```

Create the webhook secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-webhook-secret
  namespace: flux-system
type: Opaque
stringData:
  token: your-webhook-shared-secret
```

After applying these resources, retrieve the webhook path and configure a service hook in Azure DevOps under Project Settings > Service Hooks > Web Hooks.

```bash
# Retrieve the webhook URL path
kubectl get receiver azure-devops-webhook -n flux-system \
  -o jsonpath='{.status.webhookPath}'
```

## Step 7: Working with Multiple Projects

In large Azure DevOps organizations, you may need GitRepository resources spanning multiple projects. Each project can use the same PAT if the token has organization-level access.

Multiple GitRepositories sharing a single credential:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: project-alpha
  namespace: flux-system
spec:
  interval: 10m
  url: https://dev.azure.com/my-org/project-alpha/_git/infra
  ref:
    branch: main
  secretRef:
    name: azure-devops-credentials
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: project-beta
  namespace: flux-system
spec:
  interval: 10m
  url: https://dev.azure.com/my-org/project-beta/_git/infra
  ref:
    branch: main
  secretRef:
    # Same credential works across projects if the PAT has broad scope
    name: azure-devops-credentials
```

## Verifying the Configuration

After applying your GitRepository, verify that Flux can connect and fetch from Azure DevOps.

Check the reconciliation status:

```bash
# List all Git sources and their status
flux get sources git

# Get detailed status for a specific source
kubectl describe gitrepository azure-devops-repo -n flux-system
```

A successful configuration shows `Ready: True` along with the latest commit hash.

## Troubleshooting

**401 Unauthorized:** Your PAT may have expired. Azure DevOps PATs have a maximum lifetime of one year. Regenerate and update the secret.

**SSH connection issues:** Azure DevOps requires RSA keys for some configurations. If ED25519 fails, switch to RSA 4096-bit keys.

**URL format errors:** Double-check the URL format. Azure DevOps HTTPS URLs must include the `_git` segment. Missing it will cause a 404 error.

**Branch not found:** Azure DevOps uses `main` as the default branch for new repos but older repos may use `master`. Verify your branch name in the Azure DevOps portal.

## Summary

Configuring Flux CD with Azure DevOps Repos requires attention to the specific URL formats and authentication methods that Azure DevOps expects. HTTPS with a personal access token is the simplest approach, while SSH and managed identity offer stronger security options. For AKS environments, the `provider: azure` field enables seamless integration with Azure Workload Identity, eliminating the need to manage credentials manually.
