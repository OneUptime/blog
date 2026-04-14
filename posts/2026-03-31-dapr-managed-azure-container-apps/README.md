# How to Use Managed Dapr on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Managed Service, Azure, Microservice

Description: Understand and use the managed Dapr runtime provided by Azure Container Apps, including automatic upgrades, built-in components, and platform integration.

---

## Overview

Azure Container Apps offers a fully managed Dapr runtime where Microsoft handles version upgrades, security patches, and control plane management. You focus on building apps while ACA manages the Dapr infrastructure.

## What "Managed Dapr" Means

In Azure Container Apps, Dapr is:
- Automatically upgraded with the environment
- Integrated with Azure Monitor for telemetry
- Pre-configured with Azure-native component bindings
- Secured using Azure Managed Identity (no secrets in component YAML)

## Step 1: Create the Environment

```bash
az containerapp env create \
  --name aca-env \
  --resource-group rg-dapr \
  --location eastus \
  --enable-workload-profiles
```

## Step 2: Deploy with Dapr Enabled

```bash
az containerapp create \
  --name checkout \
  --resource-group rg-dapr \
  --environment aca-env \
  --image myacr.azurecr.io/checkout:latest \
  --target-port 5000 \
  --ingress internal \
  --enable-dapr \
  --dapr-app-id checkout \
  --dapr-app-port 5000 \
  --mi-system-assigned
```

## Step 3: Use Managed Identity for Components

Instead of connection strings, use Managed Identity for authentication:

```yaml
# statestore.yaml
componentType: state.azure.cosmosdb
version: v1
metadata:
  - name: url
    value: "https://mycosmosdb.documents.azure.com:443/"
  - name: database
    value: "daprdb"
  - name: collection
    value: "state"
  - name: azureClientId
    value: "<managed-identity-client-id>"
```

Assign Cosmos DB role to the identity:

```bash
az cosmosdb sql role assignment create \
  --account-name mycosmosdb \
  --resource-group rg-dapr \
  --role-definition-id "00000000-0000-0000-0000-000000000002" \
  --principal-id $(az containerapp identity show \
    --name checkout \
    --resource-group rg-dapr \
    --query principalId -o tsv) \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-dapr/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosdb"
```

## Step 4: View Dapr Version Managed by ACA

```bash
az containerapp env show \
  --name aca-env \
  --resource-group rg-dapr \
  --query 'properties.daprConfiguration' \
  --output json
```

```json
{
  "version": "1.14.0"
}
```

## Step 5: Access Dapr Telemetry in Azure Monitor

```bash
az monitor log-analytics query \
  --workspace myworkspace \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerName_s contains 'daprd' | limit 50" \
  --output table
```

## Step 6: Call Services Using Dapr Service Invocation

```python
import requests

# The checkout service calls the inventory service
response = requests.get(
    'http://localhost:3500/v1.0/invoke/inventory/method/stock'
)
data = response.json()
print(f"Stock level: {data['quantity']}")
```

## Summary

Managed Dapr on Azure Container Apps eliminates operational overhead by handling runtime upgrades, control plane management, and Azure service integration. Using Managed Identity instead of connection strings removes secrets from component configuration entirely. The platform provides built-in telemetry via Azure Monitor, making it easy to observe Dapr behavior in production.
