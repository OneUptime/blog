# How to Use Dapr with Huawei Cloud OBS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Huawei, OBS, Storage, Binding

Description: Configure the Dapr Huawei Cloud OBS output binding to perform object storage operations from microservices on Huawei Cloud infrastructure.

---

## Overview

Huawei Cloud Object Storage Service (OBS) is Huawei's scalable object storage solution, commonly used in telecom and enterprise deployments. Dapr provides an OBS output binding that enables microservices to upload, download, and manage objects in Huawei OBS through a consistent API.

## Prerequisites

- Huawei Cloud account with OBS service enabled
- An OBS bucket created
- Access Key ID and Secret Access Key with OBS permissions
- Dapr installed

## Creating an OBS Bucket

```bash
# Using hcloud CLI or Huawei Cloud Console
# Create bucket in cn-north-4 region
obsutil mb obs://my-dapr-bucket -e=obs.cn-north-4.myhuaweicloud.com
```

## Configuring the Dapr Binding Component

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
    value: "my-dapr-bucket"
  - name: endpoint
    value: "obs.cn-north-4.myhuaweicloud.com"
  - name: accessKey
    secretKeyRef:
      name: huawei-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: huawei-credentials
      key: secretKey
```

Store credentials as a Kubernetes secret:

```bash
kubectl create secret generic huawei-credentials \
  --from-literal=accessKey=YOUR_ACCESS_KEY \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

## Uploading Files

```bash
curl -X POST http://localhost:3500/v1.0/bindings/huawei-obs \
  -H "Content-Type: application/json" \
  -d '{
    "data": "eyJvcmRlcklkIjogIjEwMDEifQ==",
    "metadata": {
      "key": "orders/order-1001.json",
      "contentType": "application/json"
    },
    "operation": "create"
  }'
```

From a Python microservice:

```python
import json
from dapr.clients import DaprClient

def archive_order(order_data: dict, order_id: str):
    content = json.dumps(order_data)

    with DaprClient() as client:
        client.invoke_binding(
            binding_name="huawei-obs",
            operation="create",
            data=content,
            binding_metadata={
                "key": f"orders/{order_id}.json",
                "contentType": "application/json"
            }
        )
    print(f"Order {order_id} archived to OBS")
```

## Downloading Files

```bash
curl -X POST http://localhost:3500/v1.0/bindings/huawei-obs \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"key": "orders/order-1001.json"},
    "operation": "get"
  }'
```

## Deleting Files

```bash
curl -X POST http://localhost:3500/v1.0/bindings/huawei-obs \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"key": "orders/expired-order.json"},
    "operation": "delete"
  }'
```

## Summary

Dapr's Huawei Cloud OBS binding provides a clean abstraction for object storage operations on Huawei Cloud infrastructure. Microservices interact with OBS through the standard Dapr binding API, making storage operations portable and keeping Huawei SDK dependencies out of business logic code.
