# How to Use Labels to Prevent Pruning in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, GitOps, Labels, Pruning, Garbage-Collection, Kubernetes

Description: Learn how to use Kubernetes labels strategically to prevent Flux from pruning specific resources during garbage collection.

---

## Introduction

Flux CD uses garbage collection to keep your cluster in sync with your Git repository, automatically deleting resources that are no longer present in source control. While this is generally desirable, certain resources should persist regardless of their presence in Git. Labels provide a powerful organizational mechanism to categorize and protect resources from pruning at scale.

By combining Kubernetes labels with Kustomize patches and Flux annotations, you can build a systematic approach to pruning prevention that scales across large clusters and multiple teams.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- A Kustomization with `prune: true` enabled
- `kubectl` and `flux` CLI tools installed
- Familiarity with Kubernetes labels and selectors

## How Labels Interact with Flux Pruning

Flux tracks resources through its inventory system and manages pruning based on annotations. Labels themselves do not directly control Flux pruning behavior, but they serve as an organizational tool that you can use in combination with Kustomize patches to apply prune-disabling annotations to groups of resources.

The key label-based strategy involves labeling resources you want to protect and then using Kustomize target selectors to automatically apply the `kustomize.toolkit.fluxcd.io/prune: disabled` annotation to all resources matching those labels.

## Defining a Protection Label

First, define a consistent label for resources that should be protected from pruning:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
  labels:
    flux.oneuptime.com/no-prune: "true"
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
  labels:
    flux.oneuptime.com/no-prune: "true"
type: Opaque
data:
  username: YWRtaW4=
  password: cGFzc3dvcmQ=
```

## Applying Prune Annotations via Label Selectors

Use a Kustomize overlay to match all labeled resources and apply the prune-disabled annotation:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - pvc.yaml
  - secret.yaml
patches:
  - target:
      labelSelector: "flux.oneuptime.com/no-prune=true"
    patch: |
      apiVersion: v1
      kind: __any__
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

With this configuration, any resource carrying the `flux.oneuptime.com/no-prune: "true"` label will automatically receive the prune-disabled annotation during Kustomize rendering. This means Flux will skip these resources during garbage collection.

## Scaling Across Multiple Environments

For multi-environment setups, you can define base labels and apply patches in each environment overlay:

```text
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── pvc.yaml
├── overlays/
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       └── kustomization.yaml
```

In the base kustomization, label resources that should always be protected:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - pvc.yaml
commonLabels:
  app: my-app
```

In the production overlay, add the prune protection patch:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: PersistentVolumeClaim
    patch: |
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: not-used
        labels:
          flux.oneuptime.com/no-prune: "true"
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

This approach protects PVCs in production while allowing them to be pruned in staging.

## Using Labels for Team-Based Protection

In multi-team environments, you can assign protection labels per team to give each team control over which resources are prunable:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payments
  labels:
    team: payments
    flux.oneuptime.com/no-prune: "true"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-service
          image: payment-service:v2.1.0
          ports:
            - containerPort: 8080
```

Then scope the Kustomize patch to only that team's resources:

```yaml
patches:
  - target:
      labelSelector: "team=payments,flux.oneuptime.com/no-prune=true"
    patch: |
      apiVersion: v1
      kind: __any__
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

## Verifying Label-Based Protection

After applying your configuration, verify that the prune-disabled annotation has been applied correctly by rendering the Kustomize output locally:

```bash
kustomize build overlays/production
```

Check that the protected resources include the expected annotation:

```bash
kustomize build overlays/production | grep -A 2 "prune"
```

You can also verify in the cluster after Flux reconciles:

```bash
kubectl get pvc app-data -n production -o jsonpath='{.metadata.annotations}'
```

The output should include `kustomize.toolkit.fluxcd.io/prune: disabled`.

## Common Pitfalls

One common mistake is relying on labels alone without the corresponding Kustomize patch. Labels by themselves do not prevent Flux from pruning a resource. The patch that applies the `kustomize.toolkit.fluxcd.io/prune: disabled` annotation is what actually prevents pruning.

Another pitfall is applying the label after the resource has already been removed from Git. The label-based patch only works during the Kustomize rendering phase, so the resource must still be in Git for the patch to take effect. If you need to protect a resource that is already deployed but about to be removed from Git, manually annotate it in the cluster first:

```bash
kubectl annotate pvc app-data -n production kustomize.toolkit.fluxcd.io/prune=disabled
```

## Conclusion

Using labels to prevent pruning in Flux provides a scalable and organized approach to protecting critical resources from garbage collection. By combining well-defined labels with Kustomize patches, you can systematically protect categories of resources across multiple environments and teams. This approach keeps your Git repository as the source of truth while ensuring that stateful and critical resources are never accidentally deleted during Flux reconciliation cycles.
