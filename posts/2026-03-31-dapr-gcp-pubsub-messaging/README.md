# How to Configure GCP Pub/Sub for Dapr Messaging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Pub/Sub, Messaging, Google Cloud, Kubernetes

Description: Configure Google Cloud Pub/Sub as a Dapr pub/sub component for reliable, scalable messaging in GCP-hosted microservices.

---

## Overview

Google Cloud Pub/Sub is a fully managed, real-time messaging service that scales to billions of messages per day. By using it as a Dapr pub/sub backend, you gain the durability and global reach of GCP Pub/Sub while keeping your application code independent of the underlying infrastructure.

## Creating GCP Pub/Sub Resources

Set up the required topics and subscriptions:

```bash
# Set your project
gcloud config set project my-project-id

# Create a topic
gcloud pubsub topics create orders

# Create dead-letter topic and subscription (must exist before referencing)
gcloud pubsub topics create orders-dlq
gcloud pubsub subscriptions create orders-dlq-sub --topic=orders-dlq

# Create a subscription for the processor service
gcloud pubsub subscriptions create orders-processor \
  --topic=orders \
  --ack-deadline=60 \
  --message-retention-duration=7d \
  --dead-letter-topic=orders-dlq \
  --max-delivery-attempts=5
```

## Service Account and Permissions

Create a service account with the necessary permissions:

```bash
gcloud iam service-accounts create dapr-pubsub-sa \
  --display-name="Dapr PubSub Service Account"

gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:dapr-pubsub-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/pubsub.editor"

# Create and download key
gcloud iam service-accounts keys create /tmp/sa-key.json \
  --iam-account=dapr-pubsub-sa@my-project-id.iam.gserviceaccount.com
```

## Dapr Component Configuration

Store the service account key as a Kubernetes secret:

```bash
kubectl create secret generic gcp-sa-key \
  --from-literal=private_key_id="$(jq -r .private_key_id /tmp/sa-key.json)" \
  --from-literal=private_key="$(jq -r .private_key /tmp/sa-key.json)"
```

Create the Dapr component:

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
  - name: project_id
    value: "my-project-id"
  - name: private_key_id
    secretKeyRef:
      name: gcp-sa-key
      key: private_key_id
  - name: private_key
    secretKeyRef:
      name: gcp-sa-key
      key: private_key
  - name: client_email
    value: "dapr-pubsub-sa@my-project-id.iam.gserviceaccount.com"
  - name: maxReconnectionAttempts
    value: "30"
  - name: connectionRecoveryInSec
    value: "2"
  - name: enableMessageOrdering
    value: "true"
```

## Publishing Ordered Messages

GCP Pub/Sub supports message ordering with an ordering key:

```go
package main

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    ctx := context.Background()

    // Publish with ordering key for per-customer ordering
    err := client.PublishEvent(ctx, "gcp-pubsub", "orders",
        map[string]interface{}{
            "orderId":    "ord-456",
            "customerId": "cust-789",
            "amount":     150.00,
        },
        dapr.PublishEventWithMetadata(map[string]string{
            "orderingKey": "cust-789",
        }),
    )
    if err != nil {
        panic(err)
    }
}
```

## Workload Identity on GKE

For GKE clusters, use Workload Identity to avoid managing SA keys:

```bash
# Enable Workload Identity on cluster
gcloud container clusters update my-cluster \
  --workload-pool=my-project-id.svc.id.goog

# Annotate the Kubernetes service account
kubectl annotate serviceaccount dapr-service \
  iam.gke.io/gcp-service-account=dapr-pubsub-sa@my-project-id.iam.gserviceaccount.com

# Bind the KSA to the GSA
gcloud iam service-accounts add-iam-policy-binding \
  dapr-pubsub-sa@my-project-id.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project-id.svc.id.goog[default/dapr-service]"
```

## Summary

GCP Pub/Sub with Dapr provides enterprise-grade messaging with global delivery guarantees and message ordering support. Workload Identity eliminates credential management overhead on GKE clusters. Dead-letter topics ensure failed messages are captured for investigation rather than silently dropped.
