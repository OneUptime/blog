# How to Filter Flux Alerts by Event Reason ReconciliationFailed

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Alerts, Kubernetes, GitOps, Notifications, Events, Reconciliation, Monitoring

Description: Learn how to configure Flux alerts to filter by the ReconciliationFailed event reason for targeted failure notifications.

---

## Introduction

Flux generates events throughout the reconciliation lifecycle of its resources. These events include successes, retries, dependency waits, and failures. In a busy cluster with many Flux-managed resources, the volume of events can be overwhelming. Sending all events as alerts to your notification channels creates noise that makes it difficult to identify actual problems.

Filtering alerts by event reason allows you to target specific types of events. The `ReconciliationFailed` reason is one of the most important to monitor because it indicates that a Flux resource could not reach its desired state. By configuring alerts to only fire on this reason, you receive notifications exclusively when something has gone wrong and requires attention.

This guide shows how to set up Flux alerts filtered by the `ReconciliationFailed` event reason.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- The Flux notification-controller installed
- A notification provider configured (Slack, Teams, PagerDuty, or similar)
- kubectl access to the cluster
- Flux resources (Kustomizations, HelmReleases, GitRepositories) deployed

## Setting Up the Notification Provider

First, configure a notification provider that will receive the filtered alerts. Here is an example using Slack:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-alerts
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flux-system
type: Opaque
stringData:
  address: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## Filtering Alerts by ReconciliationFailed

The Alert resource in Flux supports filtering by event metadata including the event reason. To filter for only `ReconciliationFailed` events, use the `inclusionList` field with a regex pattern:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: reconciliation-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  inclusionList:
    - ".*ReconciliationFailed.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

The `inclusionList` accepts regular expressions that are matched against the event message and reason. The `.*ReconciliationFailed.*` pattern matches any event where the reason contains "ReconciliationFailed".

## Filtering by Severity and Reason Together

Combining severity filtering with reason filtering provides precise control. The `ReconciliationFailed` reason typically generates error-severity events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: critical-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  inclusionList:
    - ".*ReconciliationFailed.*"
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    - kind: OCIRepository
      name: "*"
      namespace: flux-system
```

This configuration only sends alerts when an error-severity event with the ReconciliationFailed reason occurs across all Flux resource types in the flux-system namespace.

## Targeting Specific Resources

You can narrow the alert scope to specific resources rather than using wildcards:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  inclusionList:
    - ".*ReconciliationFailed.*"
  eventSources:
    - kind: Kustomization
      name: production-apps
    - kind: HelmRelease
      name: api-gateway
      namespace: production
    - kind: HelmRelease
      name: web-frontend
      namespace: production
```

This sends ReconciliationFailed alerts only for the specified production resources, ignoring failures in staging or development namespaces.

## Cross-Namespace Event Sources

To monitor resources across multiple namespaces, list specific namespace and name combinations:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: all-namespace-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  inclusionList:
    - ".*ReconciliationFailed.*"
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: staging
```

## Combining Inclusion and Exclusion Patterns

You can use both `inclusionList` and `exclusionList` to fine-tune which ReconciliationFailed events trigger alerts:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: filtered-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  inclusionList:
    - ".*ReconciliationFailed.*"
  exclusionList:
    - ".*timeout.*waiting.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

This configuration sends alerts for all ReconciliationFailed events except those related to timeouts, which might be expected in certain situations.

## Sending to Multiple Providers

For critical failure events, you may want to notify multiple channels. Create separate Alert resources pointing to different providers:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: failures-to-slack
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  inclusionList:
    - ".*ReconciliationFailed.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: failures-to-pagerduty
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-alerts
  eventSeverity: error
  inclusionList:
    - ".*ReconciliationFailed.*"
  eventSources:
    - kind: Kustomization
      name: production-apps
    - kind: HelmRelease
      name: "*"
      namespace: production
```

Slack receives all failure alerts while PagerDuty is reserved for production-only failures that need immediate attention.

## Verifying the Alert Configuration

Confirm the Alert resource is configured correctly:

```bash
flux get alerts -n flux-system
kubectl describe alert reconciliation-failures -n flux-system
```

To test the alert, you can temporarily introduce a failure in a managed resource and verify that the notification arrives in your configured channel. Check the notification-controller logs if alerts are not being delivered:

```bash
kubectl logs -n flux-system deployment/notification-controller
```

## Conclusion

Filtering Flux alerts by the ReconciliationFailed event reason provides focused notifications for actual reconciliation failures. By using the `inclusionList` field with a pattern matching ReconciliationFailed, combined with severity filtering and targeted event sources, you can build an alerting setup that notifies your team only when Flux encounters problems that need attention. This reduces alert fatigue and ensures that critical failures are not lost in a stream of routine events.
