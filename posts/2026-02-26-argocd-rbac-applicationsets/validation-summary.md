# Validation Summary: How to Configure RBAC for ApplicationSets in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- ApplicationSet
- Kubernetes
- GitOps

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD ApplicationSet Application Pruning & Resource Deletion: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Application-Deletion/
- Argo CD ApplicationSet Git Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet List Generator: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet Generators overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/

## Issues Found
- The post described the ApplicationSet RBAC object format as the same `<project>/<name>` pattern used by Applications. Argo CD documents that ApplicationSet is application-specific, but the project segment represents the AppProject in which the ApplicationSet may create Applications because the ApplicationSet itself does not belong to an AppProject. Updated the wording to include that nuance.
- The post said `preserveResourcesOnDeletion` preserves generated applications when deleting an ApplicationSet. Argo CD documents that generated Application resources are still deleted through owner references, while `preserveResourcesOnDeletion` prevents the Argo CD resources finalizer from being added so deployed Kubernetes resources are preserved. Updated the wording and inline comment.
- The complete example used `applications, action, */*, allow`. Argo CD documents resource action permissions with the `action/<group>/<kind>/<action-name>` format and `action/*` for all resource actions. Updated the example to `action/*`.

## Review Notes
The ApplicationSet examples use the default fasttemplate-style placeholders such as `{{path}}` and `{{path.basename}}`, which are still supported, but current Argo CD documentation recommends Go templates for newer examples and notes that fasttemplate will be deprecated in favor of Go Template.
