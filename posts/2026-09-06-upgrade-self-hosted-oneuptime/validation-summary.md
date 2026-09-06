# Validation Summary: How to Upgrade Self-Hosted OneUptime Without Losing Data

## Status

validated

## Post Type

Technical guide / upgrade runbook.

## Technologies Covered

- OneUptime 12.0.33 and major-version upgrades
- Docker Compose and container image tags
- Helm and Kubernetes
- PostgreSQL and ClickHouse backups and migrations
- Git, npm, shell commands, and environment configuration
- Object storage and disaster recovery

## Sources Consulted

- [OneUptime upgrade guide](https://oneuptime.com/docs/en/installation/upgrading)
- [OneUptime Docker Compose installation](https://oneuptime.com/docs/en/installation/docker-compose)
- [OneUptime official latest-release API](https://api.github.com/repos/OneUptime/oneuptime/releases/latest) — reported 12.0.33, published September 4, 2026.
- [OneUptime 12.0.33 npm scripts](https://github.com/OneUptime/oneuptime/blob/12.0.33/package.json)
- [OneUptime 12.0.33 configuration script](https://github.com/OneUptime/oneuptime/blob/12.0.33/configure.sh)
- [OneUptime environment template](https://github.com/OneUptime/oneuptime/blob/12.0.33/config.example.env)
- [OneUptime environment merge script](https://github.com/OneUptime/oneuptime/blob/12.0.33/Scripts/Install/MergeEnvTemplate.js)
- [OneUptime Compose definition](https://github.com/OneUptime/oneuptime/blob/release/docker-compose.yml)
- [OneUptime Helm repository](https://helm-chart.oneuptime.com/)
- [OneUptime v12 chart schema](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/values.schema.json)
- [Helm upgrade](https://helm.sh/docs/helm/helm_upgrade/), [template](https://helm.sh/docs/helm/helm_template/), [repository update](https://helm.sh/docs/helm/helm_repo_update/), [get metadata](https://helm.sh/docs/helm/helm_get_metadata/), and [get values](https://helm.sh/docs/helm/helm_get_values/)
- [Docker Compose global options](https://docs.docker.com/reference/cli/docker/compose/), [images](https://docs.docker.com/reference/cli/docker/compose/images/), [ps](https://docs.docker.com/reference/cli/docker/compose/ps/), [logs](https://docs.docker.com/reference/cli/docker/compose/logs/), and [up](https://docs.docker.com/reference/cli/docker/compose/up/)
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Git rev-parse](https://git-scm.com/docs/git-rev-parse), [checkout](https://git-scm.com/docs/git-checkout), and [pull](https://git-scm.com/docs/git-pull)
- [PostgreSQL SQL dumps and restoration](https://www.postgresql.org/docs/current/backup-dump.html)
- [ClickHouse backup and restore](https://clickhouse.com/docs/concepts/features/backup-restore/overview)

## Issues Found

1. **Incomplete telemetry-preservation instructions for the stated 10 → 11 → 12 path.** Added the required reference to pre-upgrade table renaming and post-upgrade copying. A backup alone does not keep historical telemetry available in the upgraded application when old tables are dropped.
2. **Git pinning did not pin the actual deployment.** The configuration script performs another pull, which can advance a branch or fail on a detached checkout. Compose uses `APP_TAG`, whose default is `release`. Added a manual pinned path using the environment merge script, an explicit image version, and Compose pull/up commands. External Runner guidance now uses the example version as well.
3. **Runner key setup could happen too late.** The update command starts containers automatically. Clarified that the key must be set in `config.env` before invoking that command, and inserted a reminder directly before it in the example.
4. **Rendered Helm Secrets were written to a predictable temporary path without protection.** Added a restrictive umask, changed the output to a working-directory file, and explicitly covered rendered manifests in secret-handling guidance.
5. **Chart version placeholder and image overrides were implicit.** Clarified that readers must replace the placeholder with a reviewed chart version and check application image versions and overrides before deploying.

## Review Notes

- Confirmed the documented major-version sequence, Runner renames, retained runbook-agent identifiers and keys, orphan removal, and backup-based v12-to-v11 rollback. The v12 chart schema disallows unknown top-level keys and contains `runner`, not `aiAgent`.
- Release 12.0.33 was current in the official latest-release response during this review. Moving branches and image tags can change later.
- The official major-version notes also cover identity licensing changes and direct API-key permission changes. Operators must review these notes for their deployment, as the post already requires.
- Helm commands assume the repository is registered as `oneuptime` and the existing release and namespace are both named `oneuptime`. The production values file must exist and be adapted to the target chart. Local rendering checks templates and values; it does not prove cluster compatibility or successful migration.
- Backup restoration, cross-database consistency, representative queries, and data-aware rollback are sound operational guidance. Actual consistency depends on controlling writers and using compatible backup/restore tooling.
- Validated shell syntax for all fenced command examples and checked JSON structure and required summary headings. This was a documentation and source review; no live deployment upgrade, chart rendering with production values, database migration, or backup restoration was executed.
