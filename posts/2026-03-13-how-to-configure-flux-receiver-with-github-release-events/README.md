# How to Configure Flux Receiver with GitHub Release Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, GitHub, Release, Webhook

Description: Learn how to configure a Flux Receiver that triggers reconciliation when new GitHub releases are published for release-driven deployment workflows.

---

## Introduction

Many teams use GitHub Releases as their deployment trigger. Rather than deploying on every push, they cut a release when code is ready for production. Flux can respond to these release events through a Receiver, triggering reconciliation when GitHub sends a release webhook event. This approach gives you explicit control over when deployments happen while still maintaining the speed benefits of event-driven reconciliation.

This guide covers how to set up a Flux Receiver for GitHub release events, configure the GitHub webhook, and build a release-driven deployment pipeline.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster running a version supported by your Flux release
- Flux v2 installed and bootstrapped
- The notification controller accessible via ingress or LoadBalancer
- A GitHub repository that uses releases for versioning
- Admin access to the GitHub repository
- kubectl access to the flux-system namespace

## Why Use Release Events Instead of Push Events

Push events trigger reconciliation on every commit, which works well for development environments. However, production environments often need more controlled deployment triggers. Release events offer several advantages:

- Reconciliation happens on release activity instead of every commit
- Release tags provide clear versioning for rollback purposes
- Release notes serve as deployment documentation
- The workflow supports approval processes before creating the release

## Creating the Webhook Secret

Create the secret that both Flux and GitHub will use for webhook authentication:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic github-release-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

Or define it declaratively:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-release-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Receiver for Release Events

Create the Receiver resource that responds to release events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-release-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "release"
  secretRef:
    name: github-release-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: app-repo
```

The `events` field specifies `release` instead of `push`. GitHub sends a release event for release activity such as creating, publishing, editing, or deleting a release. The notification controller processes the webhook and triggers reconciliation of the listed source resources. Flux then notifies downstream Kustomizations or HelmReleases when the source artifact revision changes.

## Configuring the GitRepository for Tag-Based Tracking

To align with the release workflow, configure your GitRepository to track tags or semver ranges:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 1h
  url: https://github.com/yourorg/your-app
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: github-credentials
```

Using `semver` in the ref field makes the GitRepository track the latest tag matching the semver range. When a release points to a new matching tag, the Receiver triggers reconciliation, and the GitRepository picks up the new tag.

Alternatively, track a specific tag:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 1h
  url: https://github.com/yourorg/your-app
  ref:
    tag: v1.5.0
```

## Setting Up the GitHub Webhook

In your GitHub repository, go to Settings, then Webhooks, and add a new webhook:

- **Payload URL**: The public URL composed from your ingress or LoadBalancer hostname and the Receiver status path
- **Content type**: application/json
- **Secret**: The token from your Kubernetes secret
- **Events**: Select "Let me select individual events", then check only "Releases"
- **Active**: Checked

Retrieve the webhook path:

```bash
kubectl get receiver github-release-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

## Exposing the Webhook Endpoint

Ensure the webhook receiver endpoint is reachable from GitHub:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-release-webhook
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
                name: webhook-receiver
                port:
                  number: 80
```

## Combining with HelmRelease

If your application uses Helm charts versioned alongside releases:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-helm-release-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "release"
  secretRef:
    name: github-release-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: helm-charts-repo
```

This triggers the source update: the GitRepository fetches the new tag, and Flux notifies the downstream Helm resources when the source artifact revision changes.

## Multiple Repositories with Release Receivers

Create separate receivers for different repositories:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: frontend-release-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "release"
  secretRef:
    name: github-release-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: frontend-repo
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: backend-release-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "release"
  secretRef:
    name: github-release-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: backend-repo
```

Each receiver has its own webhook URL, allowing you to configure separate webhooks in each GitHub repository.

## Verifying the Setup

Create a test release in your GitHub repository and watch the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Check that the GitRepository reflects the new tag:

```bash
flux get sources git app-repo -n flux-system
```

Verify the downstream Kustomization or HelmRelease was reconciled:

```bash
flux get kustomizations -n flux-system
flux get helmreleases -n flux-system
```

## Troubleshooting

If release events are not triggering reconciliation:

Check the GitHub webhook delivery history in your repository settings. Look for failed deliveries and examine the response codes. A 404 means the webhook URL is incorrect. A 401 or 403 means the secret does not match.

Verify the Receiver status:

```bash
kubectl describe receiver github-release-receiver -n flux-system
```

Ensure the webhook receiver endpoint is accessible from the internet and not blocked by network policies or firewalls.

## Conclusion

Using Flux Receivers with GitHub release events creates a controlled, release-driven deployment pipeline. Instead of deploying on every push, your cluster updates when GitHub sends a release event and the tracked Git tag changes. This aligns your GitOps workflow with release management practices, provides clear versioning for deployments, and gives your team explicit control over when changes reach production. The setup is straightforward: create a Receiver, configure the GitHub webhook, and ensure your GitRepository tracks tags or semver ranges to pick up the latest release.
