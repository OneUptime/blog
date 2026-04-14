# How to Use Dapr with Kubernetes Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Job, Batch Processing, State Store

Description: Use Dapr with Kubernetes Jobs for batch workloads that need state management, pub/sub, or service invocation with proper sidecar lifecycle handling.

---

## The Challenge with Dapr and Kubernetes Jobs

Kubernetes Jobs run to completion, but the Dapr sidecar runs indefinitely. This means a Job pod never terminates cleanly because the daprd sidecar keeps running even after the main container exits. You need to explicitly shut down the sidecar.

## Writing a Job That Shuts Down the Dapr Sidecar

```python
# job.py
import os
import requests
import sys

DAPR_HTTP_PORT = os.getenv("DAPR_HTTP_PORT", "3500")

def process_batch():
    # Use Dapr state store to read work items
    resp = requests.get(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore/batch-items"
    )
    items = resp.json() if resp.status_code == 200 else []

    for item in items:
        # Process each item
        print(f"Processing: {item}")
        # Publish result
        requests.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/results",
            json={"item": item, "status": "processed"}
        )

    print("Batch processing complete")

def shutdown_dapr_sidecar():
    # Signal Dapr sidecar to shut down
    try:
        requests.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/shutdown",
            timeout=5
        )
        print("Dapr sidecar shutdown signal sent")
    except Exception as e:
        print(f"Could not signal Dapr shutdown: {e}")

if __name__ == "__main__":
    try:
        process_batch()
    finally:
        shutdown_dapr_sidecar()
        sys.exit(0)
```

## Kubernetes Job Manifest

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processor
  namespace: default
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 2
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "batch-processor"
        dapr.io/log-level: "info"
    spec:
      restartPolicy: Never
      containers:
      - name: batch-processor
        image: myregistry/batch-processor:latest
        env:
        - name: DAPR_HTTP_PORT
          value: "3500"
```

## CronJob with Dapr

For recurring batch jobs, use a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-batch
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            dapr.io/enabled: "true"
            dapr.io/app-id: "daily-batch"
        spec:
          restartPolicy: OnFailure
          containers:
          - name: daily-batch
            image: myregistry/daily-batch:v1
```

## Verifying Job Completion

```bash
kubectl get jobs batch-processor
kubectl logs job/batch-processor -c batch-processor
kubectl logs job/batch-processor -c daprd | tail -20
```

## Summary

Dapr works with Kubernetes Jobs by calling the `/v1.0/shutdown` endpoint after the business logic completes, allowing the sidecar to exit cleanly. This pattern enables batch workloads to leverage Dapr state stores, pub/sub, and service bindings while still terminating properly as Kubernetes Jobs expect.
