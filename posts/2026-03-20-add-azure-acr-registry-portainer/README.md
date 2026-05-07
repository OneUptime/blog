# How to Add Azure ACR as a Registry in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACR, Container Registry, DevOps

Description: Learn how to connect Azure Container Registry (ACR) to Portainer to pull and manage private container images.

## Overview

Azure Container Registry (ACR) is Microsoft's managed Docker registry service. You can authenticate using admin credentials or service principals. Portainer supports ACR as an Azure registry.

## Getting ACR Credentials

### Option 1: Admin Account (Simple, not recommended for production)

```bash
# Enable admin account on your ACR

az acr update -n myregistry --admin-enabled true

# Get admin credentials
az acr credential show -n myregistry
# Returns username and two passwords you can use in Portainer
```

### Option 2: Service Principal (Recommended for production)

```bash
# Create a service principal with pull-only access to your ACR
SERVICE_PRINCIPAL_NAME=acr-service-principal
ACR_REGISTRY_ID=$(az acr show --name myregistry --query id --output tsv)

SP_PASSWD=$(az ad sp create-for-rbac \
  --name $SERVICE_PRINCIPAL_NAME \
  --scopes $ACR_REGISTRY_ID \
  --role acrpull \
  --query password --output tsv)

SP_APP_ID=$(az ad sp list \
  --display-name $SERVICE_PRINCIPAL_NAME \
  --query "[].appId" --output tsv)

echo "Username: ${SP_APP_ID}"
echo "Password: ${SP_PASSWD}"
```

## Adding ACR to Portainer

1. Go to **Registries** and click **Add registry**.
2. Select **Azure** as the registry type.
3. Fill in:
   - **Registry URL**: `myregistry.azurecr.io`
   - **Username**: Service principal application (client) ID (or admin username)
   - **Password**: Service principal password (or admin password)
4. Click **Add registry**.

## Testing ACR Access from CLI

```bash
# Log in to ACR using service principal credentials
docker login myregistry.azurecr.io \
  --username <app-id> \
  --password <password>

# Pull an image to confirm access
docker pull myregistry.azurecr.io/my-app:latest
```

## Using ACR in a Stack Compose File

```yaml
services:
  app:
    # Portainer will use the stored ACR credentials to pull this image
    image: myregistry.azurecr.io/my-app:1.0.0
    deploy:
      replicas: 2
```

## Assigning ACR to Environments

After adding the registry, open the environment-specific **Registries** view (**Host > Registries**, **Swarm > Registries**, or **Cluster > Registries**), select **Manage access** for the registry, and grant access in that environment.

## Conclusion

Azure Container Registry integrates cleanly with Portainer as an Azure registry. For production setups, use a service principal with pull-only access rather than the admin account to follow the principle of least privilege.
