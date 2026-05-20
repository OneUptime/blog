# Validation Summary: How to Roll Back Database Migrations with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Jobs
- PostgreSQL
- SQL schema migrations
- golang-migrate CLI

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- golang-migrate getting started guide: https://github.com/golang-migrate/migrate/blob/master/GETTING_STARTED.md
- `migrate/migrate:latest` CLI help output
- PostgreSQL 16 `pg_restore` documentation: https://www.postgresql.org/docs/16/app-pgrestore.html
- PostgreSQL 16 `dropdb` and `pg_restore` CLI help output from the official `postgres:16` container image

## Issues Found
- The restore example searched for `/backups/pre-migration-*.sql` but used `pg_restore`. PostgreSQL documents `pg_restore` as restoring archive files created by `pg_dump` in non-plain-text formats, so the example now searches for `/backups/pre-migration-*.dump`.
- The automated down migration example used the full first line of `migrate version` output in a numeric shell comparison. This can fail if the output includes non-version text, so the example now extracts the first field and exits if it cannot determine a numeric version.
- The expand-contract migration snippet was marked as `yaml` even though it contains SQL migration content. The code fence is now marked as `sql`.

## Review Notes
The Argo CD hook annotations, PreSync behavior, hook deletion policy, sync-wave annotation, Kubernetes Job structure, `argocd app rollback my-app` command form, PostgreSQL `dropdb` flags, and `pg_restore` flags were consistent with the sources consulted. The backup restore example assumes the pre-migration backup was created in a `pg_dump` archive format such as custom, directory, or tar.
