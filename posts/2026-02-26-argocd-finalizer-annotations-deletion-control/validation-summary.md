# Validation Summary: How to Use Finalizer Annotations for Deletion Control in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Kubernetes finalizers
- Kubernetes deletion propagation
- Argo CD CLI
- kubectl
- YAML manifests

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD ApplicationSet Application Pruning & Resource Deletion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Application-Deletion/
- Argo CD Pull Request Generator documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/applicationset/Generators-Pull-Request/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/

## Issues Found
- The post repeatedly called the Argo CD deletion finalizer a "finalizer annotation." Kubernetes finalizers are configured in `metadata.finalizers`, not in `metadata.annotations`, so the title, description, introduction, and summary were updated to use "finalizer" terminology.
- The CLI section described `--cascade=false` as ignoring the finalizer. Argo CD documentation describes non-cascading deletion as removing the finalizer before deleting only the Application, so the wording was corrected.
- The CLI section labeled `--propagation-policy` examples as "force delete." The flag selects foreground or background propagation for cascaded deletion; it is not a force-delete flag, so the wording was corrected.
- The production Application example put `argocd.argoproj.io/sync-options: Delete=false` in Application metadata while also relying on no finalizer. Argo CD documents Application-level delete sync options under `spec.syncPolicy.syncOptions`, while the metadata annotation form is resource-specific. Because the example's deletion behavior comes from omitting the finalizer, the misleading annotation was removed.

## Review Notes
The Argo CD and Kubernetes deletion behavior described by the corrected post matches the current official documentation: `resources-finalizer.argocd.argoproj.io` enables foreground cascading deletion, `resources-finalizer.argocd.argoproj.io/background` enables background cascading deletion, and omitting or removing the finalizer preserves managed resources when the Application is deleted.
