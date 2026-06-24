# How to Use Dapr with AWS S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, S3, Binding, Object Storage

Description: Use Dapr output and input bindings to interact with AWS S3 for object uploads, downloads, and event-triggered processing without the AWS SDK.

---

Dapr bindings let services interact with AWS S3 for object storage operations. The S3 binding supports create (upload), get (download), delete, and list operations through a uniform binding API.

## Create the S3 Bucket

```bash
aws s3api create-bucket \
  --bucket my-dapr-bucket \
  --region us-east-1

# Enable versioning (optional)
aws s3api put-bucket-versioning \
  --bucket my-dapr-bucket \
  --versioning-configuration Status=Enabled
```

## Configure the Dapr S3 Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-binding
  namespace: default
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: my-dapr-bucket
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: forcePathStyle
    value: "false"
```

## Upload an Object (Create Operation)

```python
import requests
import json

def upload_file(key: str, content, content_type: str = "application/octet-stream"):
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/s3-binding",
        json={
            "operation": "create",
            "data": content,
            "metadata": {
                "key": key,
                "contentType": content_type
            }
        }
    )
    resp.raise_for_status()
    return resp.json()

# Upload a JSON report
report = {"total": 1500, "orders": 42}
result = upload_file("reports/daily-2026-03-31.json", report, "application/json")
print(result)
```

## Download an Object (Get Operation)

```python
def download_file(key: str) -> bytes:
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/s3-binding",
        json={
            "operation": "get",
            "metadata": {
                "key": key
            }
        }
    )
    resp.raise_for_status()
    return resp.content

content = download_file("reports/daily-2026-03-31.json")
print(content.decode("utf-8"))
```

## List Objects

```python
def list_objects(prefix: str = "") -> dict:
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/s3-binding",
        json={
            "operation": "list",
            "data": {
                "prefix": prefix,
                "maxResults": 100
            }
        }
    )
    resp.raise_for_status()
    return resp.json()

result = list_objects(prefix="reports/")
for obj in result.get("Contents", []):
    print(obj["Key"], obj["LastModified"])
```

## Delete an Object

```python
def delete_file(key: str):
    requests.post(
        "http://localhost:3500/v1.0/bindings/s3-binding",
        json={
            "operation": "delete",
            "metadata": {
                "key": key
            }
        }
    ).raise_for_status()

delete_file("reports/daily-2026-03-01.json")
```

## Generate a Pre-signed URL

```python
def get_presigned_url(key: str, ttl_seconds: int = 3600) -> str:
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/s3-binding",
        json={
            "operation": "presign",
            "metadata": {
                "key": key,
                "presignTTL": f"{ttl_seconds}s"
            }
        }
    )
    resp.raise_for_status()
    return resp.json()["presignURL"]

url = get_presigned_url("reports/daily-2026-03-31.json", ttl_seconds=900)
print("Download URL:", url)
```

## Summary

Dapr's S3 binding provides a clean API for object storage operations including create, get, delete, list, and pre-signed URL generation. By routing S3 interactions through the Dapr sidecar, services avoid direct AWS SDK dependencies and can swap storage backends (S3, Azure Blob, GCS) simply by changing the component configuration.
