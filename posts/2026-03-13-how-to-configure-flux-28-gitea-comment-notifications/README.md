# How to Configure Flux 2.8 Gitea Comment Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, notifications, gitea, self-hosted

Description: Learn how to configure Flux 2.8 to post deployment status comments on Gitea pull requests for self-hosted GitOps workflows.

---

## Introduction

Gitea is a popular self-hosted Git service that many organizations use as an alternative to GitHub or GitLab. Flux 2.8 added support for posting deployment status notifications directly on Gitea pull requests, bringing the same GitOps feedback loop to self-hosted environments. When Flux reconciles manifests from a Gitea repository, the notification controller can update commit statuses and post comments on associated pull requests.

This guide shows you how to configure Flux 2.8 to send reconciliation notifications to Gitea, including token setup, provider configuration, and troubleshooting tips specific to Gitea deployments.

## Prerequisites

- A Kubernetes cluster running Flux v2.8 or later
- A Gitea instance (v1.19 or later) with API access enabled
- A Gitea access token with repository read/write permissions
- `kubectl` and `flux` CLI tools installed
- A Gitea repository configured as a Flux GitRepository source

## Step 1: Generate a Gitea API Token

In your Gitea instance, navigate to Settings > Applications > Generate New Token. Create a token with the following permissions:

- Repository: Read and Write
- Issue: Read and Write (for comments)

Create a Kubernetes secret with the token:

```bash
kubectl create secret generic gitea-token \
  -n flux-system \
  --from-literal=token=your_gitea_api_token
```

## Step 2: Configure the Gitea Notification Provider

Create a provider for Gitea commit status and comment notifications:

```yaml
# gitea-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: gitea-status
  namespace: flux-system
spec:
  type: gitea
  address: https://gitea.example.com/your-org/fleet-infra
  secretRef:
    name: gitea-token
```

Apply the provider:

```bash
kubectl apply -f gitea-provider.yaml
```

Verify the provider is ready:

```bash
kubectl get provider gitea-status -n flux-system
```

## Step 3: Set Up the GitRepository Source

Ensure your Gitea repository is configured as a Flux source:

```yaml
# gitea-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  url: https://gitea.example.com/your-org/fleet-infra.git
  ref:
    branch: main
  secretRef:
    name: gitea-repo-credentials
```

Create the repository credentials:

```bash
kubectl create secret generic gitea-repo-credentials \
  -n flux-system \
  --from-literal=username=flux-bot \
  --from-literal=password=your_gitea_api_token
```

## Step 4: Create Alert Rules

Configure alerts for Gitea pull request notifications:

```yaml
# gitea-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: gitea-deployment-status
  namespace: flux-system
spec:
  providerRef:
    name: gitea-status
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  inclusionList:
    - ".*reconciliation.*"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: gitea-error-status
  namespace: flux-system
spec:
  providerRef:
    name: gitea-status
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

Apply the alerts:

```bash
kubectl apply -f gitea-alerts.yaml
```

## Step 5: Configure Kustomizations for Commit Tracking

Set up Kustomizations that reference the Gitea GitRepository source:

```yaml
# app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-deployment
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: "./apps/production"
  prune: true
  wait: true
  timeout: 5m
```

When Flux reconciles a commit, it posts the status to the Gitea API. Gitea displays this status on any pull request containing that commit.

## Step 6: Handle Gitea Behind Reverse Proxy

If your Gitea instance is behind a reverse proxy or uses a non-standard port, adjust the provider address accordingly:

```yaml
# gitea-proxy-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: gitea-status
  namespace: flux-system
spec:
  type: gitea
  address: https://git.internal.example.com:3000/your-org/fleet-infra
  secretRef:
    name: gitea-token
  certSecretRef:
    name: gitea-ca-cert
```

If Gitea uses a self-signed certificate, provide the CA certificate:

```bash
kubectl create secret generic gitea-ca-cert \
  -n flux-system \
  --from-file=ca.crt=/path/to/gitea-ca.crt
```

## Step 7: Test the Integration

Verify the complete notification chain:

```bash
# Check provider status
kubectl get providers -n flux-system

# Check alert status
kubectl get alerts -n flux-system

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=50
```

Trigger a reconciliation and watch for the notification:

```bash
flux reconcile kustomization app-deployment --with-source
```

Check the Gitea pull request for the commit status update. The status should appear as a check on the commit.

## Step 8: Configure Webhook Receivers

For Gitea to trigger immediate Flux reconciliation on push events, set up a webhook receiver:

```yaml
# gitea-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitea-webhook
  namespace: flux-system
spec:
  type: gitea
  events:
    - "push"
  secretRef:
    name: gitea-webhook-secret
  resources:
    - kind: GitRepository
      name: fleet-infra
```

Create the webhook secret:

```bash
kubectl create secret generic gitea-webhook-secret \
  -n flux-system \
  --from-literal=token=your_webhook_secret
```

After applying the receiver, get the webhook URL:

```bash
kubectl get receiver gitea-webhook -n flux-system -o jsonpath='{.status.webhookPath}'
```

Configure this URL as a webhook in your Gitea repository settings under Settings > Webhooks.

## Troubleshooting

If notifications are not appearing on Gitea pull requests:

```bash
# Verify API connectivity from the cluster
kubectl run test-gitea --rm -it --image=curlimages/curl -- \
  curl -s -H "Authorization: token your-token" \
  "https://gitea.example.com/api/v1/repos/your-org/fleet-infra"

# Check notification controller events
kubectl events -n flux-system --for provider/gitea-status

# Verify the provider address format
kubectl get provider gitea-status -n flux-system -o yaml
```

Ensure the provider address includes the full repository path and matches the Gitea URL structure exactly.

## Conclusion

Configuring Gitea comment notifications in Flux 2.8 brings GitOps deployment feedback to self-hosted Git environments. Developers using Gitea get the same pull request status integration available with GitHub and GitLab, seeing deployment outcomes directly on their pull requests. Combined with webhook receivers for push-triggered reconciliation, this creates a responsive and transparent GitOps workflow for teams running Gitea as their Git hosting platform.
