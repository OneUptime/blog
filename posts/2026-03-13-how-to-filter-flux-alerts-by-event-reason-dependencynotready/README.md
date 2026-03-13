# How to Filter Flux Alerts by Event Reason DependencyNotReady

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alerts, Event Filtering, Dependencies

Description: Learn how to filter Flux alerts by the DependencyNotReady event reason to manage dependency-related reconciliation notifications effectively.

---

## Introduction

Flux manages dependencies between Kustomizations and HelmReleases, allowing you to define ordering constraints for your GitOps deployments. When a resource depends on another that has not yet reconciled successfully, Flux emits events with the `DependencyNotReady` reason. In clusters with complex dependency chains, these events can appear frequently and create noise in your alert channels.

This guide explains how to configure Flux Alert resources to filter events by the `DependencyNotReady` reason. You will learn how to isolate these events for monitoring dependency health and how to exclude them from general alert channels to reduce noise.

## Prerequisites

Before starting, ensure the following are in place:

- A Kubernetes cluster running version 1.25 or later
- Flux v2 installed and bootstrapped
- The Flux notification controller running in the cluster
- A configured Provider resource for your notification channel
- kubectl access to the flux-system namespace
- Familiarity with Flux Kustomization dependency configuration

## What Triggers DependencyNotReady Events

The `DependencyNotReady` reason appears when a Flux Kustomization or HelmRelease has declared a dependency via the `dependsOn` field, and that dependency has not yet reached a ready state. Consider this example:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-frontend
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/frontend
  prune: true
  sourceRef:
    kind: GitRepository
    name: app-repo
  dependsOn:
    - name: app-backend
    - name: app-database
```

If `app-backend` or `app-database` has not reconciled successfully, the `app-frontend` Kustomization will emit a `DependencyNotReady` event on each reconciliation attempt. In a cluster with many interdependent resources, this can generate a significant number of events during initial deployment or after infrastructure changes.

## Setting Up a Provider

Here is a Microsoft Teams provider configuration for reference:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: teams-provider
  namespace: flux-system
spec:
  type: msteams
  secretRef:
    name: teams-webhook-url
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: teams-webhook-url
  namespace: flux-system
stringData:
  address: "https://outlook.office.com/webhook/YOUR/WEBHOOK/URL"
```

## Creating an Alert for DependencyNotReady Events

To monitor dependency health specifically, create an Alert that only captures `DependencyNotReady` events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: dependency-not-ready-alerts
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: info
  inclusionList:
    - ".*DependencyNotReady.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

The `inclusionList` regex pattern ensures only events containing the `DependencyNotReady` string are forwarded to your Teams channel. This creates a dedicated dependency health dashboard in your notification system.

## Excluding DependencyNotReady from General Alerts

For your main alert channel, you likely want to filter out dependency-related noise while keeping all other important events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: general-alerts-no-dependency
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: info
  exclusionList:
    - ".*DependencyNotReady.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
    - kind: HelmRepository
      name: "*"
    - kind: HelmChart
      name: "*"
```

This configuration forwards all events except those related to unready dependencies, keeping your general channel focused on actionable notifications.

## Combining DependencyNotReady with Other Filters

You can build more sophisticated filtering by combining multiple patterns. For example, to exclude both dependency and retry noise:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: clean-alerts
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: info
  exclusionList:
    - ".*DependencyNotReady.*"
    - ".*ProgressingWithRetry.*"
    - ".*Progressing.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Each entry in the `exclusionList` is evaluated independently. If an event matches any of the patterns, it is suppressed.

## Monitoring Specific Dependency Chains

When you have critical dependency chains that require close monitoring, create a targeted alert:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: critical-dependency-alert
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: info
  inclusionList:
    - ".*DependencyNotReady.*"
  eventSources:
    - kind: Kustomization
      name: app-frontend
    - kind: Kustomization
      name: app-api-gateway
    - kind: HelmRelease
      name: payment-service
```

This narrows the scope to only the resources you care about, preventing alerts from less important dependency chains in staging or development namespaces.

## Using Metadata for Context

Adding contextual metadata gives your team immediate context about what the alert means. Use the `eventMetadata` field to attach key-value annotations to the alert:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: dependency-alert-with-metadata
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: info
  eventMetadata:
    summary: "A Flux resource is blocked waiting for a dependency to become ready. Check the upstream resource status."
  inclusionList:
    - ".*DependencyNotReady.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

The `eventMetadata` field attaches key-value pairs to the notification, helping on-call engineers quickly understand the situation without looking up what `DependencyNotReady` means. Note: the older `summary` field is deprecated in v1beta3 and will be removed in Alert API v1 GA; use `eventMetadata` instead.

## Verifying and Testing

Apply your Alert resources and verify their status:

```bash
kubectl apply -f dependency-alert.yaml
kubectl get alerts -n flux-system
kubectl describe alert dependency-not-ready-alerts -n flux-system
```

To test the filter, you can temporarily break a dependency by suspending a Kustomization:

```bash
flux suspend kustomization app-backend
flux reconcile kustomization app-frontend
```

This forces `app-frontend` to emit a `DependencyNotReady` event. Check your notification channel to confirm the alert arrives. Then resume the suspended resource:

```bash
flux resume kustomization app-backend
```

## Troubleshooting Common Issues

If your filtered alerts are not working as expected, verify the following:

Check that the notification controller is running and healthy:

```bash
kubectl get pods -n flux-system -l app=notification-controller
```

Ensure the regex pattern matches the actual event content. You can inspect recent events to see the exact format:

```bash
kubectl get events -n flux-system --field-selector reason=DependencyNotReady
```

If no events appear, the dependency chain may be resolving too quickly. Adjust the reconciliation interval or test with a deliberately broken dependency.

## Conclusion

Filtering Flux alerts by the `DependencyNotReady` event reason is essential for managing notification noise in clusters with complex dependency chains. By using the `inclusionList` field, you can create dedicated channels for dependency health monitoring. By using the `exclusionList` field, you can keep your general alert channels clean. Combining these filters with severity levels, targeted event sources, and summary messages gives you a flexible notification strategy that scales with your cluster complexity. Apply these patterns early in your Flux deployment to prevent alert fatigue as your GitOps infrastructure grows.
