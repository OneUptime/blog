# How to Use Dapr AWS S3 Output Binding for Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, S3, Binding, Object Storage

Description: Learn how to use the Dapr AWS S3 output binding to upload, retrieve, delete, and list objects in Amazon S3 from microservices without managing the AWS SDK directly.

---

## What Is the Dapr AWS S3 Output Binding?

The Dapr AWS S3 output binding provides a consistent interface to Amazon S3 operations. You can upload objects, retrieve their content, delete them, and generate presigned URLs - all through the Dapr binding API. This avoids SDK version conflicts and keeps your code cloud-agnostic.

## Setting Up the S3 Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: document-store
  namespace: default
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "my-documents"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
    - name: forcePathStyle
      value: "false"
    - name: decodeBase64
      value: "true"
    - name: encodeBase64
      value: "false"
```

## Uploading an Object

Use the `create` operation to upload content to S3:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function uploadDocument(key, content, contentType = "application/json") {
  const base64Data = Buffer.from(content).toString("base64");
  await client.binding.send(
    "document-store",
    "create",
    base64Data,
    {
      key,
      contentType,
      "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
    }
  );
  console.log(`Uploaded: s3://my-documents/${key}`);
}

// Upload JSON report
await uploadDocument(
  "reports/2026-03-31/sales-summary.json",
  JSON.stringify({ totalRevenue: 45230.50, orders: 312 }),
  "application/json"
);

// Upload raw text
await uploadDocument(
  "logs/app-2026-03-31.log",
  "2026-03-31T02:00:00Z INFO Batch job started\n",
  "text/plain"
);
```

## Uploading Binary Files

For binary files, base64 encode the content:

```javascript
const fs = require("fs");

async function uploadPDF(key, filePath) {
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString("base64");

  await client.binding.send(
    "document-store",
    "create",
    base64Content,
    {
      key,
      contentType: "application/pdf",
    }
  );
}

await uploadPDF("invoices/INV-001.pdf", "./generated/INV-001.pdf");
```

## Retrieving an Object

```javascript
async function downloadDocument(key) {
  const result = await client.binding.send(
    "document-store",
    "get",
    null,
    { key }
  );
  return result;
}

const reportContent = await downloadDocument("reports/2026-03-31/sales-summary.json");
const report = JSON.parse(reportContent);
console.log("Total revenue:", report.totalRevenue);
```

## Deleting an Object

```javascript
async function deleteDocument(key) {
  await client.binding.send(
    "document-store",
    "delete",
    null,
    { key }
  );
  console.log(`Deleted: ${key}`);
}

await deleteDocument("temp/upload-12345.tmp");
```

## Generating a Presigned URL

```javascript
async function getPresignedUrl(key, expiresInSeconds = 3600) {
  const result = await client.binding.send(
    "document-store",
    "presign",
    null,
    {
      key,
      presignTTL: `${expiresInSeconds}s`,
    }
  );
  return result.presignURL;
}

const downloadUrl = await getPresignedUrl("invoices/INV-001.pdf", 900);
console.log("Share this URL (expires in 15 min):", downloadUrl);
```

## Listing Objects

```javascript
async function listDocuments(prefix) {
  const result = await client.binding.send(
    "document-store",
    "list",
    JSON.stringify({ prefix }),
    {}
  );
  return result;
}

const reports = await listDocuments("reports/2026-03-31/");
console.log("Reports found:", reports.length);
```

## Summary

The Dapr AWS S3 output binding covers the core object storage lifecycle: upload, retrieve, delete, presign, and list. By using Dapr's binding API instead of the AWS SDK directly, your service remains loosely coupled to the storage backend and benefits from Dapr's secret management, resiliency policies, and local development support via LocalStack.
