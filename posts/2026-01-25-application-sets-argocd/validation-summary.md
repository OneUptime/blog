# Validation Summary: How to Use Application Sets in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ApplicationSet controller
- Kubernetes custom resources
- GitOps
- Argo CD CLI
- Helm configuration in Argo CD Applications

## Sources Consulted
- Argo CD ApplicationSet introduction: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- Argo CD v2.2 to v2.3 upgrade notes: https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.2-2.3/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD List generator docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD Git generator docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD Cluster generator docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Matrix generator docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD Merge generator docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Merge/
- Argo CD Template and templatePatch docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet deletion and preserveResourcesOnDeletion docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD Sync Options docs: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD argocd cluster set command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_set/

## Issues Found
- The original Template Overrides example put `frontend` and `database` in one list generator, then set a generator-level template override. That override would apply to every Application from that generator, not only the `database` Application. Replaced it with a `templatePatch` example using `goTemplate: true`, which is the documented mechanism for conditionally setting fields such as automated sync policy from generator parameters.
- The original "Set Resource Limits" example used `argocd.argoproj.io/sync-options: Prune=false` on the generated Application metadata and described it as preventing runaway syncs. That annotation is documented for sync options, especially no-prune behavior, not resource limits. Changed the section to "Control Pruning" and used application-level `spec.syncPolicy.syncOptions`.

## Review Notes
The remaining examples use the default fasttemplate-style syntax, which is still supported, but Argo CD documentation notes that Go Template is the more capable templating option and that fasttemplate is expected to be deprecated in favor of Go Template. Future updates could migrate all examples to `goTemplate: true` and dot-prefixed parameter references for consistency with current documentation examples.
