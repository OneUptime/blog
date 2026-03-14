# How to Configure Flux Alert with Cross-Namespace Event Sources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Alerts, Cross-Namespace, Multi-Tenancy

Description: Learn how to configure Flux alerts that monitor event sources across multiple namespaces for centralized notification management.

---

## Introduction

In multi-tenant Kubernetes clusters, Flux resources are often distributed across multiple namespaces. Each team may have its own namespace with dedicated Kustomizations, HelmReleases, and source resources. Managing alerts in this environment requires the ability to reference event sources from namespaces other than where the Alert resource lives.

Flux supports cross-namespace event source references in Alert configurations, allowing you to centralize your notification setup while monitoring resources across the entire cluster. This guide walks you through configuring these cross-namespace alerts step by step.

## Prerequisites

Before proceeding, ensure you have:

- A Kubernetes cluster running version 1.25 or later
- Flux v2 installed and bootstrapped
- The notification controller deployed in the flux-system namespace
- Multiple namespaces with Flux resources to monitor
- A Provider resource configured in the flux-system namespace
- kubectl access with cluster-wide read permissions

## Understanding Cross-Namespace References

By default, a Flux Alert resource can reference event sources within the same namespace. To reference sources in other namespaces, you include the `namespace` field in the event source specification. This is the key configuration that enables cross-namespace monitoring.

The notification controller needs appropriate RBAC permissions to watch events in other namespaces. The default Flux installation grants these permissions cluster-wide, so in most setups this works without additional configuration.

## Setting Up the Namespace Structure

Consider a cluster with the following namespace layout:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-frontend
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-backend
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-data
```

Each namespace contains its own Flux resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend-app
  namespace: team-frontend
spec:
  interval: 10m
  path: ./apps/frontend
  prune: true
  sourceRef:
    kind: GitRepository
    name: frontend-repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend-api
  namespace: team-backend
spec:
  interval: 10m
  path: ./apps/backend
  prune: true
  sourceRef:
    kind: GitRepository
    name: backend-repo
```

## Configuring the Provider

Set up a centralized provider in the flux-system namespace:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: central-slack
  namespace: flux-system
spec:
  type: slack
  channel: platform-alerts
  secretRef:
    name: slack-webhook-secret
```

## Creating a Cross-Namespace Alert

Here is the core configuration. Note the `namespace` field on each event source entry:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: cross-namespace-alert
  namespace: flux-system
spec:
  providerRef:
    name: central-slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: frontend-app
      namespace: team-frontend
    - kind: Kustomization
      name: backend-api
      namespace: team-backend
    - kind: HelmRelease
      name: data-pipeline
      namespace: team-data
    - kind: GitRepository
      name: "*"
      namespace: team-frontend
    - kind: GitRepository
      name: "*"
      namespace: team-backend
```

Each source entry specifies its `namespace` explicitly. You can mix specific resource names with wildcard patterns across different namespaces.

## Monitoring All Resources in Multiple Namespaces

To watch everything in several namespaces without listing individual resources:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: multi-namespace-all-resources
  namespace: flux-system
spec:
  providerRef:
    name: central-slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: team-frontend
    - kind: Kustomization
      name: "*"
      namespace: team-backend
    - kind: Kustomization
      name: "*"
      namespace: team-data
    - kind: HelmRelease
      name: "*"
      namespace: team-frontend
    - kind: HelmRelease
      name: "*"
      namespace: team-backend
    - kind: HelmRelease
      name: "*"
      namespace: team-data
```

Using `name: "*"` with explicit namespace references captures all resources of the given kind in each namespace.

## Combining Cross-Namespace Sources with Filters

Cross-namespace alerts work well with inclusion and exclusion filters:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: filtered-cross-namespace
  namespace: flux-system
spec:
  providerRef:
    name: central-slack
  eventSeverity: info
  exclusionList:
    - ".*Progressing.*"
    - ".*DependencyNotReady.*"
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: team-frontend
    - kind: Kustomization
      name: "*"
      namespace: team-backend
    - kind: HelmRelease
      name: "*"
      namespace: team-frontend
    - kind: HelmRelease
      name: "*"
      namespace: team-backend
```

This configuration monitors all Kustomizations and HelmReleases across both team namespaces while filtering out progress-related noise.

## Per-Team Alerts with Cross-Namespace Sources

You can create separate alerts for each team while keeping them all in the flux-system namespace:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: frontend-team-alert
  namespace: flux-system
spec:
  providerRef:
    name: frontend-slack
  eventSeverity: info
  summary: "Frontend team resource event"
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: team-frontend
    - kind: HelmRelease
      name: "*"
      namespace: team-frontend
    - kind: GitRepository
      name: "*"
      namespace: team-frontend
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: backend-team-alert
  namespace: flux-system
spec:
  providerRef:
    name: backend-slack
  eventSeverity: info
  summary: "Backend team resource event"
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: team-backend
    - kind: HelmRelease
      name: "*"
      namespace: team-backend
    - kind: GitRepository
      name: "*"
      namespace: team-backend
```

Each alert routes to a team-specific provider, enabling targeted notifications while maintaining centralized management.

## RBAC Considerations

The notification controller needs permissions to watch events across namespaces. Verify the ClusterRole and ClusterRoleBinding are in place:

```bash
kubectl get clusterrole notification-controller -o yaml
kubectl get clusterrolebinding notification-controller -o yaml
```

If you are running a restricted setup, you may need to add event watch permissions for the target namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-notification-cross-namespace
rules:
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch"]
```

## Verifying Cross-Namespace Alerts

Apply the configuration and verify:

```bash
kubectl apply -f cross-namespace-alert.yaml
kubectl get alerts -n flux-system
kubectl describe alert cross-namespace-alert -n flux-system
```

Trigger a reconciliation in one of the target namespaces:

```bash
flux reconcile kustomization frontend-app -n team-frontend
```

Check your notification channel to confirm the event is received by the centralized alert.

## Conclusion

Cross-namespace event source references in Flux alerts enable centralized notification management in multi-tenant clusters. By specifying the `namespace` field on each event source, you can monitor resources across the entire cluster from a single namespace. This approach simplifies alert management, supports per-team routing through separate providers, and works seamlessly with inclusion and exclusion filters. For platform teams managing many namespaces, this pattern is essential for maintaining visibility without scattering alert configurations across the cluster.
