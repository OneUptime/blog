# Validation Summary: How to Manage Multi-Cluster Rook-Ceph with GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- ArgoCD (GitOps continuous delivery tool)
- ArgoCD ApplicationSets (multi-cluster application generation)
- Kustomize (Kubernetes configuration management)
- Kubernetes

## Sources Consulted
- ArgoCD ApplicationSet documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- ArgoCD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- ArgoCD CLI reference (`argocd cluster add`, `argocd app list`, `argocd app get`): https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/
- ArgoCD Notifications documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Kustomize documentation (patches, resources, configMapGenerator): https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- Rook-Ceph CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
1. **Deprecated `bases` field in kustomization.yaml**: The `bases` field was used in the `clusters/us-east-prod/kustomization.yaml` example. This field has been deprecated since Kustomize v2.1.0 and replaced by `resources`, which serves the same purpose. Changed `bases:` to `resources:` to reflect current best practices and avoid deprecation warnings.

## Review Notes
- The ApplicationSet uses `apiVersion: argoproj.io/v1alpha1`, which is correct — ApplicationSets are part of ArgoCD and use this API group.
- The clusters generator correctly uses `{{name}}` and `{{server}}` template parameters, which are the built-in parameters provided by the ArgoCD cluster generator.
- The JSON Patch format in `cluster-patch.yaml` (using `op`, `path`, `value`) is correctly paired with the `patches` field and `target` selector in the kustomization.yaml. Kustomize auto-detects JSON Patch vs Strategic Merge Patch based on content.
- The `argocd app get --show-operation` flag is valid for inspecting sync operation details.
- The `ServerSideApply=true` sync option is a good practice for CRD-heavy deployments like Rook-Ceph, as it avoids annotation size limits.
- The notification annotation `notifications.argoproj.io/subscribe.on-sync-failed.slack` follows the correct ArgoCD Notifications format.
