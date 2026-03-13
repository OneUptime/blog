# How to Safely Remove Resources from Git Without Deleting from Cluster in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, GitOps, Pruning, Garbage-Collection, Kubernetes, Migration

Description: Learn how to safely remove Kubernetes resource manifests from your Git repository without triggering Flux garbage collection and deleting them from the cluster.

---

## Introduction

In a GitOps workflow powered by Flux CD, your Git repository is the source of truth for cluster state. When garbage collection is enabled with `prune: true`, removing a manifest from Git causes Flux to delete the corresponding resource from the cluster. However, there are many legitimate scenarios where you want to remove a manifest from Git without deleting the resource from the cluster, such as migrating resource ownership to another controller, handing off management to a different team, or transitioning from Flux-managed to manually-managed resources.

This post covers multiple strategies to safely decouple resources from Git without triggering deletion in the cluster.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- A Kustomization with `prune: true` enabled
- `kubectl` and `flux` CLI tools installed
- Access to the Git repository connected to Flux

## Strategy 1: Annotate Before Removing from Git

The safest approach is a two-step process. First, add the prune-disabled annotation to the resource in Git and wait for Flux to apply it. Then, remove the manifest from Git.

Step 1: Add the annotation to the resource manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
  namespace: production
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  replicas: 2
  selector:
    matchLabels:
      app: legacy-app
  template:
    metadata:
      labels:
        app: legacy-app
    spec:
      containers:
        - name: app
          image: legacy-app:v3.2.1
          ports:
            - containerPort: 8080
```

Commit and push this change. Wait for Flux to reconcile and apply the annotation:

```bash
flux reconcile kustomization my-app
kubectl get deployment legacy-app -n production -o jsonpath='{.metadata.annotations}'
```

Verify the annotation is present on the cluster resource.

Step 2: Remove the manifest file from Git. Commit and push. When Flux reconciles, it will see that the resource is no longer in Git but has the prune-disabled annotation, so it will skip deletion.

## Strategy 2: Suspend the Kustomization Temporarily

If you need to remove multiple resources from Git at once, you can suspend the Kustomization, make your Git changes, annotate the resources in the cluster, and then resume:

```bash
# Suspend the Kustomization to stop reconciliation
flux suspend kustomization my-app

# Annotate resources in the cluster directly
kubectl annotate deployment legacy-app -n production \
  kustomize.toolkit.fluxcd.io/prune=disabled

kubectl annotate service legacy-service -n production \
  kustomize.toolkit.fluxcd.io/prune=disabled

# Remove the manifests from Git, commit, and push
# ...

# Resume the Kustomization
flux resume kustomization my-app
```

When the Kustomization resumes, it will reconcile against the updated Git state. Resources with the prune-disabled annotation will be skipped during garbage collection.

## Strategy 3: Temporarily Disable Pruning

Another approach is to temporarily set `prune: false` on the Kustomization, remove the resources from Git, and then re-enable pruning:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: false  # Temporarily disabled
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Step 1: Set `prune: false`, commit, and push. Wait for reconciliation.

Step 2: Remove the resource manifests from Git, commit, and push. Wait for reconciliation. The resources remain in the cluster because pruning is disabled.

Step 3: Set `prune: true` again, commit, and push.

```yaml
spec:
  prune: true  # Re-enabled
```

After this, the removed resources will no longer be in the Kustomization inventory and will not be tracked. They effectively become orphaned but remain running in the cluster.

## Strategy 4: Move Resources to a Non-Pruning Kustomization

For a more permanent solution, create a separate Kustomization with `prune: false` for resources that should not be garbage collected:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: persistent-resources
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure/persistent
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Move the resource manifests from the pruning Kustomization path to the non-pruning Kustomization path:

```bash
# Move manifests
mv apps/production/legacy-app.yaml infrastructure/persistent/legacy-app.yaml
```

This transfers ownership of the resources to the non-pruning Kustomization. When the original Kustomization reconciles, it will see the resources are gone from its path and attempt to prune them. However, the new Kustomization will have already claimed them, and the resources will persist.

To make this transition seamless, apply the new Kustomization before making the move:

```bash
flux reconcile kustomization persistent-resources
```

## Strategy 5: Remove Flux Labels from Cluster Resources

As a last resort, you can remove the Flux tracking labels from resources in the cluster. Without these labels, Flux cannot identify the resources as managed and will not attempt to prune them:

```bash
kubectl label deployment legacy-app -n production \
  kustomize.toolkit.fluxcd.io/name- \
  kustomize.toolkit.fluxcd.io/namespace-
```

This is the most aggressive approach and should only be used when other strategies are not feasible. The resource becomes completely unmanaged by Flux.

## Verification

After any of these strategies, verify that the resources are still running:

```bash
kubectl get deployment legacy-app -n production
kubectl get service legacy-service -n production
```

Check that the Kustomization has reconciled successfully:

```bash
flux get kustomization my-app
```

Ensure there are no error events:

```bash
kubectl events -n flux-system --for kustomization/my-app
```

## Choosing the Right Strategy

Use Strategy 1 (annotate before removing) for planned, individual resource removals. It is the cleanest and most auditable approach.

Use Strategy 2 (suspend and annotate) when removing multiple resources at once and you need to coordinate changes.

Use Strategy 3 (temporarily disable pruning) for quick bulk removals when you have full control of the Kustomization.

Use Strategy 4 (separate Kustomization) for permanent splits between prunable and non-prunable resources.

Use Strategy 5 (remove labels) only as an emergency measure.

## Conclusion

Removing resources from Git without deleting them from the cluster requires careful planning in a Flux GitOps environment. The annotation-first approach is the safest and most recommended method, ensuring that resources are explicitly marked as non-prunable before they disappear from the Git repository. Regardless of which strategy you choose, always verify the outcome by checking both the cluster state and the Kustomization status after reconciliation.
