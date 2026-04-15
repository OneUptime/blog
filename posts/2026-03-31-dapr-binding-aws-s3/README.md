# How to Set Up Dapr Binding with AWS S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, AWS S3, Object Storage, Integration

Description: Configure a Dapr AWS S3 output binding to create, read, delete, and list objects in an S3 bucket from your application via a simple HTTP API.

---

## Overview

The Dapr AWS S3 binding provides a portable interface for interacting with S3-compatible object storage. Your application calls the Dapr HTTP API without any AWS SDK dependency. The sidecar handles authentication, retries, and S3 API calls.

## Prerequisites

- AWS account with an S3 bucket
- IAM credentials with S3 permissions
- Dapr CLI initialized

## Creating the S3 Bucket

```bash
aws s3 mb s3://my-dapr-files --region us-east-1
```

## IAM Policy for S3 Binding

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::my-dapr-files",
        "arn:aws:s3:::my-dapr-files/*"
      ]
    }
  ]
}
```

## Configuring the S3 Binding Component

```yaml
# s3-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-storage
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: "my-dapr-files"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

Create the Kubernetes secret:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## For Self-Hosted Mode

Create a local secrets file:

```json
{
  "aws-credentials": {
    "accessKey": "AKIAIOSFODNN7EXAMPLE",
    "secretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

Reference it in a secret store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "/path/to/secrets.json"
```

## Supported Operations

| Operation | Description |
|-----------|-------------|
| `create` | Upload an object |
| `get` | Download an object |
| `delete` | Delete an object |
| `list` | List objects in the bucket |

## Uploading a File (create)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-storage \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Hello from Dapr!",
    "metadata": {
      "key": "hello.txt",
      "contentType": "text/plain"
    },
    "operation": "create"
  }'
```

For binary files, encode the content as base64:

```bash
CONTENT=$(base64 -i image.png)
curl -X POST http://localhost:3500/v1.0/bindings/s3-storage \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": \"$CONTENT\",
    \"metadata\": {
      \"key\": \"images/photo.png\",
      \"contentType\": \"image/png\"
    },
    \"operation\": \"create\"
  }"
```

## Downloading a File (get)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-storage \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"key": "hello.txt"},
    "operation": "get"
  }'
```

## Deleting a File (delete)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-storage \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"key": "hello.txt"},
    "operation": "delete"
  }'
```

## Listing Objects (list)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-storage \
  -H "Content-Type: application/json" \
  -d '{
    "data": "",
    "metadata": {"prefix": "reports/"},
    "operation": "list"
  }'
```

## Python Examples

```python
import requests
import os
import base64

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")
BINDING_NAME = "s3-storage"

def s3_create(key, content, content_type="application/octet-stream"):
    if isinstance(content, bytes):
        content = base64.b64encode(content).decode("utf-8")
    payload = {
        "operation": "create",
        "data": content,
        "metadata": {"key": key, "contentType": content_type}
    }
    resp = requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}",
        json=payload
    )
    resp.raise_for_status()
    print(f"Uploaded: {key}")

def s3_get(key):
    payload = {
        "operation": "get",
        "metadata": {"key": key}
    }
    resp = requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}",
        json=payload
    )
    resp.raise_for_status()
    return resp.json()

def s3_delete(key):
    payload = {
        "operation": "delete",
        "metadata": {"key": key}
    }
    resp = requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}",
        json=payload
    )
    resp.raise_for_status()
    print(f"Deleted: {key}")

def s3_list(prefix=""):
    payload = {
        "operation": "list",
        "data": "",
        "metadata": {"prefix": prefix}
    }
    resp = requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}",
        json=payload
    )
    resp.raise_for_status()
    return resp.json()

# Upload a report
report = "Date,Sales\n2026-03-31,9999\n"
s3_create("reports/sales-2026-03-31.csv", report, "text/csv")

# Download it
content = s3_get("reports/sales-2026-03-31.csv")
print("Downloaded:", content)

# List reports
files = s3_list("reports/")
print("Files:", files)

# Clean up
s3_delete("reports/sales-2026-03-31.csv")
```

## Go Example

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "log"
)

type S3Request struct {
    Data      string            `json:"data"`
    Metadata  map[string]string `json:"metadata"`
    Operation string            `json:"operation"`
}

func s3Op(op, key, data string, extra map[string]string) ([]byte, error) {
    meta := map[string]string{"key": key}
    for k, v := range extra {
        meta[k] = v
    }
    req := S3Request{Data: data, Metadata: meta, Operation: op}
    body, _ := json.Marshal(req)
    resp, err := http.Post(
        "http://localhost:3500/v1.0/bindings/s3-storage",
        "application/json",
        bytes.NewBuffer(body),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}

func main() {
    // Upload
    _, err := s3Op("create", "data/file.txt", "Hello World", map[string]string{
        "contentType": "text/plain",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Uploaded")

    // Download
    content, _ := s3Op("get", "data/file.txt", "", nil)
    fmt.Println("Content:", string(content))
}
```

## Presigned URL Support

Generate a presigned URL for an existing object using the `presign` operation:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-storage \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "key": "hello.txt",
      "presignTTL": "15m"
    },
    "operation": "presign"
  }'
```

You can also get a presigned URL when uploading by adding `presignTTL` to the `create` operation metadata:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/s3-storage \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Hello from Dapr!",
    "metadata": {
      "key": "hello.txt",
      "presignTTL": "1h"
    },
    "operation": "create"
  }'
```

## Using with S3-Compatible Storage (MinIO)

```yaml
  - name: endpoint
    value: "http://minio:9000"
  - name: forcePathStyle
    value: "true"
  - name: disableSSL
    value: "true"
```

## Summary

The Dapr AWS S3 binding gives your application a clean HTTP interface for S3 object operations without the AWS SDK. Configure the binding YAML with bucket name and credentials, then use `create`, `get`, `delete`, and `list` operations via the `/v1.0/bindings` endpoint. The same code works with MinIO and other S3-compatible stores by changing the endpoint metadata.
