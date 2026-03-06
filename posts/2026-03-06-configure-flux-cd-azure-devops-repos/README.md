# How to Configure Flux CD with Azure DevOps Repos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, azure-devops, GitOps, Kubernetes, Git, SSH, HTTPS

Description: Learn how to connect Flux CD to Azure DevOps Git repositories using SSH keys, HTTPS with PAT tokens, and configure branch policies for safe GitOps workflows.

---

## Introduction

Azure DevOps Repos is a popular choice for teams already using the Azure ecosystem. Flux CD integrates seamlessly with Azure DevOps Git repositories, allowing you to manage your Kubernetes infrastructure and applications through GitOps. This guide covers setting up Flux CD with Azure DevOps using both SSH and HTTPS authentication methods, configuring Personal Access Tokens (PATs), and establishing branch policies for safe deployments.

## Prerequisites

- An AKS cluster with kubectl configured
- Flux CLI (v2.2 or later)
- An Azure DevOps organization and project
- An Azure DevOps Git repository for your GitOps configuration
- Git client installed locally

## Understanding Azure DevOps Repository URLs

Azure DevOps supports two URL formats for Git operations:

```json
# SSH format
git@ssh.dev.azure.com:v3/{organization}/{project}/{repository}

# HTTPS format
https://dev.azure.com/{organization}/{project}/_git/{repository}
```

## Method 1: SSH Key Authentication

SSH authentication is the preferred method for Flux CD as it avoids token expiration issues.

### Step 1: Generate an SSH Key Pair

```bash
# Generate an ED25519 SSH key pair for Flux CD
ssh-keygen -t ed25519 -C "flux-cd" -f ~/.ssh/flux-azure-devops -N ""

# Display the public key (you will add this to Azure DevOps)
cat ~/.ssh/flux-azure-devops.pub
```

### Step 2: Add the SSH Public Key to Azure DevOps

1. Navigate to your Azure DevOps organization
2. Click on your profile icon in the top right
3. Select "SSH public keys"
4. Click "New Key"
5. Paste the contents of `~/.ssh/flux-azure-devops.pub`
6. Give it a descriptive name like "Flux CD - AKS Cluster"

### Step 3: Bootstrap Flux CD with SSH

```bash
# Set your Azure DevOps details
export AZURE_DEVOPS_ORG="my-organization"
export AZURE_DEVOPS_PROJECT="my-project"
export AZURE_DEVOPS_REPO="fleet-infra"

# Bootstrap Flux with SSH authentication
flux bootstrap git \
  --url="ssh://git@ssh.dev.azure.com/v3/${AZURE_DEVOPS_ORG}/${AZURE_DEVOPS_PROJECT}/${AZURE_DEVOPS_REPO}" \
  --branch=main \
  --path=clusters/my-cluster \
  --private-key-file=~/.ssh/flux-azure-devops \
  --silent
```

### Step 4: Verify the SSH Connection

```bash
# Check the GitRepository source status
flux get sources git

# Check Flux controllers are healthy
flux check

# View the Git source details
kubectl get gitrepository flux-system -n flux-system -o yaml
```

## Method 2: HTTPS with Personal Access Token (PAT)

HTTPS with PAT authentication is simpler to set up but requires token rotation before expiration.

### Step 1: Create a Personal Access Token

1. Navigate to Azure DevOps
2. Click your profile icon and select "Personal access tokens"
3. Click "New Token"
4. Configure the token:
   - Name: `flux-cd-gitops`
   - Expiration: Set to maximum (1 year) or your organization's policy
   - Scopes: Select "Custom defined" and grant:
     - Code: Read & Write (Read is sufficient if Flux does not need to push)

```bash
# Store the PAT securely
export AZURE_DEVOPS_PAT="your-personal-access-token-here"
```

### Step 2: Bootstrap Flux CD with HTTPS

```bash
# Bootstrap Flux using HTTPS and PAT
flux bootstrap git \
  --url="https://dev.azure.com/${AZURE_DEVOPS_ORG}/${AZURE_DEVOPS_PROJECT}/_git/${AZURE_DEVOPS_REPO}" \
  --branch=main \
  --path=clusters/my-cluster \
  --username=git \
  --password="${AZURE_DEVOPS_PAT}" \
  --token-auth=true
```

### Step 3: Manually Create a Git Source with PAT (Alternative)

If you prefer to configure the source manually rather than using bootstrap:

```bash
# Create a Kubernetes secret with the PAT credentials
kubectl create secret generic azure-devops-credentials \
  --namespace flux-system \
  --from-literal=username=git \
  --from-literal=password="${AZURE_DEVOPS_PAT}"
```

```yaml
# File: clusters/my-cluster/sources/azure-devops-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 5m
  url: https://dev.azure.com/my-organization/my-project/_git/app-config
  ref:
    branch: main
  secretRef:
    # Reference the PAT credentials secret
    name: azure-devops-credentials
```

## Configuring Multiple Azure DevOps Repositories

You can connect Flux CD to multiple Azure DevOps repositories for different purposes.

```yaml
# File: clusters/my-cluster/sources/infra-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infra-config
  namespace: flux-system
spec:
  interval: 10m
  url: ssh://git@ssh.dev.azure.com/v3/my-org/my-project/infra-config
  ref:
    branch: main
  secretRef:
    name: flux-system
---
# File: clusters/my-cluster/sources/app-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@ssh.dev.azure.com/v3/my-org/my-project/app-config
  ref:
    # Track a specific tag pattern for production
    tag: "v1.*"
  secretRef:
    name: flux-system
```

Create Kustomizations that reference each repository:

```yaml
# File: clusters/my-cluster/infra-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infra-config
  path: ./environments/production
  prune: true
  # Infrastructure should be applied before applications
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ingress-nginx-controller
      namespace: ingress-nginx
---
# File: clusters/my-cluster/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: app-config
  path: ./environments/production
  prune: true
  # Wait for infrastructure to be ready
  dependsOn:
    - name: infrastructure
```

## Setting Up Branch Policies

Branch policies in Azure DevOps protect your main branch and ensure that changes go through proper review before being applied by Flux CD.

### Configure Branch Policies in Azure DevOps

1. Navigate to your repository in Azure DevOps
2. Go to Repos > Branches
3. Click the three dots next to your main branch and select "Branch policies"

Recommended policies:

- **Require a minimum number of reviewers**: Set to at least 1 for production clusters
- **Check for linked work items**: Ensure changes are traceable
- **Check for comment resolution**: All review comments must be resolved
- **Build validation**: Add a pipeline that validates YAML syntax

### Create a Validation Pipeline

```yaml
# File: azure-pipelines/validate-manifests.yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - clusters/**
      - apps/**

pool:
  vmImage: "ubuntu-latest"

steps:
  # Install required tools
  - script: |
      # Install kustomize
      curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
      sudo mv kustomize /usr/local/bin/

      # Install kubeconform for schema validation
      wget -q https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
      tar xzf kubeconform-linux-amd64.tar.gz
      sudo mv kubeconform /usr/local/bin/
    displayName: "Install validation tools"

  # Validate all kustomize overlays
  - script: |
      # Find and validate all kustomization.yaml files
      find . -name "kustomization.yaml" -exec dirname {} \; | while read dir; do
        echo "Validating: $dir"
        kustomize build "$dir" | kubeconform -strict -summary
      done
    displayName: "Validate Kubernetes manifests"
```

## PAT Token Rotation Strategy

Personal Access Tokens expire and must be rotated. Here is a strategy using Azure DevOps service connections.

```bash
# Create a script for PAT rotation
# Run this before the current PAT expires

# Step 1: Generate a new PAT in Azure DevOps UI

# Step 2: Update the Kubernetes secret
kubectl create secret generic azure-devops-credentials \
  --namespace flux-system \
  --from-literal=username=git \
  --from-literal=password="${NEW_AZURE_DEVOPS_PAT}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Trigger a reconciliation to verify
flux reconcile source git flux-system

# Step 4: Verify the source is still working
flux get sources git
```

## Notification Integration

Configure Flux to send notifications to Azure DevOps pull requests:

```yaml
# File: clusters/my-cluster/notifications/azure-devops-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: azure-devops
  namespace: flux-system
spec:
  type: azuredevops
  address: https://dev.azure.com/my-organization/my-project/_git/fleet-infra
  secretRef:
    name: azure-devops-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-alerts
  namespace: flux-system
spec:
  providerRef:
    name: azure-devops
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Troubleshooting

### SSH Host Key Verification Failed

```bash
# Get the Azure DevOps SSH host keys
ssh-keyscan ssh.dev.azure.com 2>/dev/null

# If Flux cannot verify the host key, you may need to specify known hosts
flux create secret git flux-system \
  --url="ssh://git@ssh.dev.azure.com/v3/my-org/my-project/fleet-infra" \
  --private-key-file=~/.ssh/flux-azure-devops
```

### PAT Authentication Fails

```bash
# Test PAT authentication manually
git clone https://git:${AZURE_DEVOPS_PAT}@dev.azure.com/my-org/my-project/_git/fleet-infra /tmp/test-clone

# Check the Flux source status for error messages
kubectl describe gitrepository flux-system -n flux-system
```

### Repository Not Found

Ensure the URL format matches your Azure DevOps organization structure:

```bash
# Verify the repository exists
az repos show \
  --organization "https://dev.azure.com/my-organization" \
  --project "my-project" \
  --repository "fleet-infra"
```

## Conclusion

Configuring Flux CD with Azure DevOps Repos enables a robust GitOps workflow within the Azure ecosystem. SSH authentication provides a reliable, long-lived connection, while PAT tokens offer simplicity with the trade-off of periodic rotation. Branch policies add an essential layer of protection, ensuring that all changes to your cluster configuration are reviewed and validated before Flux applies them. Combining these practices creates a secure, auditable, and automated deployment pipeline.
