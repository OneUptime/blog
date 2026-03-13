# How to Configure Webhook Receiver for Docker Hub in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhook, Docker Hub, Receiver, Container Registry

Description: Learn how to configure a Flux Receiver to accept Docker Hub webhooks and trigger reconciliation when new container images are pushed.

---

Docker Hub can send webhook notifications when new images are pushed to a repository. By configuring a Flux Receiver with type `dockerhub`, you can trigger immediate reconciliation of image-related resources when a new image is available. This is particularly useful when combined with Flux image automation to speed up image update workflows. This guide covers the complete setup.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A Docker Hub repository where you push container images
- Admin access to the Docker Hub repository for webhook configuration
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for webhook authentication.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic dockerhub-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Note the token for later use
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Define a Receiver resource with type `dockerhub`.

```yaml
# Receiver for Docker Hub webhook events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: dockerhub-receiver
  namespace: flux-system
spec:
  # Docker Hub webhook type
  type: dockerhub
  # Docker Hub sends push events
  events:
    - "push"
  # Secret for webhook validation
  secretRef:
    name: dockerhub-webhook-secret
  # Resources to reconcile when a new image is pushed
  resources:
    - kind: ImageRepository
      name: my-app
```

Apply the configuration.

```bash
# Apply the receiver
kubectl apply -f dockerhub-receiver.yaml

# Check the receiver status
kubectl get receivers -n flux-system
```

## Step 3: Get the Webhook URL

Retrieve the webhook path from the receiver status.

```bash
# Get the webhook URL path
kubectl get receiver dockerhub-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Step 4: Expose the Receiver Endpoint

Make the notification controller accessible from Docker Hub.

```yaml
# Ingress for Docker Hub webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dockerhub-webhook-ingress
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

## Step 5: Configure Docker Hub Webhook

Set up the webhook in Docker Hub.

1. Log in to Docker Hub and navigate to your repository
2. Go to the **Webhooks** tab
3. Enter a **Webhook name** such as "Flux CD Receiver"
4. Set the **Webhook URL** to `https://flux-webhook.example.com/<webhook-path>` (use the path from Step 3)
5. Click **Create**

Note that Docker Hub webhooks are simpler than Git provider webhooks. They fire on every image push to the repository.

## Step 6: Trigger Image Automation Resources

For a complete image update workflow, configure the receiver to trigger both ImageRepository and related resources.

```yaml
# Receiver for Docker Hub triggering image automation resources
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: dockerhub-image-receiver
  namespace: flux-system
spec:
  type: dockerhub
  events:
    - "push"
  secretRef:
    name: dockerhub-webhook-secret
  resources:
    # Trigger image repository scan
    - kind: ImageRepository
      name: my-app
    # Trigger image repository for another image
    - kind: ImageRepository
      name: my-api
```

## Step 7: Verify the Setup

Test the integration by pushing a new image to Docker Hub.

```bash
# Check receiver status
kubectl get receiver dockerhub-receiver -n flux-system

# Watch notification controller logs
kubectl logs -n flux-system deploy/notification-controller -f

# After pushing an image, check if the ImageRepository was refreshed
kubectl get imagerepository my-app -n flux-system -o jsonpath='{.status.lastScanResult}'

# Verify the ImagePolicy picked up the new tag
kubectl get imagepolicy my-app -n flux-system
```

## Troubleshooting

If webhooks are not triggering, investigate these areas.

```bash
# Verify the receiver is ready
kubectl get receiver dockerhub-receiver -n flux-system -o yaml

# Check notification controller logs for errors
kubectl logs -n flux-system deploy/notification-controller | grep -i "docker\|receiver\|webhook"

# Verify the secret
kubectl get secret dockerhub-webhook-secret -n flux-system

# Test endpoint connectivity
curl -I https://flux-webhook.example.com/
```

Docker Hub shows the webhook delivery status on the Webhooks tab. Check the "History" section to see if deliveries are succeeding or failing. Common issues include the webhook URL being incorrect or the notification controller endpoint not being reachable from the internet.

## Summary

A Docker Hub webhook receiver in Flux enables immediate image repository scanning when new container images are pushed. This reduces the delay between building a new image and having Flux detect it, making your image automation pipeline faster. The setup involves creating a secret, defining a Receiver resource with type `dockerhub`, exposing the endpoint, and adding the webhook URL in Docker Hub's repository settings.
