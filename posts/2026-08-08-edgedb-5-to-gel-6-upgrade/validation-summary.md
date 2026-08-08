# Validation Summary: Upgrade EdgeDB 5 to Gel 6 Safely

## Status
validated

## Post Type
Technical Operations / Upgrade Guide

## Technologies Covered
- EdgeDB 5
- Gel 6
- Gel CLI
- EdgeQL
- Gel schema migrations
- Gel dump and restore
- PostgreSQL 14+
- Docker and the `geldata/gel` image
- Gel extensions
- Self-hosted Gel deployments
- Former Gel Cloud service

## Sources Consulted
- [Upgrading from EdgeDB 5 to Gel](https://docs.geldata.com/resources/upgrading) - official v5-to-v6 paths, CLI upgrade bridge, PostgreSQL requirement, and remote dump/restore commands.
- [Gel v6 changelog](https://docs.geldata.com/resources/changelog/6_x) - v6 upgrade procedure, naming changes, PostgreSQL compatibility, and in-place-upgrade intent.
- [Gel project upgrade](https://docs.geldata.com/reference/using/cli/gel_project/gel_project_upgrade) - target-version syntax, project-file updates, dump/restore behavior, and self-hosting limitation.
- [Gel instance upgrade](https://docs.geldata.com/reference/using/cli/gel_instance/gel_instance_upgrade), [Gel instance revert](https://docs.geldata.com/reference/using/cli/gel_instance/gel_instance_revert), the [official project-link check](https://github.com/geldata/gel-cli/blob/7c602f7c1efeb2a34fd231519bba95a08a94a566/src/instance/upgrade.rs#L167-L190), and the [official in-place path](https://github.com/geldata/gel-cli/blob/7c602f7c1efeb2a34fd231519bba95a08a94a566/src/instance/upgrade.rs#L661-L720) - standalone local upgrade syntax, project-link enforcement, retained old data, revert scope, and self-hosting limitation.
- [Gel migration upgrade check](https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_upgrade_check), [Gel migration status](https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_status), and the [official upgrade-check implementation](https://github.com/geldata/gel-cli/blob/7c602f7c1efeb2a34fd231519bba95a08a94a566/src/migrations/upgrade_check.rs) - compatibility-check scope and live branch/repository synchronization checks.
- [Gel dump](https://docs.geldata.com/reference/using/cli/gel_dump) and [Gel restore](https://docs.geldata.com/reference/using/cli/gel_restore) - `--all`, directory format, server-configuration scope, and empty-target requirements.
- [Gel projects](https://docs.geldata.com/reference/using/projects), [Gel project info](https://docs.geldata.com/reference/using/cli/gel_project/gel_project_info), and [Gel instances](https://docs.geldata.com/learn/instances) - project links and local/remote instance identification.
- [Gel server configuration](https://docs.geldata.com/reference/running/configuration) and [Docker deployment](https://docs.geldata.com/reference/running/deployment/docker) - `EDGEDB_*` versus `GEL_*` server variables, data directories, and official image usage.
- [Gel extensions](https://docs.geldata.com/reference/datamodel/extensions) and [ext::pgvector](https://docs.geldata.com/reference/stdlib/pgvector) - extension availability, pre-restore installation, and external PostgreSQL backend requirements.
- [Gel schema migration basics](https://docs.geldata.com/resources/guides/migrations/guide) and [Gel projects reference](https://docs.geldata.com/reference/using/projects) - `.gel`, `.edgeql`, `gel.toml`, and `[instance]` naming.
- [Gel system standard library](https://docs.geldata.com/reference/stdlib/sys) - `sys::get_version_as_str()` and the v5-added `sys::get_current_branch()` query syntax.
- [Gel 6 in-place upgrade architecture](https://www.geldata.com/blog/gel-6-query-stats-and-in-place-upgrade) and [Gel v7 upgrade guidance](https://docs.geldata.com/resources/changelog/7_x) - architectural intent versus release- and deployment-specific procedures.
- [Gel joins Vercel](https://www.geldata.com/blog/gel-joins-vercel) and [Migrating from Gel Cloud to Self-Hosted Gel](https://docs.geldata.com/cloud/migrate_from) - Gel Cloud shutdown dates and the final Cloud-to-self-hosted migration path.
- [Gel deprecation policy](https://docs.geldata.com/resources/changelog/deprecation) - current and previous major-version support policy.

## Issues Found
1. **Obsolete Gel Cloud upgrade path** - The post presented the Cloud console and `gel instance upgrade` as a live production path. Gel Cloud stopped accepting new registrations or creation of new database instances on December 2, 2025, and fully shut down on January 31, 2026. Reframed both Cloud sections as historical, removed the unusable command, updated the description and conclusion, and added the official shutdown source.
2. **Insufficient local-instance identification** - `gel project info` shows the linked instance name and project path but does not by itself establish that the instance is local. Added `gel instance list`, whose `Kind` column distinguishes local instances from linked remote instances.
3. **Overbroad and misleading upgrade-check explanation** - The automatic filesystem compatibility check is part of the local `gel project upgrade` path, not every CLI-managed standalone or former Cloud upgrade. The standalone `gel migration upgrade-check` validates repository schema and migration files in a temporary target-version server; it does not inspect the selected live source branch. Limited the automatic-check claim and added `gel migration status` for checking each relevant live branch against the repository.
4. **Project configuration filename assumption** - A project upgraded while retaining deprecated `edgedb.toml` may update that file rather than create `gel.toml`. Changed the post-upgrade check to inspect `gel.toml` or deprecated `edgedb.toml`.
5. **Missing extension prerequisite before restore** - A dump that uses a standalone extension cannot be restored until that extension is installed on the target. An external PostgreSQL backend may also require the underlying PostgreSQL extension. Added both requirements to target provisioning.
6. **Imprecise `--all` scope** - Replaced the vague reference to “instance data” with the CLI reference's exact scope: all branches and server configuration.
7. **Overbroad package naming** - `@gel/*` does not name the core Python or TypeScript client; those packages are named `gel` on PyPI and npm. Clarified that `@gel/*` covers JavaScript tooling and integrations.
8. **Unsafe environment-variable rename timing** - The original wording allowed all naming changes on either side of the data upgrade, but EdgeDB 5 server variables use `EDGEDB_*` while Gel 6 uses `GEL_*`. Added an explicit cutover boundary for changing deployment variables.
9. **Overstated later in-place-upgrade availability** - Gel 6 introduced the architecture for future in-place upgrades, but the actual procedure remains source-version, target-version, and deployment specific. Removed the implication that every later upgrade is exposed as an in-place operation.
10. **Incorrect standalone-instance scope** - The post defined a standalone instance as one not linked to the current project, but `gel instance upgrade` checks all project links and aborts for an instance used by any project. Changed the definition to an instance not linked to any project and noted that it may have been created directly or unlinked.
11. **Overbroad revert claim** - Retention of the old data copy applies to the v5-to-v6 dump/restore upgrade described here, not necessarily to later in-place major upgrades. Narrowed the claim to this EdgeDB 5-to-Gel 6 path.

## Review Notes
- The CLI commands and EdgeQL queries retained in the post match the official syntax. In particular, the local project and standalone `--to-version 6` commands, v5-to-v6 local revert behavior, and the all-branch dump/restore commands are correct.
- Gel 6's PostgreSQL 14-or-later requirement, new-empty-instance remote flow, and requirement to stop writes before the final dump are correct.
- The naming claims for `gel.toml`, `[instance]`, `.gel`, `.edgeql`, `GEL_*`, and `geldata/gel` are correct after the sequencing and package-scope clarifications.
- Gel 7 is the current major release in the consulted documentation. Gel's deprecation policy retains critical-fix support for one previous major version, so this Gel 6 guide remains a deliberately version-specific path rather than current-version selection advice.
- The Gel CLI was not installed in the review environment; command behavior was checked against the official CLI reference and pinned official CLI source. All external links retained or added in the post resolved to the intended official resources.
