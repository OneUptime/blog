# How to Configure Flux Receiver for Multiple Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Configuration, Multi-Resource

Description: Learn how to configure a single Flux Receiver to trigger reconciliation of multiple GitRepositories, HelmRepositories, Kustomizations, and other Flux resources simultaneously.

---

A single webhook event often needs to trigger reconciliation of more than one resource. For example, a push to your infrastructure repository might need to reconcile a GitRepository, several Kustomizations, and a HelmRepository. Rather than creating a separate Receiver for each resource, Flux allows you to list multiple target resources within a single Receiver definition.

This guide explains how to configure Receivers that target multiple resources of different types, how to organize Receivers for complex setups, and when to use one Receiver versus many.

## Prerequisites

- A Kubernetes cluster with Flux CD installed and bootstrapped.
- Multiple Flux resources configured (GitRepositories, Kustomizations, HelmRepositories).
- `kubectl` and `flux` CLI tools available.
- A webhook token secret already created.

Verify your Flux resources:

```bash
flux get all --all-namespaces
```

## Step 1: List Multiple Resources in a Single Receiver

The `spec.resources` field accepts an array of resource references. You can include resources of different kinds and API groups:

```yaml
# multi-resource-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: multi-resource-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: webhook-token
  resources:
    # Reconcile the main GitRepository
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
    # Reconcile the application GitRepository
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: app-source
    # Reconcile a specific Kustomization
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: infrastructure
    # Reconcile a HelmRepository
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: HelmRepository
      name: bitnami
```

Apply it:

```bash
kubectl apply -f multi-resource-receiver.yaml
```

When a webhook arrives, the notification-controller annotates all four resources with `reconcile.fluxcd.io/requestedAt`, causing each of their respective controllers to reconcile them.

## Step 2: Target Resources Across Different Types

Flux supports many reconcilable resource types. Here is a Receiver that covers the most common ones:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: full-stack-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: webhook-token
  resources:
    # Source resources
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: HelmRepository
      name: podinfo
    - apiVersion: source.toolkit.fluxcd.io/v1beta2
      kind: OCIRepository
      name: manifests
    - apiVersion: source.toolkit.fluxcd.io/v1beta2
      kind: Bucket
      name: artifacts
    # Deployment resources
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: apps
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: podinfo
    # Image automation
    - apiVersion: image.toolkit.fluxcd.io/v1beta2
      kind: ImageRepository
      name: app-image
```

Make sure each referenced resource actually exists. The notification-controller will log errors if it cannot find a resource but will still process the remaining ones.

## Step 3: Use Wildcard Matching with matchLabels

Instead of listing every resource by name, you can use label selectors to target groups of resources. This is especially useful when you add new Kustomizations or GitRepositories frequently and do not want to update the Receiver each time:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: labeled-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: webhook-token
  resources:
    # Match all GitRepositories with this label
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      matchLabels:
        webhook-trigger: "true"
    # Match all Kustomizations with this label
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      matchLabels:
        webhook-trigger: "true"
```

Then label the resources you want to include:

```bash
kubectl -n flux-system label gitrepository flux-system webhook-trigger=true
kubectl -n flux-system label gitrepository app-source webhook-trigger=true
kubectl -n flux-system label kustomization infrastructure webhook-trigger=true
kubectl -n flux-system label kustomization apps webhook-trigger=true
```

Any new resource with the `webhook-trigger: true` label will automatically be included without modifying the Receiver.

## Step 4: Multiple Receivers for Different Webhook Sources

If different repositories or services need to trigger different sets of resources, create separate Receivers. Each Receiver gets its own webhook path and token:

```yaml
# receiver-infra.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: infra-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: infra-webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: infrastructure
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: cluster-config
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: cluster-addons
---
# receiver-apps.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: apps-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: apps-webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: applications
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: staging-apps
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: production-apps
```

Each Receiver needs its own secret. You can use the same token value if the same GitHub repository sends both webhooks, or different tokens for different repositories.

Get the webhook paths:

```bash
kubectl -n flux-system get receiver infra-receiver -o jsonpath='{.status.webhookPath}'
kubectl -n flux-system get receiver apps-receiver -o jsonpath='{.status.webhookPath}'
```

## Step 5: Combining Named Resources and Label Selectors

You can mix named references and label selectors in the same Receiver:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: hybrid-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: webhook-token
  resources:
    # Always reconcile this specific GitRepository
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
    # Also reconcile any Kustomization tagged for webhooks
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      matchLabels:
        webhook-trigger: "true"
```

## Verification

After creating the Receiver, confirm it is ready:

```bash
kubectl -n flux-system get receiver multi-resource-receiver
```

Trigger a webhook and verify that all target resources were annotated:

```bash
# Check each resource for the reconcile annotation
for resource in "gitrepository/flux-system" "gitrepository/app-source" "kustomization/infrastructure"; do
  echo "=== $resource ==="
  kubectl -n flux-system get $resource -o jsonpath='{.metadata.annotations.reconcile\.fluxcd\.io/requestedAt}'
  echo ""
done
```

Watch all resources reconcile:

```bash
flux get all --all-namespaces -w
```

## Troubleshooting

### Some resources reconcile but others do not

Check the notification-controller logs for patch errors:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=5m | grep -i "error\|fail"
```

The most common cause is a typo in the resource name or API version. Compare the Receiver spec with actual resources:

```bash
kubectl -n flux-system get receiver multi-resource-receiver -o yaml
kubectl api-resources | grep flux
```

### matchLabels does not pick up new resources

The label selector is evaluated at webhook delivery time, not at Receiver creation time. If a newly labeled resource is not being reconciled, ensure the label is set correctly:

```bash
kubectl -n flux-system get gitrepository --show-labels
```

### Too many resources causing timeouts

If a Receiver references a large number of resources, the notification-controller must patch each one. With dozens of resources this can take time. Consider splitting into multiple Receivers or using label selectors to keep the set manageable.

### Resource in a different namespace

By default, the Receiver can only target resources in its own namespace. To target resources in other namespaces, see the cross-namespace configuration guide. You may need to use `namespace` in the resource reference and configure appropriate RBAC.

## Summary

Flux Receivers support targeting multiple resources through explicit name references and label selectors. For simple setups, listing resources directly in `spec.resources` works well. For dynamic environments where resources are added frequently, label selectors reduce maintenance overhead. When different webhook sources need to trigger different resource sets, use separate Receivers with distinct tokens and webhook paths.
