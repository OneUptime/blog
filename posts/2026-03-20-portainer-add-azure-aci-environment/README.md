# How to Add an Azure ACI Environment to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Cloud, Environment

Description: Connect Portainer to Azure Container Instances (ACI) to deploy and manage serverless containers in Azure from the Portainer interface.

## Introduction

Azure Container Instances (ACI) allows you to run containers in Azure without managing virtual machines. Portainer supports ACI environments, letting you deploy containers directly to Azure from the Portainer UI without learning the Azure CLI or portal navigation. This guide covers adding ACI as a Portainer environment.

## Prerequisites

- Azure subscription
- Azure service principal with Contributor access to the resource group
- Portainer running and accessible

## Step 1: Create an Azure Service Principal

```bash
# Login to Azure CLI

az login

# Create a resource group for containers (if not exists)
az group create --name portainer-containers --location eastus

# Create a service principal with Contributor role
az ad sp create-for-rbac \
  --name portainer-aci-sp \
  --role Contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/portainer-containers

# Note the output:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",  <- clientId
#   "displayName": "portainer-aci-sp",
#   "password": "xxxxxxxxxxxxxxxxxxxxxxxx",             <- clientSecret
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   <- tenantId
# }

# Get subscription ID
az account show --query id -o tsv
```

## Step 2: Gather Required Information

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"

# Get tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Tenant ID: $TENANT_ID"

# Service principal details from Step 1:
# CLIENT_ID (appId)
# CLIENT_SECRET (password)
```

## Step 3: Add ACI Environment in Portainer

### Via Web UI

1. Go to **Environments** → **Add environment**
2. Select **Azure ACI**
3. Fill in:

```text
Name:               Azure East US
Application ID:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Tenant ID:          xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Authentication Key: your-client-secret
```

4. Click **Connect**

### Via Portainer API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  -F "Name=Azure East US ACI" \
  -F "EndpointCreationType=3" \
  -F "AzureApplicationID=your-client-id" \
  -F "AzureTenantID=your-tenant-id" \
  -F "AzureAuthenticationKey=your-client-secret"
```

## Step 4: Deploy a Container Instance to ACI

Once connected, deploy container instances to ACI from Portainer:

1. Click on the ACI environment
2. Go to **Container instances** → **Add container**
3. Configure:

```text
Subscription:   <your-subscription>
Resource Group: portainer-containers
Location:       eastus
Name:           my-web-app
Image:          nginx:latest
OS:             Linux
Port:           80/TCP

Resource limits:
  CPU:    1 vCPU
  Memory: 1 GB
```

4. Click **Deploy the container**

The container runs in Azure ACI and gets a public IP address.

## Deploying Multi-Container ACI Workloads

Portainer's Azure ACI integration manages container instances rather than Portainer stacks. If you need a multi-container deployment, use Azure Container Instances YAML, ARM, or Docker Compose tooling directly. ACI runs multi-container deployments as container groups.

## Viewing and Managing ACI Containers

```bash
# Via Portainer API - list containers in ACI environment
ENDPOINT_ID=7  # ACI environment ID

# Get a subscription ID available to this ACI environment
SUBSCRIPTION_ID=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}/azure/subscriptions?api-version=2016-06-01" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['value'][0]['subscriptionId'])")

# ACI uses Azure subscription-scoped API paths
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}/azure/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.ContainerInstance/containerGroups?api-version=2018-04-01" \
  | python3 -m json.tool
```

## Limitations of ACI in Portainer

- No Docker Swarm support
- Limited networking options compared with full Azure networking features
- Persistent storage requires Azure Files if you need data to survive container restarts
- Container logs are limited to the last 4 MB

## Conclusion

ACI environments in Portainer provide a convenient interface for deploying serverless containers to Azure without the Azure portal learning curve. Scoping the service principal to one resource group helps limit Portainer's access while still allowing it to manage ACI container groups in that resource group. This is ideal for running stateless workloads, batch jobs, or microservices without managing virtual machines.
