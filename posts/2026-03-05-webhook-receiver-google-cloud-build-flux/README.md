# How to Configure Webhook Receiver for Google Cloud Build in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhook, Google Cloud, GCR, Receiver, Cloud Build

Description: Learn how to configure a Flux Receiver to accept Google Cloud Build webhooks and trigger reconciliation when container images are pushed to GCR.

---

Google Cloud Build can push container images to Artifact Registry as part of CI/CD pipelines. Flux CD supports receiving Google Container Registry (GCR) and Google Artifact Registry (GAR) Pub/Sub notifications through the Receiver resource with type `gcr`, enabling immediate reconciliation when new images are built and pushed. This guide covers how to set up a Google Cloud webhook receiver in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A Google Cloud project with Cloud Build and Artifact Registry
- Appropriate IAM permissions in Google Cloud
- A service account for authenticated Pub/Sub push delivery
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for authenticating webhook requests. For GCR/GAR receivers, Flux requires a random `token`, the Pub/Sub push service account `email`, and the expected OIDC token `audience`.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Configure the service account used by the Pub/Sub push subscription
SERVICE_ACCOUNT_EMAIL=flux-pubsub@my-project.iam.gserviceaccount.com
OIDC_AUDIENCE=flux-gcr-receiver

# Create the secret
kubectl create secret generic gcr-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN \
  --from-literal=email=$SERVICE_ACCOUNT_EMAIL \
  --from-literal=audience=$OIDC_AUDIENCE

# Save the token
echo "Webhook token: $TOKEN"
echo "OIDC audience: $OIDC_AUDIENCE"
```

## Step 2: Create the Receiver Resource

Define a Receiver with type `gcr` for Artifact Registry notifications. GCR/GAR receivers do not support filtering with `events`, so omit the `events` field.

```yaml
# Receiver for Google Cloud Build / Artifact Registry notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gcr-receiver
  namespace: flux-system
spec:
  # GCR receiver type, used for GCR and Artifact Registry Pub/Sub payloads
  type: gcr
  # Secret for authentication
  secretRef:
    name: gcr-webhook-secret
  # Resources to reconcile
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: my-app
      namespace: flux-system
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

Create an ingress for the webhook receiver service.

```yaml
# Ingress for Artifact Registry webhook receiver
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
                name: webhook-receiver
                port:
                  number: 80
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: webhook-tls
```

## Step 5: Configure Google Cloud Pub/Sub Notification

Artifact Registry publishes events to Google Cloud Pub/Sub. You need to create a Pub/Sub topic named `gcr` and a push subscription that sends messages to your Flux receiver endpoint.

First, ensure the Pub/Sub topic exists.

```bash
# Create the gcr topic if it does not already exist
gcloud pubsub topics describe gcr --project=my-project || \
  gcloud pubsub topics create gcr --project=my-project
```

Grant the Pub/Sub service agent permission to create OIDC tokens for the push service account.

```bash
PROJECT_ID=my-project
PROJECT_NUMBER=123456789012
SERVICE_ACCOUNT_EMAIL=flux-pubsub@my-project.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

Then create the authenticated push subscription.

```bash
# Create a push subscription that forwards to the Flux receiver
gcloud pubsub subscriptions create flux-gcr-subscription \
  --topic=gcr \
  --push-endpoint="https://flux-webhook.example.com/<webhook-path>" \
  --push-auth-service-account=$SERVICE_ACCOUNT_EMAIL \
  --push-auth-token-audience=flux-gcr-receiver
```

For regional Artifact Registry repositories, the Pub/Sub topic is still named `gcr`.

```bash
# Create a Pub/Sub subscription for Artifact Registry events
gcloud pubsub subscriptions create flux-ar-subscription \
  --topic=projects/my-project/topics/gcr \
  --push-endpoint="https://flux-webhook.example.com/<webhook-path>" \
  --push-auth-service-account=$SERVICE_ACCOUNT_EMAIL \
  --push-auth-token-audience=flux-gcr-receiver
```

## Step 6: Configure for Multiple Image Repositories

Trigger scans for multiple image repositories from a single receiver.

```yaml
# Receiver for multiple Artifact Registry image repositories
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gcr-multi-receiver
  namespace: flux-system
spec:
  type: gcr
  secretRef:
    name: gcr-webhook-secret
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: frontend
      namespace: flux-system
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: backend
      namespace: flux-system
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: api-gateway
      namespace: flux-system
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

# Push an image to Artifact Registry to trigger the webhook
docker tag my-app:latest us-central1-docker.pkg.dev/my-project/my-repo/my-app:test
docker push us-central1-docker.pkg.dev/my-project/my-repo/my-app:test

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

# Check Pub/Sub push configuration
gcloud pubsub subscriptions describe flux-gcr-subscription --format="yaml(pushConfig)"

# Verify the secret
kubectl get secret gcr-webhook-secret -n flux-system
```

Common issues include:
- Pub/Sub subscription not configured correctly
- Push endpoint not reachable from Google Cloud
- IAM permissions missing for the service account
- The `gcr` Pub/Sub topic not existing
- The Flux secret `email` or `audience` value not matching the Pub/Sub push subscription

## Summary

Configuring a Google Cloud Build webhook receiver in Flux connects your Artifact Registry pipeline to your GitOps workflow. The setup uses Pub/Sub to forward container registry events to the Flux receiver endpoint, triggering immediate image repository scans. This integration requires creating a secret, defining a Receiver with type `gcr`, exposing the webhook receiver service, and setting up an authenticated Pub/Sub push subscription. The result is faster image update detection in your GitOps pipeline.
