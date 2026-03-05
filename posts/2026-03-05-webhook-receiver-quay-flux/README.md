# How to Configure Webhook Receiver for Quay in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhooks, Quay, Receiver, Container Registry

Description: Learn how to configure a Flux Receiver to accept Quay container registry webhooks and trigger reconciliation on image push events.

---

Quay is a container registry by Red Hat that supports webhook notifications for repository events. Flux CD can receive these webhooks through a Receiver resource with type `quay`, triggering immediate reconciliation of image-related resources when new container images are pushed. This guide covers how to set up a Quay webhook receiver in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A Quay registry account with at least one repository
- Admin access to the Quay repository for notification configuration
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for webhook authentication.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic quay-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Save the token
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Define a Receiver with type `quay`.

```yaml
# Receiver for Quay container registry webhooks
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: quay-receiver
  namespace: flux-system
spec:
  # Quay webhook type
  type: quay
  # Quay push events
  events:
    - "push"
  # Secret for authentication
  secretRef:
    name: quay-webhook-secret
  # Resources to reconcile on image push
  resources:
    - kind: ImageRepository
      name: my-app
```

Apply it.

```bash
# Apply the receiver
kubectl apply -f quay-receiver.yaml

# Verify
kubectl get receivers -n flux-system
```

## Step 3: Get the Webhook URL

Retrieve the webhook path.

```bash
# Get the webhook path from the receiver
kubectl get receiver quay-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Step 4: Expose the Receiver Endpoint

Create an ingress for external access.

```yaml
# Ingress for Quay webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: quay-webhook-ingress
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

## Step 5: Configure the Quay Notification

Set up the webhook notification in Quay.

1. Log in to Quay and navigate to your repository
2. Go to **Settings** (gear icon)
3. Click **Create Notification**
4. For **Event**, select **Push to Repository**
5. For **Method**, select **Webhook POST**
6. Set the **Webhook URL** to `https://flux-webhook.example.com/<webhook-path>`
7. Click **Create Notification**

For Quay.io or self-hosted Quay, the notification configuration is accessible from the repository settings page.

## Step 6: Configure for Multiple Image Repositories

Watch for pushes across multiple image repositories.

```yaml
# Receiver triggering multiple ImageRepository resources from Quay
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: quay-multi-receiver
  namespace: flux-system
spec:
  type: quay
  events:
    - "push"
  secretRef:
    name: quay-webhook-secret
  resources:
    - kind: ImageRepository
      name: frontend
    - kind: ImageRepository
      name: backend
    - kind: ImageRepository
      name: worker
```

## Step 7: Verify the Configuration

Test by pushing an image to Quay.

```bash
# Check receiver status
kubectl get receiver quay-receiver -n flux-system

# Describe the receiver
kubectl describe receiver quay-receiver -n flux-system

# Monitor logs
kubectl logs -n flux-system deploy/notification-controller -f

# Push a test image
docker tag my-app:latest quay.io/myorg/my-app:test
docker push quay.io/myorg/my-app:test

# Check if the scan was triggered
kubectl get imagerepository my-app -n flux-system
```

## Troubleshooting

If Quay webhooks are not triggering reconciliation, check the following.

```bash
# Verify receiver status
kubectl get receiver quay-receiver -n flux-system -o yaml

# Check logs
kubectl logs -n flux-system deploy/notification-controller | grep -i "quay\|receiver"

# Verify the secret
kubectl get secret quay-webhook-secret -n flux-system

# Test endpoint reachability
curl -I https://flux-webhook.example.com/
```

In Quay, check the notification history by navigating to the repository settings and viewing the notification details. Failed deliveries will show the HTTP error status.

## Summary

A Quay webhook receiver in Flux enables push-based image scanning by notifying Flux immediately when new images are pushed to your Quay registry. The configuration involves creating a secret, defining a Receiver with type `quay`, exposing the notification controller, and adding a webhook notification in Quay's repository settings. This integration reduces the delay between image availability and deployment updates.
