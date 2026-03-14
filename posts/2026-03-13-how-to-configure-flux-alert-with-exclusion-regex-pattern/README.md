# How to Configure Flux Alert with Exclusion Regex Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alerts, Regex, Event Filtering

Description: Learn how to use exclusion regex patterns in Flux alerts to suppress noisy events and keep notification channels focused on actionable information.

---

## Introduction

Flux event notifications are valuable for tracking the state of your GitOps deployments, but not every event warrants an alert. Progress updates, routine reconciliations, and transient retries can overwhelm your notification channels. The `exclusionList` field in a Flux Alert resource allows you to define regex patterns that suppress matching events, letting everything else through.

This guide demonstrates how to configure exclusion patterns effectively, covering common use cases from suppressing routine events to building production-grade notification filters.

## Prerequisites

Ensure you have the following:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller running in the flux-system namespace
- A Provider resource configured for your preferred notification channel
- kubectl access to the flux-system namespace
- Basic understanding of regular expressions

## How the Exclusion List Works

The `exclusionList` field accepts an array of regex patterns. When an event occurs, the notification controller checks the event message against each pattern. If the message matches any pattern in the list, the event is suppressed and not forwarded to the provider. Events that do not match any exclusion pattern pass through normally.

This is the inverse of the `inclusionList`. While inclusion acts as a whitelist, exclusion acts as a blacklist. The exclusion approach is typically preferred in production because it defaults to forwarding events and only suppresses known noise.

## Suppressing Progress Events

The most common exclusion pattern targets progress-related events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: no-progress-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  exclusionList:
    - ".*Progressing.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

The pattern `.*Progressing.*` matches any event message containing the word "Progressing", which covers `Progressing`, `ProgressingWithRetry`, and similar reasons. This single pattern eliminates a significant amount of noise.

## Excluding Multiple Event Types

Build a comprehensive noise filter by listing multiple patterns:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: clean-production-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  exclusionList:
    - ".*Progressing.*"
    - ".*DependencyNotReady.*"
    - ".*ArtifactUpToDate.*"
    - ".*no changes since last reconcilation.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
    - kind: HelmRepository
      name: "*"
```

Each pattern is evaluated independently. An event is suppressed if it matches any single pattern in the list. This configuration filters out progress updates, dependency wait states, unchanged artifact notifications, and no-change reconciliation messages.

## Excluding Events by Namespace Reference

Event messages sometimes contain namespace information. You can exclude events referencing specific namespaces:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: no-staging-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  exclusionList:
    - ".*staging.*"
    - ".*dev-.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

This suppresses events where the message references staging or development resources, keeping your alert channel focused on production events.

## Excluding Specific Error Messages

Some error messages are known and expected. You can suppress them:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: filtered-error-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  exclusionList:
    - ".*rate limit.*"
    - ".*context deadline exceeded.*"
    - ".*connection refused.*"
  eventSources:
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

Rate limits, timeouts, and connection errors are often transient. Flux will retry automatically, so alerting on each occurrence adds noise without actionable information.

## Case-Insensitive Exclusion

Use the Go regex inline flag for case-insensitive matching:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: case-insensitive-exclusion
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  exclusionList:
    - "(?i).*warning.*"
    - "(?i).*deprecated.*"
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

The `(?i)` prefix makes the pattern match "Warning", "WARNING", "warning", and any other casing variation.

## Production-Ready Exclusion Configuration

Here is a comprehensive exclusion setup suitable for production clusters:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  exclusionList:
    - ".*Progressing.*"
    - ".*ProgressingWithRetry.*"
    - ".*DependencyNotReady.*"
    - ".*ArtifactUpToDate.*"
    - ".*no changes since last reconcilation.*"
    - ".*stored artifact for revision.*"
    - "(?i).*rate limit.*"
    - "(?i).*context deadline exceeded.*"
  summary: "Flux production event"
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
    - kind: OCIRepository
      name: "*"
```

This configuration monitors all major Flux resource types while excluding the most common sources of noise. The summary field adds context to every notification that does get through.

## Combining Exclusion with Inclusion

You can use both lists simultaneously. The inclusion list is evaluated first, then the exclusion list filters the results:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: combined-filter-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  inclusionList:
    - ".*Reconciliation.*"
  exclusionList:
    - ".*ProgressingWithRetry.*"
  eventSources:
    - kind: Kustomization
      name: "*"
```

This captures all reconciliation-related events except retry events, giving you a focused view of reconciliation outcomes.

## Verifying Exclusion Patterns

Apply and verify your alert configuration:

```bash
kubectl apply -f exclusion-alert.yaml
kubectl get alerts -n flux-system
kubectl describe alert production-alerts -n flux-system
```

Monitor the notification controller logs to confirm events are being properly filtered:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=100
```

Force a reconciliation and check your notification channel:

```bash
flux reconcile kustomization flux-system --with-source
```

## Conclusion

The `exclusionList` field in Flux Alert resources is the most practical tool for managing notification noise. By defining regex patterns that suppress known noisy events, you ensure your alert channels deliver actionable information. Start with the common patterns like `Progressing` and `ArtifactUpToDate`, then refine based on what your specific cluster generates. The exclusion approach is safer than inclusion for production environments because new event types are forwarded by default, preventing you from missing unexpected issues. Build your exclusion list incrementally and review it periodically as your cluster evolves.
