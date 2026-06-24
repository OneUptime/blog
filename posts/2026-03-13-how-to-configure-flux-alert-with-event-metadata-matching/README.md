# How to Configure Flux Alert with Event Metadata Matching

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alert, Metadata, Event Filtering

Description: Learn how to configure Flux alerts that match on event metadata fields for fine-grained notification control beyond message-based filtering.

---

## Introduction

Flux Alert resources offer several mechanisms for filtering events before they reach your notification channels. Beyond message-based regex filtering with inclusion and exclusion lists, Flux supports selecting event sources by object name, namespace, and labels. Flux also supports the `eventMetadata` field, which adds structured key-value context to events that are dispatched to your provider.

This guide covers how event metadata works in Flux, how to configure alerts that select specific labeled resources, and practical patterns for using metadata enrichment and label matching in production environments.

## Prerequisites

Before starting, make sure you have:

- A Kubernetes cluster supported by your Flux version (current Flux documentation lists Kubernetes v1.33 or later)
- Flux v2 installed and bootstrapped
- The notification controller deployed in the flux-system namespace
- A Provider resource configured
- kubectl access to the flux-system namespace
- Understanding of Flux reconciliation concepts

## Understanding Event Metadata in Flux

Flux controllers attach metadata to the events they generate. This metadata includes structured information about the event context, such as the revision that triggered the reconciliation. The `eventMetadata` field in the Alert spec lets you add key-value pairs to events that are forwarded by that Alert.

When you specify `eventMetadata`, Flux adds those fields to the dispatched event payload. It does not use `eventMetadata` as a filter. To filter which Flux objects an Alert subscribes to, use `eventSources` with `name`, `namespace`, and, when selecting multiple objects, `matchLabels`.

## Basic Label Matching

Here is a basic example that matches events from resources with a specific label:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: metadata-enriched-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventMetadata:
    env: production
  eventSources:
    - kind: Kustomization
      name: "*"
      matchLabels:
        env: production
    - kind: HelmRelease
      name: "*"
      matchLabels:
        env: production
```

This alert only forwards events from matching `Kustomization` and `HelmRelease` objects labeled `env: production`. The outgoing notification payload also includes the metadata field `env: production`.

## Setting Metadata on Flux Resources

For label matching to work, your Flux resources need the expected labels. To add metadata to outgoing events from a specific Flux object, use annotations with the `event.toolkit.fluxcd.io/` prefix:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-app
  namespace: flux-system
  labels:
    env: production
    team: backend
  annotations:
    event.toolkit.fluxcd.io/summary: "Production app deployment event"
    event.toolkit.fluxcd.io/team: backend
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: app-repo
```

The labels on the Flux resource can be used by `eventSources.matchLabels`. The annotations with the `event.toolkit.fluxcd.io/` prefix are carried through to the events Flux dispatches.

## Multi-Field Label Matching

You can specify multiple labels for more precise filtering:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: team-env-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventMetadata:
    env: production
    team: platform
  eventSources:
    - kind: Kustomization
      name: "*"
      matchLabels:
        env: production
        team: platform
    - kind: HelmRelease
      name: "*"
      matchLabels:
        env: production
        team: platform
```

Both label conditions must be satisfied. Only events from objects with labels containing both `env: production` AND `team: platform` will be forwarded. This enables highly targeted alerting in multi-team environments.

## Metadata for Revision Tracking

Add context to deployment notifications for a specific Git source:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: revision-tracking-alert
  namespace: flux-system
spec:
  providerRef:
    name: webhook-provider
  eventSeverity: info
  eventMetadata:
    tracked-branch: main
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: GitRepository
      name: app-repo
```

This is useful when you want notifications to include additional context about the branch or source you are tracking. Flux also includes controller-defined metadata such as source revisions where applicable.

## Combining Labels, Metadata, and Regex Filters

Label matching and event metadata work alongside `inclusionList` and `exclusionList`:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: combined-label-metadata-regex
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventMetadata:
    env: production
  exclusionList:
    - ".*Progressing.*"
    - ".*ArtifactUpToDate.*"
  eventSources:
    - kind: Kustomization
      name: "*"
      matchLabels:
        env: production
    - kind: HelmRelease
      name: "*"
      matchLabels:
        env: production
```

The event source selector limits the alert to production resources, then the exclusion list removes noisy progress events. The `eventMetadata` field adds production context to the notifications that are sent.

## Team-Based Alert Routing with Labels

Create per-team alerts using labels:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: frontend-team-alert
  namespace: flux-system
spec:
  providerRef:
    name: frontend-slack
  eventSeverity: info
  eventMetadata:
    team: frontend
    summary: "Frontend team deployment event"
  eventSources:
    - kind: Kustomization
      name: "*"
      matchLabels:
        team: frontend
    - kind: HelmRelease
      name: "*"
      matchLabels:
        team: frontend
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: backend-team-alert
  namespace: flux-system
spec:
  providerRef:
    name: backend-slack
  eventSeverity: info
  eventMetadata:
    team: backend
    summary: "Backend team deployment event"
  eventSources:
    - kind: Kustomization
      name: "*"
      matchLabels:
        team: backend
    - kind: HelmRelease
      name: "*"
      matchLabels:
        team: backend
```

Each team receives only the events from resources with its team label, routed to its specific notification channel.

## Priority-Based Alerting with Labels

Use labels to implement priority levels:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: high-priority-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventMetadata:
    priority: critical
    summary: "CRITICAL: Immediate response required"
  eventSources:
    - kind: Kustomization
      name: "*"
      matchLabels:
        priority: critical
    - kind: HelmRelease
      name: "*"
      matchLabels:
        priority: critical
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: low-priority-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventMetadata:
    priority: low
    summary: "Low priority: Review when convenient"
  eventSources:
    - kind: Kustomization
      name: "*"
      matchLabels:
        priority: low
    - kind: HelmRelease
      name: "*"
      matchLabels:
        priority: low
```

Label your Flux resources with `priority: critical` or `priority: low` to control which notification channel receives their events.

## Verifying Label Matching and Metadata

Apply your alert and check its status:

```bash
kubectl apply -f metadata-alert.yaml
kubectl describe alert metadata-enriched-alert -n flux-system
```

Verify that your Flux resources have the expected labels and event metadata annotations:

```bash
kubectl get kustomization production-app -n flux-system -o jsonpath='{.metadata.labels}{"\n"}{.metadata.annotations}{"\n"}'
```

Trigger a reconciliation to test:

```bash
flux reconcile kustomization production-app
```

## Troubleshooting

If label matching or metadata enrichment is not working as expected, check the following:

Verify that the Flux resource has the correct labels for `eventSources.matchLabels`. Inspect the Flux resource annotations to confirm any event metadata annotations use the `event.toolkit.fluxcd.io/` prefix. Ensure the label keys and values in the Alert spec exactly match what appears on the Flux resources, as label matching is exact and case-sensitive.

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=100
```

## Conclusion

Event metadata in Flux alerts provides structured context that complements label-based event source selection and regex-based message filtering. By labeling your Flux resources with fields like environment, team, and priority, you can build a sophisticated alert routing system that delivers the right notifications to the right people. Combined with inclusion and exclusion lists, metadata fields, and severity filtering, Flux alerts give you a comprehensive toolkit for managing notifications at scale.
