# Validation Summary: How to Handle Failed Database Migrations in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD sync phases, hooks, sync waves, CLI, and notifications
- Kubernetes Jobs and kubectl commands
- PostgreSQL schema migrations and session timeouts
- golang-migrate CLI
- GitOps deployment workflows

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Notifications Triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Kubernetes Job controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl port-forward` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- PostgreSQL client connection defaults and timeout settings: https://www.postgresql.org/docs/current/runtime-config-client.html
- golang-migrate CLI documentation: https://github.com/golang-migrate/migrate/tree/master/cmd/migrate

## Issues Found
- The migration command examples used `./migrate` without explicit `-path` and `-database` flags. Updated the examples to use `migrate -path ./migrations -database "$DATABASE_URL" ...`, matching golang-migrate CLI usage.
- The SyncFail hook force-cleaned the dirty migration version. For golang-migrate, `force V` sets the version without running the migration, so forcing the failed version can skip a partially applied migration. Updated the hook to detect and report dirty state instead of marking it clean automatically.
- The dirty migration recovery steps did not distinguish between completing a failed migration manually and rolling it back. Updated the manual recovery commands to force version 42 only after manual completion, or force version 41 after rolling back partial changes.
- The manual recovery snippet mixed shell commands and raw SQL in a `bash` block. Updated SQL actions to run through `psql -c` so the commands are executable as shown.
- The recovery hook used `grep -oP`, which depends on GNU grep PCRE support and is not available in many minimal container images. Replaced it with `grep -Eo`.
- The Argo CD notifications trigger accessed `app.status.operationState.phase` without optional chaining. Current Argo CD notification docs recommend `app.status?.operationState.phase` because `operationState` can be absent during trigger evaluation.

## Review Notes
The Argo CD PreSync, SyncFail, sync-wave, `argocd app get --show-operation`, and automated sync examples align with current Argo CD documentation. The Kubernetes Job `activeDeadlineSeconds`, `kubectl logs` label selector, and service port-forward examples are consistent with Kubernetes documentation. PostgreSQL `lock_timeout` and `statement_timeout` usage is technically valid.
