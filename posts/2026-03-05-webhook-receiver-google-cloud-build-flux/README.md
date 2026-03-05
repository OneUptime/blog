# How to Configure Webhook Receiver for Google Cloud Build in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhooks, Google Cloud, GCR, Receiver, Cloud Build

Description: Learn how to configure a Flux Receiver to accept Google Cloud Build webhooks and trigger reconciliation when container images are pushed to GCR.

---

Google Cloud Build can push container images to Google Container Registry (GCR) or Artifact Registry as part of CI/CD pipelines. Flux CD supports receiving webhooks from Google Cloud services through the Receiver resource with type `gcr`, enabling immediate reconciliation when new images are built and pushed. This guide covers how to set up a Google Cloud Build webhook receiver in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A Google Cloud project with Cloud Build and Container Registry or Artifact Registry
- Appropriate IAM permissions in Google Cloud
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for authenticating webhook requests.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic gcr-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Save the token
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Define a Receiver with type `gcr` for Google Container Registry events.

```yaml
# Receiver for Google Cloud Build / GCR webhooks
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gcr-receiver
  namespace: flux-system
spec:
  # GCR webhook type (also used for Artifact Registry)
  type: gcr
  # GCR push events
  events:
    - "push"
  # Secret for authentication
  secretRef:
    name: gcr-webhook-secret
  # Resources to reconcile
  resources:
    - kind: ImageRepository
      name: my-app
```

Apply the receiver.

```bash
# Apply the receiver
kubectl apply -f gcr-receiver.yaml

# Verify the receiver
kubectl get receivers -n flux-system
```

## Step 3: Get the Webhook URL

Retrieve the webhook path.

```bash
# Get the webhook URL path
kubectl get receiver gcr-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Step 4: Expose the Receiver Endpoint

Create an ingress for the notification controller.

```yaml
# Ingress for GCR webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gcr-webhook-ingress
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: webhook-tls
```

## Step 5: Configure Google Cloud Pub/Sub Notification

GCR and Artifact Registry publish events to Google Cloud Pub/Sub. You need to create a Pub/Sub subscription that pushes messages to your Flux receiver endpoint.

First, ensure the GCR Pub/Sub topic exists (GCR automatically publishes to `gcr` topic).

```bash
# Verify the gcr topic exists (created automatically by GCR)
gcloud pubsub topics list --filter="name:gcr"

# Create a push subscription that forwards to the Flux receiver
gcloud pubsub subscriptions create flux-gcr-subscription \
  --topic=gcr \
  --push-endpoint="https://flux-webhook.example.com/<webhook-path>" \
  --push-auth-service-account=flux-pubsub@my-project.iam.gserviceaccount.com
```

For Artifact Registry, the topic name is different.

```bash
# For Artifact Registry, create a topic and configure notifications
gcloud artifacts repositories update my-repo \
  --location=us-central1 \
  --update-labels=flux-monitored=true

# Create a Pub/Sub subscription for Artifact Registry events
gcloud pubsub subscriptions create flux-ar-subscription \
  --topic=projects/my-project/topics/gcr \
  --push-endpoint="https://flux-webhook.example.com/<webhook-path>"
```

## Step 6: Configure for Multiple Image Repositories

Trigger scans for multiple image repositories from a single receiver.

```yaml
# Receiver for multiple GCR image repositories
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gcr-multi-receiver
  namespace: flux-system
spec:
  type: gcr
  events:
    - "push"
  secretRef:
    name: gcr-webhook-secret
  resources:
    - kind: ImageRepository
      name: frontend
    - kind: ImageRepository
      name: backend
    - kind: ImageRepository
      name: api-gateway
```

## Step 7: Verify and Test

Test the integration.

```bash
# Check receiver status
kubectl get receiver gcr-receiver -n flux-system

# Describe the receiver
kubectl describe receiver gcr-receiver -n flux-system

# Monitor notification controller logs
kubectl logs -n flux-system deploy/notification-controller -f

# Push an image to GCR to trigger the webhook
docker tag my-app:latest gcr.io/my-project/my-app:test
docker push gcr.io/my-project/my-app:test

# Check if the ImageRepository was scanned
kubectl get imagerepository my-app -n flux-system
```

## Troubleshooting

If the webhook is not triggering, check these areas.

```bash
# Verify receiver status
kubectl get receiver gcr-receiver -n flux-system -o yaml

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller | grep -i "gcr\|receiver"

# Verify the Pub/Sub subscription
gcloud pubsub subscriptions describe flux-gcr-subscription

# Check Pub/Sub delivery metrics
gcloud pubsub subscriptions pull flux-gcr-subscription --auto-ack --limit=5

# Verify the secret
kubectl get secret gcr-webhook-secret -n flux-system
```

Common issues include:
- Pub/Sub subscription not configured correctly
- Push endpoint not reachable from Google Cloud
- IAM permissions missing for the service account
- The `gcr` Pub/Sub topic not existing (push at least one image to create it)

## Summary

Configuring a Google Cloud Build webhook receiver in Flux connects your GCR or Artifact Registry pipeline to your GitOps workflow. The setup uses Pub/Sub to forward container registry events to the Flux receiver endpoint, triggering immediate image repository scans. This integration requires creating a secret, defining a Receiver with type `gcr`, exposing the notification controller, and setting up a Pub/Sub push subscription. The result is faster image update detection in your GitOps pipeline.
