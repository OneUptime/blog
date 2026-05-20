# Validation Summary: How to Configure Application Pruning in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- GitOps
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD ApplicationSet Application Pruning & Resource Deletion: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Application-Deletion/
- Argo CD ApplicationSet Controlling Resource Modification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Progressive Syncs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD `argocd app create` Command Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Kubernetes `kubectl get` Command Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post incorrectly implied that omitting `resources-finalizer.argocd.argoproj.io` from the ApplicationSet template is enough to prevent cascade deletion. Argo CD documentation states that ApplicationSet adds the resource finalizer to generated Applications by default unless `spec.syncPolicy.preserveResourcesOnDeletion: true` is set. Updated the explanation and safe examples to use `preserveResourcesOnDeletion: true`.
- The "Prune Without Cascade" strategy was missing `spec.syncPolicy.preserveResourcesOnDeletion: true`, so it would still cascade-delete managed resources by default. Added the field and corrected the comment.
- The progressive deletion example used RollingSync but did not set `deletionOrder: Reverse`, which is the documented field for staged reverse deletion. Added `deletionOrder: Reverse` and clarified that progressive syncs must be enabled.
- The post described `create-only` / `create-update` too broadly as "never delete Applications." Argo CD documents that these policies prevent deletion due to generator-output changes, but do not protect Applications from ownerReference-based deletion when the ApplicationSet itself is deleted. Narrowed the wording to generator changes.
- The monitoring section used an undocumented `ResourceDeleted` event reason filter. Replaced it with a reliable `kubectl get applications.argoproj.io -n argocd --watch` command for observing Application additions and deletions.

## Review Notes
The reviewed Argo CD CLI example uses current `argocd app create` flags. The post does not pin an Argo CD version; progressive sync behavior is version-sensitive and currently documented as a beta feature that must be explicitly enabled.
