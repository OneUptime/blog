# How to Use Dapr Huawei OBS Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Huawei Cloud, OBS, Object Storage

Description: Learn how to configure the Dapr Huawei OBS output binding to upload objects and files to Huawei Object Storage Service from microservices.

---

Huawei Object Storage Service (OBS) is an S3-compatible object storage platform offered by Huawei Cloud. Dapr's OBS output binding enables microservices to upload, download, and delete objects without embedding the Huawei OBS SDK in application code.

## Prerequisites

- Huawei Cloud account with an OBS bucket created
- Access key ID and secret key with OBS permissions
- Dapr CLI and sidecar installed

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: huawei-obs
  namespace: default
spec:
  type: bindings.huawei.obs
  version: v1
  metadata:
  - name: bucket
    value: "my-app-bucket"
  - name: endpoint
    value: "obs.cn-north-4.myhuaweicloud.com"
  - name: accessKey
    value: "YOUR_ACCESS_KEY_ID"
  - name: secretKey
    secretKeyRef:
      name: huawei-obs-secret
      key: secretKey
  - name: region
    value: "cn-north-4"
```

Store the secret key:

```bash
kubectl create secret generic huawei-obs-secret \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

## Uploading an Object

Use the `create` operation to upload data as an object:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/huawei-obs \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "Hello from Dapr!",
    "metadata": {
      "key": "uploads/hello.txt",
      "contentType": "text/plain"
    }
  }'
```

## Uploading Binary Data from Go

```go
package main

import (
  "context"
  "os"

  dapr "github.com/dapr/go-sdk/client"
)

func uploadFile(ctx context.Context, client dapr.Client, filePath, objectKey string) error {
  fileBytes, err := os.ReadFile(filePath)
  if err != nil {
    return err
  }

  in := &dapr.InvokeBindingRequest{
    Name:      "huawei-obs",
    Operation: "create",
    Data:      fileBytes,
    Metadata: map[string]string{
      "key":         objectKey,
      "contentType": "application/octet-stream",
    },
  }
  return client.InvokeOutputBinding(ctx, in)
}
```

## Getting an Object

```bash
curl -X POST http://localhost:3500/v1.0/bindings/huawei-obs \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get",
    "metadata": {
      "key": "uploads/hello.txt"
    }
  }'
```

## Deleting an Object

```bash
curl -X POST http://localhost:3500/v1.0/bindings/huawei-obs \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "delete",
    "metadata": {
      "key": "uploads/hello.txt"
    }
  }'
```

## Best Practices

- Use path prefixes (like `uploads/`, `exports/`) as logical namespaces within a single bucket.
- Set appropriate content types when uploading so that downstream consumers can interpret files correctly.
- Use lifecycle rules in OBS to automatically expire temporary uploads after a set period.
- Store credentials in Dapr secret stores rather than embedding them in component YAML files.

## Summary

The Dapr Huawei OBS output binding provides a portable interface for interacting with Huawei Cloud object storage. By abstracting the OBS SDK behind a Dapr binding, your application code remains cloud-agnostic and easy to test. This pattern is particularly useful for file upload pipelines, report exports, and backup workflows in Huawei Cloud environments.
