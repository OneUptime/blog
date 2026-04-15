# How to Use Dapr SFTP Binding for File Transfer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, SFTP, File Transfer, Integration

Description: Learn how to configure the Dapr SFTP binding to upload and download files to remote SFTP servers from any microservice using Dapr's standard binding API.

---

## Why Use the Dapr SFTP Binding

SFTP is commonly used for exchanging files with partners, legacy systems, and compliance-sensitive environments. The Dapr SFTP binding handles SSH connection management and key authentication, letting services focus on business logic.

## Configure the SFTP Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sftp-server
spec:
  type: bindings.sftp
  version: v1
  metadata:
  - name: rootPath
    value: /data
  - name: address
    value: sftp.partner.com:22
  - name: username
    value: sftpuser
  - name: password
    secretKeyRef:
      name: sftp-secret
      key: password
  - name: hostPublicKey
    value: "sftp.partner.com ssh-rsa AAAAB3NzaC1yc2E..."
  - name: knownHostsFile
    value: /home/app/.ssh/known_hosts
```

## Using SSH Key Authentication

```yaml
metadata:
- name: rootPath
  value: /data
- name: address
  value: sftp.partner.com:22
- name: username
  value: sftpuser
- name: privateKey
  secretKeyRef:
    name: sftp-secret
    key: privateKey
- name: privateKeyPassphrase
  secretKeyRef:
    name: sftp-secret
    key: privateKeyPassphrase
```

```bash
kubectl create secret generic sftp-secret \
  --from-file=privateKey=./id_rsa \
  --from-literal=privateKeyPassphrase=my-key-passphrase
```

## Upload a File

```bash
curl -X POST http://localhost:3500/v1.0/bindings/sftp-server \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "report-content-here",
    "metadata": {
      "fileName": "/uploads/reports/daily-report-2026-03-31.csv"
    }
  }'
```

## Upload Binary Data from Application Code

```python
import base64
import requests

def upload_file(local_path: str, remote_path: str):
    with open(local_path, "rb") as f:
        file_content = f.read()

    # Encode binary content as base64
    encoded = base64.b64encode(file_content).decode("utf-8")

    response = requests.post(
        "http://localhost:3500/v1.0/bindings/sftp-server",
        json={
            "operation": "create",
            "data": encoded,
            "metadata": {
                "fileName": remote_path,
            },
        },
    )
    response.raise_for_status()
    print(f"Uploaded {local_path} to {remote_path}")

upload_file("./export.csv", "/uploads/export-2026-03-31.csv")
```

## Download a File

```bash
curl -X POST http://localhost:3500/v1.0/bindings/sftp-server \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get",
    "metadata": {
      "fileName": "/downloads/partner-feed-2026-03-31.xml"
    }
  }'
```

## List Remote Directory

```bash
curl -X POST http://localhost:3500/v1.0/bindings/sftp-server \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "list",
    "metadata": {
      "fileName": "/uploads/reports"
    }
  }'
```

## Scheduled File Transfer with Cron Binding

Combine SFTP with the Cron input binding to automate transfers:

```javascript
// Called by the cron binding every day at 6 AM
app.post("/cron-binding", async (req, res) => {
  const report = await generateDailyReport();
  await uploadReportViaSFTP(report);
  res.sendStatus(200);
});
```

## Summary

The Dapr SFTP binding simplifies file transfer to remote servers by handling SSH authentication and connection management. Configure the server address and credentials in the component YAML, then use `create`, `get`, `list`, and `delete` operations to upload, download, enumerate, and remove files without writing SSH client code.
