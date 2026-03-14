# How to Filter Flux Alerts by Event Reason ReconciliationSucceeded

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, Alerts, Reconciliation, Events, GitOps, Kubernetes, Notification-Controller

Description: Learn how to configure Flux CD alerts that only fire when reconciliation succeeds, using the inclusionList field to match the ReconciliationSucceeded event reason.

---

## Introduction

Flux CD emits events with specific reason codes during reconciliation. The `ReconciliationSucceeded` reason indicates that a Flux resource has successfully applied its desired state to the cluster. While the `eventSeverity` field filters by severity level, it does not let you filter by specific event reasons. To achieve reason-level filtering, you use the `inclusionList` field, which accepts a list of regex patterns matched against the event message.

This guide shows how to configure Flux alerts that specifically target `ReconciliationSucceeded` events using regex-based inclusion filtering.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.0 or later
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

The event reason appears in the event message that Flux emits, which is what the `inclusionList` regex patterns are matched against.

## Configuring an Alert for ReconciliationSucceeded

Use the `inclusionList` field to match events containing the reconciliation succeeded message:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: reconciliation-succeeded-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*reconciliation.*succeeded.*"
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

The `inclusionList` contains a regex pattern that matches event messages containing both "reconciliation" and "succeeded". Only events whose message matches at least one pattern in the list will trigger the alert.

## How inclusionList Works

The `inclusionList` field takes a list of regular expression strings. Each event message is checked against all patterns in the list. If the message matches any pattern, the event is forwarded to the provider. If it matches no patterns, the event is dropped.

Key points:
- Patterns are case-sensitive by default
- The pattern is matched against the full event message string
- Multiple patterns in the list are OR-ed together
- The `inclusionList` is applied after `eventSeverity` filtering

## Tracking Successful Deployments

A practical use case is tracking every successful deployment:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: successful-deployments
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments
  eventSeverity: info
  inclusionList:
    - ".*[Rr]econciliation.*succeeded.*"
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
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: api-deployment-success
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*reconciliation.*succeeded.*"
  eventSources:
    - kind: HelmRelease
      name: api-gateway
    - kind: HelmRelease
      name: user-service
```

## Building a Deployment Log

Combine the success alert with a webhook provider to feed deployment events into an external system:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: deployment-log-webhook
  namespace: flux-system
spec:
  type: generic
  address: https://your-deployment-tracker.example.com/api/deployments
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: deployment-log
  namespace: flux-system
spec:
  providerRef:
    name: deployment-log-webhook
  eventSeverity: info
  inclusionList:
    - ".*reconciliation.*succeeded.*"
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
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: success-notifications
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments
  eventSeverity: info
  inclusionList:
    - ".*reconciliation.*succeeded.*"
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
---
apiVersion: notification.toolkit.fluxcd.io/v1
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

If the reconciliation succeeds, the alert matching `ReconciliationSucceeded` should fire and send a notification to your provider.

Check the notification controller logs for event processing:

```bash
kubectl logs -n flux-system deploy/notification-controller | grep -i "dispatching"
```

## Conclusion

Filtering Flux alerts by the `ReconciliationSucceeded` event reason lets you build deployment tracking feeds, audit logs, and success confirmation notifications. The `inclusionList` field with regex patterns provides the mechanism to match specific event messages, going beyond what `eventSeverity` alone can offer. By combining inclusion patterns with resource name and namespace filters, you can precisely track which reconciliations succeed and route those notifications to the right channels.
