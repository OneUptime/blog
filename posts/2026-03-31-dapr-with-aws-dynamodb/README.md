# How to Use Dapr with AWS DynamoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, DynamoDB, State Management, NoSQL

Description: Configure Dapr to use AWS DynamoDB as a state store, covering table creation, component setup, CRUD operations, and ETag-based optimistic concurrency.

---

Dapr's state management building block can use AWS DynamoDB as a backend store. Once configured, services interact with DynamoDB through Dapr's uniform state API without using the AWS SDK directly.

## Create the DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name dapr-state \
  --attribute-definitions \
    AttributeName=key,AttributeType=S \
  --key-schema \
    AttributeName=key,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Configure the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: table
    value: dapr-state
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: ttlAttributeName
    value: expiresAt
```

## CRUD Operations

```python
import requests

BASE_URL = "http://localhost:3500/v1.0/state/statestore"

# Save state
def save_order(order_id: str, order: dict):
    requests.post(BASE_URL, json=[
        {"key": f"order-{order_id}", "value": order}
    ]).raise_for_status()

# Get state
def get_order(order_id: str) -> dict:
    resp = requests.get(f"{BASE_URL}/order-{order_id}")
    resp.raise_for_status()
    return resp.json()

# Delete state
def delete_order(order_id: str):
    requests.delete(f"{BASE_URL}/order-{order_id}").raise_for_status()

# Usage
save_order("001", {"status": "pending", "total": 99.99, "items": ["item-1"]})
order = get_order("001")
print(order)
```

## Optimistic Concurrency with ETags

DynamoDB supports conditional writes. Dapr exposes this through ETags:

```python
import requests

def update_order_with_etag(order_id: str, order: dict, etag: str):
    resp = requests.post(
        "http://localhost:3500/v1.0/state/statestore",
        json=[{
            "key": f"order-{order_id}",
            "value": order,
            "etag": etag,
            "options": {
                "concurrency": "first-write",
                "consistency": "strong"
            }
        }]
    )
    if resp.status_code == 409:
        raise Exception("Concurrent update detected - retry with latest version")
    resp.raise_for_status()

# Get the current state including ETag
resp = requests.get("http://localhost:3500/v1.0/state/statestore/order-001")
etag = resp.headers.get("ETag")
order = resp.json()

# Update with ETag protection
order["status"] = "shipped"
update_order_with_etag("001", order, etag)
```

## Bulk State Operations

```python
# Save multiple items at once
def bulk_save(items: list):
    requests.post(
        "http://localhost:3500/v1.0/state/statestore",
        json=items
    ).raise_for_status()

bulk_save([
    {"key": "order-002", "value": {"status": "pending", "total": 25.00}},
    {"key": "order-003", "value": {"status": "shipped", "total": 150.00}},
    {"key": "order-004", "value": {"status": "delivered", "total": 75.50}},
])

# Bulk get
resp = requests.post(
    "http://localhost:3500/v1.0/state/statestore/bulk",
    json={"keys": ["order-002", "order-003", "order-004"]}
)
print(resp.json())
```

## Set TTL on State Entries

```python
# Save state with TTL (requires ttlAttributeName in component config)
requests.post("http://localhost:3500/v1.0/state/statestore", json=[{
    "key": "session-abc",
    "value": {"userId": "user-1"},
    "metadata": {
        "ttlInSeconds": "3600"
    }
}]).raise_for_status()
```

## Summary

Dapr's DynamoDB state store provides a clean abstraction over DynamoDB table operations, supporting CRUD, ETag-based concurrency control, bulk operations, and TTL. Services use the same state API regardless of whether the backend is DynamoDB, Redis, or another store, making it easy to switch state stores between environments without code changes.
