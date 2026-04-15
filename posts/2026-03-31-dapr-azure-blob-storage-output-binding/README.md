# How to Use Dapr Azure Blob Storage Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Blob Storage, Binding, Object Storage

Description: Learn how to configure and use the Dapr Azure Blob Storage output binding to upload, retrieve, delete, and list blobs from microservices using the Dapr binding API.

---

## What Is the Dapr Azure Blob Storage Output Binding?

Azure Blob Storage is Microsoft's managed object storage service. The Dapr Azure Blob Storage output binding provides a consistent interface to upload, retrieve, and manage blobs without using the Azure Storage SDK directly in your application code.

## Setting Up the Blob Storage Binding Component

### Connection String Authentication

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: document-store
  namespace: default
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
    - name: accountName
      value: "mystorageaccount"
    - name: accountKey
      secretKeyRef:
        name: azure-storage-secret
        key: accountKey
    - name: containerName
      value: "documents"
    - name: decodeBase64
      value: "false"
    - name: publicAccessLevel
      value: "none"
```

Create the Kubernetes secret:

```bash
kubectl create secret generic azure-storage-secret \
  --from-literal=accountKey=<your-storage-account-key>
```

## Uploading a Blob

Use the `create` operation to upload content:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function uploadDocument(blobName, content, contentType = "application/json") {
  await client.binding.send(
    "document-store",
    "create",
    content,
    {
      blobName,
      contentType,
      contentDisposition: `attachment; filename="${blobName}"`,
    }
  );
  console.log(`Uploaded: ${blobName}`);
}

// Upload a JSON report
await uploadDocument(
  "reports/2026-03-31/daily-summary.json",
  JSON.stringify({ sales: 42300, orders: 287 })
);

// Upload an HTML page
await uploadDocument(
  "pages/welcome.html",
  "<html><body><h1>Welcome</h1></body></html>",
  "text/html"
);
```

## Uploading with Custom Metadata

```javascript
await client.binding.send(
  "document-store",
  "create",
  JSON.stringify(reportData),
  {
    blobName: "reports/sales-q1.json",
    contentType: "application/json",
    "x-ms-meta-environment": "production",
    "x-ms-meta-generatedby": "report-service",
    "x-ms-meta-version": "2.0",
  }
);
```

## Retrieving a Blob

```javascript
async function downloadDocument(blobName) {
  const result = await client.binding.send(
    "document-store",
    "get",
    null,
    { blobName }
  );
  return result;
}

const content = await downloadDocument("reports/2026-03-31/daily-summary.json");
const report = JSON.parse(content);
```

## Deleting a Blob

```javascript
async function deleteDocument(blobName) {
  await client.binding.send(
    "document-store",
    "delete",
    null,
    { blobName }
  );
  console.log(`Deleted: ${blobName}`);
}

await deleteDocument("temp/upload-staging-12345.tmp");
```

## Listing Blobs

```javascript
async function listDocuments(prefix, maxResults = 100) {
  const result = await client.binding.send(
    "document-store",
    "list",
    null,
    {
      prefix,
      maxResults: String(maxResults),
    }
  );
  return result;
}

const todayReports = await listDocuments("reports/2026-03-31/");
console.log(`Found ${todayReports.length} reports today`);
```

## Using SAS Token Authentication

For fine-grained access control, use a Shared Access Signature:

```yaml
  metadata:
    - name: accountName
      value: "mystorageaccount"
    - name: sasToken
      secretKeyRef:
        name: azure-storage-secret
        key: sasToken
    - name: containerName
      value: "documents"
```

Generate a SAS token:

```bash
az storage container generate-sas \
  --account-name mystorageaccount \
  --name documents \
  --permissions racwdl \
  --expiry 2026-12-31 \
  --auth-mode login
```

## Testing Locally with Azurite

```bash
docker run -d \
  --name azurite \
  -p 10000:10000 \
  mcr.microsoft.com/azure-storage/azurite \
  azurite-blob --blobHost 0.0.0.0
```

```yaml
  metadata:
    - name: accountName
      value: "devstoreaccount1"
    - name: accountKey
      value: "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
    - name: containerName
      value: "documents"
    - name: endpoint
      value: "http://127.0.0.1:10000/devstoreaccount1"
```

## Summary

The Dapr Azure Blob Storage output binding covers the full blob lifecycle: upload with custom metadata and content types, retrieval, deletion, and listing with prefix filtering. Using Dapr's binding API keeps your code cloud-agnostic and benefits from secret references, resiliency policies, and local Azurite emulation for development.
