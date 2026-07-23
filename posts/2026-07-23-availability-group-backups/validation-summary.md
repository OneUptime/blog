# Validation Summary: SQL Server Availability Group Backups: Which Replica Should Run Each Job?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server 2022 and earlier
- Microsoft SQL Server 2025 and later
- Always On availability groups
- SQL Server backup and restore
- SQL Server Agent
- Transact-SQL
- SQL Server availability-group catalog views and dynamic management views

## Sources Consulted

- [Offload supported backups to secondary replicas of an availability group](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/active-secondaries-backup-on-secondary-replicas-always-on-availability-groups?view=sql-server-ver17)
- [Configure backups on secondary replicas of an Always On availability group](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/configure-backup-on-availability-replicas-sql-server?view=sql-server-ver17)
- [sys.fn_hadr_backup_is_preferred_replica (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-functions/sys-fn-hadr-backup-is-preferred-replica-transact-sql?view=sql-server-ver17)
- [ALTER AVAILABILITY GROUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-availability-group-transact-sql?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [BACKUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17)
- [sys.availability_groups (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-availability-groups-transact-sql?view=sql-server-ver17)
- [sys.availability_replicas (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-availability-replicas-transact-sql?view=sql-server-ver17)
- [sys.dm_hadr_availability_replica_states (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-hadr-availability-replica-states-transact-sql?view=sql-server-ver17)
- [backupset (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/transaction-log-backups-sql-server?view=sql-server-ver17)
- [KB4480650: equal-priority preferred-replica fix for SQL Server 2016 and 2017](https://support.microsoft.com/en-gb/topic/kb4480650-fix-sys-fn-hadr-backup-is-preferred-replica-returns-true-for-more-than-one-secondary-replica-even-if-the-priority-values-are-identical-in-sql-server-2016-and-2017-93f28e58-511e-bca4-f8a5-cbc660ca277a)

## Issues Found

No technical issues found.

## Review Notes

- The SQL Server 2025 version distinction is important and current: SQL Server 2025 (17.x) and later support regular full and differential backups on secondary replicas, while earlier releases support copy-only full and regular transaction-log backups there.
- The inspection query uses documented columns from the availability-group catalog views and replica-state DMV. When run on a secondary, the DMV exposes only local state for that availability group; run it on the primary to obtain state for every replica.
- The backup-job example is valid Transact-SQL. Its `CHECKSUM`, `COMPRESSION`, `INIT`, and `STATS` options are supported for `BACKUP LOG`, subject to the SQL Server service account having access to the destination.
- Microsoft fixed an older SQL Server 2016/2017 issue in which equal backup priorities could make the preferred-replica function return `1` on more than one secondary. The post already advises assigning deliberate priorities instead of relying on ties; older deployments should also be on a cumulative update containing the fix.
