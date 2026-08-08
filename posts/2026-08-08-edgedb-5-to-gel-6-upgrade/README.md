# Upgrade EdgeDB 5 to Gel 6 Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Upgrade, Migration, Dump and Restore, Operation

Description: Choose the supported EdgeDB 5 to Gel 6 path for CLI-managed local and self-hosted remote instances, with context on the retired Gel Cloud service.

---

The EdgeDB 5 to Gel 6 transition combines a product rename with a major server upgrade. Updating the CLI to `gel` does not upgrade a server. Renaming `edgedb.toml` does not convert data. Replacing a Docker tag without following a supported data path can leave an unusable instance.

The official v5 upgrade guide draws the operational boundary clearly, although its Gel Cloud option is now historical:

- Gel Cloud could perform the managed upgrade while the service operated; it fully shut down on January 31, 2026.
- A local instance created and managed by the CLI can use the project or instance upgrade command.
- A self-hosted remote EdgeDB 5 instance should move to a new Gel 6 instance through dump and restore.

Gel 6 introduced internal support intended to make later major upgrades minimum-downtime and in-place. That improvement starts with version 6; it does not retroactively make every self-hosted 5 to 6 deployment an in-place package replacement.

## First Identify the Instance Class

Do not choose a command based only on where the application source lives.

### CLI-managed local project instance

`gel project init` created a local instance and linked it to the current source directory. `gel project info` shows that relationship; `gel instance list` lets you confirm that the linked instance is local:

```bash
gel project info
gel instance list
gel query 'select sys::get_version_as_str()'
```

The CLI owns the local server installation and data-conversion workflow.

### CLI-managed standalone local instance

The CLI-managed local instance is not linked to any project. It may have been created with `gel instance create` or unlinked from a project. It appears in:

```bash
gel instance list
```

The CLI can upgrade this local managed instance with `gel instance upgrade`.

### Former Gel Cloud instance

Gel Cloud used the organization and instance name form and owned the service lifecycle. The service fully shut down on January 31, 2026, so this instance class is now historical.

### Self-hosted remote instance

Docker Compose, Kubernetes, systemd packages, or another deployment system owns the server. `gel instance link` may give it a convenient local alias, but linking does not make it CLI-managed. Both `gel project upgrade` and `gel instance upgrade` explicitly say they are not intended for self-hosted instances.

That last distinction prevents the most common wrong upgrade plan.

## Upgrade the CLI, Then Check the Schema

Install the current CLI first:

```bash
gel cli upgrade
```

If the legacy executable cannot bridge directly, the official guide suggests:

```bash
edgedb cli upgrade
gel cli upgrade
```

This changes only the operator tool. Record client and server versions separately:

```bash
gel --version
gel query 'select sys::get_version_as_str()'
```

Run the version-aware migration check before scheduling downtime:

```bash
gel migration upgrade-check --to-version 6
```

The check is also performed during a local `gel project upgrade`, but running it early exposes incompatible repository schema while there is still time to fix and test it. It checks the schema and migration files on disk, not a selected live source branch. Separately run `gel migration status` against each relevant source branch to confirm that its database and repository migration history are synchronized.

## Choose the Supported Path

### Local project-managed instance

From the linked project directory:

```bash
gel project upgrade --to-version 6
```

The CLI reference says this updates the project server version and preserves and converts data using a dump-and-restore mechanism. It is automation around the conversion, not proof that no data copy occurs.

Afterward, inspect `gel.toml` (or the deprecated `edgedb.toml`), query the server version, and test every branch the project relies on.

### Local standalone instance

Use its local name:

```bash
gel instance upgrade --to-version 6 local_instance
```

For this CLI-managed EdgeDB 5-to-Gel 6 upgrade, the CLI keeps old instance data so `gel instance revert` can restore the previous local copy. This revert command is also not intended for self-hosted instances. Test it in a disposable environment before treating it as a rollback guarantee.

### Former Gel Cloud

There is no longer a live Cloud console or managed Cloud upgrade command: Gel Cloud stopped accepting new registrations or creation of new database instances on December 2, 2025, and fully shut down on January 31, 2026. A Cloud dump retained before shutdown must instead be restored to a compatible self-hosted instance using the version-specific restore guidance.

### Self-hosted remote instance

Follow the documented new-instance flow:

1. Verify the backend requirement. Gel 6 supports PostgreSQL 14 or later; upgrade an older external backend first through its supported procedure.
2. Provision an empty Gel 6 instance using the correct package or image. Before restore, install every required standalone Gel extension; for an external PostgreSQL backend, also install any underlying PostgreSQL extension required by the schema.
3. Record the old and new DSNs without exposing them in logs.
4. Rehearse dump and restore with a recent production-sized copy.
5. Stop application writes for the final consistent cutover.
6. Dump all branches and the server configuration with the documented `--all` format.
7. Restore into the empty Gel 6 target.
8. Validate schema, migration history, roles, branches, counts, constraints, and application behavior.
9. Change the application connection and keep the old instance fenced from writes.

The core commands from the v5 guide are:

```bash
gel dump --dsn <old-dsn> --all --format dir instance.dump/

gel restore --all instance.dump/ --dsn <new-dsn>
```

`gel restore` expects an empty compatible target. Do not apply repository migrations to the new instance before restoring a dump that already contains schema and history.

## Plan the Naming Change Without Hiding the Upgrade

Gel 6 uses current names:

- `gel.toml` instead of deprecated `edgedb.toml`;
- `[instance]` instead of `[edgedb]`;
- `.gel` schema files instead of `.esdl`;
- `gel` client packages on PyPI and npm, and `@gel/*` JavaScript tooling and integration packages;
- `GEL_*` connection and server variables; and
- `geldata/gel` container images.

Migration and query scripts remain `.edgeql`, because the language is still EdgeQL.

Make client and repository naming changes before or after the data upgrade as a separately reviewable step. Keep `EDGEDB_*` server variables while EdgeDB 5 is running, and switch the deployment to `GEL_*` when starting Gel 6. The current CLI supports the deprecated project filename, so there is no need to mix every rename into the outage window.

For Docker, pin the target Gel 6 image deliberately. Never reuse an old data volume with a new major image merely because both use a similarly named data directory. The official remote path is a new empty instance and restore.

## Validate More Than Object Counts

Before cutover, compare old and new:

```edgeql
select sys::get_version_as_str();
select sys::get_current_branch();
```

For each application branch, verify:

- expected object counts by type and tenant;
- exclusivity and required-link invariants;
- computed fields and access-policy behavior;
- migration log head;
- roles and application authentication;
- generated client compatibility;
- representative reads, inserts, updates, and deletes;
- extensions used by the schema;
- readiness, metrics, logs, backup, and restore; and
- latency with production-like query plans and data volume.

Before cutover, verify that the target Gel version and runtime support every extension used by the source schema. Extension availability and deployment differ by Gel version and hosting model, so follow the current extension and target-platform documentation rather than assuming PostgreSQL-level extension compatibility.

## Define Rollback Before the Freeze

Rollback is easiest before new writes reach Gel 6. Keep the EdgeDB 5 instance intact, block writes to it during validation, and retain the original application configuration. If validation fails before traffic moves, point back to the fenced old server and reopen it only after proving no split writes occurred.

Once Gel 6 accepts writes, rolling back is a data migration, not a connection toggle. You must prevent concurrent writers and decide how new data returns to the old generation. Prefer fixing forward or restoring from a clearly defined cutover point rather than improvising bidirectional reconciliation.

## What In-place Upgrade in Gel 6 Means

Gel's version 6 announcement says the server can compartmentalize internal structures and standard-library versions, enabling later major-version switching without the historical full dump and restore. Read that as an architectural capability introduced in Gel 6, not as a blanket guarantee that every later upgrade is in-place.

It does not authorize:

- running `gel project upgrade` against a self-hosted production DSN;
- replacing EdgeDB 5 packages in place and pointing at the same data directory;
- skipping a backup or compatibility check; or
- assuming future release procedures without reading their documentation.

Always follow the source version, target version, and deployment-type instructions for the actual upgrade being performed.

## Official Documentation

- [Upgrading from EdgeDB 5 to Gel](https://docs.geldata.com/resources/upgrading)
- [Gel project upgrade](https://docs.geldata.com/reference/using/cli/gel_project/gel_project_upgrade)
- [Gel instance upgrade](https://docs.geldata.com/reference/using/cli/gel_instance/gel_instance_upgrade)
- [Gel migration upgrade check](https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_upgrade_check)
- [Gel migration status](https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_status)
- [Gel dump](https://docs.geldata.com/reference/using/cli/gel_dump)
- [Gel restore](https://docs.geldata.com/reference/using/cli/gel_restore)
- [Gel extensions](https://docs.geldata.com/reference/datamodel/extensions)
- [Gel 6 in-place upgrade architecture](https://www.geldata.com/blog/gel-6-query-stats-and-in-place-upgrade)
- [Gel Cloud shutdown announcement](https://www.geldata.com/blog/gel-joins-vercel)

## Conclusion

Use CLI upgrade commands only where the CLI owns the local instance; Gel Cloud's former managed path is no longer available. For a self-hosted remote EdgeDB 5 server, provision an empty Gel 6 target and use the documented all-branch dump-and-restore cutover. Gel 6 improves the foundation for later major upgrades, but the safe 5 to 6 plan still depends on deployment ownership, a tested data copy, and a fenced rollback boundary.
