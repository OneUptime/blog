# Validation Summary: Differential Backups in SQL Server Availability Groups: Primary and Secondary Replica Rules

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server 2022 and earlier
- Microsoft SQL Server 2025 (17.x) and later
- Always On availability groups
- Full, differential, copy-only, and transaction log backups
- Availability-group backup preferences and replica backup priorities
- Transact-SQL and `sys.fn_hadr_backup_is_preferred_replica`
- SQL Server backup history and restore-chain metadata
- Azure Backup for SQL Server availability groups

## Sources Consulted

- [Offload supported backups to secondary replicas of an availability group](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/active-secondaries-backup-on-secondary-replicas-always-on-availability-groups?view=sql-server-ver17)
- [Configure backups on secondary replicas of an Always On availability group](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/configure-backup-on-availability-replicas-sql-server?view=sql-server-ver17)
- [`sys.fn_hadr_backup_is_preferred_replica` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-functions/sys-fn-hadr-backup-is-preferred-replica-transact-sql?view=sql-server-ver17)
- [`RETURN` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/return-transact-sql?view=sql-server-ver17)
- [What is an Always On availability group?](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [`backupset` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Back up SQL Server Always On availability groups with Azure Backup](https://learn.microsoft.com/en-us/azure/backup/backup-sql-server-on-availability-groups)

## Issues Found

No technical issues found.

## Review Notes

- Microsoft documents that, through SQL Server 2022, secondary replicas support regular transaction log backups and copy-only full database, file, or filegroup backups, but not differential backups or regular full backups that establish a differential base.
- Starting with SQL Server 2025 (17.x), Microsoft documents regular full and differential backup support on secondary replicas. The post correctly treats engine version, backup-product support, replica role, and replica health as separate routing considerations.
- The backup-preference setting is advisory and does not enforce placement for ad hoc backups. The post's `sys.fn_hadr_backup_is_preferred_replica` guard follows Microsoft's documented job pattern, and `RETURN;` validly exits the T-SQL batch.
- Secondary backup eligibility still requires communication with the primary and a `SYNCHRONIZED` or `SYNCHRONIZING` database state. The post states this requirement correctly.
- Microsoft also documents a concurrent-backup limitation on availability-group replicas and special placement rules for distributed availability groups. Those scenarios are outside this post's stated scope, but should be considered if the guide is expanded.
