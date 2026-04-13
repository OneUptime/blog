# How to Use Dapr with Azure Key Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Key Vault, Secret, Security

Description: Configure Dapr to use Azure Key Vault as a secrets store, enabling services to retrieve secrets, keys, and certificates without managing Key Vault SDK calls.

---

Azure Key Vault is a managed service for storing and accessing secrets, keys, and certificates. Dapr's Key Vault secrets store component provides a uniform API for retrieving these values, and Key Vault secrets can be referenced in other Dapr component definitions.

## Create a Key Vault and Store Secrets

```bash
# Create Key Vault
az keyvault create \
  --name my-dapr-kv \
  --resource-group my-rg \
  --location eastus \
  --sku standard

# Store secrets
az keyvault secret set \
  --vault-name my-dapr-kv \
  --name db-password \
  --value "S3cur3P@ssw0rd"

az keyvault secret set \
  --vault-name my-dapr-kv \
  --name api-key \
  --value "sk_live_example_key_123"

az keyvault secret set \
  --vault-name my-dapr-kv \
  --name redis-password \
  --value "RedisP@ss123"
```

## Configure the Dapr Key Vault Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-keyvault
  namespace: default
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: my-dapr-kv
  - name: azureTenantId
    value: "YOUR_TENANT_ID"
  - name: azureClientId
    value: "YOUR_CLIENT_ID"
  - name: azureClientSecret
    secretKeyRef:
      name: azure-sp-secret
      key: clientSecret
```

With managed identity (no credentials needed):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-keyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: my-dapr-kv
  # azureClientId empty = use system-assigned managed identity
```

## Grant Key Vault Access

```bash
# For managed identity
IDENTITY_OBJECT_ID=$(az aks show \
  --resource-group my-rg \
  --name my-aks-cluster \
  --query "identityProfile.kubeletidentity.objectId" \
  --output tsv)

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$IDENTITY_OBJECT_ID" \
  --scope "$(az keyvault show --name my-dapr-kv --query id --output tsv)"
```

## Retrieve Secrets in Your Application

```python
import requests

def get_secret(secret_name: str) -> str:
    resp = requests.get(
        f"http://localhost:3500/v1.0/secrets/azure-keyvault/{secret_name}"
    )
    resp.raise_for_status()
    return resp.json().get(secret_name)

# Get secrets
db_password = get_secret("db-password")
api_key = get_secret("api-key")
print(f"DB Password retrieved, API Key: {api_key[:8]}...")
```

## Reference Key Vault Secrets in Other Components

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  auth:
    secretStore: azure-keyvault
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-password
      key: redis-password
```

## Retrieve a Specific Secret Version

```python
# Get a specific version of a secret
resp = requests.get(
    "http://localhost:3500/v1.0/secrets/azure-keyvault/db-password",
    params={"metadata.version_id": "abc123def456"}
)
resp.raise_for_status()
print(resp.json())
```

## Scoping Access by Application

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-keyvault
  namespace: default
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: my-dapr-kv
scopes:
- order-service
- payment-service
```

## Summary

Dapr's Azure Key Vault secrets store provides a clean abstraction over Key Vault secret retrieval, supporting both client credentials and managed identity authentication. Key Vault secrets can be referenced directly in other Dapr component definitions, centralizing credential management. Scoping components to specific application IDs enforces the principle of least privilege at the Dapr layer.
