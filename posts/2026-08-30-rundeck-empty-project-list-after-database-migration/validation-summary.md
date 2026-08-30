# Validation Summary: Recover Rundeck's Project List After a Database Migration

## Status
validated

## Post Type
Troubleshooting and database-migration recovery guide

## Technologies Covered
- Rundeck / PagerDuty Runbook Automation
- JDBC data-source configuration
- H2 and external relational databases
- Rundeck database schema migration
- Rundeck Project Definition Storage Facility
- Rundeck Key Storage and storage converters
- Rundeck ACL policies
- Rundeck project archives and standalone job exports
- Rundeck clusters, resource models, and execution-log storage
- Rundeck API and `rd` CLI

## Sources Consulted
- [Rundeck Database Configuration](https://docs.rundeck.com/docs/administration/configuration/database/) - verified `dataSource.*` configuration, the default embedded H2 database, and schema-creation behavior.
- [Rundeck Docker Configuration Reference](https://docs.rundeck.com/docs/administration/configuration/docker.html) - verified database environment-variable overrides and the migration-on-start setting.
- [Rundeck Upgrading Overview](https://docs.rundeck.com/docs/upgrading/) - verified the requirement to review and follow interim upgrade instructions when skipping releases.
- [Rundeck 3.4 Upgrade Notes](https://docs.rundeck.com/docs/upgrading/upgrading-to-rundeck-3.4.html#removed-support-for-file-system-based-project-definitions) - verified the database-migration plugin behavior and removal of legacy filesystem-based project definitions.
- [Rundeck Storage Plugin Configuration](https://docs.rundeck.com/docs/administration/configuration/plugins/configuring.html#storage-plugins) - verified the independent Key Storage and Project Definition Storage containers, their configuration prefixes, `db`/`file` providers, paths, and `baseDir` behavior.
- [Rundeck Project Configuration](https://docs.rundeck.com/docs/manual/projects/configuration.html) - verified database-backed project configuration since Rundeck 3.4 and the legacy `project.properties` filesystem layout.
- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/) - verified database, filesystem, and external storage backends and that encryption through a Storage Converter is optional.
- [Rundeck Cluster Overview](https://docs.rundeck.com/docs/administration/cluster/) - verified the shared-database requirement for project and Key Storage data and shared access requirements for logs and resource models.
- [Rundeck Built-In Users/Roles](https://docs.rundeck.com/docs/administration/security/default-users.html) - verified the distinction between Full Admin and Ops Admin roles.
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html) - verified that application-context project `read` controls project-list visibility while project-context rules control actions within projects.
- [Rundeck API Reference](https://docs.rundeck.com/docs/api/) - verified project listing, project archive import/export options, execution import, node-source import, and commercial Schedule Definitions components.
- [Rundeck Project Archive](https://docs.rundeck.com/docs/manual/projects/project-archive.html) - verified archive contents, execution/history import, ACL and configuration import, and the remote execution-log caveat.
- [Rundeck Backup and Recovery](https://docs.rundeck.com/docs/administration/maintenance/backup.html) - verified backup coverage for database data, execution logs, Key Storage, job definitions, and project archives.
- [Rundeck Job Definition Format](https://docs.rundeck.com/docs/manual/document-format-reference/job-json-v44.html#schedule) - verified that standard job definitions carry schedule settings.
- [Rundeck H2-to-MySQL Migration Guide](https://docs.rundeck.com/docs/learning/howto/migrate-to-mysql.html) - verified the documented archive-based migration path and the need to preserve older filesystem project state.

## Issues Found
1. **Ambiguous administrator and ACL guidance** - The post referred to a generic "system administrator," but Rundeck's `ops_admin` role deliberately has no project access. It also grouped application and project ACL contexts together even though only application-context project `read` controls whether a project appears in the list. Changed the diagnostic account to Full Admin (`admin`), required an appropriately scoped token, and clarified the two ACL contexts.
2. **Conflated legacy project directories with a Storage Facility `file` provider** - Legacy pre-3.4 filesystem project definitions live under the configured projects directory, while a configured Project Definition Storage `file` provider stores content and metadata under its own `baseDir`. Updated the recovery paragraph to distinguish these mechanisms and identify the correct state to restore.
3. **Overly permissive cluster-storage guidance** - The post suggested shared filesystem project definitions as an alternative to database-backed definitions in a cluster. Rundeck's dedicated cluster requirements specify that project and Key Storage data must be in the shared database. Replaced that statement and separately identified execution logs and filesystem-backed resource models as shared-storage concerns.
4. **Unconditional encryption-secret requirement** - Database-backed Key Storage needs its corresponding database records, but an encryption-converter secret is required only when a Storage Converter actually encrypted the keys. Made the converter configuration and secret requirement conditional and added the need to retain external provider configuration.
5. **Incorrect documentation fragment** - The Rundeck 3.4 Project Storage link targeted the Enterprise ACL Storage section. Changed its fragment to the official "Removed Support for File System Based project definitions" section.

## Review Notes
- The two Storage Facility configuration snippets use the documented prefixes and valid `db` provider paths.
- The post now distinguishes the legacy `rundeck.projectsStorageType=file|filesystem` mode removed in Rundeck 3.4 from the separately configurable Project Definition Storage Facility provider.
- The statements about standard job schedules, commercial Schedule Definitions, imported execution history, remote execution logs, and standalone job exports are accurate.
- Rundeck project archives are ZIP archives; the `.rdproject.jar` filename used by the post remains documented for GUI-generated archives.
