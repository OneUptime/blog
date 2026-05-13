# How to Configure HelmRelease Upgrade Strategy Replace vs Merge in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Upgrade Strategy, Replace, Merge

Description: Understand the differences between replace and merge upgrade strategies in Flux HelmRelease and learn when to use each approach.

---

## Introduction

When Flux performs a Helm upgrade for a HelmRelease resource, Helm needs to determine how to apply changes to existing Kubernetes resources. Helm supports different update paths that control whether resources are patched or forced through a replacement update. Understanding the difference between replacement and patch-based updates is essential for avoiding unexpected resource modifications and preventing downtime during upgrades.

The replacement strategy sends a full replacement update for an existing resource instead of applying a patch. The merge strategy patches the existing resource in place. Each approach has trade-offs in terms of safety, downtime, and handling of fields managed by other controllers.

This guide explains both strategies, shows you how to configure them in your HelmRelease manifests, and provides guidance on choosing the right one for your workloads.

## Prerequisites

Before following this guide, you need:

- A Kubernetes cluster with Flux CD installed
- The Flux Helm Controller running
- A configured HelmRepository source
- Basic understanding of Helm upgrade behavior
- kubectl access to your cluster

## Understanding the Upgrade Strategies

When Helm uses client-side patching, it uses the concept of a three-way strategic merge patch for Kubernetes resources that support it. This means it compares the old manifest, the new manifest, and the live state in the cluster to determine what changes to apply. In current Flux versions, `spec.upgrade.serverSideApply` can also control whether server-side apply is used.

The replacement strategy, on the other hand, uses a full resource replacement update instead of a patch. This is closer to running `kubectl replace` than `kubectl apply`, but it is not a general-purpose delete-and-recreate migration mechanism for immutable Kubernetes fields.

In Flux, you control this client-side replacement behavior through the `spec.upgrade.force` field. If server-side apply is enabled for the HelmRelease, Flux ignores `spec.upgrade.force` because server-side apply handles conflicts through field ownership.

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

With `force: false` (the default), Flux does not request Helm's replacement strategy. For client-side updates, Helm uses three-way merge patches to update resources, which generally avoids overwriting fields that were set by other controllers, such as annotations added by service meshes or labels applied by admission webhooks.

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

When `force` is true, Helm attempts to replace changed resources rather than patching them. If the replacement changes a workload's pod template, Kubernetes will roll out new Pods for controllers such as Deployments, which can cause brief interruptions depending on the workload's rollout settings.

## When to Use Each Strategy

The merge strategy is the right choice for most workloads. Use it when:

- You want to minimize disruption during upgrades
- Other controllers or operators manage additional fields on your resources
- Your application handles rolling updates gracefully
- You need to preserve metadata added by external tools

The replace strategy is appropriate when:

- Client-side merge patches fail due to patch conflicts or fields that need a full replacement update
- You need to ensure the resource matches the desired state exactly with no leftover fields
- Resources have accumulated drift that you want to clean up
- A previous upgrade left resources in an inconsistent state

## Handling Immutable Field Changes

Some chart updates change immutable Kubernetes fields. For example, changing the `spec.selector` on a Deployment is not allowed after the Deployment has been created:

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
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    app:
      labelSelector: "app.kubernetes.io/name=my-app-v2"
```

In this case, the upgrade will still fail unless you plan a recreate path, such as renaming the Deployment, deleting and recreating it during a maintenance window, or uninstalling and reinstalling the release where that is acceptable. The `force` flag can avoid patch conflicts, but it does not make immutable Kubernetes fields mutable.

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
              - op: add
                path: /metadata/annotations/helm.sh~1resource-policy
                value: keep
```

## Monitoring Upgrade Behavior

After configuring your upgrade strategy, monitor the behavior to ensure it works as expected:

```bash
kubectl get helmrelease my-app -n default -o yaml | grep -A 10 "status:"
```

Check for conditions indicating whether the upgrade succeeded with the chosen strategy. If you see errors related to immutable fields, plan an explicit recreate or migration path for that resource.

## Conclusion

Choosing between replace and merge upgrade strategies in Flux HelmRelease depends on your specific requirements. The merge strategy is safer and less disruptive, making it the default choice for most workloads. The replace strategy can help with patch conflicts or accumulated resource drift, but immutable field changes still require a recreate or migration plan. Configure the strategy thoughtfully for each HelmRelease based on the chart's behavior and your application's tolerance for restarts. Always combine your chosen strategy with proper remediation settings to ensure failed upgrades are handled automatically.
