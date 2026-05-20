# Validation Summary: How to Use argocd app history for Audit Trails

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD CLI
- Argo CD Application custom resource
- Kubernetes YAML
- Bash
- jq
- Git

## Sources Consulted
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/

## Issues Found
- `argocd app history -o json` is not supported by the current official command reference. Changed JSON examples and report scripts to use `argocd app get -o json` and read `.status.history`.
- The history ID explanation incorrectly implied `ID 0` is the current deployment. Updated the example and explanation to reflect Argo CD's auto-incrementing history IDs, where newer retained entries have higher IDs.
- The history retention section incorrectly suggested `controller.status.processors` in `argocd-cmd-params-cm` controls revision history retention. Removed that snippet and kept the supported `spec.revisionHistoryLimit` configuration.
- Several examples assumed the first history item was the latest deployment. Updated them to use the last retained history item.
- The monitoring script used BSD/macOS `date -v-7d`. Changed it to GNU/Linux-compatible `date -u -d '7 days ago'`, which is more appropriate for typical Kubernetes administration environments.
- Claims that all history revisions are Git commit SHAs were too broad. Qualified those statements for Git-backed applications.
- The post described history as a complete audit trail for every deployment. Updated the wording to clarify that Argo CD stores retained deployment history according to `revisionHistoryLimit`.

## Review Notes
The corrected scripts focus on single-source Git-backed applications. Multi-source Argo CD applications can include `revisions` and `sources` fields in history entries, so future improvements could add multi-source-aware reporting.
