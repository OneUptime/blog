# How to Configure Flux Receiver with Quay Webhook Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Quay, Webhook, Container Registry

Description: Learn how to configure a Flux Receiver for Quay webhook events to trigger reconciliation when new container images are pushed to Quay.io or self-hosted Quay.

---

## Introduction

Quay is a container registry provided by Red Hat, available both as a managed service at quay.io and as a self-hosted solution. Quay supports webhook notifications for repository events, making it possible to integrate with Flux Receivers for event-driven container deployments. When a new image is pushed to Quay, the webhook triggers Flux to immediately re-scan the image repository and deploy updates.

This guide covers configuring a Flux Receiver for Quay webhook events, setting up the webhook in the Quay UI, and building an automated image deployment pipeline.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster running a version supported by your Flux release
- Flux v2 installed and bootstrapped
- The notification controller accessible from Quay (via ingress or LoadBalancer)
- A Quay.io account or self-hosted Quay instance with a repository
- Admin access to the Quay repository or organization
- Flux image automation controllers installed
- kubectl access to the flux-system namespace

## Quay Webhook Notifications

Quay supports repository notifications that fire on specific events:

- **Push to Repository**: Triggered when a new image tag is pushed
- **Image build queued**: Triggered when a Quay build is queued
- **Image build started**: Triggered when a Quay build starts
- **Image build success**: Triggered when a Quay build finishes successfully
- **Image build failed**: Triggered when a Quay build fails
- **Image build cancelled**: Triggered when a Quay build is cancelled
- **Image expiry trigger**: Triggered when an image is due to expire

For deployment automation, the "Push to Repository" event is the primary trigger. Flux's Quay Receiver supports Quay repository push notifications only.

## Creating the Webhook Secret

Create the Kubernetes secret used to generate the Receiver webhook path:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic quay-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

Declarative YAML:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: quay-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Receiver for Quay

Create the Receiver with the `quay` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: quay-receiver
  namespace: flux-system
spec:
  type: quay
  secretRef:
    name: quay-webhook-token
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: my-app
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImagePolicy
      name: my-app
```

The `quay` type instructs the notification controller to parse Quay's repository push payload format. The controller performs minimal validation by unmarshalling the JSON request body to the expected format, then requests reconciliation for the listed resources.

## Setting Up Image Automation Resources

Configure Flux to track images in your Quay repository:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: quay.io/yourorg/my-app
  interval: 1h
  secretRef:
    name: quay-registry-credentials
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

Create the registry credentials:

```bash
kubectl create secret docker-registry quay-registry-credentials \
  --namespace=flux-system \
  --docker-server=quay.io \
  --docker-username=your-username \
  --docker-password=your-password
```

For self-hosted Quay, replace `quay.io` with your Quay hostname.

## Applying and Getting the Webhook URL

Apply the configuration and retrieve the webhook path:

```bash
kubectl apply -f quay-receiver.yaml
kubectl get receiver quay-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

The full webhook URL is: `https://flux-webhook.yourdomain.com` + the webhook path.

## Configuring the Webhook in Quay

In the Quay web UI:

1. Navigate to your repository
2. Click on the Settings gear icon
3. Select "Create Notification" from the left sidebar
4. Configure the notification:
   - **When this event occurs**: Select "Push to Repository"
   - **Then issue a notification**: Select "Webhook POST"
   - **Webhook URL**: Enter your full webhook URL
5. Click "Create Notification"

For Quay.io, the notification configuration is per-repository, including repositories owned by an organization.

## Full Deployment Chain Configuration

Connect the image push event to the complete deployment pipeline:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: quay-full-deploy
  namespace: flux-system
spec:
  type: quay
  secretRef:
    name: quay-webhook-token
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: my-app
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImagePolicy
      name: my-app
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageUpdateAutomation
      name: flux-system
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: apps
```

This triggers the complete automation chain when a new image is pushed to Quay.

## Multiple Quay Repositories

Handle multiple image repositories with a single receiver:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: quay-multi-repo
  namespace: flux-system
spec:
  type: quay
  secretRef:
    name: quay-webhook-token
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: frontend
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: backend
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: worker
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImagePolicy
      name: frontend
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImagePolicy
      name: backend
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImagePolicy
      name: worker
```

Set up a notification in each Quay repository pointing to the same webhook URL.

## Self-Hosted Quay Configuration

When using a self-hosted Quay instance, update the ImageRepository to point to your instance:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: quay.internal.yourdomain.com/myproject/my-app
  interval: 1h
  certSecretRef:
    name: quay-ca-cert
  secretRef:
    name: quay-registry-credentials
```

If your self-hosted Quay uses a custom CA certificate:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: quay-ca-cert
  namespace: flux-system
data:
  ca.crt: <base64-encoded-ca-certificate>
```

## Exposing the Notification Controller

Create an ingress for webhook access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-quay-webhook
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

## Integrating with Quay Robot Accounts

For CI/CD pipelines that push images using Quay robot accounts, ensure the same repository has the webhook configured:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: quay.io/yourorg/my-app
  interval: 1h
  secretRef:
    name: quay-robot-credentials
```

```bash
kubectl create secret docker-registry quay-robot-credentials \
  --namespace=flux-system \
  --docker-server=quay.io \
  --docker-username="yourorg+fluxbot" \
  --docker-password="robot-account-token"
```

## Verifying the Integration

Push a new image to Quay:

```bash
docker tag my-app:latest quay.io/yourorg/my-app:v1.3.0
docker push quay.io/yourorg/my-app:v1.3.0
```

Monitor the notification controller:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Check image automation status:

```bash
flux get image repository my-app -n flux-system
flux get image policy my-app -n flux-system
```

In Quay, check the notification history in the repository settings to verify successful delivery.

## Troubleshooting

If Quay webhooks are not triggering reconciliation:

Verify the Receiver is ready:

```bash
kubectl describe receiver quay-receiver -n flux-system
```

Check that the notification URL is correct in Quay settings. Quay requires the full URL including the protocol.

Review the notification controller logs for errors:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "error\|quay\|receiver"
```

Ensure network connectivity between Quay and your webhook endpoint. For self-hosted Quay, verify firewall rules allow outbound connections to your cluster.

## Conclusion

Configuring a Flux Receiver for Quay webhook events enables automated container deployments triggered by image pushes. Whether using quay.io or a self-hosted Quay instance, the integration follows the standard Receiver pattern: create a secret, define the Receiver with the `quay` type, expose the notification controller, and configure the webhook in Quay. Combined with Flux image automation controllers, this creates a responsive pipeline that deploys new container images as soon as they are pushed to your registry.
