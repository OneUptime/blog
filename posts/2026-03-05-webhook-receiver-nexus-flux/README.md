# How to Configure Webhook Receiver for Nexus in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhooks, Nexus, Receiver, Container Registry

Description: Learn how to configure a Flux Receiver to accept Nexus Repository Manager webhooks and trigger reconciliation on container image events.

---

Sonatype Nexus Repository Manager is widely used as a container registry in enterprise environments. Flux CD supports Nexus webhooks through the Receiver resource with type `nexus`, enabling push-based reconciliation when new container images are pushed. This guide covers how to configure a Nexus webhook receiver in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A Nexus Repository Manager instance with a Docker-hosted repository
- Admin access to Nexus for webhook configuration
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for webhook authentication.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic nexus-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Note the token for Nexus configuration
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Define a Receiver with type `nexus`.

```yaml
# Receiver for Nexus Repository Manager webhooks
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: nexus-receiver
  namespace: flux-system
spec:
  # Nexus webhook type
  type: nexus
  # Nexus component events
  events:
    - "CREATED"
  # Secret for authentication
  secretRef:
    name: nexus-webhook-secret
  # Resources to reconcile
  resources:
    - kind: ImageRepository
      name: my-app
```

Apply the receiver.

```bash
# Apply the receiver
kubectl apply -f nexus-receiver.yaml

# Verify the receiver is created
kubectl get receivers -n flux-system
```

## Step 3: Get the Webhook URL

Retrieve the webhook path from the receiver status.

```bash
# Get the webhook URL path
kubectl get receiver nexus-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Step 4: Expose the Receiver Endpoint

Create an ingress to expose the notification controller.

```yaml
# Ingress for Nexus webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nexus-webhook-ingress
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

## Step 5: Configure Nexus Webhook

Set up the webhook capability in Nexus Repository Manager.

1. Log in to Nexus as an administrator
2. Navigate to **Administration** > **System** > **Capabilities**
3. Click **Create capability**
4. Select **Webhook: Repository**
5. Configure the capability:
   - **Repository**: Select your Docker repository
   - **Event Type**: Select **Component** with the **Created** action
   - **URL**: Enter `https://flux-webhook.example.com/<webhook-path>`
   - **Secret Key**: Enter the token from Step 1
6. Click **Create capability**

Nexus webhooks are configured as capabilities rather than per-repository settings, which allows for flexible event routing.

## Step 6: Configure for Multiple Repositories

Watch for image pushes across multiple Nexus repositories.

```yaml
# Receiver triggering multiple ImageRepository scans from Nexus
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: nexus-multi-receiver
  namespace: flux-system
spec:
  type: nexus
  events:
    - "CREATED"
  secretRef:
    name: nexus-webhook-secret
  resources:
    - kind: ImageRepository
      name: frontend
    - kind: ImageRepository
      name: backend
    - kind: ImageRepository
      name: microservice-a
```

## Step 7: Verify and Test

Test the integration by pushing an image to your Nexus registry.

```bash
# Check receiver status
kubectl get receiver nexus-receiver -n flux-system

# Describe the receiver
kubectl describe receiver nexus-receiver -n flux-system

# Monitor notification controller logs
kubectl logs -n flux-system deploy/notification-controller -f

# Push an image to Nexus
docker tag my-app:latest nexus.example.com/docker-hosted/my-app:latest
docker push nexus.example.com/docker-hosted/my-app:latest

# Verify the ImageRepository was scanned
kubectl get imagerepository my-app -n flux-system
```

## Troubleshooting

If the Nexus webhook is not triggering reconciliation, investigate these areas.

```bash
# Verify receiver readiness
kubectl get receiver nexus-receiver -n flux-system -o yaml

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller | grep -i "nexus\|receiver"

# Verify the secret exists
kubectl get secret nexus-webhook-secret -n flux-system

# Test endpoint
curl -I https://flux-webhook.example.com/
```

In Nexus, check the capability status to see if it is active and verify that the event type matches what the Flux receiver expects. Also check the Nexus system logs for webhook delivery errors.

## Summary

Configuring a Nexus webhook receiver in Flux connects your enterprise container registry to your GitOps pipeline. When images are pushed to Nexus, the receiver triggers immediate scanning of ImageRepository resources, accelerating your image update workflow. The setup involves creating a secret, defining a Receiver with type `nexus`, exposing the endpoint, and configuring a webhook capability in Nexus Repository Manager.
