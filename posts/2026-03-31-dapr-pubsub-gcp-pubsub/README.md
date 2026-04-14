# How to Set Up Dapr Pub/Sub with Google Cloud Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, GCP, Google Cloud, Event-Driven

Description: Configure the Dapr GCP Pub/Sub component to publish and subscribe to Google Cloud Pub/Sub topics in self-hosted and Kubernetes environments with Workload Identity support.

---

## Overview

The Dapr `pubsub.gcp.pubsub` component connects your microservices to Google Cloud Pub/Sub topics. Dapr handles authentication, CloudEvent wrapping, and retry logic while you configure the component YAML.

```mermaid
flowchart LR
    Publisher[Publisher App] -->|POST /v1.0/publish| Sidecar1[Dapr Sidecar]
    Sidecar1 -->|Publish| GCPTopic[GCP Pub/Sub Topic]
    GCPTopic -->|Push / Pull| Sidecar2[Dapr Sidecar]
    Sidecar2 -->|POST /handle-order| Subscriber[Subscriber App]
```

## Prerequisites

- A Google Cloud project with Pub/Sub API enabled
- A GCP service account with `roles/pubsub.publisher` and `roles/pubsub.subscriber`
- Dapr CLI installed and initialized

## Create GCP Pub/Sub Resources

```bash
# Set project
gcloud config set project my-gcp-project

# Create a topic
gcloud pubsub topics create orders

# Create a subscription
gcloud pubsub subscriptions create orders-sub \
  --topic=orders \
  --ack-deadline=60

# Create service account
gcloud iam service-accounts create dapr-pubsub-sa \
  --display-name="Dapr Pub/Sub Service Account"

# Grant publisher and subscriber roles
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:dapr-pubsub-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:dapr-pubsub-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"

# Download key
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=dapr-pubsub-sa@my-gcp-project.iam.gserviceaccount.com
```

## Component Configuration (Service Account Key)

```yaml
# pubsub-gcp.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: type
    value: "service_account"
  - name: projectId
    value: "my-gcp-project"
  - name: identityProjectId
    value: "my-gcp-project"
  - name: privateKeyId
    secretKeyRef:
      name: gcp-pubsub-secret
      key: privateKeyId
  - name: privateKey
    secretKeyRef:
      name: gcp-pubsub-secret
      key: privateKey
  - name: clientEmail
    value: "dapr-pubsub-sa@my-gcp-project.iam.gserviceaccount.com"
  - name: clientId
    secretKeyRef:
      name: gcp-pubsub-secret
      key: clientId
  - name: authUri
    value: "https://accounts.google.com/o/oauth2/auth"
  - name: tokenUri
    value: "https://oauth2.googleapis.com/token"
  - name: disableEntityManagement
    value: "false"
  - name: enableMessageOrdering
    value: "false"
```

Store the service account key as a Kubernetes secret:

```bash
kubectl create secret generic gcp-pubsub-secret \
  --from-literal=privateKeyId="$(jq -r '.private_key_id' gcp-key.json)" \
  --from-literal=privateKey="$(jq -r '.private_key' gcp-key.json)" \
  --from-literal=clientId="$(jq -r '.client_id' gcp-key.json)" \
  --namespace default
```

## Component Configuration (Workload Identity)

For GKE with Workload Identity enabled, omit the key fields and bind the KSA to GSA:

```yaml
# pubsub-gcp-workload-identity.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: projectId
    value: "my-gcp-project"
  - name: type
    value: "service_account"
  - name: clientEmail
    value: "dapr-pubsub-sa@my-gcp-project.iam.gserviceaccount.com"
  - name: disableEntityManagement
    value: "false"
```

```bash
# Bind Kubernetes service account to GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  dapr-pubsub-sa@my-gcp-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-gcp-project.svc.id.goog[default/order-processor]"

kubectl annotate serviceaccount order-processor \
  --namespace default \
  iam.gke.io/gcp-service-account=dapr-pubsub-sa@my-gcp-project.iam.gserviceaccount.com
```

## Self-Hosted Setup

```bash
# Place key file and component
cp gcp-key.json ~/.dapr/
cp pubsub-gcp.yaml ~/.dapr/components/
```

Update the component to reference the file path directly:

```yaml
  - name: privateKey
    value: |
      -----BEGIN RSA PRIVATE KEY-----
      ...
      -----END RSA PRIVATE KEY-----
```

## Subscription Configuration

```yaml
# subscription.yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  route: /handle-order
scopes:
- order-processor
```

## Publishing a Message

```bash
dapr run \
  --app-id publisher \
  --dapr-http-port 3500 \
  -- bash -c 'sleep 2 && curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
    -H "Content-Type: application/json" \
    -d "{\"orderId\": \"gcp-001\", \"item\": \"widget\", \"qty\": 5}"'
```

## Subscriber Application (Python)

```python
# subscriber.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "orders",
        "route": "/handle-order"
    }])

@app.route('/handle-order', methods=['POST'])
def handle_order():
    event = request.get_json()
    order = event.get('data', {})
    print(f"GCP Pub/Sub order received: {order.get('orderId')}")
    return jsonify({"status": "SUCCESS"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

```bash
dapr run \
  --app-id order-processor \
  --app-port 5001 \
  --dapr-http-port 3501 \
  -- python subscriber.py
```

## Advanced Component Options

```yaml
  metadata:
  - name: maxConcurrentConnections
    value: "10"
  - name: enableMessageOrdering
    value: "true"
  - name: orderingKey
    value: "orderId"
  - name: maxOutstandingMessages
    value: "1000"
  - name: maxOutstandingBytes
    value: "1073741824"
```

## Summary

The Dapr GCP Pub/Sub component integrates your microservices with Google Cloud Pub/Sub using either a service account key JSON or GKE Workload Identity. Create the topic and subscription in GCP, configure the component YAML with the project ID and credentials, and then publish and subscribe using the standard Dapr pub/sub API. Workload Identity is the recommended approach for production GKE deployments to avoid managing long-lived credentials.
