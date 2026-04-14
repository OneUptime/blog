# How to Use Dapr with GCP Storage Buckets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Storage, Binding, Microservice

Description: Use Dapr's output binding with Google Cloud Storage to upload, download, and manage files from your microservices without directly using the GCS SDK.

---

## Overview

Google Cloud Storage (GCS) is a scalable object storage service used for files, backups, and media. Dapr provides a GCS output binding that lets your microservices interact with storage buckets through a consistent API, abstracting away the GCS SDK details.

## Prerequisites

- GCP project with Cloud Storage API enabled
- A GCS bucket created
- Service account with `roles/storage.objectAdmin`
- Dapr installed

## Creating a GCS Bucket

```bash
gsutil mb -l us-central1 gs://my-dapr-bucket
gsutil versioning set on gs://my-dapr-bucket
```

## Configuring the Dapr Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcs-binding
  namespace: default
spec:
  type: bindings.gcp.bucket
  version: v1
  metadata:
  - name: bucket
    value: "my-dapr-bucket"
  - name: project_id
    value: "my-gcp-project"
  - name: decodeBase64
    value: "false"
  - name: encodeBase64
    value: "false"
```

## Uploading Files

```bash
# Upload a file object
curl -X POST http://localhost:3500/v1.0/bindings/gcs-binding \
  -H "Content-Type: application/json" \
  -d '{
    "data": "SGVsbG8gV29ybGQ=",
    "metadata": {
      "name": "uploads/hello.txt",
      "contentType": "text/plain"
    },
    "operation": "create"
  }'
```

From a Node.js service:

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient();

async function uploadReport(reportId, content) {
  const data = Buffer.from(content).toString("base64");
  await client.binding.send("gcs-binding", "create", data, {
    name: `reports/${reportId}.json`,
    contentType: "application/json"
  });
  console.log(`Report ${reportId} uploaded to GCS`);
}
```

## Downloading Files

```bash
curl -X POST http://localhost:3500/v1.0/bindings/gcs-binding \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"name": "uploads/hello.txt"},
    "operation": "get"
  }'
```

## Listing Objects

```bash
curl -X POST http://localhost:3500/v1.0/bindings/gcs-binding \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"prefix": "reports/"},
    "operation": "list"
  }'
```

## Deleting Objects

```bash
curl -X POST http://localhost:3500/v1.0/bindings/gcs-binding \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"name": "reports/old-report.json"},
    "operation": "delete"
  }'
```

## Using with Dapr Workflows

Combine GCS binding with Dapr workflows for file processing pipelines:

```python
from dapr.ext.workflow import DaprWorkflowContext

def file_processing_workflow(ctx: DaprWorkflowContext, input: dict):
    file_name = input["fileName"]
    # Download file
    content = yield ctx.call_activity(download_file, input={"name": file_name})
    # Process file
    result = yield ctx.call_activity(process_file, input=content)
    # Upload result
    yield ctx.call_activity(upload_result, input={"name": f"processed/{file_name}", "data": result})
```

## Summary

Dapr's GCP Storage Bucket binding provides a simple, cloud-agnostic interface for object storage operations. By routing file operations through the Dapr binding API, microservices gain portability across storage backends while benefiting from Dapr's built-in retry and error handling.
