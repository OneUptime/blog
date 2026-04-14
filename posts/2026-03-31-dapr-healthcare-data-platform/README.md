# How to Build a Healthcare Data Platform with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Healthcare, Microservice, Security, Pub/Sub

Description: Learn how to build a HIPAA-aware healthcare data platform using Dapr for secure service communication, state management, and event-driven workflows.

---

## Overview

Healthcare platforms must handle sensitive patient data with strict security and compliance requirements. Dapr provides building blocks for encrypting secrets, securing service-to-service calls with mTLS, and routing medical events reliably across services.

## Platform Services

A typical healthcare data platform includes:

- **Patient Service** - manages patient records
- **Lab Results Service** - receives and stores diagnostic results
- **Notification Service** - alerts providers on critical findings
- **Audit Service** - logs all data access events

## Initializing Dapr in Kubernetes

```bash
dapr init --kubernetes --wait
kubectl create namespace healthcare
```

## Storing Patient Records with Encrypted State

```yaml
# components/patient-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: patient-statestore
  namespace: healthcare
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master.healthcare.svc.cluster.local:6379
    - name: enableTLS
      value: "true"
```

```python
from dapr.clients import DaprClient

def save_patient_record(patient_id: str, data: dict):
    with DaprClient() as client:
        client.save_state(
            store_name="patient-statestore",
            key=f"patient:{patient_id}",
            value=str(data),
            state_metadata={"contentType": "application/json"}
        )
```

## Publishing Lab Result Events

When new lab results arrive, publish them to a topic for downstream processing:

```python
import json

def publish_lab_result(patient_id: str, result: dict):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="lab-results",
            data=json.dumps({"patientId": patient_id, "result": result}),
            data_content_type="application/json"
        )
```

## Subscribing to Critical Alerts

```python
from dapr.ext.grpc import App

app = App()

@app.subscribe(pubsub_name="pubsub", topic="lab-results")
def handle_lab_result(event) -> None:
    data = event.Data()
    if data.get("result", {}).get("severity") == "critical":
        notify_provider(data["patientId"])
    log_audit_event("lab_result_received", data["patientId"])
```

## Audit Logging via Bindings

Use an output binding to write all access events to an external audit log:

```yaml
# components/audit-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: audit-log
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: kafka.healthcare.svc.cluster.local:9092
    - name: topics
      value: audit-events
    - name: publishTopic
      value: audit-events
```

## Secrets Management

Store database credentials and API keys in Kubernetes Secrets, accessed through Dapr:

```python
def get_db_password():
    with DaprClient() as client:
        secret = client.get_secret(
            store_name="kubernetes",
            key="db-credentials"
        )
        return secret.secret["password"]
```

## Summary

Dapr simplifies building compliant healthcare platforms by providing mTLS encryption for all service communication, centralized secrets management, and reliable pub/sub messaging for clinical events. Its component model lets you swap storage or messaging backends without changing application code, which is critical in regulated environments where infrastructure choices may evolve.
