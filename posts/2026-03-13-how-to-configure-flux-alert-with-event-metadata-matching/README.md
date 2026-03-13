# How to Configure Flux Alert with Event Metadata Matching

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alerts, Metadata, Event Filtering

Description: Learn how to configure Flux alerts that match on event metadata fields for fine-grained notification control beyond message-based filtering.

---

## Introduction

Flux Alert resources offer several mechanisms for filtering events before they reach your notification channels. Beyond message-based regex filtering with inclusion and exclusion lists, Flux supports event metadata matching through the `eventMetadata` field. This feature allows you to filter events based on key-value pairs present in the event metadata, providing a structured and precise filtering mechanism.

This guide covers how event metadata works in Flux, how to configure alerts that match specific metadata fields, and practical patterns for using metadata matching in production environments.

## Prerequisites

Before starting, make sure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller deployed in the flux-system namespace
- A Provider resource configured
- kubectl access to the flux-system namespace
- Understanding of Flux reconciliation concepts

## Understanding Event Metadata in Flux

Flux controllers attach metadata to the events they generate. This metadata includes structured information about the event context, such as the revision that triggered the reconciliation, the source kind, and custom annotations. The `eventMetadata` field in the Alert spec lets you match events based on these metadata key-value pairs.

When you specify `eventMetadata`, only events that carry all the specified key-value pairs in their metadata are forwarded. This acts as an AND filter: every key-value pair must be present in the event metadata for the event to match.

## Basic Metadata Matching

Here is a basic example that matches events containing a specific metadata key-value pair:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: metadata-filtered-alert
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
    - kind: HelmRelease
      name: "*"
```

This alert only forwards events where the metadata includes `env: production`. Events without this metadata field or with a different value are silently dropped.

## Setting Metadata on Flux Resources

For metadata matching to work, your Flux resources need to emit events with the expected metadata. You can annotate your resources to influence the event metadata:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-app
  namespace: flux-system
  labels:
    env: production
    team: backend
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: app-repo
```

The labels and annotations on the Flux resource are carried through to the events it generates, making them available for metadata matching in alerts.

## Multi-Field Metadata Matching

You can specify multiple metadata fields for more precise filtering:

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
    - kind: HelmRelease
      name: "*"
```

Both conditions must be satisfied. Only events with metadata containing both `env: production` AND `team: platform` will be forwarded. This enables highly targeted alerting in multi-team environments.

## Metadata Matching for Revision Tracking

Track deployments of specific Git revisions:

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
    revision-source: main
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: GitRepository
      name: "*"
```

This is useful when you want to track events related to changes from a specific branch.

## Combining Metadata with Regex Filters

Metadata matching works alongside `inclusionList` and `exclusionList`:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: combined-metadata-regex
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
    - kind: HelmRelease
      name: "*"
```

The metadata filter runs first to select events from the production environment, then the exclusion list removes noisy progress events. This layered approach gives you precise control over what reaches your notification channel.

## Team-Based Alert Routing with Metadata

Create per-team alerts using metadata fields:

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
    - kind: HelmRelease
      name: "*"
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
    - kind: HelmRelease
      name: "*"
```

Each team receives only the events from their own resources, routed to their specific notification channel.

## Priority-Based Alerting with Metadata

Use metadata to implement priority levels:

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
    - kind: HelmRelease
      name: "*"
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
    - kind: HelmRelease
      name: "*"
```

Label your Flux resources with `priority: critical` or `priority: low` to control which notification channel receives their events.

## Verifying Metadata Matching

Apply your alert and check its status:

```bash
kubectl apply -f metadata-alert.yaml
kubectl describe alert metadata-filtered-alert -n flux-system
```

Verify that events carry the expected metadata:

```bash
kubectl get events -n flux-system -o json | jq '.items[] | {reason, message, metadata: .metadata.annotations}'
```

Trigger a reconciliation to test:

```bash
flux reconcile kustomization production-app
```

## Troubleshooting

If metadata matching is not working as expected, check the following:

Verify that the Flux resource has the correct labels or annotations that generate the expected event metadata. Inspect the events directly to see what metadata fields are present. Ensure the metadata keys and values in the Alert spec exactly match what appears in the events, as the matching is exact and case-sensitive.

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=100
```

## Conclusion

Event metadata matching in Flux alerts provides structured, precise filtering that complements regex-based message filtering. By labeling your Flux resources with metadata like environment, team, and priority, you can build a sophisticated alert routing system that delivers the right notifications to the right people. Combined with inclusion and exclusion lists, summary fields, and severity filtering, metadata matching gives you a comprehensive toolkit for managing Flux notifications at scale.
