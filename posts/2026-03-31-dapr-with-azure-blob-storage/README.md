# How to Use Dapr with Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Blob Storage, Binding, Object Storage

Description: Use Dapr output and input bindings with Azure Blob Storage to upload, download, list, and delete blobs without embedding Azure Storage SDK code in services.

---

Azure Blob Storage provides object storage for unstructured data. Dapr's Azure Blob Storage binding lets microservices perform create, get, delete, and list operations on blobs through the uniform Dapr binding API.

## Create a Storage Account and Container

```bash
# Create storage account
az storage account create \
  --name mydaprblob \
  --resource-group my-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create blob container
az storage container create \
  --name dapr-files \
  --account-name mydaprblob \
  --auth-mode login

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name mydaprblob \
  --resource-group my-rg \
  --query "[0].value" --output tsv)

kubectl create secret generic azure-storage-secret \
  --from-literal=storageKey="$STORAGE_KEY"
```

## Configure the Dapr Blob Storage Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: blob-binding
  namespace: default
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
  - name: accountName
    value: mydaprblob
  - name: containerName
    value: dapr-files
  - name: accountKey
    secretKeyRef:
      name: azure-storage-secret
      key: storageKey
  - name: publicAccessLevel
    value: none
```

With managed identity:

```yaml
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
  - name: accountName
    value: mydaprblob
  - name: containerName
    value: dapr-files
  - name: azureClientId
    value: ""
```

## Upload a Blob

```python
import requests
import json

def upload_blob(blob_name: str, content: str, content_type: str = "application/octet-stream"):
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/blob-binding",
        json={
            "operation": "create",
            "data": content,
            "metadata": {
                "blobName": blob_name,
                "contentType": content_type
            }
        }
    )
    resp.raise_for_status()
    return resp.json()

# Upload a report
report = json.dumps({"date": "2026-03-31", "totalOrders": 150})
result = upload_blob("reports/2026-03-31.json", report, "application/json")
print(result)
```

## Download a Blob

```python
def download_blob(blob_name: str) -> bytes:
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/blob-binding",
        json={
            "operation": "get",
            "metadata": {
                "blobName": blob_name
            }
        }
    )
    resp.raise_for_status()
    return resp.content

content = download_blob("reports/2026-03-31.json")
report = json.loads(content)
print(report)
```

## List Blobs

```python
def list_blobs(prefix: str = "") -> list:
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/blob-binding",
        json={
            "operation": "list",
            "data": {
                "prefix": prefix,
                "maxResults": 50,
                "include": {
                    "metadata": True
                }
            }
        }
    )
    resp.raise_for_status()
    return resp.json()

blobs = list_blobs(prefix="reports/")
for blob in blobs:
    print(f"{blob['name']} - {blob['properties']['contentLength']} bytes")
```

## Delete a Blob

```python
def delete_blob(blob_name: str):
    requests.post(
        "http://localhost:3500/v1.0/bindings/blob-binding",
        json={
            "operation": "delete",
            "metadata": {
                "blobName": blob_name,
                "deleteSnapshots": "include"
            }
        }
    ).raise_for_status()

delete_blob("reports/2026-01-01.json")
```

## Summary

Dapr's Azure Blob Storage binding provides a portable interface for object storage operations, enabling services to upload, download, list, and delete blobs without Azure Storage SDK dependencies. The binding supports both shared access key and managed identity authentication. Switching from Azure Blob Storage to AWS S3 or Google Cloud Storage requires only a component configuration change, not application code changes.
