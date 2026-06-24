# How to Deploy Redis with Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Container, Deployment, Cloud

Description: Deploy Redis on Azure Container Instances with persistent Azure Files storage, Key Vault secrets, and virtual network integration.

---

Azure Container Instances (ACI) lets you run containers without managing VMs or Kubernetes clusters. For lightweight Redis deployments on Azure, ACI provides a fast path to a running instance with persistent storage through Azure Files and virtual network isolation.

## Create the Azure Files Share

Redis data needs to survive container restarts. Create an Azure Files share for persistence:

```bash
# Variables
RG="my-resource-group"
LOCATION="eastus"
STORAGE_ACCOUNT="mystorageaccount"
FILE_SHARE="redis-data"

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS

# Create file share
az storage share create \
  --name $FILE_SHARE \
  --account-name $STORAGE_ACCOUNT

# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RG \
  --account-name $STORAGE_ACCOUNT \
  --query "[0].value" -o tsv)
```

## Deploy Redis Container

Create the container instance with persistent storage and a password from environment variable:

```bash
REDIS_PASSWORD="your-strong-password"

az container create \
  --resource-group $RG \
  --name redis \
  --image redis:7-alpine \
  --cpu 0.5 \
  --memory 1 \
  --ports 6379 \
  --ip-address Private \
  --vnet my-vnet \
  --subnet redis-subnet \
  --command-line "redis-server --requirepass $REDIS_PASSWORD --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes --dir /data" \
  --azure-file-volume-account-name $STORAGE_ACCOUNT \
  --azure-file-volume-account-key $STORAGE_KEY \
  --azure-file-volume-share-name $FILE_SHARE \
  --azure-file-volume-mount-path /data \
  --restart-policy Always \
  --location $LOCATION
```

## Using Azure Resource Manager Template

For repeatable deployments, use an ARM template:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "redisPassword": {
      "type": "securestring"
    },
    "storageAccountName": {
      "type": "string"
    },
    "storageAccountKey": {
      "type": "securestring"
    },
    "fileShareName": {
      "type": "string"
    }
  },
  "resources": [
    {
      "type": "Microsoft.ContainerInstance/containerGroups",
      "apiVersion": "2021-10-01",
      "name": "redis",
      "location": "[resourceGroup().location]",
      "properties": {
        "containers": [
          {
            "name": "redis",
            "properties": {
              "image": "redis:7-alpine",
              "command": [
                "redis-server",
                "--requirepass", "[parameters('redisPassword')]",
                "--maxmemory", "512mb",
                "--appendonly", "yes",
                "--dir", "/data"
              ],
              "ports": [{"port": 6379, "protocol": "TCP"}],
              "resources": {
                "requests": {"cpu": 0.5, "memoryInGB": 1.0}
              },
              "volumeMounts": [
                {
                  "name": "redis-data",
                  "mountPath": "/data"
                }
              ]
            }
          }
        ],
        "osType": "Linux",
        "restartPolicy": "Always",
        "ipAddress": {
          "type": "Private",
          "ports": [{"port": 6379, "protocol": "TCP"}]
        },
        "volumes": [
          {
            "name": "redis-data",
            "azureFile": {
              "shareName": "[parameters('fileShareName')]",
              "storageAccountName": "[parameters('storageAccountName')]",
              "storageAccountKey": "[parameters('storageAccountKey')]"
            }
          }
        ]
      }
    }
  ]
}
```

## Checking Container Status

```bash
# Get container state and IP
az container show \
  --resource-group $RG \
  --name redis \
  --query "{state:instanceView.state, ip:ipAddress.ip}"

# View logs
az container logs --resource-group $RG --name redis --follow

# Execute redis-cli inside the container
az container exec \
  --resource-group $RG \
  --name redis \
  --exec-command "redis-cli -a $REDIS_PASSWORD ping"
```

## Summary

Azure Container Instances deploys Redis in minutes without VM or cluster management. Azure Files provides durable persistent storage via SMB mount, virtual network integration keeps Redis off the public internet, and ARM templates make deployments repeatable. ACI is well-suited for dev, test, and small production workloads where Kubernetes or AKS overhead is not justified.
