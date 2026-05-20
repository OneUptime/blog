# Validation Summary: How to Implement Change Auditing with GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes audit logging
- Argo CD Notifications
- Git and GPG-signed commits
- Kubernetes CronJobs

## Sources Consulted
- Argo CD Git GnuPG signature verification and source integrity documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD source integrity overview: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_get/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/auto_sync/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/

## Issues Found
- The AppProject example used the legacy `.spec.signatureKeys` field. Updated it to the current `.spec.sourceIntegrity.git.policies` format with a GPG policy for the configured repository.
- The CLI example used `argocd app get --show-events`, which is not a current documented flag. Replaced it with `argocd app get --show-operation`.
- The post claimed `argocd app history --output json` could be piped to `jq`, but the documented output values are `wide` and `id`. Replaced the command with `argocd app history production-backend`.
- The Kubernetes audit policy logged Secrets at `RequestResponse`, which would include request and response bodies. Changed Secret audit logging to `Metadata`.
- The notification trigger named `on-sync-status-unknown` was used for `OutOfSync`. Added the correct `Unknown` condition under that trigger and added a separate `on-out-of-sync` trigger for drift detection.
- The sync notification trigger expressions accessed optional `operationState` without optional chaining. Updated those conditions to use `app.status?.operationState.phase`.
- The post described Git history as an immutable record and said every cluster change starts as Git. Adjusted the wording to avoid overstating Git immutability and to distinguish intended GitOps changes from manual cluster changes.
- The post stated any self-heal event means someone made a manual change. Updated this to say self-heal indicates drift from Git and should be investigated, since drift can also come from controllers or defaults.

## Review Notes
All YAML snippets were parsed successfully after the corrections. The examples remain intentionally illustrative and assume the referenced Argo CD GPG keys have already been imported into Argo CD's keyring.
