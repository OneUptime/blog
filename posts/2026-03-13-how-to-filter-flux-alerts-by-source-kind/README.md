# How to Filter Flux Alerts by Source Kind

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, Alerts, Source-Kind, GitOps, Kubernetes, Notification-Controller

Description: Learn how to configure Flux CD alerts that filter by resource kind, such as GitRepository, HelmRelease, Kustomization, and other Flux resource types.

---

## Introduction

Flux CD manages several types of resources: GitRepositories, HelmRepositories, HelmCharts, Kustomizations, HelmReleases, OCIRepositories, Buckets, and more. Each resource kind generates different types of events. By filtering alerts by source kind, you can separate source-level issues from reconciliation problems, route different resource types to different teams, and reduce notification noise.

This guide explains how to use the `kind` field in Flux Alert event sources to filter notifications by resource type.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.0 or later
- The notification controller, source controller, kustomize controller, and helm controller running
- A configured Provider resource
- `kubectl` and `flux` CLI access

## Available Flux Resource Kinds

Flux supports the following resource kinds in Alert event sources:

| Kind | Controller | Description |
|------|-----------|-------------|
| `GitRepository` | source-controller | Git repository sync status |
| `HelmRepository` | source-controller | Helm chart repository index |
| `HelmChart` | source-controller | Helm chart fetch and packaging |
| `OCIRepository` | source-controller | OCI artifact sync |
| `Bucket` | source-controller | S3-compatible bucket sync |
| `Kustomization` | kustomize-controller | Kustomize reconciliation |
| `HelmRelease` | helm-controller | Helm release lifecycle |

## Filtering by a Single Kind

To receive alerts only for GitRepository events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: git-source-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: '*'
```

The `name: '*'` wildcard captures events from all GitRepository resources. Only GitRepository events trigger this alert; HelmRelease and Kustomization events are ignored.

## Separating Source and Reconciliation Alerts

A practical pattern is splitting alerts into source-level alerts and reconciliation-level alerts:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: source-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-sources-channel
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
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: reconciliation-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments-channel
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

Source alerts capture problems fetching code or charts, such as authentication failures, network issues, or missing references. Reconciliation alerts capture deployment outcomes like successful upgrades, failed applies, or drift detection.

## Monitoring Only Helm-Related Resources

If your cluster relies heavily on Helm, you might want a dedicated alert for all Helm-related kinds:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: helm-pipeline-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: HelmRepository
      name: '*'
    - kind: HelmChart
      name: '*'
    - kind: HelmRelease
      name: '*'
```

This captures the full Helm pipeline: repository index updates, chart fetches, and release reconciliations.

## Monitoring OCI-Based Sources

For clusters using OCI artifacts for GitOps:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: oci-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: OCIRepository
      name: '*'
```

## Combining Kind Filtering with Namespace

You can combine kind filtering with namespace filtering for precise targeting:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: prod-kustomization-alerts
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
      namespace: production
```

This only alerts on Kustomization errors in the production namespace, ignoring all other kinds and namespaces.

## Kind-Based Routing to Different Teams

Different teams often care about different resource kinds. The platform team monitors sources, while application teams monitor reconciliation:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: platform-team-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-platform
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: '*'
    - kind: HelmRepository
      name: '*'
    - kind: OCIRepository
      name: '*'
    - kind: Bucket
      name: '*'
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: app-team-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-app-team
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

## Verification

List all alerts and confirm they are ready:

```bash
kubectl get alerts -n flux-system
```

Describe a specific alert to verify event sources:

```bash
kubectl describe alert source-alerts -n flux-system
```

Test by triggering reconciliation of a specific kind:

```bash
flux reconcile source git flux-system
```

Only the alert watching GitRepository should fire.

## Conclusion

Filtering Flux alerts by source kind is fundamental to building a well-organized notification system. By separating source-level events from reconciliation events and routing different resource kinds to different channels or teams, you create an alerting strategy that scales with your cluster complexity. The `kind` field in `spec.eventSources` is the primary mechanism for this filtering, and it works well in combination with name and namespace filters for precise targeting.
