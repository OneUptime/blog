# How to Use Dapr Alibaba Cloud OSS Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba Cloud, OSS, Binding, Object Storage

Description: Learn how to configure and use the Dapr Alibaba Cloud OSS output binding to upload, retrieve, and manage objects in Alibaba Cloud Object Storage Service from microservices.

---

## What Is the Dapr Alibaba Cloud OSS Output Binding?

Alibaba Cloud Object Storage Service (OSS) is a cloud storage service popular in China and Asia-Pacific. The Dapr Alibaba Cloud OSS output binding allows microservices to upload objects to OSS buckets without managing the OSS SDK or authentication directly.

## Setting Up an OSS Bucket

In the Alibaba Cloud Console:
1. Navigate to Object Storage Service
2. Create a new bucket (e.g., `my-dapr-documents`)
3. Choose the region (e.g., `oss-cn-hangzhou`)
4. Set access control: Private (recommended for production)

Or use the OSS CLI:

```bash
ossutil mb oss://my-dapr-documents --region cn-hangzhou
```

Create an OSS access key and secret in the Alibaba Cloud RAM console.

## Configuring the OSS Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oss-store
  namespace: default
spec:
  type: bindings.alicloud.oss
  version: v1
  metadata:
    - name: endpoint
      value: "oss-cn-hangzhou.aliyuncs.com"
    - name: accessKeyID
      secretKeyRef:
        name: alicloud-secrets
        key: accessKeyID
    - name: accessKey
      secretKeyRef:
        name: alicloud-secrets
        key: accessKey
    - name: bucket
      value: "my-dapr-documents"
```

```bash
kubectl create secret generic alicloud-secrets \
  --from-literal=accessKeyID=<your-access-key-id> \
  --from-literal=accessKey=<your-access-key-secret>
```

## Uploading Objects

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function uploadToOSS(objectKey, content, contentType = "application/json") {
  await client.binding.send(
    "oss-store",
    "create",
    typeof content === "string" ? content : JSON.stringify(content),
    {
      key: objectKey,
      contentType,
    }
  );
  console.log(`Uploaded: oss://my-dapr-documents/${objectKey}`);
}

// Upload a JSON report
await uploadToOSS(
  "reports/2026/03/31/daily-sales.json",
  { totalSales: 1234567.89, orders: 4521 }
);

// Upload a CSV file
const csvData = "date,product,quantity,revenue\n2026-03-31,Widget-A,120,5998.80\n";
await uploadToOSS("exports/sales-20260331.csv", csvData, "text/csv");
```

## OSS Lifecycle Rules for Cost Management

```bash
ossutil lifecycle --method put oss://my-dapr-documents \
  --lc-id delete-old-reports \
  --lc-prefix reports/ \
  --lc-days 365 \
  --lc-status Enabled
```

## Configuring CDN for Public Assets

For serving user-facing content, attach Alibaba Cloud CDN to your OSS bucket:

```bash
# In OSS console or via API: bind a CDN domain to your bucket
# Set bucket ACL to public-read for the public prefix
ossutil set-acl oss://my-dapr-documents/public/ public-read --recursive
```

## Summary

The Dapr Alibaba Cloud OSS output binding provides a simple way to upload objects to OSS for Asia-Pacific deployments. Configure the binding with your OSS endpoint and RAM credentials via Dapr secret references, then use the `create` operation to upload objects. Enable OSS lifecycle rules to automatically clean up old objects and manage storage costs.
