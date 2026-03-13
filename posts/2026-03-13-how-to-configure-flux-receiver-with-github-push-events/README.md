# How to Configure Flux Receiver with GitHub Push Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, GitHub, Webhook

Description: Learn how to configure a Flux Receiver to trigger immediate reconciliation when GitHub push events occur, eliminating polling delays.

---

## Introduction

By default, Flux reconciles resources on a scheduled interval, typically every few minutes. This polling approach means there is always a delay between pushing code to your Git repository and seeing it deployed in your cluster. Flux Receivers solve this by exposing a webhook endpoint that external systems like GitHub can call to trigger immediate reconciliation.

This guide walks you through configuring a Flux Receiver for GitHub push events, setting up the webhook in GitHub, and verifying that pushes trigger instant reconciliation.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller running with a publicly accessible endpoint (or via an ingress)
- A GitHub repository that Flux is tracking
- Admin access to the GitHub repository for webhook configuration
- kubectl access to the flux-system namespace

## Understanding Flux Receivers

A Receiver is a Flux resource that generates a unique webhook URL. When this URL receives an HTTP POST request with the correct payload and authentication, the notification controller triggers a reconciliation of the specified resources. This eliminates the polling delay and gives you near-instant deployments on push.

The Receiver validates incoming requests using a shared secret, ensuring that only authorized sources can trigger reconciliation.

## Creating the Webhook Secret

First, create a Kubernetes secret containing the token that GitHub will use to authenticate webhook requests:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

Generate a strong random token:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic github-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

Save this token value, as you will need it when configuring the webhook in GitHub.

## Configuring the Receiver for Push Events

Create the Receiver resource that listens for GitHub push events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-push-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: github-webhook-token
  resources:
    - kind: GitRepository
      name: flux-system
    - kind: GitRepository
      name: app-repo
```

The key fields are:

- `type: github` tells the notification controller to expect GitHub webhook payload format and validate the signature accordingly
- `events` lists the GitHub event types to process. Include `ping` so GitHub can verify the webhook during setup
- `secretRef` references the shared secret for HMAC signature validation
- `resources` lists the Flux resources to reconcile when a push event is received

## Applying the Receiver

Apply the configuration:

```bash
kubectl apply -f receiver.yaml
```

Check the Receiver status to get the generated webhook URL:

```bash
kubectl get receiver github-push-receiver -n flux-system
```

The output shows the webhook path:

```text
NAME                    AGE   READY   STATUS
github-push-receiver    10s   True    Receiver initialized for path: /hook/abc123def456...
```

Get the full URL path:

```bash
kubectl get receiver github-push-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Exposing the Receiver Endpoint

The notification controller needs to be accessible from the internet for GitHub to reach it. Set up an ingress or use a LoadBalancer service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-webhook
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

Your full webhook URL will be: `https://flux-webhook.yourdomain.com/hook/abc123def456...`

## Configuring the GitHub Webhook

In your GitHub repository, navigate to Settings, then Webhooks, and click Add webhook. Configure the following:

- **Payload URL**: The full webhook URL from the Receiver status
- **Content type**: application/json
- **Secret**: The same token you stored in the Kubernetes secret
- **Events**: Select "Just the push event"
- **Active**: Checked

GitHub will send a ping event to verify the webhook. Check the webhook delivery history to confirm a successful response.

## Targeting Specific Branches

To limit reconciliation triggers to a specific branch, you can filter in the GitRepository resource:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/yourorg/your-app
  ref:
    branch: main
  secretRef:
    name: github-credentials
```

The Receiver triggers reconciliation of the GitRepository, but the GitRepository only tracks the `main` branch. Push events to other branches will trigger reconciliation, but the GitRepository will find no new commits and skip the update.

## Multiple Repositories in One Receiver

A single Receiver can trigger reconciliation for multiple GitRepository resources:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-multi-repo-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: github-webhook-token
  resources:
    - kind: GitRepository
      name: infrastructure-repo
    - kind: GitRepository
      name: app-frontend-repo
    - kind: GitRepository
      name: app-backend-repo
    - kind: Kustomization
      name: apps
```

You can also include Kustomization and HelmRelease resources directly to trigger their reconciliation alongside the source update.

## Verifying the Setup

After configuring both the Receiver and the GitHub webhook, test the integration:

Push a commit to your repository and check the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

You should see log entries indicating the webhook was received and reconciliation was triggered.

Verify the GitRepository was updated:

```bash
flux get sources git -n flux-system
```

The last reconciliation timestamp should reflect the time of your push.

## Troubleshooting

If pushes are not triggering reconciliation, check these common issues:

Verify the Receiver is ready:

```bash
kubectl describe receiver github-push-receiver -n flux-system
```

Check that the webhook URL is correct and accessible from the internet. Test with curl:

```bash
curl -X POST https://flux-webhook.yourdomain.com/hook/abc123... \
  -H "Content-Type: application/json" \
  -d '{}'
```

Ensure the secret token matches between the Kubernetes secret and the GitHub webhook configuration. A mismatch causes HMAC validation failures, which appear in the notification controller logs.

## Conclusion

Configuring a Flux Receiver for GitHub push events transforms your GitOps workflow from polling-based to event-driven. Pushes to your repository trigger immediate reconciliation, reducing deployment latency from minutes to seconds. The setup involves creating a shared secret, defining the Receiver resource, exposing the notification controller, and configuring the GitHub webhook. Once in place, this integration provides a responsive deployment pipeline that reacts to code changes as they happen.
