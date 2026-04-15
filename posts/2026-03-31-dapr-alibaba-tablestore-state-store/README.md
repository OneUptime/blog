# How to Configure Dapr with Alibaba Cloud TableStore State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba Cloud, Tablestore, State Store, Cloud

Description: Learn how to configure Dapr with Alibaba Cloud TableStore as a state store for microservices deployed on Alibaba Cloud infrastructure.

---

## Overview

Alibaba Cloud TableStore (OTS) is a distributed NoSQL database service designed for massive amounts of structured data. It provides high performance, low cost, and strong consistency. As a Dapr state store, TableStore is the optimal choice for microservices running on Alibaba Cloud, enabling native integration without exporting data outside the cloud boundary.

## Prerequisites

- An Alibaba Cloud account with TableStore access
- Dapr CLI and runtime installed
- Alibaba Cloud CLI (aliyun) configured

## Setting Up TableStore

Create a TableStore instance from the Alibaba Cloud console or CLI:

```bash
# Create a TableStore instance via CLI
aliyun ots InsertInstance \
  --InstanceName dapr-state-instance \
  --RegionId cn-hangzhou
```

Create a table for Dapr state using the Alibaba Cloud console or the TableStore SDK, as table creation is a data-plane operation not available through the `aliyun` CLI. The table must have a primary key column named `key` of type `STRING`, with `MaxVersions` set to `1`.

## Configuring the Dapr Component

Create a Kubernetes secret with your Alibaba Cloud credentials:

```bash
kubectl create secret generic alibaba-secret \
  --from-literal=accessKeyID=YOUR_ACCESS_KEY_ID \
  --from-literal=accessKeySecret=YOUR_ACCESS_KEY_SECRET
```

Create the Dapr state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tablestore-statestore
  namespace: default
spec:
  type: state.alicloud.tablestore
  version: v1
  metadata:
  - name: endpoint
    value: "https://dapr-state-instance.cn-hangzhou.ots.aliyuncs.com"
  - name: accessKeyID
    secretKeyRef:
      name: alibaba-secret
      key: accessKeyID
  - name: accessKey
    secretKeyRef:
      name: alibaba-secret
      key: accessKeySecret
  - name: instanceName
    value: "dapr-state-instance"
  - name: tableName
    value: "DaprState"
```

Apply the component:

```bash
kubectl apply -f tablestore-statestore.yaml
```

## Using the TableStore State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store customer data for Alibaba Cloud workloads
await client.state.save("tablestore-statestore", [
  {
    key: "customer-cn-88001",
    value: {
      customerId: "cn-88001",
      name: "Zhang Wei",
      tier: "platinum",
      points: 15200,
      region: "cn-hangzhou"
    }
  }
]);

const customer = await client.state.get("tablestore-statestore", "customer-cn-88001");
console.log("Customer:", customer);
```

## Bulk State Operations

```bash
# Save multiple state entries at once
curl -X POST http://localhost:3500/v1.0/state/tablestore-statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "product-cn-001", "value": {"name": "Widget A", "stock": 500}},
    {"key": "product-cn-002", "value": {"name": "Widget B", "stock": 300}},
    {"key": "product-cn-003", "value": {"name": "Widget C", "stock": 800}}
  ]'
```

## Summary

Alibaba Cloud TableStore as a Dapr state store provides a fully managed, high-throughput NoSQL backend optimized for Alibaba Cloud workloads. By keeping state within the Alibaba Cloud boundary, you benefit from reduced egress costs, lower latency, and streamlined IAM management using Alibaba Cloud RAM policies.
