# How to Use Dapr Alibaba Cloud Tablestore Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Alibaba Cloud, Tablestore, Output Binding

Description: Configure the Dapr Alibaba Cloud Tablestore output binding to write structured data to a NoSQL wide-column store from any Dapr-enabled microservice.

---

Alibaba Cloud Tablestore is a serverless NoSQL wide-column database suited for time-series data, IoT telemetry, and audit logs. Dapr's Tablestore output binding lets services write rows without embedding the Tablestore SDK.

## Prerequisites

- An Alibaba Cloud Tablestore instance with a table created
- Access key with Tablestore write permissions
- Dapr sidecar running (self-hosted or Kubernetes)

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tablestore-binding
  namespace: default
spec:
  type: bindings.alicloud.tablestore
  version: v1
  metadata:
  - name: endpoint
    value: "https://myinstance.cn-hangzhou.ots.aliyuncs.com"
  - name: accessKeyID
    value: "YOUR_ACCESS_KEY_ID"
  - name: accessKey
    secretKeyRef:
      name: alibaba-tablestore-secret
      key: accessKey
  - name: instanceName
    value: "myinstance"
  - name: tableName
    value: "sensor_readings"
```

Create the Kubernetes secret:

```bash
kubectl create secret generic alibaba-tablestore-secret \
  --from-literal=accessKey=YOUR_SECRET_KEY
```

## Writing a Row via HTTP

The binding expects `data` containing all column values (including primary keys) and a `primaryKeys` metadata field listing the primary key column names:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/tablestore-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "deviceId": "sensor-001",
      "timestamp": 1711900800,
      "temperature": 23.5,
      "humidity": 65,
      "location": "rack-A1"
    },
    "metadata": {
      "primaryKeys": "deviceId,timestamp"
    }
  }'
```

## Writing from Python

```python
import requests

def write_sensor_reading(device_id: str, temperature: float, ts: int):
    payload = {
        "operation": "create",
        "data": {
            "deviceId": device_id,
            "timestamp": ts,
            "temperature": temperature,
        },
        "metadata": {
            "primaryKeys": "deviceId,timestamp"
        }
    }
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/tablestore-binding",
        json=payload
    )
    resp.raise_for_status()
```

## Deleting a Row

Use the `delete` operation with matching primary keys:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/tablestore-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "delete",
    "data": {
      "deviceId": "sensor-001",
      "timestamp": 1711900800
    },
    "metadata": {
      "primaryKeys": "deviceId,timestamp"
    }
  }'
```

## Best Practices

- Design primary keys carefully - Tablestore is optimized for range queries on primary key prefixes.
- Use timestamp as a secondary primary key column for time-series workloads to enable efficient time-range scans.
- Keep column values compact; Tablestore charges per read/write CU based on data size.
- Batch writes when ingesting high-frequency telemetry to reduce API call overhead.

## Summary

The Dapr Alibaba Cloud Tablestore output binding provides a clean interface for writing structured rows to a serverless NoSQL store. It removes the need for SDK management inside application code and integrates naturally with Dapr's component-based configuration model. This approach is well-suited for IoT telemetry pipelines and audit log ingestion patterns.
