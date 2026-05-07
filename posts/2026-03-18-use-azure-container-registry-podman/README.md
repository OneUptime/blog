# How to Use Azure Container Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Azure, ACR, Cloud

Description: A comprehensive guide to using Azure Container Registry with Podman for container image management in Azure environments.

---

> Azure Container Registry integrates deeply with Azure services, and Podman connects to it using standard registry authentication.

Azure Container Registry (ACR) is a managed container registry service from Microsoft Azure. It supports Docker and OCI image formats, making it fully compatible with Podman. ACR provides geo-replication and integration with Azure Kubernetes Service, and it can integrate with Microsoft Defender for Cloud for vulnerability assessment. This guide covers how to configure and use ACR with Podman.

---

## Prerequisites

Install and configure the Azure CLI.

```bash
# Install Azure CLI (Linux)

curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Verify your account
az account show

# Set the active subscription
az account set --subscription "My Subscription"
```

## Creating an Azure Container Registry

Set up a new ACR instance.

```bash
# Create a resource group (if you do not have one)
az group create --name myResourceGroup --location eastus

# Create an ACR instance (Basic SKU for development)
az acr create \
  --resource-group myResourceGroup \
  --name myacrregistry \
  --sku Basic

# Verify the registry was created
az acr show --name myacrregistry --query loginServer --output tsv
# Output: myacrregistry.azurecr.io
```

## Authenticating Podman to ACR

There are several ways to authenticate Podman with ACR.

```bash
# Method 1: Using Azure CLI credentials
ACR_TOKEN=$(az acr login --name myacrregistry --expose-token --query accessToken -o tsv)
echo "$ACR_TOKEN" | podman login myacrregistry.azurecr.io \
  --username 00000000-0000-0000-0000-000000000000 \
  --password-stdin

# Method 2: Using admin credentials (enable admin first)
az acr update --name myacrregistry --admin-enabled true
ACR_PASSWORD=$(az acr credential show --name myacrregistry --query "passwords[0].value" -o tsv)
podman login myacrregistry.azurecr.io \
  --username myacrregistry \
  --password-stdin <<< "$ACR_PASSWORD"
```

## Using Service Principals for CI/CD

Service principals provide non-interactive authentication.

```bash
# Create a service principal with pull and push access
ACR_ID=$(az acr show --name myacrregistry --query id --output tsv)
SP_CREDENTIALS=$(az ad sp create-for-rbac \
  --name acr-podman-sp \
  --scopes "$ACR_ID" \
  --role acrpush \
  --query "{appId: appId, password: password}" \
  --output json)

# Extract the credentials
SP_APP_ID=$(echo "$SP_CREDENTIALS" | python3 -c "import sys,json; print(json.load(sys.stdin)['appId'])")
SP_PASSWORD=$(echo "$SP_CREDENTIALS" | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")

# Login with the service principal
echo "$SP_PASSWORD" | podman login myacrregistry.azurecr.io \
  --username "$SP_APP_ID" \
  --password-stdin
```

## Pulling Images from ACR

Pull images from your Azure Container Registry.

```bash
ACR_REGISTRY="myacrregistry.azurecr.io"

# Pull an image
podman pull ${ACR_REGISTRY}/myapp:latest

# Pull a specific version
podman pull ${ACR_REGISTRY}/myapp:v2.0

# List pulled ACR images
podman images | grep azurecr
```

## Pushing Images to ACR

Build and push images to ACR.

```bash
ACR_REGISTRY="myacrregistry.azurecr.io"

# Build a local image
podman build -t myapp:latest .

# Tag the image for ACR
podman tag myapp:latest ${ACR_REGISTRY}/myapp:latest
podman tag myapp:latest ${ACR_REGISTRY}/myapp:v1.0

# Push the image
podman push ${ACR_REGISTRY}/myapp:latest
podman push ${ACR_REGISTRY}/myapp:v1.0

# List images in the ACR repository
az acr repository list --name myacrregistry --output table
```

## Listing and Managing ACR Images

Use the Azure CLI to manage images in ACR.

```bash
# List all repositories in the registry
az acr repository list --name myacrregistry --output table

# List tags for a specific repository
az acr repository show-tags --name myacrregistry \
  --repository myapp --output table

# Show image details
az acr repository show --name myacrregistry --image myapp:latest

# Untag an image tag
az acr repository untag --name myacrregistry \
  --image myapp:v1.0
```

## Configuring ACR in registries.conf

Add ACR to your Podman configuration.

```toml
# /etc/containers/registries.conf

unqualified-search-registries = ["docker.io", "myacrregistry.azurecr.io"]

[[registry]]
prefix = "myacrregistry.azurecr.io"
location = "myacrregistry.azurecr.io"
insecure = false
```

## ACR with Geo-Replication

Use geo-replicated ACR for faster pulls across regions.

```bash
# Enable geo-replication (requires Premium SKU)
az acr replication create \
  --registry myacrregistry \
  --location westeurope

# List replications
az acr replication list --registry myacrregistry --output table

# Azure routes requests to an appropriate replica
# when using the registry's FQDN
```

## CI/CD Pipeline with ACR

A complete pipeline script for Azure DevOps or GitHub Actions.

```bash
#!/bin/bash
# ci-acr-deploy.sh - Build and push to Azure Container Registry

set -euo pipefail

ACR_NAME="myacrregistry"
ACR_REGISTRY="${ACR_NAME}.azurecr.io"
IMAGE_NAME="myapp"
IMAGE_TAG="${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}"

# Authenticate using service principal
echo "${ACR_SP_PASSWORD}" | podman login "${ACR_REGISTRY}" \
  --username "${ACR_SP_APP_ID}" \
  --password-stdin

# Build and tag the image
podman build -t "${ACR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" .
podman tag "${ACR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" \
  "${ACR_REGISTRY}/${IMAGE_NAME}:latest"

# Push both tags
podman push "${ACR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
podman push "${ACR_REGISTRY}/${IMAGE_NAME}:latest"

# Logout
podman logout "${ACR_REGISTRY}"
echo "Deployed: ${ACR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
```

## Summary

Azure Container Registry works with Podman through standard Docker registry authentication. You can authenticate using Azure CLI tokens, admin credentials, or service principals for CI/CD. ACR provides features like geo-replication and integration with Azure Kubernetes Service, and it can integrate with Microsoft Defender for Cloud for vulnerability assessment. Use service principals for automated workflows and the Azure CLI for image lifecycle management.
