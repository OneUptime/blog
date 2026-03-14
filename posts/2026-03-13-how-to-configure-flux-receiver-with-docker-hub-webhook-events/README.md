# How to Configure Flux Receiver with Docker Hub Webhook Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Docker Hub, Webhook, Container Registry

Description: Learn how to configure a Flux Receiver for Docker Hub webhook events to trigger reconciliation when new container images are pushed.

---

## Introduction

Container image updates are a common trigger for deployments in Kubernetes environments. Docker Hub can send webhook notifications when new images are pushed to a repository, and Flux can receive these notifications to trigger immediate reconciliation. This is particularly useful when your CI pipeline pushes a new image to Docker Hub and you want the cluster to pick it up without waiting for the next polling interval.

This guide walks you through configuring a Flux Receiver for Docker Hub webhook events, connecting it to your image update automation, and verifying the end-to-end flow.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller accessible from the internet
- A Docker Hub account with at least one repository
- Flux image automation controllers installed (image-reflector-controller and image-automation-controller) if using image update automation
- kubectl access to the flux-system namespace

## How Docker Hub Webhooks Work

Docker Hub sends a POST request to a configured URL whenever a new image is pushed to a repository. The payload includes the repository name, the tag that was pushed, the pusher information, and a callback URL. Flux's notification controller can parse this payload and trigger reconciliation of specified resources.

## Creating the Webhook Secret

Create the authentication secret:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic dockerhub-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

As a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Receiver for Docker Hub

Create the Receiver with the `dockerhub` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: dockerhub-receiver
  namespace: flux-system
spec:
  type: dockerhub
  secretRef:
    name: dockerhub-webhook-token
  resources:
    - kind: ImageRepository
      name: my-app
    - kind: ImagePolicy
      name: my-app
```

Note that for Docker Hub receivers, the `events` field is optional. The receiver responds to any webhook call from Docker Hub. The resources listed should include your ImageRepository and ImagePolicy resources so that Flux re-scans for new tags immediately.

## Setting Up Image Automation Resources

For the Receiver to be most effective, you need the image automation pipeline configured:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/yourorg/my-app
  interval: 1h
  secretRef:
    name: dockerhub-credentials
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

The ImageRepository scans Docker Hub for available tags, and the ImagePolicy selects the latest tag matching your criteria. When the Receiver triggers reconciliation, the ImageRepository immediately re-scans, picking up the newly pushed image.

## Applying and Getting the Webhook URL

Apply the Receiver and retrieve the webhook path:

```bash
kubectl apply -f dockerhub-receiver.yaml
kubectl get receiver dockerhub-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

The full webhook URL combines your notification controller's external domain with this path.

## Exposing the Notification Controller

Set up ingress for external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-dockerhub-webhook
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

## Configuring the Docker Hub Webhook

In Docker Hub, navigate to your repository:

1. Go to the repository page on hub.docker.com
2. Click on "Webhooks" tab
3. Enter a name for the webhook (e.g., "Flux Trigger")
4. Enter the full webhook URL
5. Click "Create"

Docker Hub will send a test request to verify the URL is reachable.

## Triggering Full Deployment Chain

To trigger the complete deployment chain from image push to application update:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: dockerhub-full-chain
  namespace: flux-system
spec:
  type: dockerhub
  secretRef:
    name: dockerhub-webhook-token
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

This triggers a cascade: the ImageRepository re-scans, the ImagePolicy evaluates the new tag, the ImageUpdateAutomation commits the new tag to Git, the GitRepository picks up the commit, and the Kustomization deploys the update.

## Multiple Image Repositories

If you have multiple Docker Hub repositories, you can handle them with a single receiver:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: dockerhub-multi-image
  namespace: flux-system
spec:
  type: dockerhub
  secretRef:
    name: dockerhub-webhook-token
  resources:
    - kind: ImageRepository
      name: frontend-app
    - kind: ImageRepository
      name: backend-api
    - kind: ImageRepository
      name: worker-service
    - kind: ImagePolicy
      name: frontend-app
    - kind: ImagePolicy
      name: backend-api
    - kind: ImagePolicy
      name: worker-service
```

Configure a webhook in each Docker Hub repository pointing to the same webhook URL.

## Using with HelmRelease

If your deployments use Helm charts with image values:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: dockerhub-helm-receiver
  namespace: flux-system
spec:
  type: dockerhub
  secretRef:
    name: dockerhub-webhook-token
  resources:
    - kind: ImageRepository
      name: my-app
    - kind: HelmRelease
      name: my-app
```

The HelmRelease reconciliation will pick up the new image if it references the ImagePolicy for its values.

## Verifying the Integration

Push a new image to Docker Hub and watch for reconciliation:

```bash
docker build -t yourorg/my-app:v1.1.0 .
docker push yourorg/my-app:v1.1.0
```

Monitor the notification controller:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Check the ImageRepository for the new tag:

```bash
flux get image repository my-app -n flux-system
flux get image policy my-app -n flux-system
```

## Troubleshooting

If Docker Hub webhooks are not triggering reconciliation:

Check the webhook delivery history in Docker Hub. The repository's Webhooks tab shows recent calls and their response codes.

Verify the Receiver is ready:

```bash
kubectl describe receiver dockerhub-receiver -n flux-system
```

Ensure the notification controller service is accessible. Docker Hub requires HTTPS endpoints for webhooks. Self-signed certificates may cause delivery failures.

Check the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "error\|docker\|receiver"
```

## Conclusion

Configuring a Flux Receiver for Docker Hub webhook events creates an automated pipeline from image push to cluster deployment. When your CI system pushes a new image to Docker Hub, the webhook triggers Flux to immediately re-scan the image repository, evaluate policies, and deploy updates. This eliminates the scanning interval delay and gives you responsive container deployments. Combined with Flux's image automation controllers, this integration provides a complete image-driven deployment workflow.
