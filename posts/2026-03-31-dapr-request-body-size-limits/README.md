# How to Configure Request Body Size Limits in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Request, Body, Configuration

Description: Learn how to configure Dapr sidecar request body size limits to handle large payloads in file uploads, batch operations, and data ingestion workflows.

---

## Overview

Dapr's sidecar HTTP server enforces a default maximum request body size of 4 MB. Services that handle file uploads, batch records, or large binary payloads need to increase this limit to avoid receiving `413 Payload Too Large` responses.

## Default Limit and the Problem

The default `max-body-size` is 4 MB. If your service receives a payload larger than this, Dapr rejects it before it reaches your application:

```bash
curl -X POST http://localhost:3500/v1.0/invoke/upload-service/method/upload \
  -H "Content-Type: application/octet-stream" \
  --data-binary @large-file.bin
# Returns: 413 Request Entity Too Large
```

## Increasing the Request Body Limit

Set the limit via Kubernetes annotations (value in MB):

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "upload-service"
  dapr.io/app-port: "8080"
  dapr.io/max-body-size: "64Mi"
```

For local development with the CLI:

```bash
dapr run --app-id upload-service \
  --max-body-size 64Mi \
  --app-port 8080 \
  -- node server.js
```

## Handling Large Uploads in Application Code

Once the sidecar limit is raised, handle the data stream efficiently:

```javascript
const express = require('express');
const app = express();

// Configure express body parser for large payloads
app.use(express.raw({ limit: '64mb', type: 'application/octet-stream' }));

app.post('/upload', (req, res) => {
    const fileSize = req.body.length;
    console.log(`Received file: ${fileSize} bytes`);
    // Process the file...
    res.json({ received: fileSize });
});

app.listen(8080);
```

## Batch Operations with Large Bodies

For batch data ingestion, structure payloads to stay within practical limits:

```python
import requests, json

def ingest_batch(records: list, batch_size=1000):
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        payload = json.dumps({"records": batch})
        # Verify batch size before sending
        size_mb = len(payload.encode()) / (1024 * 1024)
        print(f"Batch {i//batch_size}: {size_mb:.2f} MB")
        response = requests.post(
            "http://localhost:3500/v1.0/invoke/ingest-service/method/batch",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
```

## Setting Limits for Pub/Sub Messages

Pub/sub message body limits are separate from HTTP invocation. Configure them in the pubsub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: maxMessageBytes
    value: "10485760"
```

## Security Considerations

Larger body limits increase memory consumption per request. Set limits appropriate to your actual use case:

```yaml
# For file upload services: 64MB
dapr.io/max-body-size: "64Mi"

# For API services with JSON payloads: 8MB
dapr.io/max-body-size: "8Mi"

# For lightweight microservices: keep default 4Mi
```

## Summary

Dapr's `max-body-size` annotation controls the maximum body size accepted by the sidecar HTTP server. Increase it per-service based on actual payload needs, and also configure your application framework's own body parser limits to match, ensuring large requests are handled end-to-end without truncation.
