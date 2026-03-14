# How to Configure Flux Receiver with Harbor Webhook Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Harbor, Webhook, Container Registry

Description: Learn how to configure a Flux Receiver for Harbor webhook events to trigger reconciliation when new images are pushed to your Harbor registry.

---

## Introduction

Harbor is an open-source container registry widely adopted in enterprise Kubernetes environments for its security scanning, access control, and replication features. When using Flux with Harbor as your container registry, you can configure a Receiver to respond to Harbor webhook events, triggering immediate reconciliation when new images are pushed or artifacts are signed.

This guide covers how to set up a Flux Receiver for Harbor webhook events, configure the webhook in Harbor, and integrate it with Flux image automation for a complete image-driven deployment pipeline.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller accessible from your Harbor instance
- A Harbor registry with at least one project and repository
- Harbor admin or project admin access for webhook configuration
- Flux image automation controllers installed if using image update automation
- kubectl access to the flux-system namespace

## Harbor Webhook Events

Harbor supports several webhook event types:

- **Push artifact**: Triggered when a new image or artifact is pushed
- **Pull artifact**: Triggered when an artifact is pulled
- **Delete artifact**: Triggered when an artifact is deleted
- **Scanning completed**: Triggered when a vulnerability scan finishes
- **Scanning failed**: Triggered when a scan encounters an error

For deployment automation, the push artifact event is the most relevant, as it indicates a new image is available.

## Creating the Webhook Secret

Set up the authentication secret:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic harbor-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

As a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: harbor-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Receiver for Harbor

Create the Receiver with the `harbor` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: harbor-receiver
  namespace: flux-system
spec:
  type: harbor
  secretRef:
    name: harbor-webhook-token
  resources:
    - kind: ImageRepository
      name: my-app
    - kind: ImagePolicy
      name: my-app
```

The `harbor` type tells the notification controller to expect Harbor's webhook payload format and validate the authentication header accordingly.

## Setting Up Image Automation with Harbor

Configure the image automation pipeline to work with your Harbor registry:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: harbor.yourdomain.com/myproject/my-app
  interval: 1h
  secretRef:
    name: harbor-registry-credentials
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

Create the registry credentials secret:

```bash
kubectl create secret docker-registry harbor-registry-credentials \
  --namespace=flux-system \
  --docker-server=harbor.yourdomain.com \
  --docker-username=your-username \
  --docker-password=your-password
```

## Applying and Getting the Webhook URL

Apply the Receiver:

```bash
kubectl apply -f harbor-receiver.yaml
kubectl get receiver harbor-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

Combine the webhook path with your notification controller's external URL.

## Configuring the Webhook in Harbor

In the Harbor web UI:

1. Navigate to your project
2. Go to the Webhooks section
3. Click "New Webhook"
4. Configure the webhook:
   - **Notify Type**: HTTP
   - **Event Type**: Select "Artifact pushed"
   - **Endpoint URL**: Your full webhook URL
   - **Auth Header**: The token from your Kubernetes secret
5. Click "Continue" and then "Add"

Harbor allows you to configure webhooks at the project level, meaning all repositories within the project will trigger the webhook.

## Complete Deployment Chain

Trigger the full deployment pipeline from image push through to application update:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: harbor-full-chain
  namespace: flux-system
spec:
  type: harbor
  secretRef:
    name: harbor-webhook-token
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

When a new image is pushed to Harbor, this triggers the full chain: image scanning, policy evaluation, Git commit with the updated tag, and cluster reconciliation.

## Multiple Projects in One Receiver

If you have images spread across Harbor projects:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: harbor-multi-project
  namespace: flux-system
spec:
  type: harbor
  secretRef:
    name: harbor-webhook-token
  resources:
    - kind: ImageRepository
      name: frontend-app
    - kind: ImageRepository
      name: backend-api
    - kind: ImageRepository
      name: data-service
    - kind: ImagePolicy
      name: frontend-app
    - kind: ImagePolicy
      name: backend-api
    - kind: ImagePolicy
      name: data-service
```

Configure webhooks in each Harbor project pointing to the same Receiver webhook URL.

## Integrating with Harbor Scan Results

You can create a receiver that responds to scan completion events, ensuring only scanned images trigger deployments:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: harbor-scan-complete
  namespace: flux-system
spec:
  type: harbor
  secretRef:
    name: harbor-webhook-token
  resources:
    - kind: ImageRepository
      name: my-app
    - kind: ImagePolicy
      name: my-app
```

In Harbor, configure the webhook to trigger on "Scanning completed" events instead of push events. This way, reconciliation only happens after the image has been scanned for vulnerabilities.

## Ingress Configuration

Expose the notification controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-harbor-webhook
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

Since Harbor is often self-hosted on the same network as the Kubernetes cluster, you may be able to use internal networking instead of a public ingress.

## Verifying the Integration

Push a new image to Harbor:

```bash
docker tag my-app:latest harbor.yourdomain.com/myproject/my-app:v1.2.0
docker push harbor.yourdomain.com/myproject/my-app:v1.2.0
```

Watch the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Check that the ImageRepository detected the new tag:

```bash
flux get image repository my-app -n flux-system
flux get image policy my-app -n flux-system
```

In Harbor, check the webhook logs under the project's Webhook section for delivery status.

## Troubleshooting

If Harbor webhooks are not working:

Verify the Receiver status:

```bash
kubectl describe receiver harbor-receiver -n flux-system
```

Check that Harbor can reach the notification controller. Test connectivity from the Harbor host if possible. Ensure the auth header in Harbor matches the token in your Kubernetes secret.

Review notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "error\|harbor\|receiver"
```

Ensure the Harbor webhook is enabled and not paused in the project settings.

## Conclusion

Configuring a Flux Receiver for Harbor webhook events integrates your enterprise container registry directly with your GitOps deployment pipeline. When new images are pushed to Harbor, the Receiver triggers immediate reconciliation of your image automation resources, eliminating scanning delays. Combined with Harbor's vulnerability scanning, you can build a deployment pipeline that only promotes scanned images to production. This integration is particularly valuable for enterprise environments where Harbor serves as the central container registry and security scanning is a deployment requirement.
