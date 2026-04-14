# How to Configure Dapr with GCP Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Google Cloud, Pub/Sub, Messaging, Cloud, Microservice

Description: Configure Dapr's pub/sub building block with Google Cloud Pub/Sub for scalable event streaming on GCP infrastructure.

---

## Overview

Google Cloud Pub/Sub is a fully managed, serverless messaging service that scales automatically. Dapr's GCP Pub/Sub component maps Dapr pub/sub operations to GCP topics and subscriptions, letting you leverage GCP's global message delivery without writing GCP SDK code. This guide covers setup, authentication, and message handling.

## Prerequisites

- GCP project with Pub/Sub API enabled
- Service account with Pub/Sub permissions
- Dapr CLI installed

## Setting Up GCP Resources

```bash
# Enable Pub/Sub API
gcloud services enable pubsub.googleapis.com

# Create a topic
gcloud pubsub topics create order-events

# Create service account
gcloud iam service-accounts create dapr-pubsub \
  --display-name "Dapr Pub/Sub Service Account"

# Grant Pub/Sub permissions
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:dapr-pubsub@your-project-id.iam.gserviceaccount.com" \
  --role="roles/pubsub.editor"

# Download service account key
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=dapr-pubsub@your-project-id.iam.gserviceaccount.com
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-pubsub
  namespace: default
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
    - name: type
      value: "service_account"
    - name: projectId
      value: "your-gcp-project-id"
    - name: privateKeyId
      value: "<PRIVATE_KEY_ID>"
    - name: clientEmail
      value: "dapr-pubsub@your-project-id.iam.gserviceaccount.com"
    - name: clientId
      value: "<CLIENT_ID>"
    - name: authUri
      value: "https://accounts.google.com/o/oauth2/auth"
    - name: tokenUri
      value: "https://oauth2.googleapis.com/token"
    - name: authProviderX509CertUrl
      value: "https://www.googleapis.com/oauth2/v1/certs"
    - name: clientX509CertUrl
      value: "https://www.googleapis.com/robot/v1/metadata/x509/dapr-pubsub%40your-project-id.iam.gserviceaccount.com"
    - name: privateKey
      secretKeyRef:
        name: gcp-credentials
        key: private-key
    - name: maxOutstandingMessages
      value: "1000"
    - name: maxOutstandingBytes
      value: "104857600"
    - name: maxConcurrentConnections
      value: "10"
```

Store the private key from your service account key file:

```bash
kubectl create secret generic gcp-credentials \
  --from-literal=private-key="$(jq -r '.private_key' sa-key.json)"
```

## Using Workload Identity on GKE

For GKE, use Workload Identity instead of service account keys:

```bash
# Enable Workload Identity on cluster
gcloud container clusters update your-cluster \
  --workload-pool=your-project-id.svc.id.goog

# Annotate Kubernetes service account
kubectl annotate serviceaccount order-service \
  iam.gke.io/gcp-service-account=dapr-pubsub@your-project-id.iam.gserviceaccount.com

# Bind the Kubernetes SA to GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  dapr-pubsub@your-project-id.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:your-project-id.svc.id.goog[default/order-service]"
```

With Workload Identity, omit `credentialsJson` from the component:

```yaml
metadata:
  - name: projectId
    value: "your-gcp-project-id"
```

## Publishing Messages

```bash
curl -X POST http://localhost:3500/v1.0/publish/gcp-pubsub/order-events \
  -H "Content-Type: application/json" \
  -d '{"orderId": "GCP-5001", "region": "us-central1"}'
```

## Subscribing in Python

```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/order-events', methods=['POST'])
def handle_order():
    event = request.json
    data = event.get('data', {})
    print(f"Received order {data['orderId']} from {data['region']}")
    return '', 200
```

Subscription:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: gcp-order-sub
spec:
  pubsubname: gcp-pubsub
  topic: order-events
  route: /order-events
```

## Summary

Dapr's GCP Pub/Sub component provides a seamless bridge to Google Cloud Pub/Sub. On GKE, use Workload Identity to eliminate service account key management. Dapr creates GCP subscriptions automatically per consuming service, and handles message acknowledgment so your application just needs to return HTTP 200. This pattern is identical to using any other Dapr pub/sub broker, enabling portability across clouds.
