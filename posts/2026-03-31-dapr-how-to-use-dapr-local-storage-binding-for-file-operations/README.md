# How to Use Dapr Local Storage Binding for File Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Local Storage, File Operations, Binding, Microservice

Description: Learn how to use the Dapr Local Storage binding to read, write, and delete files on the local filesystem from your microservices through the Dapr sidecar API.

---

## What Is the Dapr Local Storage Binding

The Dapr Local Storage binding provides an output binding that lets your application perform file I/O - reading files, writing files, and deleting files - through a consistent Dapr API. This is useful for services that need to work with files on a shared volume, generate reports, or stage data temporarily before processing.

## Prerequisites

- Dapr CLI installed and initialized
- A directory that the Dapr sidecar can access for file operations
- Basic familiarity with Dapr bindings

## Define the Local Storage Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-files
  namespace: default
spec:
  type: bindings.localstorage
  version: v1
  metadata:
  - name: rootPath
    value: "/tmp/dapr-files"
```

The `rootPath` is the base directory for all file operations. All file paths provided at runtime are relative to this root.

Create the directory before running:

```bash
mkdir -p /tmp/dapr-files
```

## Supported Operations

```text
create  - write (create or overwrite) a file
get     - read the contents of a file
delete  - delete a file
list    - list files in a directory
```

## Write a File

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-files \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Hello from Dapr Local Storage!",
    "metadata": {
      "fileName": "hello.txt"
    },
    "operation": "create"
  }'
```

## Read a File

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-files \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "fileName": "hello.txt"
    },
    "operation": "get"
  }'
```

Response body contains the raw file content:

```text
Hello from Dapr Local Storage!
```

## Delete a File

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-files \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "fileName": "hello.txt"
    },
    "operation": "delete"
  }'
```

## List Files in a Directory

```bash
curl -X POST http://localhost:3500/v1.0/bindings/local-files \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "fileName": "reports/"
    },
    "operation": "list"
  }'
```

## Use in a Node.js Application

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const BINDING = 'local-files';

async function writeFile(path, content) {
  await client.binding.send(BINDING, 'create', content, {
    fileName: path,
  });
  console.log('File written:', path);
}

async function readFile(path) {
  const result = await client.binding.send(BINDING, 'get', '', {
    fileName: path,
  });
  return result?.data ?? null;
}

async function deleteFile(path) {
  await client.binding.send(BINDING, 'delete', '', {
    fileName: path,
  });
  console.log('File deleted:', path);
}

async function listFiles(directory) {
  const result = await client.binding.send(BINDING, 'list', '', {
    fileName: directory,
  });
  return result?.data ?? [];
}

// Example: generate and save a JSON report
async function generateDailyReport(data) {
  const date = new Date().toISOString().split('T')[0];
  const reportPath = `reports/daily-${date}.json`;

  const report = {
    generatedAt: new Date().toISOString(),
    totalOrders: data.orders.length,
    revenue: data.orders.reduce((sum, o) => sum + o.amount, 0),
    orders: data.orders,
  };

  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log('Daily report saved:', reportPath);
  return reportPath;
}

// Example: read and parse a config file
async function loadConfig() {
  const content = await readFile('config/app.json');
  if (!content) throw new Error('Config file not found');
  return JSON.parse(content);
}
```

## Use in a Python Application

```python
from dapr.clients import DaprClient
import json

BINDING = 'local-files'

def write_file(path: str, content: str):
    with DaprClient() as client:
        client.invoke_binding(
            binding_name=BINDING,
            operation='create',
            data=content,
            binding_metadata={'fileName': path}
        )
    print(f"File written: {path}")

def read_file(path: str) -> str:
    with DaprClient() as client:
        resp = client.invoke_binding(
            binding_name=BINDING,
            operation='get',
            data='',
            binding_metadata={'fileName': path}
        )
        return resp.text()

def delete_file(path: str):
    with DaprClient() as client:
        client.invoke_binding(
            binding_name=BINDING,
            operation='delete',
            data='',
            binding_metadata={'fileName': path}
        )

# Write a CSV report
def save_csv_report(filename: str, rows: list):
    import csv, io
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    write_file(filename, buffer.getvalue())
```

## Use with Kubernetes Shared Volumes

On Kubernetes, mount a shared PersistentVolumeClaim so multiple pods can access the same files:

```yaml
spec:
  containers:
  - name: app
    volumeMounts:
    - name: shared-files
      mountPath: /tmp/dapr-files
  volumes:
  - name: shared-files
    persistentVolumeClaim:
      claimName: shared-pvc
```

## Summary

The Dapr Local Storage binding provides a simple, consistent API for file read, write, delete, and list operations through the Dapr sidecar. It is particularly useful for generating reports, sharing files between services via mounted volumes, and staging data for processing. The component's `rootPath` configuration allows easy environment-specific path configuration without changing application code.
