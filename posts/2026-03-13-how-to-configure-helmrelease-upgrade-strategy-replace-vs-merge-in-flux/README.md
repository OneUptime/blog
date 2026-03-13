# How to Configure HelmRelease Upgrade Strategy Replace vs Merge in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Upgrade Strategy, Replace, Merge

Description: Understand the differences between replace and merge upgrade strategies in Flux HelmRelease and learn when to use each approach.

---

## Introduction

When Flux performs a Helm upgrade for a HelmRelease resource, Helm needs to determine how to apply changes to existing Kubernetes resources. Helm supports different upgrade strategies that control whether resources are replaced entirely or merged with their current state. Understanding the difference between replace and merge strategies is essential for avoiding unexpected resource modifications and preventing downtime during upgrades.

The replace strategy deletes the existing resource and creates a new one with the desired state. The merge strategy patches the existing resource in place. Each approach has trade-offs in terms of safety, downtime, and handling of fields managed by other controllers.

This guide explains both strategies, shows you how to configure them in your HelmRelease manifests, and provides guidance on choosing the right one for your workloads.

## Prerequisites

Before following this guide, you need:

- A Kubernetes cluster with Flux CD installed
- The Flux Helm Controller running
- A configured HelmRepository source
- Basic understanding of Helm upgrade behavior
- kubectl access to your cluster

## Understanding the Upgrade Strategies

Helm uses the concept of a three-way strategic merge patch by default when upgrading resources. This means it compares the old manifest, the new manifest, and the live state in the cluster to determine what changes to apply. This is the default merge behavior.

The replace strategy, on the other hand, uses a full resource replacement. It deletes the existing resource and creates a new one. This is equivalent to running `kubectl replace` instead of `kubectl apply`.

In Flux, you control this behavior through the `spec.upgrade.force` field and related Helm flags.

## Configuring Merge Strategy (Default)

The merge strategy is the default behavior. You do not need to explicitly set it, but here is what a HelmRelease looks like with merge semantics:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    force: false
    remediation:
      retries: 3
      strategy: rollback
```

With `force: false` (the default), Helm uses three-way strategic merge patches to update resources. This preserves any fields that were set by other controllers, such as annotations added by service meshes or labels applied by admission webhooks.

## Configuring Replace Strategy

To use the replace strategy, set `spec.upgrade.force` to true:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    force: true
    remediation:
      retries: 3
      strategy: rollback
```

When `force` is true, Helm deletes and recreates resources that have changed rather than patching them. This triggers pod restarts for Deployments and can cause brief interruptions.

## When to Use Each Strategy

The merge strategy is the right choice for most workloads. Use it when:

- You want to minimize disruption during upgrades
- Other controllers or operators manage additional fields on your resources
- Your application handles rolling updates gracefully
- You need to preserve metadata added by external tools

The replace strategy is appropriate when:

- Merge patches fail due to immutable field changes (such as modifying a Deployment's selector)
- You need to ensure the resource matches the desired state exactly with no leftover fields
- Resources have accumulated drift that you want to clean up
- A previous upgrade left resources in an inconsistent state

## Handling Immutable Field Changes

One of the most common reasons to use the replace strategy is when a chart update changes an immutable field. For example, changing the `spec.selector` on a Deployment is not allowed with a patch:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "3.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    force: true
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    app:
      labelSelector: "app.kubernetes.io/name=my-app-v2"
```

In this case, the force flag ensures the Deployment is deleted and recreated with the new selector labels.

## Combining Strategies with Post-Renderers

You can combine the upgrade strategy with post-renderers to further control how resources are applied. Post-renderers modify the rendered manifests before Helm applies them, which can be useful when you need to adjust resources for compatibility with a particular upgrade strategy:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "3.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    force: false
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: my-app
                annotations:
                  helm.sh/resource-policy: keep
```

## Monitoring Upgrade Behavior

After configuring your upgrade strategy, monitor the behavior to ensure it works as expected:

```bash
kubectl get helmrelease my-app -n default -o yaml | grep -A 10 "status:"
```

Check for conditions indicating whether the upgrade succeeded with the chosen strategy. If you see errors related to immutable fields, switch to the replace strategy for that release.

## Conclusion

Choosing between replace and merge upgrade strategies in Flux HelmRelease depends on your specific requirements. The merge strategy is safer and less disruptive, making it the default choice for most workloads. The replace strategy is necessary when dealing with immutable field changes or accumulated resource drift. Configure the strategy thoughtfully for each HelmRelease based on the chart's behavior and your application's tolerance for restarts. Always combine your chosen strategy with proper remediation settings to ensure failed upgrades are handled automatically.
