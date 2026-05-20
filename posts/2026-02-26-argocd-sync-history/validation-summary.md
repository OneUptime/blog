# Validation Summary: How to Check Application Sync History in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD CLI
- JSON and jq
- YAML Application manifests

## Sources Consulted
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Application API types: https://raw.githubusercontent.com/argoproj/argo-cd/master/pkg/apis/application/v1alpha1/types.go

## Issues Found
- The post described retained sync history as storing operation status, duration, error messages, sync options, and per-resource results for every entry. Argo CD's `status.history` stores revision history fields such as revision, deployed timestamps, ID, source details, and initiator; operation status and per-resource results are in `status.operationState`. Updated the affected sections to separate retained revision history from current or most recent operation state.
- The UI example showed `Status` and `Duration` as fields in a history entry. Removed those fields from the example because they are operation state details rather than retained revision history fields.
- The post said `argocd app get --show-params` shows resources that were part of the last sync. That flag shows application parameters and overrides. Added a JSON query against `.status.operationState.syncResult.resources` for the most recent operation resources.
- The post treated sync history entries as having status values. Updated the section to describe operation phases instead, and added the `Terminating` phase.
- The rollback guidance said auto-sync would immediately undo a rollback. Argo CD documentation states rollback cannot be performed while automated sync is enabled. Updated the wording to require disabling automated sync before rollback.
- The audit section said sync history proves who approved a deployment and whether it succeeded. Changed this to who initiated it and which source was used, because approval is not a sync-history field and retained history only records successful deployed revisions.
- The correlation example used `argocd app history my-app -o json`, but the current stable command reference only supports `wide` and `id` output for `argocd app history`. Updated it to use `argocd app get my-app -o json | jq '.status.history[]...'`.
- The retention section used an invalid `argocd-cm` key, `resource.status.maxHistory`. Argo CD controls history retention with `spec.revisionHistoryLimit` on the Application. Replaced the ConfigMap snippet with an Application spec snippet.

## Review Notes
The Argo CD CLI was not installed in the local environment, so CLI verification was performed against official Argo CD command documentation rather than local `--help` output.
