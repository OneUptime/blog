# How to Configure Alert Event Sources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Event Sources

Description: Learn how to configure the eventSources field in Flux alerts to specify exactly which resources to monitor for events.

---

The `spec.eventSources` field in a Flux Alert resource defines which Flux resources should trigger notifications. By configuring event sources carefully, you control the scope of your alerts, from monitoring a single resource to watching entire categories of resources across multiple namespaces. This guide explains how to configure event sources effectively.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The notification controller and at least one other Flux controller running
- A notification provider configured

## Understanding Event Sources

Each entry in the `spec.eventSources` array specifies a resource to watch using three fields:

- **kind** - The type of Flux resource (e.g., Kustomization, HelmRelease, GitRepository)
- **name** - The name of the resource, or `*` to match all resources of that kind
- **namespace** - The namespace where the resource lives

The alert will forward events from all matched resources to the referenced notification provider.

## Step 1: Monitor a Single Resource

The simplest configuration watches a single named resource.

```yaml
# Alert watching a single Kustomization resource
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: single-source-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Watch only the "apps" Kustomization in flux-system
    - kind: Kustomization
      name: apps
      namespace: flux-system
```

## Step 2: Monitor All Resources of a Kind

Use a wildcard (`*`) for the name to match all resources of a given kind in a namespace.

```yaml
# Alert watching all HelmRelease resources in flux-system
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-helmreleases-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Wildcard matches all HelmRelease resources
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

## Step 3: Monitor Multiple Resource Kinds

Combine different resource kinds in a single alert for broader coverage.

```yaml
# Alert watching multiple resource kinds
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: multi-kind-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Source controller resources
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    - kind: HelmRepository
      name: "*"
      namespace: flux-system
    # Deployment resources
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

Apply the alert.

```bash
# Apply the multi-kind alert
kubectl apply -f multi-kind-alert.yaml
```

## Step 4: Monitor Resources Across Namespaces

Add entries for the same kind in different namespaces to monitor cross-namespace resources.

```yaml
# Alert watching resources across multiple namespaces
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: cross-namespace-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Kustomizations across environments
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: Kustomization
      name: "*"
      namespace: staging
    - kind: Kustomization
      name: "*"
      namespace: production
    # HelmReleases across environments
    - kind: HelmRelease
      name: "*"
      namespace: staging
    - kind: HelmRelease
      name: "*"
      namespace: production
```

## Step 5: Mix Wildcards and Specific Names

You can mix wildcard and named entries to create targeted monitoring.

```yaml
# Alert combining wildcard and specific resource names
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: mixed-sources-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    # Watch all GitRepositories
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    # Watch only specific critical Kustomizations
    - kind: Kustomization
      name: infra-controllers
      namespace: flux-system
    - kind: Kustomization
      name: apps
      namespace: flux-system
    # Watch a specific HelmRelease
    - kind: HelmRelease
      name: cert-manager
      namespace: flux-system
```

## Step 6: Full GitOps Pipeline Event Sources

For complete pipeline monitoring, include all relevant source and deployment resource kinds.

```yaml
# Comprehensive alert covering the full GitOps pipeline
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: full-pipeline-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    # Source controllers
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    - kind: OCIRepository
      name: "*"
      namespace: flux-system
    - kind: HelmRepository
      name: "*"
      namespace: flux-system
    - kind: HelmChart
      name: "*"
      namespace: flux-system
    # Deployment controllers
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
    # Image automation
    - kind: ImageRepository
      name: "*"
      namespace: flux-system
    - kind: ImagePolicy
      name: "*"
      namespace: flux-system
    - kind: ImageUpdateAutomation
      name: "*"
      namespace: flux-system
```

## Step 7: Verify Event Source Configuration

Check that your event sources are correctly configured and matching the intended resources.

```bash
# List the alert and its event sources
kubectl get alert multi-kind-alert -n flux-system -o yaml

# Verify that the referenced resource kinds exist
kubectl get kustomizations -n flux-system
kubectl get helmreleases -n flux-system
kubectl get gitrepositories -n flux-system

# Check for events from the specified sources
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

## Supported Event Source Kinds

The following Flux resource kinds can be used as event sources:

| Kind | Controller |
|---|---|
| GitRepository | source-controller |
| OCIRepository | source-controller |
| HelmRepository | source-controller |
| HelmChart | source-controller |
| Bucket | source-controller |
| Kustomization | kustomize-controller |
| HelmRelease | helm-controller |
| ImageRepository | image-reflector-controller |
| ImagePolicy | image-reflector-controller |
| ImageUpdateAutomation | image-automation-controller |

## Common Mistakes

- **Wrong kind name**: Resource kinds are case-sensitive. Use `Kustomization`, not `kustomization`
- **Missing namespace**: Always specify the namespace where the watched resource lives
- **Alert namespace vs source namespace**: The alert itself lives in one namespace but can watch resources in other namespaces via the event source namespace field
- **Non-existent resources**: If the named resource does not exist, the alert will not error, but it will never fire

## Summary

The `spec.eventSources` field gives you precise control over which Flux resources trigger alerts. You can watch individual resources by name, all resources of a kind using wildcards, or resources across multiple namespaces. Combine event sources with severity filters and exclusion rules for a well-tuned notification setup. Start with broad wildcards during setup and narrow down to specific resources as your understanding of event patterns grows.
