# How to Filter Flux Alerts by Event Reason ReconciliationFailed

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Alert, Kubernetes, GitOps, Notification, Event, Reconciliation, Monitoring

Description: Learn how to configure Flux alerts to filter by the ReconciliationFailed event reason for targeted failure notifications.

---

## Introduction

Flux generates events throughout the reconciliation lifecycle of its resources. These events include successes, retries, dependency waits, and failures. In a busy cluster with many Flux-managed resources, the volume of events can be overwhelming. Sending all events as alerts to your notification channels creates noise that makes it difficult to identify actual problems.

Filtering alerts by severity and event source allows you to target specific types of Flux events. Flux events include a machine-readable reason, but the Flux `Alert` resource does not provide a dedicated selector for that reason. The `ReconciliationFailed` condition reason is still important to monitor because it indicates that a Flux resource could not reach its desired state.

This guide shows how to set up Flux alerts for reconciliation failures using `eventSeverity`, `eventSources`, and message-based inclusion or exclusion patterns where appropriate.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed and the `notification.toolkit.fluxcd.io/v1beta3` APIs available
- The Flux notification-controller installed
- A notification provider configured (Slack, Teams, PagerDuty, or similar)
- kubectl access to the cluster
- Flux resources (Kustomizations, HelmReleases, GitRepositories) deployed

## Setting Up the Notification Provider

First, configure a notification provider that will receive the filtered alerts. Here is an example using Slack:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-alerts
  namespace: flux-system
spec:
  type: slack
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

## Filtering Alerts for Reconciliation Failures

The Alert resource in Flux supports filtering by event severity and event source. It also supports `inclusionList`, but that field matches event message content, not the event reason. To receive failure notifications for Flux resources, start with `eventSeverity: error` and the Flux resource kinds you want to monitor:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: reconciliation-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

This configuration sends error-severity events from the selected Flux resources. If you need an exact reason-level filter, do that in the receiving system when it exposes Flux event fields or labels, such as the `reason` label on Prometheus Alertmanager notifications.

## Filtering by Severity and Source Together

Combining severity filtering with source filtering provides precise control. Reconciliation failure events are emitted with error severity:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: critical-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
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

This configuration sends error-severity events across the listed Flux resource types in the `flux-system` namespace.

## Targeting Specific Resources

You can narrow the alert scope to specific resources rather than using wildcards:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
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

This sends failure alerts only for the specified production resources, ignoring failures in staging or development namespaces.

## Cross-Namespace Event Sources

To monitor resources across multiple namespaces, list specific namespace and name combinations:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-namespace-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
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

You can use both `inclusionList` and `exclusionList` to fine-tune which message text triggers alerts:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: filtered-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  inclusionList:
    - ".*(failed|error|not found|timeout).*"
  exclusionList:
    - ".*timeout.*waiting.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

This configuration sends error-severity alerts whose messages match the inclusion pattern, except those that also match the exclusion pattern. The inclusion and exclusion regexes are matched against the event message.

## Sending to Multiple Providers

For critical failure events, you may want to notify multiple channels. Create separate Alert resources pointing to different providers:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: failures-to-slack
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: failures-to-pagerduty
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-alerts
  eventSeverity: error
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

Filtering Flux alerts by error severity and targeted event sources provides focused notifications for reconciliation failures. By using `eventSeverity: error`, selecting the Flux resources you care about, and applying message-based inclusion or exclusion patterns only when needed, you can build an alerting setup that notifies your team when Flux encounters problems that need attention. This reduces alert fatigue and ensures that critical failures are not lost in a stream of routine events.
