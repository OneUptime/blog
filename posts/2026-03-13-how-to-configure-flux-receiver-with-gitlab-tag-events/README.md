# How to Configure Flux Receiver with GitLab Tag Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, GitLab, Tags, Webhooks

Description: Learn how to configure a Flux Receiver for GitLab tag push events to trigger reconciliation when new version tags are created.

---

## Introduction

Tag-based deployments are a common pattern for production environments where you want explicit version control over what gets deployed. In GitLab, creating a tag or a release generates a tag push event that can trigger a Flux Receiver. This allows you to build a workflow where creating a version tag in GitLab immediately triggers a deployment to your cluster.

This guide covers how to configure a Flux Receiver specifically for GitLab tag events, set up the corresponding GitLab webhook, and configure your Flux sources to track tags.

## Prerequisites

Ensure you have the following:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller accessible from GitLab
- A GitLab project with your application or infrastructure code
- Maintainer or Owner access to the GitLab project
- kubectl access to the flux-system namespace

## How GitLab Tag Events Work

When you create a tag in GitLab, either through the UI, API, or by pushing a tag via Git, GitLab generates a `Tag Push Hook` event. This is distinct from the regular `Push Hook` event. The tag push hook payload includes the tag reference, the commit SHA it points to, and metadata about who created the tag.

Flux's notification controller can process this event type when the Receiver is configured with the `gitlab` type.

## Creating the Webhook Secret

Set up the authentication secret:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic gitlab-tag-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

Or as a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-tag-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Receiver for Tag Events

Create the Receiver with the `Tag Push Hook` event:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-tag-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Tag Push Hook"
  secretRef:
    name: gitlab-tag-token
  resources:
    - kind: GitRepository
      name: app-repo
```

The critical difference from a push receiver is the event type: `Tag Push Hook` instead of `Push Hook`. This ensures the receiver only responds to tag creation events, not regular pushes.

## Configuring the GitRepository for Tag Tracking

To make the tag-driven workflow complete, configure your GitRepository to track tags using semver:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 1h
  url: https://gitlab.com/yourorg/your-app.git
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: gitlab-credentials
```

The `semver` range tells Flux to track the latest tag matching the specified version constraint. When the Receiver triggers reconciliation, the GitRepository checks for new tags and picks up the latest one matching the range.

For a more specific tag pattern:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 1h
  url: https://gitlab.com/yourorg/your-app.git
  ref:
    semver: ">=2.0.0 <3.0.0"
  secretRef:
    name: gitlab-credentials
```

This restricts tracking to v2.x.x tags only, ignoring major version bumps.

## Setting Up the GitLab Webhook

In your GitLab project, navigate to Settings, then Webhooks:

- **URL**: The webhook URL from `kubectl get receiver gitlab-tag-receiver -n flux-system -o jsonpath='{.status.webhookPath}'` combined with your external domain
- **Secret token**: The token from your Kubernetes secret
- **Trigger**: Check "Tag push events" only
- **Enable SSL verification**: Checked

Click "Add webhook" to save.

## Combined Push and Tag Receiver

If you want a single receiver for both regular pushes and tag events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-all-events-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
    - "Tag Push Hook"
  secretRef:
    name: gitlab-tag-token
  resources:
    - kind: GitRepository
      name: app-repo
```

In the GitLab webhook configuration, enable both "Push events" and "Tag push events" triggers.

## Separate Receivers for Different Environments

A common pattern is to use push events for staging and tag events for production:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: staging-push-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
  secretRef:
    name: gitlab-tag-token
  resources:
    - kind: GitRepository
      name: staging-repo
    - kind: Kustomization
      name: staging-apps
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: production-tag-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Tag Push Hook"
  secretRef:
    name: gitlab-tag-token
  resources:
    - kind: GitRepository
      name: production-repo
    - kind: Kustomization
      name: production-apps
```

This creates two separate webhook URLs. Configure the staging webhook in GitLab to trigger on push events, and the production webhook to trigger on tag events.

## Triggering HelmRelease Updates

If your Helm charts are tagged in the same repository:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-helm-tag-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Tag Push Hook"
  secretRef:
    name: gitlab-tag-token
  resources:
    - kind: GitRepository
      name: helm-charts-repo
    - kind: HelmChart
      name: flux-system-my-app
    - kind: HelmRelease
      name: my-app
```

This triggers the full update chain when a new chart version tag is pushed.

## Ingress Configuration

Expose the notification controller for GitLab access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-tag-webhook
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

## Verifying the Setup

Create a test tag in your GitLab repository:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Watch the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Check the GitRepository status to confirm it picked up the new tag:

```bash
flux get sources git app-repo -n flux-system
```

In GitLab, check the webhook recent events section to verify successful delivery.

## Troubleshooting

If tag events are not triggering reconciliation:

Verify the event type is exactly `Tag Push Hook` (case-sensitive) in your Receiver configuration. Check that the GitLab webhook is configured for "Tag push events" specifically. Ensure the GitRepository uses a semver or tag ref that matches the tag you created.

Check the notification controller logs for errors:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "error\|tag\|receiver"
```

## Conclusion

Configuring a Flux Receiver for GitLab tag events enables a controlled, version-driven deployment workflow. Tags provide clear version markers for your deployments, and the Receiver ensures that creating a tag triggers immediate reconciliation without polling delays. By combining tag-based receivers with semver-tracking GitRepositories, you get a production deployment pipeline that responds to explicit versioning actions while maintaining full GitOps automation. This pattern works well for teams that want the speed of event-driven deployments with the control of explicit release versioning.
