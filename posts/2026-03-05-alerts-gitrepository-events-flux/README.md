# How to Create Alerts for GitRepository Events in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Git

Description: Learn how to configure Flux alerts for GitRepository events to track source changes, fetch failures, and artifact updates.

---

GitRepository resources in Flux are responsible for fetching source code from Git repositories and making it available to other Flux components like Kustomizations and HelmReleases. Monitoring GitRepository events helps you detect source fetch failures, authentication issues, and new artifact availability. This guide shows you how to set up alerts for GitRepository events.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the source-controller and notification-controller
- A notification provider already configured
- At least one GitRepository resource configured in your cluster

## Why Monitor GitRepository Events

GitRepository resources generate events when they successfully fetch new commits, encounter authentication errors, fail to clone a repository, or detect changes in the tracked branch. These events are often the first indication that something has changed or gone wrong in your GitOps pipeline.

## Step 1: Create an Alert for All GitRepository Events

This alert watches every GitRepository resource in the `flux-system` namespace.

```yaml
# Alert monitoring all GitRepository events in flux-system
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gitrepository-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Capture both info and error events
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
      namespace: flux-system
```

Apply this configuration.

```bash
# Apply the GitRepository alert
kubectl apply -f gitrepository-alert.yaml
```

## Step 2: Create an Error-Only Alert for GitRepository Resources

If you only want to be notified when source fetching fails, filter by error severity.

```yaml
# Alert that only triggers on GitRepository errors
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gitrepository-error-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Only report errors such as fetch failures or auth issues
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: "*"
      namespace: flux-system
```

## Step 3: Monitor a Specific GitRepository

When you need to track a particular repository closely, specify it by name.

```yaml
# Alert targeting a specific GitRepository named "app-source"
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: app-source-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: app-source
      namespace: flux-system
```

## Step 4: Combine GitRepository Alerts with Downstream Resources

For full pipeline visibility, monitor GitRepository events alongside the Kustomization or HelmRelease resources that consume them.

```yaml
# Alert covering the full GitOps pipeline from source to deployment
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gitops-pipeline-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Source events
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    # Deployment events triggered by source changes
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

## Step 5: Filter GitRepository Events with Exclusion Rules

Reduce noise by excluding routine events that do not require attention.

```yaml
# Alert with exclusion rules for GitRepository events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: filtered-gitrepo-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
      namespace: flux-system
  # Suppress repetitive no-change notifications
  exclusionList:
    - "^stored artifact.*same revision$"
    - "^no changes since last reconciliation$"
```

## Step 6: Monitor GitRepository Events Across Namespaces

If your team uses GitRepository resources in multiple namespaces, aggregate them in one alert.

```yaml
# Alert watching GitRepository resources in multiple namespaces
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: multi-ns-gitrepo-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    - kind: GitRepository
      name: "*"
      namespace: apps
    - kind: GitRepository
      name: "*"
      namespace: infra
```

## Step 7: Verify the Alert

Check that the alert was created and is active.

```bash
# List alerts in the flux-system namespace
kubectl get alerts -n flux-system

# Describe the alert for detailed status
kubectl describe alert gitrepository-alerts -n flux-system

# Force a GitRepository reconciliation to trigger an event
flux reconcile source git flux-system
```

## Common GitRepository Event Types

You will encounter these types of events from GitRepository resources:

- **New artifact stored** - A new commit was fetched and a new artifact was produced
- **No changes since last reconciliation** - The source has not changed
- **Failed to clone repository** - Clone operation failed, often due to authentication or network issues
- **Authentication failed** - The credentials in the referenced secret are invalid or expired
- **Branch not found** - The specified branch does not exist in the remote repository

## Troubleshooting

If you are not seeing GitRepository alerts, check the following.

```bash
# Verify that the source-controller is generating events
kubectl get events -n flux-system --field-selector involvedObject.kind=GitRepository

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller

# Confirm the alert is not suspended
kubectl get alert gitrepository-alerts -n flux-system -o yaml | grep suspend
```

Common issues include incorrect provider references, missing secrets, or the alert being in a suspended state. Also verify that the namespace specified in your event sources matches where your GitRepository resources are actually deployed.

## Summary

Alerting on GitRepository events gives you early visibility into source-level changes and failures in your GitOps pipeline. By combining severity filters, exclusion rules, and multi-namespace monitoring, you can build a notification strategy that keeps you informed about what matters most. Pair GitRepository alerts with downstream Kustomization or HelmRelease alerts for complete pipeline observability.
