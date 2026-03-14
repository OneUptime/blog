# How to Configure Flux Alert with Inclusion Regex Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alerts, Regex, Event Filtering

Description: Learn how to use inclusion regex patterns in Flux alerts to selectively forward only the events that match specific criteria.

---

## Introduction

Flux generates a steady stream of events as it reconciles your cluster state with your Git repositories. Not all of these events are equally important. The `inclusionList` field in a Flux Alert resource lets you define regex patterns that act as a whitelist, forwarding only events whose message content matches at least one of the specified patterns.

This guide covers how to craft effective inclusion regex patterns, apply them to your Alert resources, and use them to build a precise notification pipeline that delivers only the information you need.

## Prerequisites

Make sure you have the following ready:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller running in the flux-system namespace
- A Provider resource configured for your notification channel
- Basic familiarity with regular expressions
- kubectl access to the flux-system namespace

## How the Inclusion List Works

The `inclusionList` field accepts an array of regex patterns. When an event is generated, the notification controller evaluates the event message against each pattern. If the message matches any pattern in the list, the event is forwarded to the provider. If it matches none, the event is silently dropped.

This behavior is fundamentally different from the `exclusionList`, which drops matching events. Think of `inclusionList` as a whitelist filter: only explicitly matching events get through.

## Basic Inclusion Pattern

The simplest use case is matching a specific keyword in event messages:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: reconciliation-complete-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*ReconciliationSucceeded.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

This alert only fires when a reconciliation succeeds. All other events, including progress updates, retries, and dependency checks, are excluded.

## Multiple Inclusion Patterns

You can specify multiple patterns to capture several types of events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: success-and-failure-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*ReconciliationSucceeded.*"
    - ".*ReconciliationFailed.*"
    - ".*ValidationFailed.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Each pattern is evaluated independently. An event that matches any one of the three patterns will be forwarded. This gives you end-state notifications without the intermediate noise.

## Matching Specific Resource Names in Messages

Event messages often include the name of the resource. You can use this to filter for specific resources within the message content:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-resource-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*production-.*"
    - ".*prod-.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

This captures events where the message references any resource with a name starting with `production-` or `prod-`.

## Case-Insensitive Matching

Go regex syntax supports inline flags. To perform case-insensitive matching:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: case-insensitive-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - "(?i).*error.*"
    - "(?i).*failed.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

The `(?i)` flag makes the pattern match regardless of letter casing, catching messages like "Error", "ERROR", "error", "Failed", "FAILED", and so on.

## Matching Version or Tag Patterns

When monitoring image or chart updates, you might want to alert only for specific version patterns:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: major-version-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*v[0-9]+\\.0\\.0.*"
  eventSources:
    - kind: HelmRelease
      name: "*"
    - kind: ImagePolicy
      name: "*"
```

This pattern matches messages containing version strings like `v2.0.0` or `v10.0.0`, alerting you to major version updates while ignoring minor and patch releases.

## Combining Inclusion List with Severity

The inclusion list works alongside the `eventSeverity` field:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: info-reconciliation-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*ReconciliationSucceeded.*"
  eventSources:
    - kind: Kustomization
      name: "*"
```

Setting `eventSeverity: info` means both info and error events are candidates. The inclusion list then further filters to only reconciliation success messages. If you set `eventSeverity: error`, info-level events are pre-filtered before the inclusion list is evaluated.

## Practical Pattern for Deployment Notifications

A common production pattern is to alert only on meaningful state changes:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: deployment-state-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*ReconciliationSucceeded.*"
    - ".*ReconciliationFailed.*"
    - ".*HealthCheckFailed.*"
    - ".*PruneFailed.*"
    - ".*ArtifactUpToDate.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

This pattern captures the events that indicate a deployment reached a terminal state, whether success or failure, without the intermediate reconciliation chatter.

## Testing Your Patterns

After applying the alert, trigger events and verify:

```bash
kubectl apply -f inclusion-alert.yaml
flux reconcile kustomization flux-system --with-source
```

Check the notification controller logs to see which events are being processed:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50
```

If events are not matching, review the actual event messages to adjust your regex:

```bash
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

## Conclusion

The `inclusionList` field in Flux Alert resources provides a powerful whitelist mechanism for event filtering. By crafting targeted regex patterns, you can ensure that only the events you care about reach your notification channels. Whether you are filtering by event reason, resource name, version string, or any other message content, inclusion patterns give you precise control. Start with broad patterns and refine them as you learn what events your cluster generates, building toward a notification setup that delivers signal without noise.
