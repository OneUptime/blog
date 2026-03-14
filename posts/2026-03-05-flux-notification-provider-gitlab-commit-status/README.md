# How to Configure Flux Notification Provider for GitLab Commit Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, GitLab, Commit Status, CI/CD

Description: Learn how to configure Flux CD's notification controller to update GitLab commit statuses based on Flux reconciliation results using the Provider resource.

---

GitLab commit status integration with Flux CD provides a direct feedback loop between your Kubernetes cluster and your GitLab repository. When Flux reconciles a change, it can update the commit status in GitLab to show whether the deployment succeeded or failed. This status appears in merge requests and pipeline views, giving your team immediate visibility into deployment outcomes.

This guide walks through configuring the GitLab commit status provider from token creation to verification.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (including the notification controller)
- `kubectl` access to the cluster
- A GitLab repository managed by Flux (GitLab.com or self-hosted)
- A GitLab personal access token or project access token with `api` scope
- The `flux` CLI installed (optional but helpful)

## Step 1: Create a GitLab Access Token

In GitLab, navigate to **User Settings** then **Access Tokens** (or **Project Settings** then **Access Tokens** for a project-scoped token). Create a new token with the `api` scope. Copy the token.

## Step 2: Create a Kubernetes Secret

Store the GitLab token in a Kubernetes secret.

```bash
# Create a secret containing the GitLab access token
kubectl create secret generic gitlab-token \
  --namespace=flux-system \
  --from-literal=token=glpat-YOUR_GITLAB_ACCESS_TOKEN
```

## Step 3: Create the Flux Notification Provider

Define a Provider resource for GitLab commit status updates.

```yaml
# provider-gitlab-commit-status.yaml
# Configures Flux to update GitLab commit statuses
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: gitlab-status-provider
  namespace: flux-system
spec:
  # Use "gitlab" as the provider type for commit status updates
  type: gitlab
  # The GitLab project address
  address: https://gitlab.com/YOUR_GROUP/YOUR_PROJECT
  # Reference to the secret containing the GitLab token
  secretRef:
    name: gitlab-token
```

For self-hosted GitLab instances, update the address accordingly:

```yaml
  address: https://gitlab.your-company.com/YOUR_GROUP/YOUR_PROJECT
```

Apply the Provider:

```bash
# Apply the GitLab commit status provider configuration
kubectl apply -f provider-gitlab-commit-status.yaml
```

## Step 4: Create an Alert Resource

Create an Alert that triggers commit status updates.

```yaml
# alert-gitlab-commit-status.yaml
# Updates GitLab commit statuses based on Flux events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gitlab-status-alert
  namespace: flux-system
spec:
  providerRef:
    name: gitlab-status-provider
  # Send both info and error events for complete status tracking
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Apply the Alert:

```bash
# Apply the alert configuration
kubectl apply -f alert-gitlab-commit-status.yaml
```

## Step 5: Verify the Configuration

Check that both resources are ready.

```bash
# Verify provider and alert status
kubectl get providers.notification.toolkit.fluxcd.io -n flux-system
kubectl get alerts.notification.toolkit.fluxcd.io -n flux-system
```

## Step 6: Test the Notification

Trigger a reconciliation:

```bash
# Force reconciliation to update commit status
flux reconcile kustomization flux-system --with-source
```

Navigate to your GitLab project and check the latest commit. You should see a pipeline status or external status from Flux.

## How It Works

```mermaid
graph LR
    A[Git Push] --> B[GitLab Repository]
    B -->|detected by| C[Flux Source Controller]
    C -->|triggers| D[Flux Kustomize/Helm Controller]
    D -->|emits event| E[Notification Controller]
    E -->|matches Alert| F[Provider: gitlab]
    F -->|GitLab Commit Status API| B
```

The notification controller extracts the commit SHA from the Flux event's revision metadata and updates the commit status via the GitLab API. The status reflects the reconciliation outcome:

- **Success**: Reconciliation completed successfully
- **Failed**: Reconciliation encountered an error
- **Running**: Reconciliation is in progress

## Commit Status in Merge Requests

When commit statuses are configured, they appear as external pipeline statuses in GitLab merge requests. This means:

- Merge request reviewers can see whether the change deployed successfully after merging
- You can configure merge request approval rules to require a successful Flux deployment status
- The deployment status is visible in the commit history

## Self-Hosted GitLab Configuration

For self-hosted GitLab instances:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: gitlab-self-hosted
  namespace: flux-system
spec:
  type: gitlab
  # Use your self-hosted GitLab URL
  address: https://gitlab.internal.company.com/team/project
  secretRef:
    name: gitlab-token
```

Ensure the cluster can reach your self-hosted GitLab instance on the network.

## Multiple Projects

Create separate providers for each GitLab project:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: gitlab-infra
  namespace: flux-system
spec:
  type: gitlab
  address: https://gitlab.com/YOUR_GROUP/infrastructure
  secretRef:
    name: gitlab-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: gitlab-apps
  namespace: flux-system
spec:
  type: gitlab
  address: https://gitlab.com/YOUR_GROUP/applications
  secretRef:
    name: gitlab-token
```

## Troubleshooting

If commit statuses are not appearing in GitLab:

1. **Token scope**: The GitLab token must have `api` scope to update commit statuses.
2. **Project URL**: The `address` must be the full project URL (not just the GitLab instance URL).
3. **Commit SHA**: The notification controller uses the revision from the Flux event. If the revision does not match a commit in the project, the status update will fail.
4. **Self-hosted TLS**: If your GitLab instance uses a self-signed certificate, the notification controller may reject the connection.
5. **Namespace alignment**: Provider, Alert, and Secret must be in the same namespace.
6. **Controller logs**: Check `kubectl logs -n flux-system deploy/notification-controller` for API errors.
7. **Network access**: The cluster must reach the GitLab API (default port 443).

## Conclusion

GitLab commit status integration with Flux CD provides essential deployment feedback directly in your Git workflow. By seeing deployment status on commits and merge requests, teams can quickly identify whether changes are live and healthy. This is a foundational configuration for any GitOps workflow using GitLab and Flux CD, and it takes only a few minutes to set up.
