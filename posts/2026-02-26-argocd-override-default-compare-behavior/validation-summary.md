# Validation Summary: How to Override Default Compare Behavior in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- YAML configuration
- Argo CD CLI
- ApplicationSet

## Sources Consulted
- Argo CD Diff Strategies: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD CLI `argocd app diff` reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD CLI `argocd app get` reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD ApplicationSet Git Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template migration guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/

## Issues Found
- The post described server-side diff as an `argocd-cm` setting. Updated the global server-side diff snippets to use `argocd-cmd-params-cm`, which is where `controller.diff.server.side` is configured, and noted that the application controller must be restarted.
- The post showed a non-documented global `controller.diff.server.side.mutation` setting. Removed it and clarified that mutation webhook effects are enabled per Application with `IncludeMutationWebhook=true` when server-side diff is enabled.
- The Application annotation example used the same YAML key twice, which is invalid YAML. Replaced it with a single combined `argocd.argoproj.io/compare-options` annotation.
- The post listed `IgnoreExtraneous=true` as an Application annotation option. Removed it from the Application options because official compare-options documentation describes `IgnoreExtraneous` as a resource annotation.
- The resource-level annotation section said `IgnoreExtraneous` skips comparison for the resource. Corrected it to say the annotation excludes extraneous resources from the application's overall sync status and does not suppress degraded health.
- The post said Argo CD only ignores the status block for built-in resources and that every CRD needs an explicit status ignore. Updated this to match current Argo CD behavior, where resource status fields are ignored by default unless `ignoreResourceStatusField` is changed.
- The post described custom diff normalization as Lua-based. Corrected this to use Argo CD resource customizations for ignore-difference normalization; Lua is supported for other resource customizations such as health checks/actions, not for the shown diff ignore rule.
- The title metadata mentioned project-level overrides, but the post does not cover an Argo CD project-level compare override. Updated the description to system, application, and resource level.

## Review Notes
The remaining examples use documented `jsonPointers`, `jqPathExpressions`, `managedFieldsManagers`, `resource.compareoptions.ignoreAggregatedRoles`, Application `spec.ignoreDifferences`, and current `argocd app diff` / `argocd app get --hard-refresh` CLI flags. The ApplicationSet example uses the default legacy template syntax; current Argo CD docs also show Go template syntax with `goTemplate: true`, but the legacy form remains documented in the migration guide. The post does not pin an Argo CD version; the corrections were made against the current stable Argo CD documentation available on 2026-05-20.
