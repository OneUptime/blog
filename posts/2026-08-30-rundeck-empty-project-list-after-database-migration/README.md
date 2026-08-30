# Why Does Rundeck Start with an Empty Project List After a Database Migration? Recovering Jobs and History

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Database Migration, Troubleshooting, Backup And Recovery

Description: Diagnose an empty Rundeck project list after migration by checking the active database, project-storage backend, schema migration, ACLs, and recoverable archives.

---

An empty Rundeck home page after a database migration does not mean the jobs were necessarily deleted. It often means the new process connected to a fresh database, selected a different schema, changed its project-storage backend, cannot read filesystem project definitions, or is hiding projects from the current user through ACL policy.

Stop and preserve evidence before creating replacement projects. Creating new objects in the destination can complicate archive imports, reuse names, and obscure whether Rundeck is reading the intended data.

## First Decide Whether the Data Is Missing or Invisible

Sign in with a known Full Admin (`admin`) account and query the project list through the API or `rd` CLI using a fresh token with the required roles. If the Full Admin sees projects but another user does not, verify that user's application-context `read` permission for those projects; then check project-context permissions for actions within them rather than restoring the database.

If every administrative view is empty, collect:

- the exact Rundeck version before and after migration;
- startup and service logs from the first destination boot;
- the effective JDBC URL, username, and environment overrides;
- database host, port, database name, and schema/search path;
- project and Key Storage provider configuration; and
- old project, data, log, and storage paths.

Do not print database passwords or storage-encryption secrets into a ticket or job log.

## Verify the Database Rundeck Actually Opened

Rundeck reads `dataSource.*` properties from `rundeck-config.properties`, but environment variables, container configuration, or deployment templates can supply different values. Inspect the effective deployment, not only a copied configuration file.

A common failure pattern is:

1. The destination starts once with its stock H2 configuration.
2. Rundeck initializes a new empty local database.
3. The UI works, which makes the migration appear successful.
4. The expected projects and history are absent because the production dump was never opened.

Check the startup log for the JDBC driver, destination host, database, authentication failures, and database-migration messages. From the database side, confirm that the Rundeck account connects to the intended restored database and schema.

Compare source and destination using database-native metadata and row counts under DBA supervision. Do not update Rundeck tables by hand. A destination containing only a newly created schema with near-zero domain data should be restored from the source backup rather than repaired through ad hoc inserts.

## Check Schema Migration Before Application Data

Rundeck manages database schema changes during supported upgrades. A dump made from one version must be restored completely, then opened by a compatible upgrade path. Look for startup migration failures, insufficient DDL permissions, unsupported version jumps, and a mistakenly disabled migration setting.

Do not respond to a migration error by pointing Rundeck at another blank database. Preserve the source snapshot, check the official upgrade notes for every skipped release boundary, and retry in a disposable clone. If rollback is required, restore both the old Rundeck binary/configuration and its pre-upgrade database snapshot.

## Identify the Project-Storage Backend

Jobs and execution records live in the Rundeck database, while the project definition and related configuration can be stored through Rundeck's project-definition Storage Facility. Current installations normally use database-backed project storage, but older or customized installations may use the filesystem or a plugin.

Relevant configuration prefixes include:

```properties
# Project definition storage
rundeck.config.storage.provider.1.type=db
rundeck.config.storage.provider.1.path=/

# Key Storage is a separate container
rundeck.storage.provider.1.type=db
rundeck.storage.provider.1.path=/keys
```

Some historical installations also use `rundeck.projectsStorageType` and `framework.projects.dir`. The official Rundeck 3.4 upgrade notes state that filesystem values for `rundeck.projectsStorageType` are no longer supported and that project configuration is migrated to database storage. Record the source setting for diagnosis, but follow the target version's upgrade path instead of copying a legacy filesystem value into a current installation.

If a pre-3.4 source used legacy filesystem-backed project definitions, restore the configured projects directory, including each project's `etc/project.properties` and permissions, and restore referenced resource files from their configured paths. If the Project Definition Storage Facility instead used a `file` provider, restore that provider's configured `baseDir` and metadata. Make sure the `rundeck` service account can traverse and read the restored paths. In a supported Rundeck cluster, project definitions and Key Storage must use the shared database; execution logs and filesystem-backed resource models need appropriate shared storage.

A mismatch can produce two confusing cases:

- the database contains jobs and executions, but no project definitions are discoverable; or
- project names appear from the filesystem, but their expected jobs and history are absent because Rundeck is connected to the wrong database.

## Recover with the Least Destructive Source

Use this order:

1. **Correct a configuration error.** Point a stopped Rundeck instance at the verified restored database and original project-storage backend.
2. **Restore the complete database.** Use the pre-migration dump or snapshot, including BLOBs, sequences, and all Rundeck schemas.
3. **Restore filesystem state.** Recover project definitions, resource files, Key Storage, and logs wherever the configured providers used local storage.
4. **Import project archives.** If the database cannot be recovered, create the destination project deliberately and import its `.rdproject.jar`, selecting the supported components required for recovery. Standard jobs carry their schedule settings, separate commercial Schedule Definitions require their own archive component, and imported executions supply history; remote execution logs remain dependent on the original log-storage backend.
5. **Load standalone job exports.** This recovers definitions but not execution history or output.

Project archives are a valuable fallback and current versions can include project configuration, ACLs, node-source definitions, and other selectable components. They cannot package the live contents of every external resource provider or guarantee access to remotely stored execution logs, so preserve those backends separately. Key Storage is also separate: database-backed keys require the corresponding database data and, if a storage converter encrypted them, the original converter configuration and secret; filesystem or external keys require their original backend and provider configuration.

When importing schedules into a recovery environment, keep execution and scheduling disabled until node sources, credentials, notifications, and target endpoints have been reviewed.

## Validate Recovery

Do not declare success when project names reappear. For each project, verify:

- expected job UUIDs, groups, options, and schedules;
- historical executions and their output;
- node sources and node filters;
- project and system ACL behavior;
- referenced jobs across projects;
- Key Storage paths without revealing key material; and
- one non-destructive test execution.

Record which source restored each class of data. That turns the incident into a concrete backup improvement: future migrations should include a tested database snapshot, project archives, standalone job exports, filesystem/plugin state, and an inventory of storage-provider settings.

## Official Documentation

- [Rundeck Database Configuration](https://docs.rundeck.com/docs/administration/configuration/database/)
- [Rundeck Storage Facility](https://docs.rundeck.com/docs/administration/configuration/storage-facility.html)
- [Rundeck Project Configuration](https://docs.rundeck.com/docs/manual/projects/configuration.html)
- [Rundeck: Backup and Recovery](https://docs.rundeck.com/docs/administration/maintenance/backup.html)
- [Rundeck: Project Archives](https://docs.rundeck.com/docs/manual/projects/project-archive.html)
- [Rundeck: Migrate from H2 to MySQL](https://docs.rundeck.com/docs/learning/howto/migrate-to-mysql.html)
- [Rundeck 3.4 Upgrade Notes: Project Storage](https://docs.rundeck.com/docs/upgrading/upgrading-to-rundeck-3.4.html#removed-support-for-file-system-based-project-definitions)

## Conclusion

An empty project list is a symptom, not a recovery plan. Verify the effective JDBC destination, schema migration, ACL view, and project-storage backend before changing data. Then restore the complete database and any filesystem or plugin-backed state, using project archives and job exports as controlled fallback paths.
