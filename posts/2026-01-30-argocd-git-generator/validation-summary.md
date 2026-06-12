# Validation Summary: How to Implement ArgoCD Git Generator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet Git directory generator
- ApplicationSet Git file generator
- ApplicationSet matrix generator
- ApplicationSet merge generator
- Kubernetes manifests and namespaces
- GitOps repository layout

## Sources Consulted
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD Merge Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD Go Template documentation and migration guide: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet pruning and resource deletion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Application-Deletion/
- Argo CD ApplicationSet resource modification policy documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD `argocd appset` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_appset/
- Argo CD `argocd appset get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_appset_get/

## Issues Found
- The deletion section incorrectly implied that `spec.syncPolicy.preserveResourcesOnDeletion: false` is what deletes generated Applications when their Git directory is removed. The ApplicationSet controller's default sync policy allows deleting generated Applications when they no longer appear in generator output; `preserveResourcesOnDeletion: false` controls whether generated Applications get the Argo CD resources finalizer, which causes Kubernetes child resources to be deleted when the Application is deleted. Updated the heading text, inline comment, and warning to reflect the documented behavior.
- The Git x Clusters section said the example deploys to all registered clusters, but the manifest includes a label selector for `environment: production`. Updated the section text and comment to say it deploys to registered clusters selected by label.

## Review Notes
- The examples use the default ApplicationSet fasttemplate syntax such as `{{path.basename}}` and `{{path[1]}}`, which is still supported. Current Argo CD documentation recommends Go templates for newer manifests; with `goTemplate: true`, these expressions would need to become forms such as `{{.path.basename}}`, `{{.path.path}}`, and `{{index .path.segments 1}}`.
- The matrix generator examples use two child generators, which matches the documented current matrix-generator restriction.
