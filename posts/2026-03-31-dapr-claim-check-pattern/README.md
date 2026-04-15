# How to Implement Claim Check Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Claim Check, Pub/Sub, Blob Storage, Messaging

Description: Learn how to implement the Claim Check messaging pattern with Dapr to handle large payloads by storing them externally and passing only a reference in the message.

---

## What is the Claim Check Pattern?

Message brokers impose payload size limits (typically 256 KB to 1 MB). The Claim Check pattern handles large messages by storing the full payload in external storage (a blob store or object store) and including only a reference (the "claim check" or ticket) in the message. The subscriber uses the reference to retrieve the full payload.

Dapr bindings and state management provide the storage layer, while Dapr pub/sub carries the lightweight reference message.

## Implementing the Producer Side

The producer stores the large payload and publishes only the reference:

```python
import httpx
import uuid
import json
from fastapi import FastAPI
from datetime import datetime

app = FastAPI()
DAPR_HTTP_PORT = 3500
BLOB_STORE = "azure-blob"  # or any Dapr output binding

async def store_payload(payload: dict) -> str:
    """Store large payload in blob storage and return the reference key."""
    claim_id = str(uuid.uuid4())

    # Store in Dapr blob storage binding
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BLOB_STORE}",
            json={
                "operation": "create",
                "metadata": {
                    "blobName": f"payloads/{claim_id}.json"
                },
                "data": json.dumps(payload)
            }
        )

    return claim_id

@app.post("/reports/generate")
async def generate_report(report_data: dict):
    large_payload = {
        "reportId": str(uuid.uuid4()),
        "generatedAt": datetime.utcnow().isoformat(),
        "rows": report_data.get("rows", []),  # Could be thousands of rows
        "metadata": report_data.get("metadata", {})
    }

    # Store the large payload and get a claim check
    claim_id = await store_payload(large_payload)

    # Publish lightweight message with only the claim check
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/report-ready",
            json={
                "eventType": "ReportReady",
                "claimId": claim_id,
                "reportType": report_data.get("type"),
                "sizeBytes": len(json.dumps(large_payload)),
                "issuedAt": datetime.utcnow().isoformat()
            }
        )

    return {"claimId": claim_id, "status": "queued"}
```

## Implementing the Consumer Side

The consumer receives the lightweight message and redeems the claim check:

```python
import httpx
import json
from fastapi import FastAPI, Request

app = FastAPI()
DAPR_HTTP_PORT = 3500
BLOB_STORE = "azure-blob"

async def retrieve_payload(claim_id: str) -> dict:
    """Retrieve stored payload using the claim check reference."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BLOB_STORE}",
            json={
                "operation": "get",
                "metadata": {
                    "blobName": f"payloads/{claim_id}.json"
                }
            }
        )
        return resp.json()

@app.get("/dapr/subscribe")
def subscribe():
    return [{"pubsubname": "pubsub", "topic": "report-ready", "route": "/process-report"}]

@app.post("/process-report")
async def process_report(request: Request):
    body = await request.json()
    event = body.get("data", {})

    claim_id = event.get("claimId")
    if not claim_id:
        return {"status": "DROP"}

    # Redeem the claim check - retrieve the full payload
    payload = await retrieve_payload(claim_id)

    # Process the full report data
    await process_full_report(payload)

    # Optionally delete the claim check after processing
    await delete_payload(claim_id)

    return {"status": "SUCCESS"}
```

## Dapr Blob Storage Binding Component

Configure Azure Blob Storage as the claim check store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-blob
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
  - name: accountName
    value: mystorageaccount
  - name: accountKey
    secretKeyRef:
      name: storageKey
      key: storageKey
  - name: containerName
    value: claim-checks
```

For local development, use MinIO instead:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-blob
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: endpoint
    value: http://minio:9000
  - name: bucket
    value: claim-checks
  - name: accessKey
    value: minioadmin
  - name: secretKey
    value: minioadmin
  - name: forcePathStyle
    value: "true"
```

## Summary

The Claim Check pattern with Dapr keeps pub/sub messages lightweight regardless of payload size. Large payloads are stored using a Dapr output binding, and only a tiny reference is published to the message topic. Consumers retrieve the full payload on demand and delete it after processing. This approach stays within broker size limits while supporting arbitrarily large data transfer between services.
