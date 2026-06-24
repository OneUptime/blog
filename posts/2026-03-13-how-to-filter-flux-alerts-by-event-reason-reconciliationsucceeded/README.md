# How to Filter Flux Alerts by Event Reason ReconciliationSucceeded

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Alert, Reconciliation, Event, GitOps, Kubernetes, Notification-Controller

Description: Learn how to configure Flux CD alerts that only fire when reconciliation succeeds, using the inclusionList field to match the ReconciliationSucceeded event reason.

---

## Introduction

Flux CD emits events with specific reason codes during reconciliation. The `ReconciliationSucceeded` reason indicates that a Flux resource has successfully applied its desired state to the cluster. While the `eventSeverity` field filters by severity level, Flux Alert resources do not provide a direct field for filtering by event reason. The `inclusionList` field accepts a list of regex patterns matched against the event message, so it can be used to match success-related messages.

This guide shows how to configure Flux alerts that target successful reconciliation messages using regex-based inclusion filtering.

## Prerequisites

- A Kubernetes cluster with Flux CD and notification-controller installed
- The notification controller running
- A configured Provider resource
- `kubectl` and `flux` CLI access

## Understanding Flux Event Reasons

Flux events include a `reason` field that describes the nature of the event. Common reconciliation reasons include:

- `ReconciliationSucceeded` - The resource was successfully reconciled
- `ReconciliationFailed` - The reconciliation encountered an error
- `ProgressingWithRetry` - Reconciliation is in progress with retries
- `DependencyNotReady` - A dependency is not ready
- `Progressing` - Reconciliation is in progress
- `ArtifactUpToDate` - No new artifact to reconcile

The event reason and event message are separate fields. The `inclusionList` regex patterns are matched against the event message, not the `reason` field.

## Configuring an Alert for Successful Reconciliation Messages

Use the `inclusionList` field to match events containing successful reconciliation-related messages:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: reconciliation-succeeded-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*(Reconciliation finished|succeeded).*"
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

The `inclusionList` contains a regex pattern that matches common success messages, including Kustomization messages such as "Reconciliation finished" and HelmRelease messages that contain "succeeded". Only events whose message matches at least one pattern in the list will trigger the alert.

## How inclusionList Works

The `inclusionList` field takes a list of regular expression strings. Each event message is checked against all patterns in the list. If the message matches any pattern, the event is forwarded to the provider. If it matches no patterns, the event is dropped.

Key points:
- Patterns are case-sensitive by default
- The pattern is matched against the event message string
- Multiple patterns in the list are OR-ed together
- The `inclusionList` is applied after `eventSeverity` filtering

## Tracking Successful Deployments

A practical use case is tracking every successful deployment:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: successful-deployments
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments
  eventSeverity: info
  inclusionList:
    - ".*(Reconciliation finished|succeeded).*"
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: production
    - kind: HelmRelease
      name: '*'
      namespace: production
```

This sends a notification every time a Kustomization or HelmRelease in the production namespace successfully reconciles, providing a deployment activity feed.

## Scoping Success Alerts to Specific Resources

You can combine `inclusionList` with specific resource names to track successful reconciliations for particular workloads:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: api-deployment-success
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*succeeded.*"
  eventSources:
    - kind: HelmRelease
      name: api-gateway
    - kind: HelmRelease
      name: user-service
```

## Building a Deployment Log

Combine the success alert with a webhook provider to feed deployment events into an external system:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: deployment-log-webhook
  namespace: flux-system
spec:
  type: generic
  address: https://your-deployment-tracker.example.com/api/deployments
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-log
  namespace: flux-system
spec:
  providerRef:
    name: deployment-log-webhook
  eventSeverity: info
  inclusionList:
    - ".*(Reconciliation finished|succeeded).*"
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

Every successful reconciliation sends a webhook payload to your deployment tracking system.

## Complementary Success and Failure Alerts

A common pattern pairs success alerts on one channel with failure alerts on another:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: success-notifications
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments
  eventSeverity: info
  inclusionList:
    - ".*(Reconciliation finished|succeeded).*"
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: failure-notifications
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

## Verification

Check the alert status:

```bash
kubectl get alerts -n flux-system
```

Trigger a successful reconciliation:

```bash
flux reconcile kustomization flux-system
```

If the reconciliation succeeds and the emitted event message matches the `inclusionList` pattern, the alert should fire and send a notification to your provider.

Check the notification controller logs for event processing:

```bash
kubectl logs -n flux-system deploy/notification-controller | grep -i "dispatching"
```

## Conclusion

Filtering Flux alerts for successful reconciliation messages lets you build deployment tracking feeds, audit logs, and success confirmation notifications. The `inclusionList` field with regex patterns provides the mechanism to match specific event messages, going beyond what `eventSeverity` alone can offer. By combining inclusion patterns with resource name and namespace filters, you can track successful reconciliation-related events and route those notifications to the right channels.
