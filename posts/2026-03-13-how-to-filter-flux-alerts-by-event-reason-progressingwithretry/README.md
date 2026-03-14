# How to Filter Flux Alerts by Event Reason ProgressingWithRetry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alerts, Event Filtering

Description: Learn how to filter Flux alerts by the ProgressingWithRetry event reason to reduce noise and focus on actionable reconciliation issues.

---

## Introduction

When running Flux in a production Kubernetes cluster, the notification system can generate a large volume of events. Among these, the `ProgressingWithRetry` reason indicates that a reconciliation is still in progress but has encountered a transient error and is retrying. While this information can be valuable for debugging, it often creates noise in alert channels if left unfiltered.

This guide walks you through configuring a Flux Alert resource that specifically filters events by the `ProgressingWithRetry` reason. By the end, you will have a targeted alerting setup that either isolates or excludes these retry events depending on your operational needs.

## Prerequisites

Before you begin, make sure you have the following in place:

- A running Kubernetes cluster (v1.25 or later recommended)
- Flux v2 installed and bootstrapped on the cluster
- The Flux notification controller deployed (included by default in a standard Flux installation)
- A Provider resource already configured (such as Slack, Microsoft Teams, or a generic webhook)
- kubectl access with permissions to create resources in the flux-system namespace

## Understanding the ProgressingWithRetry Event Reason

Flux controllers emit Kubernetes events during reconciliation. Each event carries a `reason` field that describes what triggered it. The `ProgressingWithRetry` reason appears when a controller encounters a recoverable error during reconciliation and schedules a retry attempt. Common scenarios include temporary network failures when pulling Helm charts, brief API server unavailability, or transient image registry errors.

These events are normal in dynamic environments but can flood notification channels if every retry triggers an alert. Filtering them allows your team to focus on persistent failures rather than transient blips.

## Setting Up the Provider

If you have not yet created a Provider, here is a basic Slack example that your Alert will reference:

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
```

Create the associated secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flux-system
stringData:
  address: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

Apply both resources with kubectl:

```bash
kubectl apply -f provider.yaml
kubectl apply -f secret.yaml
```

## Filtering Alerts to Only Include ProgressingWithRetry

To receive alerts exclusively for `ProgressingWithRetry` events, configure the Alert resource with the `inclusionList` field using a regex pattern that matches this reason:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: progressing-retry-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*ProgressingWithRetry.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

In this configuration, the `inclusionList` field accepts a list of regex patterns. Only events whose message or reason matches one of these patterns will be forwarded to the provider. The wildcard `name: "*"` ensures all resources of each kind are monitored.

## Filtering Alerts to Exclude ProgressingWithRetry

In many production environments, the opposite approach is more useful. You want all alerts except the noisy retry events. Use the `exclusionList` field for this:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: all-except-retry-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  exclusionList:
    - ".*ProgressingWithRetry.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

This configuration forwards every event to Slack unless the event message or reason contains `ProgressingWithRetry`. This is the recommended approach for teams that want comprehensive visibility without retry noise.

## Combining Filters with Event Severity

You can further refine your alerts by combining the reason filter with severity levels. For example, to only see error-level events that are not retries:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: errors-no-retry
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  exclusionList:
    - ".*ProgressingWithRetry.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Setting `eventSeverity` to `error` limits the alert to error events only. Combined with the exclusion pattern, this gives you a focused view of genuine failures.

## Targeting Specific Resources

Rather than monitoring all resources, you can narrow the scope to specific event sources:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: specific-resource-retry-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*ProgressingWithRetry.*"
  eventSources:
    - kind: HelmRelease
      name: my-critical-app
    - kind: Kustomization
      name: production-stack
```

This setup only watches for retry events on the `my-critical-app` HelmRelease and the `production-stack` Kustomization, which is useful when you want to track retries for specific workloads without affecting the broader alerting pipeline.

## Verifying the Alert Configuration

After applying your Alert resource, verify it is ready:

```bash
kubectl get alerts -n flux-system
```

Check the status conditions for any issues:

```bash
kubectl describe alert progressing-retry-alerts -n flux-system
```

You can trigger a test reconciliation to validate the filter:

```bash
flux reconcile kustomization flux-system --with-source
```

Monitor your notification channel to confirm that only the expected events arrive.

## Troubleshooting

If alerts are not being delivered, check the notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller
```

Common issues include an incorrect provider reference, a malformed regex pattern in the inclusion or exclusion list, or the secret containing the webhook URL being missing or misconfigured. Make sure the regex pattern is properly escaped and anchored if you need exact matching rather than substring matching.

## Conclusion

Filtering Flux alerts by event reason gives you precise control over what reaches your notification channels. The `ProgressingWithRetry` reason is a common source of alert fatigue, and using the `inclusionList` or `exclusionList` fields in the Alert resource lets you either isolate or suppress these events as needed. Combined with severity filtering and targeted event sources, you can build a notification pipeline that surfaces actionable information without drowning your team in transient retry noise. Apply these patterns to other event reasons as well to keep your alerting strategy clean and effective.
