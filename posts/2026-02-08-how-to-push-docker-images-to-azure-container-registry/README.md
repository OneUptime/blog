# How to Push Docker Images to Azure Container Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Azure, ACR, Azure Container Registry, CI/CD, DevOps, Cloud, Microsoft Azure

Description: Step-by-step instructions for pushing Docker images to Azure Container Registry with authentication, RBAC, and GitHub Actions integration.

---

Azure Container Registry (ACR) is Microsoft's managed Docker registry that integrates tightly with Azure services like AKS, App Service, and Azure Container Instances. It supports geo-replication, content trust, and automated image builds. If your infrastructure runs on Azure, ACR is the most straightforward option for storing and distributing container images.

This guide covers setting up ACR, pushing images, and automating the process with CI/CD pipelines.

## Prerequisites

Install the Azure CLI:

```bash
# macOS
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set your subscription
az account set --subscription YOUR_SUBSCRIPTION_ID
```

## Creating an Azure Container Registry

```bash
# Create a resource group (if you do not already have one)
az group create --name myResourceGroup --location eastus

# Create the container registry
# The name must be globally unique and contain only alphanumeric characters
az acr create \
    --resource-group myResourceGroup \
    --name myappregistry \
    --sku Basic \
    --location eastus

# Verify the registry was created
az acr show --name myappregistry --query loginServer --output tsv
# Output: myappregistry.azurecr.io
```

ACR offers three pricing tiers:
- **Basic** - For development and testing, includes 10 GB storage
- **Standard** - For production workloads, includes 100 GB storage and webhooks
- **Premium** - Adds geo-replication, content trust, and private links

## Authenticating Docker with ACR

There are several authentication methods. The simplest for local development is the Azure CLI:

```bash
# Login to ACR using Azure CLI credentials
az acr login --name myappregistry

# This configures Docker to authenticate with the registry
# Credentials are cached for a limited time
```

For automation, use a service principal:

```bash
# Create a service principal with push access
ACR_ID=$(az acr show --name myappregistry --query id --output tsv)

az ad sp create-for-rbac \
    --name acr-push-sp \
    --role AcrPush \
    --scopes "$ACR_ID"

# The output provides appId (username) and password
# Store these securely for CI/CD use
```

You can also enable the admin user (simpler but less secure):

```bash
# Enable admin user
az acr update --name myappregistry --admin-enabled true

# Get the admin credentials
az acr credential show --name myappregistry
```

## Building and Pushing an Image

Tag your image with the ACR login server address and push:

```bash
# Build with the ACR tag
docker build -t myappregistry.azurecr.io/myapp:v1.0.0 .

# Push to ACR
docker push myappregistry.azurecr.io/myapp:v1.0.0

# Also push as latest
docker tag myappregistry.azurecr.io/myapp:v1.0.0 myappregistry.azurecr.io/myapp:latest
docker push myappregistry.azurecr.io/myapp:latest
```

## Using ACR Build (Build in the Cloud)

ACR can build images in the cloud, which is useful when your local machine is slow or you need to build for different architectures:

```bash
# Build an image directly in ACR (no local Docker daemon needed)
az acr build \
    --registry myappregistry \
    --image myapp:v1.0.0 \
    --file Dockerfile \
    .

# Build for a specific platform
az acr build \
    --registry myappregistry \
    --image myapp:v1.0.0 \
    --platform linux/amd64 \
    .
```

ACR Build uploads your source code to Azure and builds it there. This is particularly useful in CI/CD pipelines running on agents without Docker installed.

## Verifying the Push

```bash
# List repositories in the registry
az acr repository list --name myappregistry --output table

# List tags for a specific image
az acr repository show-tags --name myappregistry --repository myapp --output table

# Show detailed manifest information
az acr repository show-manifests --name myappregistry --repository myapp --output table
```

## CI/CD with GitHub Actions

Automate builds and pushes with GitHub Actions:

```yaml
# .github/workflows/build-push-acr.yml
name: Build and Push to ACR
on:
  push:
    branches: [main]

env:
  REGISTRY: myappregistry.azurecr.io
  IMAGE: myapp

jobs:
  build-push:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Login to ACR using a service principal
      - name: Login to ACR
        uses: azure/docker-login@v2
        with:
          login-server: ${{ env.REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      # Build and push with commit SHA and latest tags
      - name: Build and Push
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE }}:${{ github.sha }} .
          docker tag ${{ env.REGISTRY }}/${{ env.IMAGE }}:${{ github.sha }} \
            ${{ env.REGISTRY }}/${{ env.IMAGE }}:latest
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE }}:latest
```

### Using Azure Login Action (Recommended for OIDC)

```yaml
# .github/workflows/build-push-acr-oidc.yml
name: Build and Push to ACR (OIDC)
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Authenticate with Azure using OIDC
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # Login to ACR (uses the Azure session from above)
      - name: Login to ACR
        run: az acr login --name myappregistry

      - name: Build and Push
        run: |
          docker build -t myappregistry.azurecr.io/myapp:${{ github.sha }} .
          docker push myappregistry.azurecr.io/myapp:${{ github.sha }}
```

## Connecting ACR to AKS

Azure Kubernetes Service can pull from ACR with a managed identity:

```bash
# Attach ACR to an existing AKS cluster
az aks update \
    --name myAKSCluster \
    --resource-group myResourceGroup \
    --attach-acr myappregistry

# Verify the connection
az aks check-acr --name myAKSCluster --resource-group myResourceGroup --acr myappregistry.azurecr.io
```

After attaching, AKS nodes can pull images from ACR without additional configuration in your Kubernetes manifests.

## Geo-Replication (Premium SKU)

For global deployments, replicate your registry to multiple regions:

```bash
# Add replication to West Europe
az acr replication create \
    --registry myappregistry \
    --location westeurope

# Add replication to Southeast Asia
az acr replication create \
    --registry myappregistry \
    --location southeastasia

# List replications
az acr replication list --registry myappregistry --output table
```

Geo-replication ensures fast pulls from any region and provides disaster recovery.

## Image Cleanup

Manage storage by cleaning up old images:

```bash
# Delete a specific tag
az acr repository delete --name myappregistry --image myapp:v1.0.0 --yes

# Delete untagged manifests (dangling images)
az acr run --registry myappregistry \
    --cmd "acr purge --filter 'myapp:.*' --untagged --ago 30d" \
    /dev/null

# Set up a retention policy (Premium SKU)
az acr config retention update \
    --registry myappregistry \
    --status enabled \
    --days 90 \
    --type UntaggedManifests
```

## Security Best Practices

Lock down your registry with these recommendations:

```bash
# Disable admin user in production
az acr update --name myappregistry --admin-enabled false

# Enable content trust for image signing
az acr config content-trust update --registry myappregistry --status enabled

# Restrict network access (Premium SKU)
az acr update --name myappregistry --default-action Deny
az acr network-rule add --name myappregistry --ip-address YOUR_CI_IP
```

Azure Container Registry provides a secure, scalable home for your Docker images in the Azure ecosystem. The managed identity integration with AKS eliminates credential management headaches, ACR Build offloads image compilation to the cloud, and geo-replication ensures fast pulls globally. Start with the Basic tier for development and upgrade as your needs grow.
