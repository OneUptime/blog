# How to Use Dapr with Alibaba Cloud Object Storage (OSS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba, OSS, Storage, Binding

Description: Use Dapr's Alibaba Cloud OSS output binding to upload, download, and manage objects in Alibaba Cloud Object Storage from microservices.

---

## Overview

Alibaba Cloud Object Storage Service (OSS) is a scalable cloud storage service commonly used in Asia-Pacific deployments. Dapr provides an OSS output binding that enables microservices to upload objects to OSS through Dapr's consistent binding API. The binding currently supports the `create` operation for uploading objects.

## Prerequisites

- Alibaba Cloud account with OSS enabled
- An OSS bucket created
- Access Key ID and Secret with OSS permissions
- Dapr installed

## Creating an OSS Bucket

From the Alibaba Cloud Console or CLI:

```bash
# Using ossutil CLI
ossutil mb oss://my-dapr-bucket -e oss-cn-hangzhou.aliyuncs.com
ossutil set-acl oss://my-dapr-bucket private -b
```

## Configuring the Dapr Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: alibaba-oss
  namespace: default
spec:
  type: bindings.alicloud.oss
  version: v1
  metadata:
  - name: endpoint
    value: "https://oss-cn-hangzhou.aliyuncs.com"
  - name: accessKeyID
    secretKeyRef:
      name: alibaba-credentials
      key: accessKeyID
  - name: accessKey
    secretKeyRef:
      name: alibaba-credentials
      key: accessKey
  - name: bucket
    value: "my-dapr-bucket"
```

Store credentials as a Kubernetes secret:

```bash
kubectl create secret generic alibaba-credentials \
  --from-literal=accessKeyID=YOUR_ACCESS_KEY_ID \
  --from-literal=accessKey=YOUR_ACCESS_KEY_SECRET
```

## Uploading Objects

```bash
curl -X POST http://localhost:3500/v1.0/bindings/alibaba-oss \
  -H "Content-Type: application/json" \
  -d '{
    "data": "SGVsbG8gV29ybGQ=",
    "metadata": {
      "key": "uploads/hello.txt"
    },
    "operation": "create"
  }'
```

From a Go microservice:

```go
import dapr "github.com/dapr/go-sdk/client"

func uploadDocument(ctx context.Context, client dapr.Client, key string, content []byte) error {
    _, err := client.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "alibaba-oss",
        Operation: "create",
        Data:      content,
        Metadata: map[string]string{
            "key": key,
        },
    })
    return err
}
```

## Summary

Dapr's Alibaba Cloud OSS binding provides a clean abstraction for uploading objects to Alibaba Cloud. By routing OSS interactions through the Dapr binding API, microservices remain portable and can be migrated between storage providers without code changes. Note that the OSS binding currently only supports the `create` operation for uploading objects; for downloading, deleting, or listing objects, you will need to use the Alibaba Cloud OSS SDK directly.
