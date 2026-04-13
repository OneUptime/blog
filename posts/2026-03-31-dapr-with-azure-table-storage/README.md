# How to Use Dapr with Azure Table Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Table Storage, State Management, NoSQL

Description: Configure Dapr state management with Azure Table Storage as a simple, low-cost key-value store for microservice state that requires no database server provisioning.

---

Azure Table Storage is a serverless NoSQL key-value store that provides low-cost, scalable storage. Dapr's Azure Table Storage state store lets services persist state without managing a full database, making it ideal for lightweight scenarios.

## Create a Storage Account

```bash
# Create storage account (shared with Blob Storage if already created)
az storage account create \
  --name mydaprstorage \
  --resource-group my-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create a table (optional - Dapr can auto-create)
az storage table create \
  --name daprstate \
  --account-name mydaprstorage

# Get the connection string
CONN_STR=$(az storage account show-connection-string \
  --name mydaprstorage \
  --resource-group my-rg \
  --query connectionString --output tsv)

# Get the account key
ACCOUNT_KEY=$(az storage account keys list \
  --account-name mydaprstorage \
  --resource-group my-rg \
  --query '[0].value' --output tsv)

kubectl create secret generic azure-table-secret \
  --from-literal=connectionString="$CONN_STR" \
  --from-literal=accountKey="$ACCOUNT_KEY"
```

## Configure the Dapr Table Storage State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tablestate
  namespace: default
spec:
  type: state.azure.tablestorage
  version: v1
  metadata:
  - name: accountName
    value: mydaprstorage
  - name: accountKey
    secretKeyRef:
      name: azure-table-secret
      key: accountKey
  - name: tableName
    value: daprstate
```

With a connection string:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tablestate
spec:
  type: state.azure.tablestorage
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: azure-table-secret
      key: connectionString
  - name: tableName
    value: daprstate
  - name: cosmosDbMode
    value: "false"
```

## Store and Retrieve State

```python
import requests

TABLE_STATE_URL = "http://localhost:3500/v1.0/state/tablestate"

# Save user preferences
def save_preferences(user_id: str, preferences: dict):
    requests.post(TABLE_STATE_URL, json=[{
        "key": f"prefs-{user_id}",
        "value": preferences
    }]).raise_for_status()

def get_preferences(user_id: str) -> dict:
    resp = requests.get(f"{TABLE_STATE_URL}/prefs-{user_id}")
    if resp.status_code == 204:
        return {}
    resp.raise_for_status()
    return resp.json()

# Save preferences
save_preferences("user-001", {
    "theme": "dark",
    "language": "en-US",
    "notifications": True,
    "timezone": "UTC"
})

prefs = get_preferences("user-001")
print(prefs)
```

## Bulk State Operations

```python
# Save multiple records
requests.post(TABLE_STATE_URL, json=[
    {"key": "config-max-retries", "value": {"value": 3}},
    {"key": "config-timeout-ms", "value": {"value": 5000}},
    {"key": "config-feature-flag-new-ui", "value": {"enabled": True}}
]).raise_for_status()

# Bulk get
resp = requests.post(
    f"{TABLE_STATE_URL}/bulk",
    json={"keys": [
        "config-max-retries",
        "config-timeout-ms",
        "config-feature-flag-new-ui"
    ]}
)
configs = {item["key"]: item["data"] for item in resp.json()}
print(configs)
```

## Use with Actor State Store

Azure Table Storage can serve as the Dapr actor state store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tablestate
spec:
  type: state.azure.tablestorage
  version: v1
  metadata:
  - name: accountName
    value: mydaprstorage
  - name: accountKey
    secretKeyRef:
      name: azure-table-secret
      key: accountKey
  - name: tableName
    value: daprstate
  - name: actorStateStore
    value: "true"
```

## Cost Comparison

```bash
# Azure Table Storage pricing (approximate)
# - Storage: $0.045 per GB/month
# - Transactions: $0.00036 per 10,000 operations
# - No provisioned throughput required

# Cosmos DB pricing (for comparison)
# - $0.008 per RU/s per hour (minimum 400 RU/s)
# - Better for high throughput and global distribution

# Table Storage is ideal for:
# - Low-traffic microservices
# - Configuration storage
# - Development and staging environments
```

## Summary

Azure Table Storage provides a serverless, low-cost state store for Dapr that requires no database provisioning or management. It works well for user preferences, configuration data, and feature flags where query patterns are key-based. For higher throughput or complex querying needs, Azure Cosmos DB with the Dapr state store component is a more capable alternative with an easy migration path.
