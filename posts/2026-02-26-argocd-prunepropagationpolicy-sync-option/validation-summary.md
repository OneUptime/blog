# Validation Summary: How to Use the 'PrunePropagationPolicy' Sync Option in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Kubernetes garbage collection and deletion propagation
- Argo CD sync options and CLI

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Kubernetes Garbage Collection documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes API reference for `DeleteOptions.propagationPolicy`: https://kubernetes.io/docs/reference/generated/kubernetes-api/

## Issues Found
- The CLI examples used `argocd app sync my-app --sync-option ...`, but the current `argocd app sync` command reference does not include a `--sync-option` flag. Updated the examples to use `argocd app set my-app --sync-option ...`, which is the documented CLI command for setting Application sync options.
- The post claimed `PrunePropagationPolicy` could be set per resource with `argocd.argoproj.io/sync-options`. Current Argo CD documentation documents this option at the Application sync option level, and the controller applies it as an operation-level prune setting. Removed the unsupported per-resource annotation section.
- The Kubernetes orphaning explanation implied all dependents become standalone resources. Kubernetes orphan propagation removes the owner reference from direct dependents; lower-level objects may still be owned by those direct dependents. Updated the explanation and practical example to distinguish ReplicaSets from Pods.
- The migration example implied a StatefulSet could take over Pods from a Deployment. That is misleading because Deployment-created Pods are owned through ReplicaSets and do not become StatefulSet-managed Pods. Reworded the example to describe keeping the old ReplicaSets and Pods running temporarily while introducing a replacement workload.

## Review Notes
The remaining Application manifests and sync option values are consistent with the current Argo CD sync options documentation. The Kubernetes propagation policy descriptions now align with current Kubernetes garbage collection behavior.
