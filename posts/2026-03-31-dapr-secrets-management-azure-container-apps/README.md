# How to Use Dapr Secrets Management on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Secret, Key Vault, Security

Description: Access Azure Key Vault secrets from Dapr applications on Azure Container Apps using the Dapr secrets API and Managed Identity for passwordless authentication.

---

## Overview

Dapr secrets management abstracts secret retrieval behind a unified API. On Azure Container Apps, you use Azure Key Vault as the secret store with Managed Identity, so applications never handle credentials directly.

## Step 1: Create Azure Key Vault

```bash
az keyvault create \
  --name dapr-keyvault \
  --resource-group rg-dapr \
  --location eastus \
  --enable-rbac-authorization true

# Store a secret
az keyvault secret set \
  --vault-name dapr-keyvault \
  --name database-password \
  --value "supersecretpassword"

az keyvault secret set \
  --vault-name dapr-keyvault \
  --name api-key \
  --value "my-external-api-key"
```

## Step 2: Enable Managed Identity on the Container App

```bash
az containerapp identity assign \
  --name orders-service \
  --resource-group rg-dapr \
  --system-assigned

PRINCIPAL_ID=$(az containerapp identity show \
  --name orders-service \
  --resource-group rg-dapr \
  --query principalId -o tsv)

# Grant Key Vault access via RBAC
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$PRINCIPAL_ID" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-dapr/providers/Microsoft.KeyVault/vaults/dapr-keyvault"
```

## Step 3: Configure the Dapr Secret Store Component

```yaml
# secretstore.yaml
componentType: secretstores.azure.keyvault
version: v1
metadata:
  - name: vaultName
    value: "dapr-keyvault"
  - name: azureEnvironment
    value: "AZUREPUBLICCLOUD"
  - name: azureClientId
    value: "<managed-identity-client-id>"
```

```bash
az containerapp env dapr-component set \
  --name aca-env \
  --resource-group rg-dapr \
  --dapr-component-name secretstore \
  --yaml secretstore.yaml
```

## Step 4: Read Secrets from Application Code

```python
import requests

def get_secret(secret_name: str) -> str:
    resp = requests.get(
        f'http://localhost:3500/v1.0/secrets/secretstore/{secret_name}'
    )
    resp.raise_for_status()
    return resp.json()[secret_name]

db_password = get_secret('database-password')
api_key = get_secret('api-key')

print(f"Got secrets: db_password length={len(db_password)}")
```

## Step 5: Use Secrets in Dapr Component Definitions

Reference Key Vault secrets in other Dapr components:

```yaml
# statestore.yaml
componentType: state.azure.cosmosdb
version: v1
secretStoreComponent: "secretstore"
metadata:
  - name: masterKey
    secretRef: cosmos-primary-key
```

## Step 6: Bulk Secret Retrieval

```python
# Get all secrets with a prefix
resp = requests.get(
    'http://localhost:3500/v1.0/secrets/secretstore/bulk'
)
all_secrets = resp.json()
for name, value in all_secrets.items():
    print(f"Secret: {name}")
```

## Step 7: Use with .NET SDK

```csharp
using Dapr.Client;

var client = new DaprClientBuilder().Build();

var secret = await client.GetSecretAsync(
    "secretstore",
    "database-password"
);

string dbPassword = secret["database-password"];
```

## Summary

Dapr secrets management on Azure Container Apps combines the Dapr secrets API with Azure Key Vault and Managed Identity for a fully passwordless secrets workflow. Applications retrieve secrets by name via `localhost:3500`, and Managed Identity handles authentication with Key Vault - no credentials are stored in code or environment variables. Secrets can also be referenced in other Dapr component definitions for centralized credential management.
