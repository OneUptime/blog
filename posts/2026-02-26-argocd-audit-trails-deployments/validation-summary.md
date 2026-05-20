# Validation Summary: How to Implement Audit Trails for All Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Git and GitHub CLI
- commitlint
- Kubernetes audit logging
- jq
- Fluent Bit
- SOC 2 change-management evidence

## Sources Consulted
- Argo CD command parameters documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD notification webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd proj list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_list/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes deprecated API migration guide for Events fields: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- GitHub CLI `gh pr list` manual: https://cli.github.com/manual/gh_pr_list
- commitlint rules documentation: https://commitlint.js.org/reference/rules.html
- Local CLI help for `gh pr list`, `git log`, and installed `jq`.

## Issues Found
- The Argo CD logging section described `server.log.level` and `server.log.format` as enabling audit logging. These settings configure server log level and JSON formatting, so the text and comment were changed to describe audit-friendly server logging.
- The log export example used a Fluentd sidecar mounting `/var/log/argocd`, but Argo CD logs to stdout by default and the snippet did not define a log volume. Replaced it with a node-level Fluent Bit tail input for Argo CD server container logs.
- The Argo CD notification trigger accessed `app.status.operationState.phase` without optional chaining. Argo CD documentation notes `operationState` is optional, so the trigger now uses `app.status?.operationState.phase`.
- The notification payloads used `.app.status.sync.revision` for deployment events. Changed these to `.app.status.operationState.syncResult.revision` so the audit event records the revision from the completed operation.
- The Kubernetes audit policy's RBAC rule did not specify verbs, which means it would match every verb. Added `create`, `update`, `patch`, and `delete` so it matches the stated goal of logging RBAC changes.
- The Argo CD-specific Kubernetes section queried `kubectl get events` while describing Kubernetes audit logs, and it used deprecated Event fields such as `source.component` and `lastTimestamp`. Replaced the command with a `jq` query over Kubernetes audit log records for the Argo CD application controller service account.
- The audit report script used `argocd app history -o json`, but current Argo CD documentation lists `argocd app history -o` formats as `wide|id`. Changed the revision extraction to use `argocd app get "$APP_NAME" -o json` and `.status.history[].revision`.

## Review Notes
The remaining examples are illustrative and assume standard names such as the `argocd` namespace and `argocd-application-controller` service account. Managed Kubernetes services may expose audit logs through provider logging backends instead of `/var/log/kubernetes/audit/audit.log`.
