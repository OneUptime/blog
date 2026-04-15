# How to Implement Data Export with Dapr Output Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Output Binding, Data Export, Integration, Microservice

Description: Learn how to implement data export to external systems using Dapr output bindings for files, queues, email, and cloud storage.

---

Data export features - generating CSV files, pushing records to message queues, archiving to cloud storage - often require direct SDK integration with each target system. Dapr output bindings replace these SDKs with a single uniform API, making exports portable and testable.

## What Are Output Bindings

Output bindings let your service invoke external systems (write a file, send an email, push to Kafka, upload to S3) via a simple HTTP or gRPC call to the Dapr sidecar. The sidecar handles the actual protocol.

## Configure Output Bindings

S3 file export:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-export
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: data-exports
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-secrets
      key: access-key
  - name: secretKey
    secretKeyRef:
      name: aws-secrets
      key: secret-key
```

SMTP email export:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: email-export
spec:
  type: bindings.smtp
  version: v1
  metadata:
  - name: host
    value: smtp.company.com
  - name: port
    value: "587"
  - name: user
    secretKeyRef:
      name: smtp-secrets
      key: username
  - name: password
    secretKeyRef:
      name: smtp-secrets
      key: password
  - name: emailFrom
    value: exports@company.com
```

## Export Data to S3

```python
from dapr.clients import DaprClient
import csv
import io
import json

def export_users_to_s3(users: list, export_date: str):
    # Generate CSV in memory
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=['id', 'name', 'email', 'createdAt'])
    writer.writeheader()
    writer.writerows(users)
    csv_content = output.getvalue()

    with DaprClient() as client:
        client.invoke_binding(
            binding_name='s3-export',
            operation='create',
            data=csv_content.encode('utf-8'),
            binding_metadata={
                "key": f"exports/users-{export_date}.csv",
                "ContentType": "text/csv"
            }
        )

    print(f"Exported {len(users)} users to S3")
```

## Export to Kafka for Downstream Systems

```python
def export_events_to_kafka(events: list):
    with DaprClient() as client:
        for event in events:
            client.invoke_binding(
                binding_name='kafka-export',
                operation='create',
                data=json.dumps(event).encode('utf-8'),
                binding_metadata={
                    "partitionKey": event['userId']
                }
            )
```

## Send Report via Email Binding

```python
def email_export_report(recipients: list, report_body: str):
    with DaprClient() as client:
        client.invoke_binding(
            binding_name='email-export',
            operation='create',
            data=report_body,
            binding_metadata={
                "emailTo": ";".join(recipients),
                "subject": "Data Export - 2026-03-31"
            }
        )
```

## HTTP Webhook Export

Push data to an external API via HTTP binding:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: webhook-export
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: https://partner-api.example.com/data-ingest
```

```python
client.invoke_binding(
    binding_name='webhook-export',
    operation='post',
    data=json.dumps(export_payload),
    binding_metadata={
        "Authorization": "Bearer token123",
        "Content-Type": "application/json"
    }
)
```

## Summary

Dapr output bindings provide a uniform API for exporting data to any external system, replacing scattered SDK integrations with a single `invoke_binding` call. Configure S3, Kafka, SMTP, or HTTP bindings declaratively in Kubernetes, and your export service code remains unchanged as target systems evolve. This makes data export features portable across cloud providers and environments.
