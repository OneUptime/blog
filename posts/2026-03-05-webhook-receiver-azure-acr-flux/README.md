# How to Configure Webhook Receiver for Azure Container Registry in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Webhooks, Azure, ACR, Receiver, Container Registry

Description: Learn how to configure a Flux Receiver to accept Azure Container Registry webhooks and trigger reconciliation on image push events.

---

Azure Container Registry (ACR) supports webhook notifications for container image events. Flux CD can receive these webhooks through a Receiver resource with type `acr`, enabling push-based reconciliation when new images are pushed to your ACR instance. This guide walks through the complete configuration process.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- An Azure Container Registry instance
- Contributor or Owner access to the ACR for webhook configuration
- An ingress controller or load balancer to expose the receiver endpoint

## Step 1: Create the Webhook Secret

Create a Kubernetes secret for webhook authentication.

```bash
# Generate a random token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create the secret
kubectl create secret generic acr-webhook-secret \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Note the token
echo "Webhook token: $TOKEN"
```

## Step 2: Create the Receiver Resource

Define a Receiver with type `acr`.

```yaml
# Receiver for Azure Container Registry webhooks
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: acr-receiver
  namespace: flux-system
spec:
  # ACR webhook type
  type: acr
  # ACR push events
  events:
    - "push"
  # Secret for authentication
  secretRef:
    name: acr-webhook-secret
  # Resources to reconcile when new images are pushed
  resources:
    - kind: ImageRepository
      name: my-app
```

Apply the receiver.

```bash
# Apply the receiver
kubectl apply -f acr-receiver.yaml

# Verify the receiver
kubectl get receivers -n flux-system
```

## Step 3: Get the Webhook URL

Retrieve the generated webhook path.

```bash
# Get the webhook URL path
kubectl get receiver acr-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Step 4: Expose the Receiver Endpoint

Make the notification controller reachable from Azure.

```yaml
# Ingress for ACR webhook receiver
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: acr-webhook-ingress
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

## Step 5: Configure ACR Webhook via Azure CLI

You can configure the ACR webhook using the Azure CLI.

```bash
# Create a webhook in Azure Container Registry
az acr webhook create \
  --name fluxcdreceiver \
  --registry myregistry \
  --resource-group myresourcegroup \
  --uri "https://flux-webhook.example.com/<webhook-path>" \
  --actions push \
  --scope "my-app:*"

# Verify the webhook was created
az acr webhook list --registry myregistry --resource-group myresourcegroup
```

Alternatively, configure it through the Azure Portal:

1. Navigate to your ACR instance in the Azure Portal
2. Go to **Services** > **Webhooks**
3. Click **+ Add**
4. Set the **Webhook name** to "fluxcdreceiver"
5. Set the **Service URI** to `https://flux-webhook.example.com/<webhook-path>`
6. Set **Actions** to **push**
7. Optionally set the **Scope** to limit to specific repositories (e.g., `my-app:*`)
8. Click **Create**

## Step 6: Configure for Multiple Repositories

Trigger reconciliation for multiple image repositories from ACR.

```yaml
# Receiver triggering multiple image scans from ACR
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: acr-multi-receiver
  namespace: flux-system
spec:
  type: acr
  events:
    - "push"
  secretRef:
    name: acr-webhook-secret
  resources:
    - kind: ImageRepository
      name: frontend
    - kind: ImageRepository
      name: backend-api
    - kind: ImageRepository
      name: worker-service
```

## Step 7: Verify and Test

Test the integration by pushing an image to ACR.

```bash
# Check receiver status
kubectl get receiver acr-receiver -n flux-system

# Describe the receiver
kubectl describe receiver acr-receiver -n flux-system

# Monitor notification controller logs
kubectl logs -n flux-system deploy/notification-controller -f

# Push a test image to ACR
az acr login --name myregistry
docker tag my-app:latest myregistry.azurecr.io/my-app:test
docker push myregistry.azurecr.io/my-app:test

# Check ImageRepository status
kubectl get imagerepository my-app -n flux-system

# Test the webhook from Azure CLI
az acr webhook ping --name fluxcdreceiver --registry myregistry --resource-group myresourcegroup
```

## Troubleshooting

If ACR webhooks are not triggering, check these items.

```bash
# Verify receiver status
kubectl get receiver acr-receiver -n flux-system -o yaml

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller | grep -i "acr\|receiver"

# Verify the secret
kubectl get secret acr-webhook-secret -n flux-system

# Check webhook delivery status from Azure
az acr webhook list-events --name fluxcdreceiver --registry myregistry --resource-group myresourcegroup
```

Common issues include:
- Network connectivity between Azure and your cluster
- Incorrect webhook URI in the ACR configuration
- The receiver endpoint not being accessible over the internet
- Webhook scope filtering out the pushed image

## Summary

Configuring an ACR webhook receiver in Flux enables instant image scanning when new images are pushed to Azure Container Registry. The setup involves creating a secret, defining a Receiver with type `acr`, exposing the notification controller, and adding a webhook in ACR via the Azure Portal or CLI. This push-based approach minimizes the time between image availability and deployment updates in your GitOps pipeline.
