# How to Build a Data Lake Ingestion Pipeline with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Data Lake, Ingestion, Pipeline, Analytics

Description: Build a scalable data lake ingestion pipeline with Dapr using pub/sub for event collection, bindings for storage writes, and batching for efficient S3/ADLS ingestion.

---

## Data Lake Ingestion Architecture

A data lake ingestion pipeline collects events from operational systems, enriches and validates them, batches for efficiency, and writes to object storage in analytics-friendly formats (Parquet, Delta Lake, JSON).

```text
Services (Order, User, Product) --> [events] --> Collector
                                                      |
                                               [batch-ready] --> Validator
                                                                      |
                                                               [validated] --> Transformer
                                                                                    |
                                                                             [transformed] --> Storage Writer
                                                                                                   |
                                                                                              S3 / ADLS
```

## Event Collector with Batching

```python
# collector_service.py
from fastapi import FastAPI
from dapr.ext.fastapi import DaprApp
from dapr.clients import DaprClient
import json, time, uuid
from collections import defaultdict
from threading import Lock

app = FastAPI()
dapr_app = DaprApp(app)

# In-memory buffer (use Redis-backed for production)
event_buffer = defaultdict(list)
buffer_lock = Lock()
BATCH_SIZE = 1000
FLUSH_INTERVAL_SECONDS = 60

@dapr_app.subscribe(pubsub="pubsub", topic="order-events")
async def collect_order_event(event: dict):
    return await buffer_event("orders", event.get("data", {}))

@dapr_app.subscribe(pubsub="pubsub", topic="user-events")
async def collect_user_event(event: dict):
    return await buffer_event("users", event.get("data", {}))

async def buffer_event(stream: str, data: dict):
    data["_ingested_at"] = int(time.time() * 1000)
    data["_event_id"] = str(uuid.uuid4())

    with buffer_lock:
        event_buffer[stream].append(data)

        if len(event_buffer[stream]) >= BATCH_SIZE:
            batch = event_buffer[stream][:]
            event_buffer[stream] = []
            await flush_batch(stream, batch)

    return {"status": "SUCCESS"}

async def flush_batch(stream: str, batch: list):
    batch_id = str(uuid.uuid4())
    with DaprClient() as client:
        client.save_state("statestore", f"batch-{stream}-{batch_id}", json.dumps({
            "batchId": batch_id,
            "stream": stream,
            "recordCount": len(batch),
            "records": batch,
            "createdAt": int(time.time() * 1000)
        }))

        client.publish_event("pubsub", "batch-ready", json.dumps({
            "batchId": batch_id,
            "stream": stream,
            "recordCount": len(batch)
        }), data_content_type="application/json")
```

## Schema Validator Service

```go
// validator/main.go
package main

import (
    "context"
    "encoding/json"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
)

type BatchReadyEvent struct {
    BatchID     string `json:"batchId"`
    Stream      string `json:"stream"`
    RecordCount int    `json:"recordCount"`
}

func handleBatchReady(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event BatchReadyEvent
    json.Unmarshal(e.RawData, &event)

    client, _ := dapr.NewClient()
    defer client.Close()

    // Get batch from state
    batchState, _ := client.GetState(ctx, "statestore",
        "batch-"+event.Stream+"-"+event.BatchID, nil)

    var batch map[string]interface{}
    json.Unmarshal(batchState.Value, &batch)

    records := batch["records"].([]interface{})
    schema := getSchema(event.Stream)

    validRecords := []interface{}{}
    invalidRecords := []interface{}{}

    for _, record := range records {
        r := record.(map[string]interface{})
        if validateRecord(r, schema) {
            validRecords = append(validRecords, r)
        } else {
            r["_validation_error"] = "schema_mismatch"
            invalidRecords = append(invalidRecords, r)
        }
    }

    // Save valid batch for transformation
    validated := map[string]interface{}{
        "batchId":      event.BatchID,
        "stream":       event.Stream,
        "validCount":   len(validRecords),
        "invalidCount": len(invalidRecords),
        "records":      validRecords,
    }
    validatedJSON, _ := json.Marshal(validated)
    client.SaveState(ctx, "statestore",
        "validated-"+event.BatchID, validatedJSON, nil)

    client.PublishEvent(ctx, "pubsub", "batch-validated", map[string]interface{}{
        "batchId":    event.BatchID,
        "stream":     event.Stream,
        "validCount": len(validRecords),
    })

    return false, nil
}
```

## Storage Writer with Dapr Output Binding

```yaml
# dapr/components/s3-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: data-lake-s3
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: "my-data-lake"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-secret
      key: access-key
  - name: secretKey
    secretKeyRef:
      name: aws-secret
      key: secret-key
```

```python
# storage_writer.py
from dapr.ext.fastapi import DaprApp
from dapr.clients import DaprClient
import json, time
from fastapi import FastAPI

app = FastAPI()
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="pubsub", topic="batch-validated")
async def write_to_data_lake(event: dict):
    data = event.get("data", {})
    batch_id = data.get("batchId")
    stream = data.get("stream")

    with DaprClient() as client:
        state = client.get_state("statestore", f"validated-{batch_id}")
        batch = json.loads(state.data)

        # Convert records to newline-delimited JSON
        ndjson = "\n".join(json.dumps(r) for r in batch["records"])

        # Write to S3 via Dapr output binding
        year_month = time.strftime("%Y/%m/%d")
        s3_key = f"{stream}/{year_month}/{batch_id}.ndjson"

        client.invoke_binding(
            binding_name="data-lake-s3",
            operation="create",
            data=ndjson.encode('utf-8'),
            binding_metadata={"key": s3_key, "contentType": "application/x-ndjson"}
        )

    return {"status": "SUCCESS"}
```

## Summary

A Dapr data lake ingestion pipeline uses pub/sub for reliable event collection, in-memory batching to reduce write operations, and Dapr output bindings to write directly to S3 or Azure Data Lake Storage. The validation stage ensures only schema-conformant records reach the data lake, while invalid records are quarantined for investigation. This architecture cleanly separates concerns between event collection, quality assurance, and storage, enabling each stage to scale according to its processing demand.
