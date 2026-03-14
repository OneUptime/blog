# How to Filter Flux Alerts by Event Severity Error Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Alerts, Severity, Error, GitOps, Kubernetes, Notification-Controller

Description: Learn how to configure Flux CD alerts that only fire on error events, keeping your notification channels focused on failures that need attention.

---

## Introduction

In production environments, you typically do not need notifications for every successful reconciliation. What you need are alerts when something breaks. Flux CD's notification controller lets you filter alerts by severity level, and setting `eventSeverity: error` ensures you only receive notifications when Flux encounters failures.

This guide shows you how to configure error-only alerts, what types of errors trigger them, and how to build a production-grade error alerting strategy.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.0 or later
- The notification controller running
- A configured Provider resource
- `kubectl` and `flux` CLI access

## How Error Severity Filtering Works

The `eventSeverity` field on an Alert resource acts as a minimum threshold. When set to `error`, the notification controller only forwards events that Flux has classified as errors. All informational events such as successful reconciliations, healthy status checks, and routine artifact updates are silently discarded.

## Basic Error-Only Alert

Here is a minimal configuration that only fires on errors:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: error-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

This captures error events from all Kustomizations and HelmReleases while ignoring all successful reconciliation events.

## Types of Error Events

With `eventSeverity: error`, you will receive notifications for:

- **ReconciliationFailed**: The reconciliation loop encountered an error applying resources
- **ValidationFailed**: Kustomize or Helm validation rejected the manifests
- **ArtifactFailed**: The source controller could not fetch a Git repository, Helm chart, or OCI artifact
- **HealthCheckFailed**: Post-deployment health checks failed
- **DependencyNotReady**: A required dependency is not in a ready state
- **UpgradeFailed / InstallFailed**: Helm operations that failed
- **BuildFailed**: Kustomize overlay build errors

## Production Error Alerting Strategy

### Cluster-Wide Error Monitoring

For a comprehensive error monitoring setup that covers all Flux resource types:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: cluster-error-alerts
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: '*'
    - kind: HelmRepository
      name: '*'
    - kind: HelmChart
      name: '*'
    - kind: OCIRepository
      name: '*'
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

This catches errors at every stage of the GitOps pipeline, from source fetching to deployment.

### Environment-Specific Error Alerts

Route production errors to PagerDuty and staging errors to Slack:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-errors
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: production
    - kind: HelmRelease
      name: '*'
      namespace: production
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: staging-errors
  namespace: flux-system
spec:
  providerRef:
    name: slack-staging
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: staging
    - kind: HelmRelease
      name: '*'
      namespace: staging
```

### Critical Resource Error Alerts

For specific high-priority resources that should trigger immediate response:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: critical-errors
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-critical
  eventSeverity: error
  eventSources:
    - kind: HelmRelease
      name: payment-service
    - kind: HelmRelease
      name: auth-service
    - kind: Kustomization
      name: core-infrastructure
```

## Provider Configuration for Error Alerts

Error alerts often warrant more urgent notification channels. Here is a PagerDuty provider example:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: pagerduty-provider
  namespace: flux-system
spec:
  type: pagerduty
  address: https://events.pagerduty.com
  channel: YOUR_PAGERDUTY_INTEGRATION_KEY
```

## Complementary Info Alert

A common setup pairs error-only alerts with info-level alerts on separate channels:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: errors-pagerduty
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
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: all-events-slack
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

Errors go to PagerDuty for immediate attention while the full event stream goes to a Slack channel for observability.

## Verification

Check that your alert is ready:

```bash
kubectl get alerts -n flux-system
```

To test error alerting, you can intentionally create a failing Kustomization:

```bash
flux create kustomization test-error \
  --source=GitRepository/flux-system \
  --path="./nonexistent-path" \
  --prune=true
```

This will generate a reconciliation error that should trigger your alert. Clean up after testing:

```bash
flux delete kustomization test-error
```

## Conclusion

Error-only Flux alerts are the foundation of a production alerting strategy. By setting `eventSeverity: error`, you filter out the noise of successful reconciliations and focus your team's attention on failures that require action. Combined with environment-specific routing and appropriate notification providers, error-only alerts help you respond quickly to GitOps pipeline failures without alert fatigue.
