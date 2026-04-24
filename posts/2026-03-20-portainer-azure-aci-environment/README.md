# How to Set Up Azure ACI as an Environment in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Cloud, DevOps

Description: Learn how to configure Azure Container Instances as a managed environment in Portainer Business Edition to deploy and manage serverless containers in Azure.

## Introduction

Azure Container Instances (ACI) allow you to run containers in Azure without managing underlying infrastructure. Portainer Business Edition supports ACI as a first-class environment type, letting you deploy and manage Azure containers from the same Portainer interface you use for Docker and Kubernetes environments.

## Prerequisites

- Portainer Business Edition (BE)
- An active Azure subscription
- Azure CLI installed locally or access to Azure Cloud Shell
- Permission in Microsoft Entra ID to register applications and create service principals
- Admin access to Portainer

## Architecture Overview

Portainer connects to ACI using Azure's API via a Microsoft Entra ID service principal. For the flow shown here, the service principal needs `Contributor` on the resource group where containers will be deployed and `Reader` on the subscription so Portainer can enumerate subscription-scoped data.

## Step 1: Gather Azure Prerequisites

You need the following information from Azure:

```bash
# Install Azure CLI if not present

curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Log into Azure
az login

# Get your subscription ID
az account list --output table
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"

# Get your tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Tenant ID: $TENANT_ID"
```

## Step 2: Create a Resource Group for ACI

```bash
# Create a dedicated resource group for Portainer-managed ACI containers
az group create \
  --name portainer-aci-rg \
  --location eastus

# Verify creation
az group show --name portainer-aci-rg
```

## Step 3: Register a Microsoft Entra ID Application

```bash
# Create a Microsoft Entra ID app registration
APP_ID=$(az ad app create \
  --display-name "Portainer ACI Integration" \
  --query appId -o tsv)

echo "Application (Client) ID: $APP_ID"
```

## Step 4: Create a Service Principal and Assign Roles

```bash
# Create a service principal for the app
SP_OBJECT_ID=$(az ad sp create --id $APP_ID --query 'id' -o tsv)

# Assign Contributor role on the resource group
az role assignment create \
  --assignee-object-id $SP_OBJECT_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/portainer-aci-rg"

# Assign Reader role on the subscription for discovery operations
az role assignment create \
  --assignee-object-id $SP_OBJECT_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Reader" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"

echo "Service principal created and roles assigned."
```

## Step 5: Create a Client Secret

```bash
# Create a client secret (valid for 1 year)
SECRET=$(az ad app credential reset \
  --id $APP_ID \
  --years 1 \
  --query 'password' -o tsv)

echo "Client Secret: $SECRET"
# Save this securely - it will not be shown again
```

## Step 6: Add ACI as an Environment in Portainer

1. Log into Portainer as admin.
2. Go to **Environments** → **Add environment**.
3. Select **ACI** as the environment type and click **Start Wizard**.
4. Fill in:
   - **Name**: `Azure Production ACI`
   - **Application ID**: The app ID from step 3
   - **Tenant ID**: Your Microsoft Entra tenant ID
   - **Authentication key**: The secret from step 5
5. Click **Connect** to validate credentials.
6. If successful, Portainer adds the environment. Click **Close** to return to the environment list.

## Step 7: Verify the ACI Environment

After Portainer adds the environment:

1. The ACI environment will appear in the Portainer home dashboard.
2. Click on it to open the Azure ACI dashboard.
3. The dashboard should display counts for subscriptions, resource groups, and container instances associated with the connection.
4. From there, open **Container instances** to view or deploy ACI workloads.

## Configuring Environment Groups and Tags

Optionally, organize your ACI environment:

1. In environment settings, add **tags** like `cloud: azure`, `region: eastus`.
2. Assign the environment to an **environment group** (e.g., `cloud-environments`).
3. Set **team access** to restrict which Portainer users can deploy to this ACI environment.

## Permissions Summary

For the flow shown here, grant:

| Permission | Scope | Purpose |
|-----------|-------|---------|
| `Contributor` | Resource Group | Create/delete ACI container groups |
| `Reader` | Subscription | Enumerate subscription-scoped data such as locations and resource groups |

## Troubleshooting

```bash
# Test Azure credentials manually
az login --service-principal \
  --username $APP_ID \
  --password $SECRET \
  --tenant $TENANT_ID

# List ACI container groups to verify access
az container list --resource-group portainer-aci-rg --output table

# Check role assignments
az role assignment list \
  --all \
  --assignee-object-id $SP_OBJECT_ID \
  --output table
```

## Conclusion

Setting up Azure ACI as a Portainer environment enables you to manage serverless Azure containers from the same dashboard as your Docker and Kubernetes workloads. The integration uses a Microsoft Entra ID service principal with scoped Azure RBAC access, providing a secure and auditable connection. Once configured, you can deploy containers to ACI with the same familiar Portainer workflow.
