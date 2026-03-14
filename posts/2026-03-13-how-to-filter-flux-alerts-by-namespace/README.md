# How to Filter Flux Alerts by Namespace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Namespace, Alerts, GitOps, Kubernetes, Notification-Controller

Description: Learn how to scope Flux CD alerts to specific Kubernetes namespaces, enabling environment-based and team-based notification routing.

---

## Introduction

In multi-tenant or multi-environment Kubernetes clusters, Flux CD typically manages resources across many namespaces. Receiving alerts for every namespace creates noise that makes it hard to identify important events. Flux's notification controller supports namespace-based filtering in Alert event sources, allowing you to target notifications to specific namespaces.

This guide covers how to configure Flux Alerts that filter by namespace, including patterns for environment isolation, team-based routing, and wildcard matching.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.0 or later
- The notification controller deployed and running
- A Provider resource configured for your notification channel
- Flux resources deployed across multiple namespaces
- `kubectl` and `flux` CLI access

## Namespace Filtering in Event Sources

Each entry in `spec.eventSources` can include a `namespace` field. When specified, the Alert only captures events from the named resource in that particular namespace. When you use a wildcard `*` for the `name` field combined with a specific namespace, you capture all resources of that kind within the namespace.

## Filtering All Resources in a Namespace

To receive alerts for all Kustomizations in a specific namespace, use the `*` wildcard for the name:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: production-namespace-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: production
```

The `name: '*'` wildcard matches all Kustomization resources in the `production` namespace. Events from Kustomizations in any other namespace are excluded.

## Monitoring Multiple Namespaces

You can combine multiple namespace-scoped entries to monitor several namespaces:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: app-namespaces-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: production
    - kind: Kustomization
      name: '*'
      namespace: staging
    - kind: HelmRelease
      name: '*'
      namespace: production
    - kind: HelmRelease
      name: '*'
      namespace: staging
```

This Alert captures events from both Kustomizations and HelmReleases across the `production` and `staging` namespaces.

## Environment-Based Alert Routing

A common production pattern is routing alerts from different namespaces to different notification channels:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: prod-alerts
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
  name: staging-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-staging-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: staging
    - kind: HelmRelease
      name: '*'
      namespace: staging
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: dev-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-dev-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: development
    - kind: HelmRelease
      name: '*'
      namespace: development
```

Production errors go to PagerDuty for immediate response. Staging and development events go to their respective Slack channels.

## Combining Namespace and Name Filters

You can mix wildcard namespace entries with specifically named entries:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: targeted-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: production
    - kind: HelmRelease
      name: ingress-nginx
      namespace: infra
```

This captures all Kustomization events in `production` plus events from a specific HelmRelease in the `infra` namespace.

## Monitoring Source Resources by Namespace

You can also filter source controller resources like GitRepository and HelmRepository by namespace:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: source-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: '*'
      namespace: flux-system
    - kind: HelmRepository
      name: '*'
      namespace: flux-system
```

This captures source-level errors like failed Git clones or Helm repository index fetch failures.

## Provider Setup

Here is an example provider for reference:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: flux-namespace-alerts
  secretRef:
    name: slack-webhook-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-secret
  namespace: flux-system
stringData:
  address: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Verification

Check your alerts are ready:

```bash
kubectl get alerts -n flux-system
```

```text
NAME              AGE   READY   STATUS
prod-alerts       15s   True    Initialized
staging-alerts    15s   True    Initialized
dev-alerts        15s   True    Initialized
```

Test by reconciling a resource in one of the watched namespaces:

```bash
flux reconcile kustomization my-app --namespace production
```

Only the production alert should fire; staging and dev alerts should remain silent.

## Troubleshooting

If alerts are not firing for a specific namespace, verify the following:

1. The Flux resource actually exists in the target namespace:
   ```bash
   kubectl get kustomizations -n production
   ```

2. The Alert resource is in a namespace that has visibility to the target namespace. Alerts in `flux-system` can typically reference any namespace.

3. The event source kind matches the actual resource API kind. Use `Kustomization` (not `kustomize`) and `HelmRelease` (not `helmrelease`).

## Conclusion

Namespace-based filtering in Flux alerts is a powerful way to segment notifications by environment, team, or application boundary. Using the wildcard name with a specific namespace captures all resources in that namespace, while combining namespace filters with specific resource names gives you fine-grained control. This approach scales well in multi-tenant clusters where different teams and environments need independent notification channels.
