# How to Configure Flux Receiver with ACR Webhook Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, ACR, Azure, Webhook, Container Registry

Description: Learn how to configure a Flux Receiver for Azure Container Registry webhook events to trigger reconciliation when new images are pushed to ACR.

---

## Introduction

Azure Container Registry (ACR) is the native container registry for teams running workloads on Azure Kubernetes Service (AKS) or any Kubernetes cluster that pulls images from Azure infrastructure. ACR supports webhooks that fire when images are pushed, deleted, or quarantined. By connecting ACR webhooks to a Flux Receiver, you can trigger immediate reconciliation whenever a new container image is available, eliminating the polling delay.

This guide covers how to configure a Flux Receiver for ACR webhook events, set up the webhook in the Azure portal or CLI, and integrate with Flux image automation for end-to-end automated deployments.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later, AKS recommended but not required)
- Flux v2 installed and bootstrapped
- The notification controller accessible from Azure (via ingress or LoadBalancer)
- An Azure Container Registry instance
- Azure CLI installed with permissions to manage ACR webhooks
- Flux image automation controllers installed
- kubectl access to the flux-system namespace

## ACR Webhook Events

Azure Container Registry supports several webhook actions:

- **push**: Triggered when an image is pushed to the registry
- **delete**: Triggered when an image tag or manifest is deleted
- **quarantine**: Triggered when an image is quarantined
- **chart_push**: Triggered when a Helm chart is pushed
- **chart_delete**: Triggered when a Helm chart is deleted

For deployment automation, the `push` action is the primary event you want to capture.

## Creating the Webhook Secret

Create the authentication secret:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic acr-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: acr-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Receiver for ACR

Create the Receiver with the `acr` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: acr-receiver
  namespace: flux-system
spec:
  type: acr
  secretRef:
    name: acr-webhook-token
  resources:
    - kind: ImageRepository
      name: my-app
    - kind: ImagePolicy
      name: my-app
```

The `acr` type tells the notification controller to expect ACR's webhook payload format. The controller parses the payload to extract the repository and tag information.

## Setting Up Image Automation for ACR

Configure the image automation pipeline pointing to your ACR instance:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: myregistry.azurecr.io/my-app
  interval: 1h
  provider: azure
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

When running on AKS with managed identity, the `provider: azure` field enables workload identity authentication to ACR without explicit credentials. For non-AKS clusters, use a docker-registry secret:

```bash
kubectl create secret docker-registry acr-credentials \
  --namespace=flux-system \
  --docker-server=myregistry.azurecr.io \
  --docker-username=service-principal-id \
  --docker-password=service-principal-secret
```

Then reference it in the ImageRepository:

```yaml
spec:
  secretRef:
    name: acr-credentials
```

## Applying and Getting the Webhook URL

Apply the Receiver and retrieve the webhook URL:

```bash
kubectl apply -f acr-receiver.yaml
kubectl get receiver acr-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Exposing the Notification Controller

Set up ingress for external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-acr-webhook
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.yourdomain.com
      secretName: webhook-tls
  rules:
    - host: flux-webhook.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
```

## Configuring the ACR Webhook via Azure CLI

Create the webhook using the Azure CLI:

```bash
az acr webhook create \
  --name fluxReconcileTrigger \
  --registry myregistry \
  --resource-group my-rg \
  --uri "https://flux-webhook.yourdomain.com/hook/abc123..." \
  --actions push \
  --scope "my-app:*" \
  --custom-headers "Authorization=token your-secure-random-token-here"
```

Key parameters:

- `--actions push` limits the webhook to push events
- `--scope "my-app:*"` restricts the webhook to the `my-app` repository with any tag
- `--custom-headers` sets the authorization header that Flux uses to validate the request

## Configuring via Azure Portal

Alternatively, configure the webhook through the Azure portal:

1. Navigate to your Container Registry in the Azure portal
2. Select "Webhooks" under Services
3. Click "Add"
4. Fill in the details:
   - **Webhook name**: flux-reconcile-trigger
   - **Service URI**: Your full webhook URL
   - **Custom headers**: `Authorization: token your-secure-random-token-here`
   - **Actions**: Select "push"
   - **Scope**: Enter the repository name pattern (e.g., `my-app:*`)
   - **Status**: On
5. Click "Create"

## Scoping Webhooks to Specific Repositories

ACR webhooks support scope patterns to control which repositories trigger the webhook:

```bash
# Single repository, all tags
az acr webhook create --scope "my-app:*" ...

# Single repository, specific tag pattern
az acr webhook create --scope "my-app:v*" ...

# All repositories
az acr webhook create --scope "" ...
```

## Full Deployment Chain

Trigger the complete deployment pipeline on image push:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: acr-full-deploy
  namespace: flux-system
spec:
  type: acr
  secretRef:
    name: acr-webhook-token
  resources:
    - kind: ImageRepository
      name: my-app
    - kind: ImagePolicy
      name: my-app
    - kind: ImageUpdateAutomation
      name: flux-system
    - kind: GitRepository
      name: flux-system
    - kind: Kustomization
      name: apps
```

## Multiple ACR Repositories

Handle multiple repositories with a single receiver:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: acr-multi-repo
  namespace: flux-system
spec:
  type: acr
  secretRef:
    name: acr-webhook-token
  resources:
    - kind: ImageRepository
      name: frontend
    - kind: ImageRepository
      name: backend
    - kind: ImageRepository
      name: worker
    - kind: ImagePolicy
      name: frontend
    - kind: ImagePolicy
      name: backend
    - kind: ImagePolicy
      name: worker
```

In ACR, create a single webhook with an empty scope to capture pushes from all repositories, or create separate webhooks scoped to each repository.

## AKS Integration with Managed Identity

When running on AKS with ACR integration enabled, you can simplify authentication:

```bash
az aks update \
  --name my-aks-cluster \
  --resource-group my-rg \
  --attach-acr myregistry
```

This grants the AKS cluster pull access to ACR. Flux image automation controllers running on the cluster inherit this access when configured with `provider: azure`.

## Verifying the Integration

Push a new image to ACR:

```bash
az acr login --name myregistry
docker tag my-app:latest myregistry.azurecr.io/my-app:v1.4.0
docker push myregistry.azurecr.io/my-app:v1.4.0
```

Monitor the notification controller:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Check image automation:

```bash
flux get image repository my-app -n flux-system
flux get image policy my-app -n flux-system
```

Verify webhook delivery in Azure:

```bash
az acr webhook list-events --name fluxReconcileTrigger --registry myregistry
```

## Troubleshooting

If ACR webhooks are not working:

Check webhook ping:

```bash
az acr webhook ping --name fluxReconcileTrigger --registry myregistry
```

Verify the webhook configuration:

```bash
az acr webhook show --name fluxReconcileTrigger --registry myregistry
```

Check that the custom header matches the Kubernetes secret token exactly. Review the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "error\|acr\|receiver"
```

Ensure the notification controller is reachable from Azure. Test with the webhook ping command and check the response code.

## Conclusion

Configuring a Flux Receiver for ACR webhook events creates a seamless integration between your Azure container registry and your GitOps deployment pipeline. When CI pushes a new image to ACR, the webhook triggers Flux to immediately scan for the new tag and deploy the update. Combined with AKS managed identity integration, this provides a fully automated, secure deployment workflow within the Azure ecosystem. The setup is straightforward whether you use the Azure CLI or portal, and the scoping feature lets you control exactly which repository pushes trigger reconciliation.
