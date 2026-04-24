# How to Configure Azure Container Registry with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Azure, ACR, Container Registry

Description: Integrate Azure Container Registry (ACR) with Rancher clusters using service principals and managed identities for secure container image management.

## Introduction

Azure Container Registry (ACR) is Microsoft's managed container registry service that integrates tightly with Azure services. This guide covers configuring ACR with Rancher clusters, including authentication via service principals, admin credentials, and Azure Managed Identities for AKS clusters.

## Prerequisites

- Azure subscription with ACR and AKS/Azure VM access
- Azure CLI installed and authenticated
- Rancher managing an Azure-based or connected cluster
- kubectl configured for your cluster

## Step 1: Create an Azure Container Registry

```bash
# Create a resource group if needed

az group create --name myResourceGroup --location eastus

# Create an ACR instance
az acr create \
  --resource-group myResourceGroup \
  --name mycontainerregistry \
  --sku Premium \
  --admin-enabled false

# Get the ACR login server
az acr show \
  --name mycontainerregistry \
  --query loginServer \
  --output tsv
# Output: mycontainerregistry.azurecr.io
```

## Step 2: Create a Service Principal for ACR Access

```bash
# Get the ACR resource ID
ACR_ID=$(az acr show \
  --name mycontainerregistry \
  --resource-group myResourceGroup \
  --query id \
  --output tsv)

# Create a service principal with pull permissions
SP_PASSWD=$(az ad sp create-for-rbac \
  --name acr-service-principal \
  --scopes $ACR_ID \
  --role acrpull \
  --query password \
  --output tsv)

SP_APP_ID=$(az ad sp list \
  --display-name acr-service-principal \
  --query "[].appId" \
  --output tsv)

echo "Service Principal ID: $SP_APP_ID"
echo "Service Principal Password: $SP_PASSWD"
```

## Step 3: Create Kubernetes Secret for ACR

```bash
# Create registry secret using service principal credentials
kubectl create secret docker-registry acr-credentials \
  --docker-server=mycontainerregistry.azurecr.io \
  --docker-username=$SP_APP_ID \
  --docker-password=$SP_PASSWD \
  --namespace=production
```

## Step 4: Use ACR Admin Credentials (Not Recommended for Production)

For development or testing, you can use ACR admin credentials:

```bash
# Enable admin user on ACR
az acr update \
  --name mycontainerregistry \
  --admin-enabled true

# Get admin credentials
ACR_USERNAME=$(az acr credential show \
  --name mycontainerregistry \
  --query username \
  --output tsv)

ACR_PASSWORD=$(az acr credential show \
  --name mycontainerregistry \
  --query "passwords[0].value" \
  --output tsv)

# Create Kubernetes secret
kubectl create secret docker-registry acr-admin-credentials \
  --docker-server=mycontainerregistry.azurecr.io \
  --docker-username=$ACR_USERNAME \
  --docker-password=$ACR_PASSWORD \
  --namespace=development
```

## Step 5: Attach ACR to AKS Cluster (Managed Identity)

For AKS clusters managed by Rancher, use AKS's built-in ACR integration:

```bash
# Attach ACR to AKS - grants AcrPull to the kubelet managed identity
az aks update \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --attach-acr mycontainerregistry

# Verify the attachment
az aks check-acr \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --acr mycontainerregistry.azurecr.io
```

## Step 6: Deploy a Workload Using ACR

```yaml
# app-deployment.yaml - Deployment using ACR image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-azure-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-azure-app
  template:
    metadata:
      labels:
        app: my-azure-app
    spec:
      # Use ACR credentials (not needed with managed identity on AKS)
      imagePullSecrets:
        - name: acr-credentials
      containers:
        - name: my-azure-app
          # Full ACR image reference
          image: mycontainerregistry.azurecr.io/production/my-app:v1.0.0
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

## Step 7: Configure ACR Geo-Replication

For multi-region deployments, replicate ACR to multiple regions. Geo-replication requires the Premium SKU:

```bash
# Add ACR replication to West Europe
az acr replication create \
  --registry mycontainerregistry \
  --location westeurope

# List replications
az acr replication list \
  --registry mycontainerregistry \
  --output table
```

## Step 8: Configure ACR Tasks for CI/CD

```bash
# Create an ACR task to build and push on git commit
az acr task create \
  --registry mycontainerregistry \
  --name build-push-task \
  --image production/my-app:{{.Run.ID}} \
  --context https://github.com/myorg/my-app.git#main \
  --file Dockerfile \
  --git-access-token $GITHUB_TOKEN
```

## Step 9: Configure ACR with Rancher Fleet

For Rancher Fleet-managed Helm releases, pass the ACR image settings as chart values:

```yaml
# values.yaml - Example Helm values passed through Rancher Fleet
image:
  repository: mycontainerregistry.azurecr.io/production/my-app
  tag: v1.0.0
  pullSecrets:
    - name: acr-credentials
```

## Step 10: Monitor ACR Usage

```bash
# View ACR metrics
az monitor metrics list \
  --resource $(az acr show --name mycontainerregistry --query id -o tsv) \
  --metric TotalPullCount,TotalPushCount \
  --interval PT1H

# List all repositories
az acr repository list --name mycontainerregistry --output table
```

## Troubleshooting

```bash
# Test ACR login
az acr login --name mycontainerregistry

# Check service principal validity
az ad sp show --id $SP_APP_ID

# Verify ACR role assignment
az role assignment list \
  --scope $(az acr show --name mycontainerregistry --query id -o tsv) \
  --output table

# Debug pod image pull issues
kubectl describe pod <pod-name> -n production
```

## Conclusion

Azure Container Registry integrates well with Rancher-managed clusters, especially when running on Azure infrastructure. For AKS clusters, the managed identity integration is the most secure and maintenance-free approach. For non-AKS clusters, use service principals with appropriate RBAC roles. Always prefer service principals over admin credentials in production, and consider geo-replication on Premium registries for multi-region deployments.
