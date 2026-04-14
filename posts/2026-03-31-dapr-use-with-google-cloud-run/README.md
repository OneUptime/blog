# How to Use Dapr with Google Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Google Cloud Run, Serverless, Container, Cloud

Description: Deploy Dapr-enabled applications on Google Cloud Run using multi-container sidecars or a Dapr-integrated sidecar pattern for state and pub/sub on serverless.

---

## Overview

Google Cloud Run supports multi-container deployments (Cloud Run sidecars), allowing you to run the Dapr sidecar alongside your application container. This gives you full Dapr capabilities on a fully managed serverless platform.

## Multi-Container Cloud Run Service

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-service
  annotations:
    run.googleapis.com/launch-stage: BETA
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
    spec:
      containers:
      - name: app
        image: gcr.io/my-project/order-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DAPR_HTTP_PORT
          value: "3500"
      - name: daprd
        image: daprio/daprd:1.15.0
        args:
        - "--app-id"
        - "order-service"
        - "--app-port"
        - "8080"
        - "--dapr-http-port"
        - "3500"
        - "--resources-path"
        - "/components"
        - "--log-level"
        - "info"
        volumeMounts:
        - name: components
          mountPath: /components
      volumes:
      - name: components
        secret:
          secretName: dapr-components
```

## Deploying via gcloud CLI

```bash
# Deploy via YAML (recommended for multi-container)
gcloud run services replace cloud-run-service.yaml --region us-central1
```

## Dapr Component: Google Cloud Pub/Sub

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: projectId
    value: "my-gcp-project"
```

## Dapr Component: Firestore State Store

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.gcp.firestore
  version: v1
  metadata:
  - name: project_id
    value: "my-gcp-project"
  - name: entity_kind
    value: "DaprState"
```

## Application Code Using Dapr

```python
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
DAPR_PORT = os.getenv("DAPR_HTTP_PORT", "3500")

@app.route('/orders', methods=['POST'])
def create_order():
    order = request.json

    # Save to Firestore via Dapr
    requests.post(
        f'http://localhost:{DAPR_PORT}/v1.0/state/statestore',
        json=[{"key": order["id"], "value": order}]
    )

    # Publish to Pub/Sub via Dapr
    requests.post(
        f'http://localhost:{DAPR_PORT}/v1.0/publish/pubsub/orders',
        json=order
    )

    return jsonify({"status": "created", "id": order["id"]}), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## IAM Configuration for Cloud Run

```bash
# Grant Cloud Run service account access to Pub/Sub and Firestore
gcloud projects add-iam-policy-binding my-gcp-project \
  --member "serviceAccount:order-service@my-gcp-project.iam.gserviceaccount.com" \
  --role "roles/pubsub.publisher"

gcloud projects add-iam-policy-binding my-gcp-project \
  --member "serviceAccount:order-service@my-gcp-project.iam.gserviceaccount.com" \
  --role "roles/datastore.user"
```

## Min/Max Instance Configuration

```bash
gcloud run services update order-service \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 80
```

Set `--min-instances 1` to keep Dapr warm and avoid cold start latency for the sidecar.

## Summary

Google Cloud Run's multi-container support lets you run the Dapr sidecar alongside your application in a fully managed serverless environment. Use GCP-native Dapr components (Cloud Pub/Sub for messaging, Firestore for state) to stay within the GCP ecosystem. Set minimum instances to 1 to reduce cold start impact on Dapr initialization, and use Workload Identity for secure, keyless authentication to GCP services.
