# How to Filter Flux Alerts by Kustomization Name

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, Kustomization, Alerts, GitOps, Kubernetes, Notification-Controller

Description: Learn how to configure Flux CD alerts that only trigger for specific Kustomization resources by name, reducing notification noise in your GitOps workflow.

---

## Introduction

When managing multiple Kustomization resources in a Flux CD environment, you often need alerts scoped to specific Kustomizations rather than receiving notifications for every single reconciliation event across your cluster. Flux's notification controller allows you to define Alert resources with fine-grained event source references, letting you target exactly which Kustomization resources should trigger notifications.

This guide walks you through configuring Flux Alert resources that filter events by Kustomization name, so you only receive notifications for the workloads you care about.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- The Flux notification controller running in your cluster
- At least one Provider resource configured (e.g., Slack, Microsoft Teams, or a generic webhook)
- One or more Kustomization resources deployed in your cluster
- `kubectl` access to your cluster

## Understanding Flux Alert Event Sources

Flux Alert resources use the `spec.eventSources` field to define which Flux resources should trigger notifications. Each entry in the event sources list specifies a `kind`, a `name`, and optionally a `namespace`. By setting the `kind` to `Kustomization` and providing a specific `name`, you filter alerts to only that Kustomization.

The Alert resource is part of the `notification.toolkit.fluxcd.io` API group, and the Kustomization kind referenced here belongs to the `kustomize.toolkit.fluxcd.io` API group. Flux resolves these references internally.

## Configuring an Alert for a Single Kustomization

Below is a complete example that sends alerts only when the Kustomization named `app-frontend` produces events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: frontend-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: app-frontend
```

In this configuration, the Alert named `frontend-alert` references a Provider called `slack-provider`. The `eventSources` list contains a single entry that matches only the Kustomization named `app-frontend` in the same namespace as the Alert (flux-system). Any reconciliation events from other Kustomizations are ignored.

## Configuring an Alert for Multiple Kustomizations

You can list multiple Kustomization names in the `eventSources` array to monitor several workloads with a single Alert:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: critical-apps-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: app-frontend
    - kind: Kustomization
      name: app-backend
    - kind: Kustomization
      name: app-database
```

This Alert triggers only when `app-frontend`, `app-backend`, or `app-database` Kustomizations emit error-severity events. All other Kustomizations in the cluster are excluded.

## Referencing Kustomizations in Other Namespaces

If your Kustomization lives in a different namespace than the Alert, you must specify the namespace in the event source and enable cross-namespace references:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: staging-frontend-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: app-frontend
      namespace: staging
```

For cross-namespace event sources to work, the referenced Kustomization must not have restricted cross-namespace access via the `spec.eventSources[].crossNamespaceSelectors` field on the notification controller configuration.

## Setting Up the Provider

For completeness, here is an example Slack Provider resource that the Alert references:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-provider
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
stringData:
  address: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Verifying the Alert Configuration

After applying your Alert resource, verify it is ready:

```bash
kubectl get alerts -n flux-system
```

You should see output similar to:

```text
NAME                 AGE   READY   STATUS
frontend-alert       30s   True    Initialized
```

To check the alert details:

```bash
kubectl describe alert frontend-alert -n flux-system
```

You can also trigger a manual reconciliation of the targeted Kustomization to test the alert:

```bash
flux reconcile kustomization app-frontend
```

If the alert is configured correctly, you should receive a notification in your configured provider channel.

## Combining with Severity Filters

You can further refine your alerts by combining the Kustomization name filter with severity filtering. For example, to only receive error notifications for a specific Kustomization:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: frontend-errors-only
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: app-frontend
```

Setting `eventSeverity: error` ensures you only receive alerts when the `app-frontend` Kustomization encounters failures, not routine successful reconciliations.

## Practical Pattern: Per-Environment Alerts

A common production pattern is to create separate alerts for each environment, each routing to a different notification channel:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: production-apps
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: staging-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-staging-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: staging-apps
```

This routes production errors to PagerDuty for immediate response while sending all staging events to a Slack channel for visibility.

## Conclusion

Filtering Flux alerts by Kustomization name gives you precise control over which GitOps reconciliation events trigger notifications. By specifying exact Kustomization names in the `spec.eventSources` field, you can reduce alert noise, route different workloads to different notification channels, and build environment-specific alerting strategies. Combined with severity filters, this approach lets you build a notification system that surfaces only the events your team needs to act on.
