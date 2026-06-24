# How to Configure ArgoCD Image Updater with ACR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure ACR, Image Updater

Description: Learn how to configure ArgoCD Image Updater with Azure Container Registry for automatic image updates using managed identity, service principal authentication, and update strategies.

---

Azure Container Registry (ACR) is a common container registry for teams running Kubernetes on Azure. Configuring ArgoCD Image Updater with ACR involves setting up authentication using Azure Workload Identity or service principals, configuring the registry endpoint, and defining update strategies. This guide walks you through the complete setup.

## Authentication Options

ACR supports several authentication methods. For AKS clusters, Azure Workload Identity is the recommended approach as it avoids storing credentials entirely.

### Option 1: Azure Workload Identity (Recommended for AKS)

When your AKS cluster uses Microsoft Entra Workload ID, you can grant a managed identity pull access to ACR without storing registry passwords.

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

#### Step 2: Grant Image Updater Access

The AKS-ACR attachment lets nodes pull images, but Image Updater runs as a pod and needs its own identity for registry API calls. Create or reuse a user-assigned managed identity and grant it AcrPull on the registry:

```bash
# Create a managed identity for Image Updater
az identity create \
  --name argocd-image-updater-mi \
  --resource-group my-rg \
  --location eastus

UPDATER_CLIENT_ID=$(az identity show \
  --name argocd-image-updater-mi \
  --resource-group my-rg \
  --query clientId \
  --output tsv)

UPDATER_PRINCIPAL_ID=$(az identity show \
  --name argocd-image-updater-mi \
  --resource-group my-rg \
  --query principalId \
  --output tsv)

# Get the ACR resource ID
ACR_ID=$(az acr show --name myacrregistry --query id --output tsv)

# Grant pull access for registry reads
az role assignment create \
  --assignee "$UPDATER_PRINCIPAL_ID" \
  --role "AcrPull" \
  --scope "$ACR_ID"

# Federate the Kubernetes service account with the managed identity
AKS_OIDC_ISSUER=$(az aks show \
  --name my-aks-cluster \
  --resource-group my-rg \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

az identity federated-credential create \
  --name argocd-image-updater \
  --identity-name argocd-image-updater-mi \
  --resource-group my-rg \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:argocd:argocd-image-updater-controller \
  --audience api://AzureADTokenExchange
```

#### Step 3: Configure Image Updater for Workload Identity

With workload identity, Image Updater can use an external credentials script to exchange the projected service account token for an ACR refresh token:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-auth
  namespace: argocd
data:
  auth.sh: |
    #!/bin/sh
    set -eo pipefail
    AAD_ACCESS_TOKEN=$(cat "$AZURE_FEDERATED_TOKEN_FILE")
    ACCESS_TOKEN=$(wget --output-document - --header "Content-Type: application/x-www-form-urlencoded" \
      --post-data="grant_type=client_credentials&client_id=${AZURE_CLIENT_ID}&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&scope=https://management.azure.com/.default&client_assertion=${AAD_ACCESS_TOKEN}" \
      "https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token" \
      | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
    ACR_REFRESH_TOKEN=$(wget --quiet --header="Content-Type: application/x-www-form-urlencoded" \
      --post-data="grant_type=access_token&service=${ACR_NAME}&access_token=${ACCESS_TOKEN}" \
      --output-document - \
      "https://${ACR_NAME}/oauth2/exchange" \
      | python3 -c "import sys, json; print(json.load(sys.stdin)['refresh_token'])")
    echo "00000000-0000-0000-0000-000000000000:$ACR_REFRESH_TOKEN"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-image-updater-controller
  namespace: argocd
  labels:
    azure.workload.identity/use: "true"
  annotations:
    azure.workload.identity/client-id: "<UPDATER_CLIENT_ID>"
---
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
        credentials: ext:/app/auth/auth.sh
        credsexpire: 1h
        default: false
```

Mount `argocd-image-updater-auth` at `/app/auth`, set `ACR_NAME=myacrregistry.azurecr.io` on the Image Updater container, and add the `azure.workload.identity/use: "true"` label to the pod template.

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
    argocd-image-updater.argoproj.io/image-list: myapp=myacrregistry.azurecr.io/myapp:>=1.0.0
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
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

### Newest Build Strategy with Branch Tags

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=myacrregistry.azurecr.io/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: newest-build
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

**Image Updater cannot list tags** - Check that the credentials have AcrPull in registry RBAC mode. For registries using RBAC plus ABAC repository permissions, use the Container Registry Repository Reader role for repository reads.

**Managed identity not working** - Verify the workload identity service account annotation, federated credential subject, and pod template label. You can still verify the AKS-ACR attachment for node image pulls:

```bash
az aks check-acr --name my-aks-cluster --resource-group my-rg --acr myacrregistry.azurecr.io
```

**Stale token after credential rotation** - Restart Image Updater after rotating service principal credentials:

```bash
kubectl rollout restart deployment argocd-image-updater -n argocd
```

For monitoring your Image Updater operations on Azure, set up [ArgoCD notifications](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view) to alert on update events and failures.

ACR with ArgoCD Image Updater provides a seamless automated deployment pipeline for Azure-based Kubernetes workloads. The key is choosing the right authentication method - workload identity for AKS, service principals for everything else.
