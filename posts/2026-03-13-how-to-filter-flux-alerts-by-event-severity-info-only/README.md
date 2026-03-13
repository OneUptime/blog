# How to Filter Flux Alerts by Event Severity Info Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, Alerts, Severity, Info, GitOps, Kubernetes, Notification-Controller

Description: Learn how to configure Flux CD alerts that capture both info and error severity events, providing full visibility into your GitOps reconciliation pipeline.

---

## Introduction

Flux CD events carry a severity level: either `info` or `error`. The `eventSeverity` field on an Alert resource controls the minimum severity threshold for forwarding events. When set to `info`, the Alert forwards both informational events and error events, giving you complete visibility into the reconciliation lifecycle.

This guide explains how to configure Flux alerts with info-level severity, when to use them, and how to avoid alert fatigue while maintaining visibility.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.0 or later
- The notification controller running
- A configured Provider resource
- `kubectl` and `flux` CLI access

## Understanding Event Severity Levels

Flux events have two severity levels:

- **info**: Routine operational events such as successful reconciliations, artifact updates, and normal state transitions.
- **error**: Failure events such as failed reconciliations, validation errors, dependency issues, and timeout errors.

The `eventSeverity` field on the Alert resource acts as a threshold filter:

- `eventSeverity: info` forwards events with severity `info` and above (meaning both `info` and `error` events)
- `eventSeverity: error` forwards only events with severity `error`

## Configuring an Info-Level Alert

To capture all events from your Flux resources, set `eventSeverity` to `info`:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-events-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

This Alert forwards every event from all Kustomizations and HelmReleases, including successful reconciliations, upgrades, and failures.

## Info Events You Will Receive

With `eventSeverity: info`, you will see events for:

- Successful reconciliations (`ReconciliationSucceeded`)
- Artifact updates when a new commit or chart version is detected
- Helm upgrade and install completions
- Health check passes
- Drift detection and correction
- Dependency resolution completions

Plus all error events:

- Failed reconciliations
- Validation errors
- Timeout errors
- Health check failures

## Practical Use Cases for Info-Level Alerts

### Development and Staging Environments

Info-level alerts are ideal for non-production environments where you want full visibility:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: staging-full-visibility
  namespace: flux-system
spec:
  providerRef:
    name: slack-staging
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: staging
    - kind: HelmRelease
      name: '*'
      namespace: staging
    - kind: GitRepository
      name: '*'
```

### Deployment Tracking

To track every deployment as it happens across your cluster:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-tracker
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

This gives your team a real-time feed of all deployments, useful for correlating application behavior changes with deployment events.

### Audit Trail

Info-level alerts serve as an audit trail of all changes applied to your cluster:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: audit-trail
  namespace: flux-system
spec:
  providerRef:
    name: webhook-audit-system
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
    - kind: GitRepository
      name: '*'
    - kind: HelmRepository
      name: '*'
    - kind: OCIRepository
      name: '*'
```

## Combining Info Severity with Name Filters

To get full visibility for specific critical resources without flooding your channel with all cluster events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: critical-app-full-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: production-apps
    - kind: HelmRelease
      name: api-gateway
    - kind: GitRepository
      name: app-repo
```

Only these three specific resources generate notifications, but you see every event they produce.

## Managing Alert Volume

Info-level alerts can generate high volumes of notifications. Here are strategies to manage this:

### Use Dedicated Channels

Route info-level alerts to a dedicated low-priority channel:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-info-channel
  namespace: flux-system
spec:
  type: slack
  channel: flux-info-events
  secretRef:
    name: slack-webhook-secret
```

### Split Info and Error Alerts

Create separate alerts for info and error events, routed to different channels:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: info-events
  namespace: flux-system
spec:
  providerRef:
    name: slack-info-channel
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: error-events
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
```

Note that the info alert also captures error events. If you want true separation, use the `inclusionList` field with a regex pattern matching info-only messages.

## Verification

```bash
kubectl get alerts -n flux-system
kubectl describe alert all-events-alert -n flux-system
```

Trigger a reconciliation to see both info and error events flow through:

```bash
flux reconcile kustomization flux-system
```

## Conclusion

Setting `eventSeverity: info` on Flux alerts gives you complete visibility into the GitOps reconciliation lifecycle. This is valuable for development environments, deployment tracking, and audit trails. To manage notification volume in production, combine info-level severity with specific resource name filters, dedicated notification channels, or split info and error alerts to different destinations. The key is matching the verbosity level to the audience and the criticality of the monitored resources.
