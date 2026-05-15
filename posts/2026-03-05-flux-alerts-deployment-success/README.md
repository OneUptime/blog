# How to Configure Flux Alerts for Deployment Success Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notification, Alert, Deployment

Description: Learn how to configure Flux alerts that notify you when deployments succeed, providing visibility into successful GitOps reconciliations.

---

Knowing when deployments succeed is just as important as knowing when they fail. Success notifications confirm that reconciliations have completed successfully and can show when new revisions have been applied to your cluster, providing an audit trail and giving your team confidence that the GitOps pipeline is working. This guide shows how to configure Flux alerts specifically for deployment success notifications.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A notification provider configured
- Kustomization or HelmRelease resources deployed

## Understanding Success Events in Flux

Flux generates informational events when reconciliations succeed. These events have an `info` severity level and contain messages about successful operations. To capture success notifications, you need to set `eventSeverity` to `info` and optionally use inclusion and exclusion rules to filter the event messages.

## Step 1: Create a Basic Success Alert

The simplest approach is to create an info-level alert that captures all events, including successes.

```yaml
# Alert that captures all events including success notifications

apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-success-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Info severity captures success and error events
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

## Step 2: Filter for Success-Only Notifications

To focus on success events and suppress common non-success noise, add inclusion and exclusion rules.

```yaml
# Alert focused on meaningful success events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: success-only-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-success-channel
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  # Include success message patterns, then exclude noisy matches
  inclusionList:
    - ".*succeeded.*"
    - "^Reconciliation finished.*"
  exclusionList:
    # Exclude waiting and progress messages
    - ".*is not ready$"
    - ".*waiting for.*"
    - ".*dependency.*not ready.*"
    # Exclude no-update messages
    - "^no updates made$"
```

Apply the alert.

```bash
# Apply the success alert
kubectl apply -f success-alert.yaml
```

## Step 3: Track Deployment Success Across Environments

Create separate success alerts for different environments. This requires cross-namespace references to be enabled on the notification controller, which is the default.

```yaml
# Success alert for staging deployments
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: staging-success-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-staging
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: staging
    - kind: HelmRelease
      name: "*"
      namespace: staging
  inclusionList:
    - ".*succeeded.*"
    - "^Reconciliation finished.*"
  exclusionList:
    - ".*is not ready$"
    - ".*waiting for.*"
---
# Success alert for production deployments
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-success-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-production
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
  inclusionList:
    - ".*succeeded.*"
    - "^Reconciliation finished.*"
  exclusionList:
    - ".*is not ready$"
    - ".*waiting for.*"
```

## Step 4: Combined Success and Source Update Alerts

Track the full deployment pipeline from source update through successful deployment.

```yaml
# Alert covering source updates and deployment success
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: pipeline-success-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments
  eventSeverity: info
  eventSources:
    # Source updates
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    # Deployment success
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  inclusionList:
    - ".*succeeded.*"
    - "^stored artifact.*"
    - "^Reconciliation finished.*"
  exclusionList:
    # Only exclude truly noisy events
    - "^no changes since last reconcili?ation:.*"
    - "^artifact up-to-date.*"
    - ".*is not ready$"
    - ".*waiting for.*"
```

## Step 5: Monitor Critical Application Deployments

For critical applications, create a dedicated success alert that tracks a specific resource.

```yaml
# Success alert for a specific critical application
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: critical-app-success
  namespace: flux-system
spec:
  providerRef:
    name: slack-critical
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: payment-service
      namespace: production
    - kind: HelmRelease
      name: auth-service
      namespace: production
  inclusionList:
    - ".*succeeded.*"
  exclusionList:
    - ".*is not ready$"
```

## Step 6: Verify Success Alerts Are Working

Test that success notifications are being delivered.

```bash
# Trigger a reconciliation
flux reconcile kustomization flux-system --with-source

# Watch for events
kubectl get events -n flux-system --watch

# Check notification controller logs for delivery
kubectl logs -n flux-system deploy/notification-controller --tail=20

# Verify the alert configuration
kubectl get alert deployment-success-alert -n flux-system -o yaml
```

## Best Practices for Success Alerts

1. **Send success alerts to a dedicated channel** so they do not mix with error alerts and on-call notifications
2. **Use exclusion rules** to filter out source no-change and artifact-up-to-date messages that would create noise
3. **Track success events per environment** to maintain clear audit trails for staging and production
4. **Combine with error alerts** by having separate Alert resources pointing to different providers
5. **Monitor critical applications individually** with specific event source names rather than wildcards

## Summary

Configuring Flux alerts for deployment success notifications provides your team with confirmation that reconciliations have completed successfully and new revisions have been applied when Flux reports them. By using info-level severity with carefully crafted exclusion rules, you can capture meaningful success events while filtering out routine noise. Send success notifications to dedicated channels, track them per environment, and combine them with error alerts for a complete deployment monitoring strategy.
