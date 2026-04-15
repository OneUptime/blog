# How to Configure Dapr Binding with Local Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Storage, File, Local

Description: Configure the Dapr local storage output binding to read and write files on the host filesystem for development workflows, sidecar-shared volumes, and data exports.

---

## Overview

The Dapr local storage binding provides `create`, `get`, `list`, and `delete` operations on the local filesystem. It is primarily used in development and self-hosted environments, or in Kubernetes with shared `emptyDir` or `PersistentVolume` mounts.

```mermaid
flowchart LR
    App[Microservice] -->|POST /v1.0/bindings/local-storage| Sidecar[Dapr Sidecar]
    Sidecar -->|Read / Write| LocalFS[Local Filesystem\n/var/dapr/data/]
    LocalFS -->|Mount| SharedVol[Shared Volume\nPVC / emptyDir]
```

## Prerequisites

- Dapr CLI installed and initialized
- A directory writable by the Dapr sidecar process

## Component Configuration

```yaml
# binding-local-storage.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-storage
  namespace: default
spec:
  type: bindings.localstorage
  version: v1
  metadata:
  - name: rootPath
    value: "/var/dapr/data"
```

For self-hosted development:

```yaml
  - name: rootPath
    value: "/tmp/dapr-storage"
```

Apply:

```bash
# Self-hosted
mkdir -p /tmp/dapr-storage
cp binding-local-storage.yaml ~/.dapr/components/

# Kubernetes
kubectl apply -f binding-local-storage.yaml
```

## Kubernetes: Shared Volume Setup

```yaml
# deployment-with-storage.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-processor
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: file-processor
  template:
    metadata:
      labels:
        app: file-processor
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "file-processor"
        dapr.io/app-port: "5001"
        dapr.io/volume-mounts-rw: "data-volume:/var/dapr/data"
    spec:
      containers:
      - name: file-processor
        image: your-image:latest
        ports:
        - containerPort: 5001
        volumeMounts:
        - name: data-volume
          mountPath: /var/dapr/data
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: dapr-data-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dapr-data-pvc
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Writing a File

```bash
# Write text content
curl -X POST http://localhost:3500/v1.0/bindings/local-storage \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "order-id,item,quantity,total\nORD-001,laptop,1,999.99\nORD-002,mouse,3,89.97",
    "metadata": {
      "fileName": "exports/orders-2026-03-31.csv"
    }
  }'
```

Writing JSON:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-storage \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "{\"reportDate\": \"2026-03-31\", \"totalOrders\": 542, \"revenue\": 28000.00}",
    "metadata": {
      "fileName": "reports/daily-2026-03-31.json"
    }
  }'
```

## Reading a File

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-storage \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get",
    "metadata": {
      "fileName": "reports/daily-2026-03-31.json"
    }
  }'
```

## Listing Files

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-storage \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "list",
    "metadata": {
      "fileName": "reports/"
    }
  }'
```

## Deleting a File

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-storage \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "delete",
    "metadata": {
      "fileName": "exports/orders-2026-03-31.csv"
    }
  }'
```

## Python Application: File Export Service

```python
# file_export_service.py
import json
import csv
import io
import requests
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)
DAPR_HTTP_PORT = 3500
BINDING_NAME = "local-storage"

def write_file(filename: str, content: str):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}"
    payload = {
        "operation": "create",
        "data": content,
        "metadata": {"fileName": filename}
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    print(f"Written: {filename}")

def read_file(filename: str) -> str:
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{BINDING_NAME}"
    payload = {
        "operation": "get",
        "metadata": {"fileName": filename}
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.text

@app.route('/export-orders', methods=['POST'])
def export_orders():
    data = request.get_json()
    orders = data.get('orders', [])
    date = datetime.utcnow().strftime('%Y-%m-%d')

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['OrderID', 'Item', 'Quantity', 'Total'])
    for order in orders:
        writer.writerow([
            order['orderId'],
            order['item'],
            order['qty'],
            order['total']
        ])

    csv_content = output.getvalue()
    filename = f"exports/orders-{date}.csv"
    write_file(filename, csv_content)

    return jsonify({
        "status": "exported",
        "filename": filename,
        "records": len(orders)
    })

@app.route('/read-report', methods=['GET'])
def read_report():
    filename = request.args.get('filename')
    content = read_file(filename)
    return jsonify({"filename": filename, "content": content})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

## Running Locally

```bash
mkdir -p /tmp/dapr-storage/exports /tmp/dapr-storage/reports

dapr run \
  --app-id file-processor \
  --app-port 5001 \
  --dapr-http-port 3500 \
  --components-path ~/.dapr/components \
  -- python file_export_service.py
```

## Summary

The Dapr local storage binding provides file `create`, `get`, `list`, and `delete` operations against a configured root directory. It is best suited for development environments or Kubernetes pods with a shared PersistentVolume. Specify the target file path in the `fileName` metadata field per request. For production scenarios requiring durability and remote access, consider switching to Azure Blob Storage or AWS S3 bindings with minimal component changes.
