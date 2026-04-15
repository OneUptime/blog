# How to Use Dapr with Alibaba Cloud Tablestore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba, Tablestore, State, NoSQL

Description: Configure Dapr state management with Alibaba Cloud Tablestore as the backend for scalable, low-latency microservice state storage on Alibaba Cloud.

---

## Overview

Alibaba Cloud Tablestore is a serverless NoSQL database service optimized for large-scale structured data with millisecond-level read/write latency. Dapr supports Tablestore as a state store, enabling microservices to persist state using a consistent API backed by Tablestore's scalable infrastructure.

## Prerequisites

- Alibaba Cloud account with Tablestore enabled
- A Tablestore instance created
- RAM user with `AliyunOTSFullAccess` policy
- Dapr installed

## Creating a Tablestore Instance

From the Alibaba Cloud console or CLI:

```bash
# Using aliyun CLI
aliyun ots CreateInstance \
  --InstanceName=dapr-state \
  --ClusterType=SSD \
  --Description="Dapr state store"
```

## Configuring the Dapr State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.alicloud.tablestore
  version: v1
  metadata:
  - name: accessKeyID
    secretKeyRef:
      name: alibaba-credentials
      key: accessKeyID
  - name: accessKey
    secretKeyRef:
      name: alibaba-credentials
      key: accessKey
  - name: endpoint
    value: "https://dapr-state.cn-hangzhou.ots.aliyuncs.com"
  - name: instanceName
    value: "dapr-state"
  - name: tableName
    value: "dapr_state_table"
```

## Saving and Retrieving State

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "session-abc123",
    "value": {"userId": "user-42", "cart": ["item-1", "item-2"], "expiry": 3600}
  }]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/session-abc123
```

## ETag-Based Optimistic Concurrency

```python
import json
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateOptions, Concurrency

with DaprClient() as client:
    # Get current state with ETag
    state = client.get_state("statestore", "inventory-widget")
    current_etag = state.etag
    current_value = json.loads(state.data)

    # Update with concurrency check
    new_value = {**current_value, "quantity": current_value["quantity"] - 1}
    client.save_state(
        store_name="statestore",
        key="inventory-widget",
        value=json.dumps(new_value),
        etag=current_etag,
        options=StateOptions(concurrency=Concurrency.first_write)
    )
```

## Summary

Dapr's Alibaba Cloud Tablestore state store integration provides a highly scalable, low-latency backend for microservice state on Alibaba Cloud. With support for bulk operations and ETag-based optimistic concurrency, Tablestore is well-suited for high-throughput stateful microservices deployed in Chinese cloud regions.
