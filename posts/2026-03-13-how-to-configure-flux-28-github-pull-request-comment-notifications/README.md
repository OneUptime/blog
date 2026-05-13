# How to Configure Flux 2.8 GitHub Pull Request Comment Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Notification, GitHub, Pull-Requests

Description: Learn how to set up Flux 2.8 to post reconciliation status comments directly on GitHub pull requests for better GitOps visibility.

---

## Introduction

Flux 2.8 introduced the ability to post reconciliation status updates as comments directly on GitHub pull requests. This feature gives developers immediate feedback on whether their Kubernetes manifest changes deploy successfully, without needing to check separate dashboards or logs. When a pull request preview environment triggers a Flux reconciliation, the notification controller can post comments showing the deployment status and any errors encountered.

This guide walks you through configuring GitHub pull request comment notifications in Flux 2.8, including authentication setup, provider configuration, and alert rules.

## Prerequisites

- A Kubernetes cluster running Flux v2.8 or later
- A GitHub repository used for Flux GitOps
- A GitHub personal access token or GitHub App with permission to read and write pull request comments, and commit status write permission if you configure status checks
- `kubectl` and `flux` CLI tools installed

## Step 1: Create a GitHub Authentication Secret

Generate a GitHub personal access token with the `repo` scope (or use a fine-grained token with pull request read/write permissions). Create a Kubernetes secret with the token:

```bash
kubectl create secret generic github-pr-token \
  -n flux-system \
  --from-literal=token=ghp_your_github_token_here
```

Alternatively, use a GitHub App for better security and scoping:

```yaml
# github-app-secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: github-app-credentials
  namespace: flux-system
type: Opaque
stringData:
  githubAppID: "123456"
  githubAppInstallationID: "78901234"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    your-private-key-content
    -----END RSA PRIVATE KEY-----
```

If you use this GitHub App secret, set the provider `secretRef.name` to `github-app-credentials`.

## Step 2: Configure the Notification Provider

Create a notification provider configured for GitHub pull request comments:

```yaml
# github-pr-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-pr-comments
  namespace: flux-system
spec:
  type: githubpullrequestcomment
  address: https://github.com/your-org/fleet-infra
  secretRef:
    name: github-pr-token
```

If you also want GitHub commit status checks, use a separate `github` provider:

```yaml
# github-commit-status-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  address: https://github.com/your-org/fleet-infra
  secretRef:
    name: github-pr-token
```

Apply the providers:

```bash
kubectl apply -f github-pr-provider.yaml
kubectl apply -f github-commit-status-provider.yaml
```

## Step 3: Create Alert Rules for PR Events

Configure alerts that trigger on reconciliation events and post to the GitHub providers:

```yaml
# github-pr-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: pr-deployment-status
  namespace: flux-system
spec:
  providerRef:
    name: github-pr-comments
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  inclusionList:
    - ".*reconciliation.*"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: pr-commit-status
  namespace: flux-system
spec:
  providerRef:
    name: github-status
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  inclusionList:
    - ".*reconciliation.*"
```

Apply the alert:

```bash
kubectl apply -f github-pr-alert.yaml
```

## Step 4: Annotate Flux Objects for PR Comments and Commit Status

For Flux to associate deployments with specific pull requests, add the standard event metadata annotations to the Flux objects created for the pull request preview environment:

```yaml
# kustomization-with-status.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-deployment
  namespace: flux-system
  annotations:
    event.toolkit.fluxcd.io/change_request: "42"
    event.toolkit.fluxcd.io/commit: "0123456789abcdef0123456789abcdef01234567"
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: "./clusters/production"
  prune: true
  wait: true
  timeout: 5m
```

When Flux reconciles this object, the `githubpullrequestcomment` provider uses the `change_request` annotation to find the pull request, and the `github` provider can use the `commit` annotation for commit status reporting.

## Step 5: Configure Detailed Comment Notifications

For PR comments that include additional event metadata, set up a dedicated comment provider:

```yaml
# github-comment-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-comments
  namespace: flux-system
spec:
  type: githubpullrequestcomment
  address: https://github.com/your-org/fleet-infra
  secretRef:
    name: github-pr-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: pr-detailed-status
  namespace: flux-system
spec:
  providerRef:
    name: github-comments
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  eventMetadata:
    summary: "Flux deployment status"
```

## Step 6: Handle Error Notifications

Create a separate alert for deployment failures that posts error details to pull requests:

```yaml
# github-error-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: pr-error-notifications
  namespace: flux-system
spec:
  providerRef:
    name: github-pr-comments
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
  exclusionList:
    - ".*no changes.*"
```

## Step 7: Test the Configuration

Verify the provider and alert are configured correctly:

```bash
kubectl get providers -n flux-system
kubectl get alerts -n flux-system
```

Check notification controller logs for delivery status:

```bash
kubectl logs -n flux-system deploy/notification-controller --tail=50
```

Create a test pull request that provisions an annotated preview-environment Flux object. Watch for the reconciliation and the pull request comment on GitHub:

```bash
flux get kustomizations -n flux-system -w
```

## Troubleshooting

If comments are not appearing on pull requests, verify the following:

```bash
# Check provider status
kubectl describe provider github-pr-comments -n flux-system

# Check alert status
kubectl describe alert pr-deployment-status -n flux-system

# Verify the token has correct permissions
kubectl get secret github-pr-token -n flux-system -o jsonpath='{.data.token}' | base64 -d | head -c 10
```

Common issues include expired tokens, incorrect repository URLs in the provider address, and missing permissions on the GitHub token.

## Conclusion

GitHub pull request comment notifications in Flux 2.8 create a tight feedback loop between GitOps deployments and the code review process. Developers see preview-environment deployment results directly on their pull requests without context-switching to separate dashboards. By configuring both commit status checks and detailed comment notifications for annotated Flux objects, you ensure that every pull request preview gets immediate, visible feedback on its deployment outcome. This integration makes GitOps workflows more transparent and helps teams catch deployment issues before they reach production.
