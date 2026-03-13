# How to Configure Flux Receiver with GitLab Push Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, GitLab, Webhooks

Description: Learn how to configure a Flux Receiver for GitLab push events to enable instant reconciliation when code is pushed to your GitLab repositories.

---

## Introduction

GitLab is a popular choice for teams running self-managed Git infrastructure or using GitLab SaaS. When using Flux with GitLab repositories, the default polling interval means there is a delay between pushing code and seeing it deployed. Flux Receivers bridge this gap by accepting GitLab webhook notifications and triggering immediate reconciliation.

This guide covers the complete setup of a Flux Receiver for GitLab push events, from creating the webhook secret to configuring the GitLab project webhook and verifying the integration.

## Prerequisites

Before proceeding, make sure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller accessible from GitLab (via ingress or LoadBalancer)
- A GitLab project that Flux is tracking as a GitRepository source
- Maintainer or Owner access to the GitLab project
- kubectl access to the flux-system namespace

## Creating the Webhook Secret

Create a Kubernetes secret with the token that GitLab will use to authenticate webhook requests:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic gitlab-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

Declarative approach:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

Keep the token value accessible, as you will need it when configuring the webhook in GitLab.

## Configuring the Receiver

Create the Receiver resource with the `gitlab` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-push-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
  secretRef:
    name: gitlab-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
```

Key differences from the GitHub receiver:

- `type` is set to `gitlab` instead of `github`
- GitLab uses different event names. Push events are called `Push Hook` in GitLab
- The token validation mechanism follows GitLab's `X-Gitlab-Token` header format

## Applying and Retrieving the Webhook URL

Apply the Receiver and get the generated webhook path:

```bash
kubectl apply -f gitlab-receiver.yaml
kubectl get receiver gitlab-push-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

The output is a path like `/hook/abc123def456...`. Combine this with your notification controller's external URL to form the complete webhook URL.

## Exposing the Notification Controller

Set up an ingress to make the notification controller reachable from GitLab:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-gitlab-webhook
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

If you are using a self-managed GitLab instance on the same network as your cluster, you may be able to use a ClusterIP service with internal DNS instead.

## Configuring the GitLab Webhook

In your GitLab project, navigate to Settings, then Webhooks. Configure a new webhook:

- **URL**: Your full webhook URL (e.g., `https://flux-webhook.yourdomain.com/hook/abc123...`)
- **Secret token**: The same token stored in your Kubernetes secret
- **Trigger**: Check "Push events"
- **Push events branch filter**: Optionally specify a branch pattern (e.g., `main`)
- **Enable SSL verification**: Checked (recommended for production)

Click "Add webhook" to save the configuration.

## Branch Filtering in GitLab

GitLab webhooks support branch filtering at the webhook level, which is more efficient than filtering in Flux:

When configuring the webhook trigger, you can specify:
- A specific branch name like `main`
- A wildcard pattern like `release-*`
- Leave blank to trigger on all branches

This prevents unnecessary webhook calls to your cluster for branches that Flux does not track.

## Receiver with Multiple Resources

Trigger reconciliation for multiple resources on push:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-full-reconcile
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
  secretRef:
    name: gitlab-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
    - kind: Kustomization
      name: apps
    - kind: Kustomization
      name: infrastructure
    - kind: HelmRelease
      name: monitoring-stack
```

All listed resources are reconciled when a push event is received. This is useful when a single repository drives multiple deployments.

## Handling GitLab Merge Request Events

You can also listen for merge request events to trigger reconciliation when merge requests are merged:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-merge-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
    - "Merge Request Hook"
  secretRef:
    name: gitlab-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
```

In the GitLab webhook settings, enable both "Push events" and "Merge request events" triggers.

## Self-Managed GitLab Configuration

When using a self-managed GitLab instance, you may need to allow outbound webhook requests to your cluster. In GitLab Admin settings:

1. Navigate to Admin Area, then Settings, then Network
2. Under Outbound requests, check "Allow requests to the local network from web hooks and services"
3. Add your cluster webhook domain to the allowlist if needed

Also ensure that SSL certificates are properly configured if your webhook endpoint uses HTTPS with a custom CA.

## Verifying the Integration

Test the webhook by pushing a commit to your GitLab repository:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

You should see log lines indicating the webhook was received and processed.

Check the GitRepository status:

```bash
flux get sources git app-repo -n flux-system
```

In GitLab, check the webhook delivery history under Settings, Webhooks. Click the "Edit" button next to your webhook, then scroll to "Recent events" to see delivery attempts and responses.

## Troubleshooting

Common issues with GitLab webhook integration:

If the webhook shows a 404 response, verify the webhook URL path matches the Receiver status output exactly.

If you see SSL verification errors, ensure your ingress TLS certificate is valid and trusted. For self-signed certificates, disable SSL verification in the GitLab webhook settings temporarily for testing.

If the token validation fails, verify the secret token matches exactly between the Kubernetes secret and the GitLab webhook configuration. GitLab sends the token in the `X-Gitlab-Token` header:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "token\|auth\|forbidden"
```

## Conclusion

Configuring a Flux Receiver for GitLab push events enables instant, event-driven reconciliation in your GitOps workflow. The setup involves creating a shared secret, defining a Receiver with the `gitlab` type and `Push Hook` event, exposing the notification controller, and configuring the GitLab project webhook. GitLab's built-in branch filtering for webhooks adds an extra layer of efficiency by preventing unnecessary triggers. Whether you are using GitLab SaaS or a self-managed instance, this integration eliminates polling delays and gives you responsive deployments that react to code changes as they happen.
