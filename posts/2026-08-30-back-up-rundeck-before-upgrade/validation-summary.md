# Validation Summary: How to Back Up Rundeck Projects, Job Definitions, Key Storage, and Execution History Before an Upgrade

## Status
validated

## Post Type
Operational backup, recovery, and upgrade-preparation guide

## Technologies Covered
- Rundeck / PagerDuty Runbook Automation
- Rundeck `rd` CLI
- Rundeck Project Archives and job-definition formats
- Rundeck Storage Facility and Key Storage
- Execution log storage plugins and local log storage
- Rundeck ACL policy storage
- PostgreSQL `pg_dump`, `pg_restore`, and database recovery
- MySQL, MariaDB, Microsoft SQL Server, and Oracle (mentioned as alternative database backends)
- Docker and Kubernetes persistent storage

## Sources Consulted
- [Rundeck Backup and Recovery](https://docs.rundeck.com/docs/administration/maintenance/backup.html)
- [Rundeck Project Archive](https://docs.rundeck.com/docs/manual/projects/project-archive.html) and [Project Archive API](https://docs.rundeck.com/docs/api/#project-archive-export)
- [Rundeck CLI Commands](https://docs.rundeck.com/docs/rd-cli/commands.html), [JOB-YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html), [Project Schedules](https://docs.rundeck.com/docs/manual/schedules/project-schedules.html), and [RD CLI 2.2.0 release](https://github.com/rundeck/rundeck-cli/releases/tag/v2.2.0)
- [Rundeck Storage Facility](https://docs.rundeck.com/docs/administration/configuration/storage-facility.html), [Storage Plugin Configuration](https://docs.rundeck.com/docs/administration/configuration/plugins/configuring.html), and [Key Storage](https://docs.rundeck.com/docs/manual/key-storage/)
- [Rundeck Configuration File Reference](https://docs.rundeck.com/docs/administration/configuration/config-file-reference.html) and [System Properties Configuration](https://docs.rundeck.com/docs/administration/configuration/system-properties.html)
- [Runbook Automation Config Property Encryption](https://docs.rundeck.com/docs/administration/configuration/encryptable-properties.html)
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html) and [ACL APIs](https://docs.rundeck.com/docs/api/#acls)
- [Rundeck Logging Plugins](https://docs.rundeck.com/docs/developer/logging-plugins.html) and [Logstore](https://docs.rundeck.com/docs/administration/cluster/logstore/)
- [Rundeck Database Configuration](https://docs.rundeck.com/docs/administration/configuration/database/), [General Upgrade Guide](https://docs.rundeck.com/docs/upgrading/upgrading.html), and [Rundeck 6.0 Upgrade Notes](https://docs.rundeck.com/docs/upgrading/upgrading-to-6.0.html)
- Rundeck source for the current packaged [rundeck-config.properties](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/packaging/lib/common/etc/rundeck/rundeck-config.properties), [framework.properties](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/packaging/lib/common/etc/rundeck/framework.properties), [RPM/DEB profile](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/packaging/lib/common/etc/rundeck/profile), and [AES-GCM converter properties](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/plugins/aes-gcm-encryption-plugin/src/main/java/org/rundeck/plugin/encryption/ModernEncryptionConverterPlugin.java)
- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html), [`pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html), and [`pg_dumpall`](https://www.postgresql.org/docs/current/app-pg-dumpall.html)
- [Rundeck Docker Installation](https://docs.rundeck.com/docs/administration/install/docker.html) and [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)

## Issues Found
1. **The inventory command could expose secrets.** Its broad `rundeck.storage` and `rundeck.config.storage` alternatives also matched converter passwords and arbitrary provider credentials. Replaced them with exact, allowlisted property patterns that retain provider paths, safe legacy converter metadata, and password source names without printing password values. Exact property-name boundaries were added so similarly prefixed secret fields cannot match accidentally.
2. **The inventory omitted recovery-critical storage and log selectors.** Added `framework.var.dir`, storage `removePathPrefix`, the execution-log provider selectors, safe legacy converter fields, and support for indented Java-properties entries. Added explicit guidance to inventory provider-specific non-secret endpoints, buckets, mounts, and object prefixes separately.
3. **Launcher and packaged-service configuration coverage was incomplete.** Launcher installs split configuration between `$RDECK_BASE/etc` and `$RDECK_BASE/server/config`; both are now listed. The filesystem section now also covers `/etc/default/rundeckd` or `/etc/sysconfig/rundeckd` and systemd drop-ins, which can contain path/JVM overrides and encryption-secret values or references.
4. **The ACL wording was too edition-specific.** System and Project ACL policies managed through the APIs are database-stored even without the Enterprise optimized ACL layer. The post now identifies API-managed ACLs and the optional Enterprise layer as database-dependent while retaining the separate filesystem ACL warning.
5. **Local and remote execution-log storage are not mutually exclusive.** Changed the state table from “or” to “and/or” because an ExecutionFileStorage plugin commonly uploads files that were first written locally.
6. **The final recovery point did not explicitly drain work across storage backends.** Added passive execution mode, completion of running executions, and completion of queued log-storage uploads before taking the coordinated database/filesystem recovery set.
7. **The PostgreSQL example needed a restore-scope caveat.** The `pg_dump` and `pg_restore --list` commands are correct, but a per-database dump excludes cluster-wide roles and tablespace definitions. Added guidance to capture those separately or document recreation of the Rundeck database role, ownership, and grants.
8. **Configuration-property encryption secrets were not covered.** Commercial Runbook Automation can store `ENC(...)` values in `rundeck-config.properties`; these require their separate master password and possibly legacy decryption settings. Added them to the recovery-secret and manifest guidance.
9. **The restore rehearsal could start schedules before they were checked.** Added `rundeck.executionMode=passive` and production-blocking network controls before the restored instance's first startup, then required project/job schedules to be disabled before active execution mode is deliberately restored.

## Review Notes
- `rd projects list`, `rd jobs list -p production -f backup/production-jobs.yaml -F yaml`, and `rd projects archives export -p production --file backup/production.rdproject.jar` are valid current CLI commands.
- The archive coverage claims are accurate: core archives can contain jobs, executions/history, configuration, README/MOTD, ACLs, and other selected components. Standard job definitions include their schedules, while commercial Schedule Definitions are a separate archive component.
- The warning about remotely stored execution logs is correct: imported execution records can still depend on objects remaining available in the original remote log backend.
- The PostgreSQL custom-format dump is transactionally consistent and includes the database schema, table data, sequence values, indexes, and large objects by default. `pg_restore --list` validates readability of the archive table of contents; the documented restore rehearsal remains the decisive integrity test.
- Current official pages are not fully consistent about a universal Key Storage default, and packaged defaults can differ from generic plugin fallbacks. The post correctly avoids asserting one default and instructs readers to inventory the effective backend.
- All Rundeck documentation links and the author link in the post resolved to the intended pages during review.
