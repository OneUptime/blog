# How to Back Up Rundeck Projects, Job Definitions, Key Storage, and Execution History Before an Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Backup And Recovery, Database Backup, Upgrade

Description: Build a restorable Rundeck upgrade backup that covers its database, projects, jobs, key-storage backend, execution logs, configuration, and encryption secrets.

---

A Rundeck backup is not automatically complete because a database dump succeeded. Depending on the version and configuration, project definitions, keys, resource files, plugins, and execution output can live outside the main database. A project archive is also not a replacement for a full system backup.

Before an upgrade, inventory each storage backend and capture a consistent recovery set that can bring up the old version if the new version or its schema migration fails.

## Inventory Where Rundeck Stores State

Record these settings before copying anything:

```bash
sudo grep -E \
  -e '^[[:space:]]*dataSource\.(url|driverClassName|dialect|dbCreate)[[:space:]=:]' \
  -e '^[[:space:]]*rundeck\.projectsStorageType[[:space:]=:]' \
  -e '^[[:space:]]*rundeck\.(storage|config\.storage)\.(provider|converter)\.[0-9]+\.(type|path|removePathPrefix|config\.(baseDir|encryptorType|algorithm|provider|passwordEnvVarName|passwordSysPropName|keyObtentionIterations))[[:space:]=:]' \
  -e '^[[:space:]]*rundeck\.execution\.logs\.(fileStoragePlugin|localFileStorageEnabled|streamingReaderPlugin|streamingWriterPlugins)[[:space:]=:]' \
  -e '^[[:space:]]*framework\.(projects|logs|var)\.dir[[:space:]=:]' \
  /etc/rundeck/rundeck-config.properties \
  /etc/rundeck/framework.properties 2>/dev/null
```

This selection excludes `dataSource.password` and arbitrary storage-provider or converter `.config.*` values, which can contain credentials; it includes only non-secret filesystem and legacy encryption settings. Redact credentials embedded in a JDBC URL before saving the output. Also inventory the selected providers' non-secret settings, such as remote endpoints, buckets, mounts, and object prefixes, and inspect environment-variable names, container-secret references, Helm values, or systemd overrides. They may replace file settings, but do not copy secret values into the manifest.

Classify the state:

| State | Common location or backend |
| --- | --- |
| Jobs, execution records, schedules | Rundeck database |
| Project configuration | Database by default in current Rundeck, or configured filesystem/plugin storage |
| Key Storage | Database, filesystem under `$RDECK_BASE/var/storage`, or an external plugin |
| Execution output | Local logs directory and/or configured log-storage plugin |
| Resource definitions and project files | Project filesystem or configured project storage/source |
| Server configuration, file-based ACLs, realm files | `/etc/rundeck`; for launcher installs, `$RDECK_BASE/etc` and `$RDECK_BASE/server/config` |
| Plugins | `libext` and any provisioned plugin directories |

Keep storage encryption-converter passwords, any configuration-property encryption master password, and external-vault credentials in the recovery plan. Encrypted storage content and `ENC(...)` configuration values cannot be decrypted if the destination lacks the corresponding encryption configuration and secret.

Database-stored ACLs—including policies managed through the System or Project ACL APIs and, where enabled, the Enterprise ACL Storage Layer—depend on the database backup rather than the file-copy row above. Inventory the effective ACL backends instead of assuming every policy is an `.aclpolicy` file.

## Export Jobs and Project Archives

Job definitions in source control are the best portable copy. If they are not already versioned, export every project while Rundeck is running:

```bash
rd projects list
rd jobs list -p production -f backup/production-jobs.yaml -F yaml
```

Confirm the exact `rd` CLI flags against the CLI version installed with your environment. Repeat for every project and verify that each file is non-empty and parseable.

In addition, export each project archive from **Project Settings > Export Archive**, selecting all components required for recovery. The same basic export is available from the CLI:

```bash
rd projects archives export -p production --file backup/production.rdproject.jar
```

Current project archives can include jobs, executions and history, project configuration, readme/MOTD content, project ACLs, and other version- or edition-dependent components. Standard job definitions carry their schedule settings; separate commercial Schedule Definitions are their own optional archive component. Coverage still depends on the selected export options and the Rundeck/API version.

Do not treat the archive as the only backup. In particular, externally managed node data or files referenced by a resource-model source must remain available separately. Execution logs held by remote log storage must also remain at that backend and be readable by the restored instance; importing execution metadata does not copy every remote object into the archive.

## Take a Consistent Database Backup

Put Rundeck in passive execution mode, wait for running executions and queued log-storage uploads to finish, and prevent configuration changes during the final backup window. Stop Rundeck, or use a database-native consistent snapshot procedure that your DBA has tested.

For PostgreSQL, a custom-format logical dump is one option:

```bash
pg_dump \
  --host=db.example.com \
  --username=rundeck_backup \
  --format=custom \
  --file=backup/rundeck.dump \
  rundeck

pg_restore --list backup/rundeck.dump > backup/rundeck.dump.contents
```

A per-database `pg_dump` does not include cluster-wide roles or tablespace definitions. Capture them separately where you manage the PostgreSQL cluster, or document how to recreate the Rundeck database role, ownership, and grants before restoration.

Use equivalent supported tools for MySQL, MariaDB, SQL Server, or Oracle. Include all schemas, tables, indexes, sequences, and large objects/BLOBs. Database-backed Key Storage and project storage depend on the BLOB data being present.

Do not upgrade by pointing the new release at a writable production database before this recovery point exists. Schema migrations can make a downgrade impossible without restoring the old database.

## Copy Filesystem and Configuration State

With Rundeck stopped for consistency, copy the paths that actually exist in your installation. For RPM/DEB installations these often include:

```text
/etc/rundeck/
/var/lib/rundeck/data/
/var/lib/rundeck/logs/
/var/lib/rundeck/var/storage/
/var/lib/rundeck/libext/
/var/lib/rundeck/projects/
```

Also securely copy the applicable service defaults file (`/etc/default/rundeckd` on DEB or `/etc/sysconfig/rundeckd` on RPM) and any systemd drop-ins. These can hold path and JVM overrides as well as secret values or references.

Historical and launcher installations use different paths such as `$RDECK_BASE/etc`, `$RDECK_BASE/server/config`, `$RDECK_BASE/server/data`, `$RDECK_BASE/var/logs`, `$RDECK_BASE/var/storage`, `$RDECK_BASE/libext`, and `$RDECK_BASE/projects`. Follow configured paths rather than copying this example blindly.

Preserve owners, modes, symlinks, ACLs, and extended attributes. For containers or Kubernetes, back up the persistent volumes and the deployment configuration that mounts them. For remote execution-log or secret-storage plugins, capture provider configuration and verify that retained remote objects remain readable from a restored instance.

## Build and Verify a Recovery Manifest

Create a manifest containing:

- Rundeck edition and exact version;
- Java version and installation method;
- plugin names, versions, and checksums;
- database engine and version;
- storage-provider, storage-converter, and configuration-property encryption settings;
- paths or object prefixes for execution logs;
- exported project and job names; and
- checksums for every backup artifact.

Store the backup outside the machine being upgraded. Protect it as production-sensitive data because it can contain credentials, job arguments, node details, and execution output.

The decisive validation is a restore rehearsal. In an isolated environment, restore the database and files with the old Rundeck version. Before the first restored startup, configure `rundeck.executionMode=passive` and enforce network controls that block production nodes and integrations. Provide the same encryption secrets, start Rundeck, and confirm:

- all expected projects and jobs appear;
- no schedule can run while the server is passive, and project/job schedules are disabled before execution mode is deliberately re-enabled;
- ACLs still restrict access;
- Key Storage entries can be used without exposing their values;
- historical execution metadata and output are readable; and
- one safe job can resolve nodes and run.

Never let a restore test contact production nodes, notification endpoints, or schedules by accident.

## Official Documentation

- [Rundeck: Backup and Recovery](https://docs.rundeck.com/docs/administration/maintenance/backup.html)
- [Rundeck: Project Archives](https://docs.rundeck.com/docs/manual/projects/project-archive.html)
- [Rundeck CLI Commands](https://docs.rundeck.com/docs/rd-cli/commands.html)
- [Rundeck Storage Facility](https://docs.rundeck.com/docs/administration/configuration/storage-facility.html)
- [Rundeck Key Storage](https://docs.rundeck.com/docs/manual/key-storage/)
- [Rundeck Access Control Policy and ACL Storage](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck Database Configuration](https://docs.rundeck.com/docs/administration/configuration/database/)
- [Rundeck General Upgrade Guide](https://docs.rundeck.com/docs/upgrading/upgrading.html)

## Conclusion

A safe Rundeck upgrade backup combines portable job and project exports with a consistent database snapshot, filesystem state, configuration, plugins, logs, and encryption secrets. Document the exact version and storage topology, then prove the set by restoring it in isolation before changing production.
