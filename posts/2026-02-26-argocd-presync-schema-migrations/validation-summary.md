# Validation Summary: How to Run Schema Migrations as PreSync Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks, sync phases, hook deletion policies, and sync waves
- Kubernetes Jobs, init containers, ConfigMaps, Secrets, volumes, resource requests/limits, affinity, and TTL cleanup
- PostgreSQL client utilities (`pg_isready`, `pg_dump`) and PostgreSQL migration SQL
- golang-migrate CLI and migration file naming
- Redgate Flyway CLI
- Istio sidecar injection labels

## Sources Consulted
- Argo CD Sync Phases and Waves documentation — https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes Jobs documentation — https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished documentation — https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes command and arguments documentation — https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes node affinity documentation — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Istio sidecar injection documentation — https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- golang-migrate CLI documentation — https://pkg.go.dev/github.com/golang-migrate/migrate/v4/cmd/migrate
- golang-migrate README and migration file naming — https://github.com/golang-migrate/migrate
- Redgate Flyway command-line documentation — https://documentation.red-gate.com/flyway/reference/usage/command-line
- Redgate Flyway migrate command documentation — https://documentation.red-gate.com/flyway/reference/commands/migrate
- Redgate Flyway locations setting documentation — https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-locations-setting
- Redgate Flyway outOfOrder setting documentation — https://documentation.red-gate.com/fd/reference/configuration/flyway-namespace/flyway-out-of-order-setting
- PostgreSQL 16 `pg_isready` documentation — https://www.postgresql.org/docs/16/app-pg-isready.html
- PostgreSQL 17 `pg_dump` documentation — https://www.postgresql.org/docs/17/app-pgdump.html

## Issues Found
- The ConfigMap migration filenames used `004_add_index_on_email.sql` and `004_add_index_on_email_down.sql`, but the later golang-migrate example reads from that mounted directory and golang-migrate expects paired `.up.sql` and `.down.sql` migration files. Changed them to `004_add_index_on_email.up.sql` and `004_add_index_on_email.down.sql`.
- The golang-migrate shell snippet did not enable `set -e`, so a failed `migrate up` could be masked if a later command exited successfully. Added `set -e` so the Job fails when migration application fails.
- The backup hook used `pg_dump --format=custom` while naming the output file with a `.sql` extension. Custom-format dumps are archive files intended for `pg_restore`, not plain SQL scripts. Changed the filename extension to `.dump`.

## Review Notes
- The Argo CD hook phases, `argocd.argoproj.io/hook`, `argocd.argoproj.io/hook-delete-policy`, and negative sync wave examples are consistent with current Argo CD documentation.
- The Kubernetes Job fields shown (`activeDeadlineSeconds`, `backoffLimit`, `ttlSecondsAfterFinished`, init containers, ConfigMap and Secret references, volumes, resource requests/limits, and preferred node affinity) are valid.
- The Flyway CLI example uses valid command-line parameter forms for Flyway 10, though newer Flyway releases are available.
- `CREATE INDEX CONCURRENTLY` is appropriate for reducing write blocking on PostgreSQL, but migration tools may need transaction-per-migration disabled for that specific statement because PostgreSQL does not allow it inside a transaction block.
