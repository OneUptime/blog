# Validation Summary: In-Place Upgrade or Side-by-Side Migration? Choosing a Safe SQL Server Upgrade Path

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft SQL Server Database Engine
- SQL Server 2025 (17.x)
- Transact-SQL (T-SQL)
- Database backup and restore
- Database compatibility levels and Query Store
- Side-by-side migration, log shipping, replication, and Always On availability groups
- SQL Server Agent, SSIS, SSRS, encryption, and instance-level dependencies

## Sources Consulted
- [Upgrade SQL Server](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/upgrade-sql-server?view=sql-server-ver17)
- [Supported version and edition upgrades (SQL Server 2025)](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/supported-version-and-edition-upgrades-2025?view=sql-server-ver17)
- [Choose a Database Engine upgrade method](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/choose-a-database-engine-upgrade-method?view=sql-server-ver17)
- [Plan and test the Database Engine upgrade plan](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/plan-and-test-the-database-engine-upgrade-plan?view=sql-server-ver17)
- [Work with multiple versions and instances of SQL Server](https://learn.microsoft.com/en-us/sql/sql-server/install/work-with-multiple-versions-and-instances-of-sql-server?view=sql-server-ver17)
- [RESTORE (Transact-SQL): compatibility support](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17#compatibility-support)
- [ALTER DATABASE compatibility level (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-compatibility-level?view=sql-server-ver17)
- [Change the database compatibility level and use the Query Store](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/change-the-database-compatibility-mode-and-use-the-query-store?view=sql-server-ver17)
- [Monitor performance by using the Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store?view=sql-server-ver17)
- [sys.dm_db_persisted_sku_features (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-db-persisted-sku-features-transact-sql?view=sql-server-ver17)
- [Enable or disable backup checksums during backup or restore](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/enable-or-disable-backup-checksums-during-backup-or-restore-sql-server?view=sql-server-ver17)
- [Transfer logins and passwords between instances of SQL Server](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/security/transfer-logins-passwords-between-instances)
- [Transparent data encryption (TDE)](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption?view=sql-server-ver17)
- [Upgrade availability group replicas](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/upgrading-always-on-availability-group-replica-instances?view=sql-server-ver17)
- [Installation guidance for SQL Server on Linux](https://learn.microsoft.com/en-us/sql/linux/install-upgrade/setup?view=sql-server-ver17)

## Issues Found
- The rollback paragraph tied backup incompatibility to both recovery and subsequent writes on the newer engine. SQL Server upgrades an older database when it is restored or attached to the newer engine, and restore direction is determined by the Database Engine version that created the backup; a write is not required to make a backup taken by the newer version incompatible with older versions. The paragraph now separates that version boundary from the post-write data-divergence boundary.

## Review Notes
- The SQL Server 2025 direct in-place upgrade matrix cited in the post applies to SQL Server on Windows. Linux upgrades use distribution and repository-specific guidance, so administrators should consult the Linux documentation for that platform.
- SQL Server 2025 documentation states that in-place upgrades of Data Quality Services, Master Data Services, and Reporting Services are not supported. The post correctly instructs readers to inventory components and select supported component-specific migration paths.
- `sys.dm_db_persisted_sku_features` is current and the example query is valid. Running it requires `VIEW DATABASE STATE` on SQL Server 2019 and earlier, or `VIEW DATABASE PERFORMANCE STATE` on SQL Server 2022 and later.
- The remaining T-SQL examples are syntactically correct, and compatibility level 170 is correct for SQL Server 2025.
