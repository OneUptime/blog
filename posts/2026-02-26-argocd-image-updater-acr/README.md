# How to Configure ArgoCD Image Updater with ACR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure ACR, Image Updater

Description: Learn how to configure ArgoCD Image Updater with Azure Container Registry for automatic image updates using managed identity, service principal authentication, and update strategies.

---

Azure Container Registry (ACR) is the default container registry for teams running Kubernetes on Azure. Configuring ArgoCD Image Updater with ACR involves setting up authentication using Azure Managed Identity or service principals, configuring the registry endpoint, and defining update strategies. This guide walks you through the complete setup.

## Authentication Options

ACR supports several authentication methods. For AKS clusters, Azure Managed Identity is the recommended approach as it avoids storing credentials entirely.

### Option 1: Azure Managed Identity (Recommended for AKS)

When your AKS cluster has a managed identity, you can grant it pull access to ACR.

#### Step 1: Attach ACR to AKS

The simplest approach is to use the AKS-ACR integration:

```bash
# Attach ACR to AKS cluster
az aks update \
  --name my-aks-cluster \
  --resource-group my-rg \
  --attach-acr my-acr-registry
```

This grants the AKS kubelet identity the AcrPull role on the ACR.

#### Step 2: Grant Image Updater Additional Permissions

Image Updater needs to list tags, which requires more than pull access:

```bash
# Get the AKS kubelet identity
KUBELET_IDENTITY=$(az aks show \
  --name my-aks-cluster \
  --resource-group my-rg \
  --query "identityProfile.kubeletidentity.objectId" \
  --output tsv)

# Get the ACR resource ID
ACR_ID=$(az acr show --name myacrregistry --query id --output tsv)

# Grant Reader role (for listing tags)
az role assignment create \
  --assignee "$KUBELET_IDENTITY" \
  --role "AcrPull" \
  --scope "$ACR_ID"
```

#### Step 3: Configure Image Updater for Managed Identity

With managed identity, Image Updater can authenticate automatically:

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Azure Container Registry
        api_url: https://myacrregistry.azurecr.io
        prefix: myacrregistry.azurecr.io
        default: false
```

### Option 2: Service Principal Authentication

For non-AKS clusters or when you need explicit credentials:

```bash
# Create a service principal with AcrPull role
ACR_ID=$(az acr show --name myacrregistry --query id --output tsv)

SP_CREDENTIALS=$(az ad sp create-for-rbac \
  --name argocd-image-updater \
  --role AcrPull \
  --scopes "$ACR_ID" \
  --query "{appId: appId, password: password}" \
  --output json)

SP_APP_ID=$(echo "$SP_CREDENTIALS" | jq -r '.appId')
SP_PASSWORD=$(echo "$SP_CREDENTIALS" | jq -r '.password')

# Create a Kubernetes secret
kubectl create secret docker-registry acr-credentials \
  -n argocd \
  --docker-server=myacrregistry.azurecr.io \
  --docker-username="$SP_APP_ID" \
  --docker-password="$SP_PASSWORD"
```

Configure Image Updater to use the credentials:

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Azure Container Registry
        api_url: https://myacrregistry.azurecr.io
        prefix: myacrregistry.azurecr.io
        credentials: pullsecret:argocd/acr-credentials
        default: false
```

### Option 3: ACR Admin Account (Development Only)

For quick development setups, you can use the ACR admin account:

```bash
# Enable admin account
az acr update --name myacrregistry --admin-enabled true

# Get credentials
ACR_USERNAME=$(az acr credential show --name myacrregistry --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name myacrregistry --query "passwords[0].value" --output tsv)

# Create the secret
kubectl create secret docker-registry acr-admin-creds \
  -n argocd \
  --docker-server=myacrregistry.azurecr.io \
  --docker-username="$ACR_USERNAME" \
  --docker-password="$ACR_PASSWORD"
```

Note: Do not use admin credentials in production. They are shared credentials with full access.

## Configuring Applications

### Basic ACR Image Tracking

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Track image in ACR
    argocd-image-updater.argoproj.io/image-list: myapp=myacrregistry.azurecr.io/myapp
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    argocd-image-updater.argoproj.io/myapp.semver-constraint: ">=1.0.0"
    # Filter to stable release tags only
    argocd-image-updater.argoproj.io/myapp.allow-tags: "regexp:^[0-9]+\\.[0-9]+\\.[0-9]+$"
    # Write back to Git
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: kustomization
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Latest Strategy with Branch Tags

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=myacrregistry.azurecr.io/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: latest
  argocd-image-updater.argoproj.io/myapp.allow-tags: "regexp:^main-[a-f0-9]{7}$"
```

### Helm Values Write-Back

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=myacrregistry.azurecr.io/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: semver
  argocd-image-updater.argoproj.io/write-back-method: git
  argocd-image-updater.argoproj.io/write-back-target: "helmvalues:values.yaml"
  argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
  argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
```

## ACR with Azure DevOps Pipeline

A common pattern is using Azure DevOps Pipelines for CI and ArgoCD Image Updater for CD:

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: Docker@2
    displayName: Build and push
    inputs:
      containerRegistry: myacrregistry
      repository: myapp
      command: buildAndPush
      Dockerfile: Dockerfile
      tags: |
        $(Build.BuildId)
        $(Build.SourceVersion)
        latest
```

Once the image is pushed, Image Updater will detect the new tag and update the manifests automatically.

## ACR Geo-Replication

If you use ACR geo-replication, Image Updater needs to point to only one endpoint - the primary registry:

```yaml
data:
  registries.conf: |
    registries:
      - name: ACR
        api_url: https://myacrregistry.azurecr.io
        prefix: myacrregistry.azurecr.io
```

ACR handles replication transparently. You do not need to configure multiple registry entries for geo-replicated registries.

## Troubleshooting

**401 Unauthorized errors** - Verify the service principal has the correct role assignment:

```bash
az role assignment list \
  --assignee "$SP_APP_ID" \
  --scope "$ACR_ID" \
  --output table
```

**Image Updater cannot list tags** - Check that the credentials have at least AcrPull role, which includes tag listing permissions.

**Managed identity not working** - Verify the AKS-ACR attachment:

```bash
az aks check-acr --name my-aks-cluster --resource-group my-rg --acr myacrregistry.azurecr.io
```

**Stale token after credential rotation** - Restart Image Updater after rotating service principal credentials:

```bash
kubectl rollout restart deployment argocd-image-updater -n argocd
```

For monitoring your Image Updater operations on Azure, set up [ArgoCD notifications](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view) to alert on update events and failures.

ACR with ArgoCD Image Updater provides a seamless automated deployment pipeline for Azure-based Kubernetes workloads. The key is choosing the right authentication method - managed identity for AKS, service principals for everything else.
