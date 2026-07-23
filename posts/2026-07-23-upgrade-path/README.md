# In-Place Upgrade or Side-by-Side Migration? Choosing a Safe SQL Server Upgrade Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Upgrade, Database Migration, Compatibility, Change Management

Description: Compare in-place and side-by-side SQL Server upgrades, define rollback boundaries, and test the chosen path before production cutover.

---

An in-place upgrade replaces the SQL Server instance's binaries and upgrades its system and user databases on the existing host. A side-by-side migration builds a separate target instance and moves databases plus instance-level dependencies.

Neither path is automatically safest. The right choice depends on supported upgrade paths, infrastructure constraints, outage tolerance, dependency inventory, data movement time, validation needs, and what “rollback” means after writes reach the new version.

## Compare the Operational Tradeoffs

| Question | In-place upgrade | Side-by-side migration |
| --- | --- | --- |
| Server and instance identity | Usually retained | New host/instance or endpoint must be introduced |
| Instance objects | Setup upgrades existing system state | Logins, jobs, credentials, links, keys, and settings must be migrated |
| Hardware/OS refresh | Not inherently provided | Natural opportunity to change them |
| Pre-cutover testing | Limited on the actual production instance | Full target can be rehearsed and load-tested |
| Main outage | Setup, database upgrade, validation, and remediation | Final data synchronization, validation, and client switch |
| Pre-write fallback | Requires a tested server-level recovery plan | Source can remain intact until target writes are enabled |
| Complexity | Lower movement complexity, higher change concentration | More dependency and cutover work |

Once an upgraded database is recovered and written on a newer Database Engine, a database backup cannot be restored to an older SQL Server version. Side-by-side preserves a clean fallback only until writes begin on the target; after that, the copies diverge unless a separately engineered reverse path exists.

## Apply Hard Support Gates First

For the intended target release, verify the current Microsoft matrix for:

- direct source-version and service-pack/CU eligibility;
- source and target editions and features;
- Windows or Linux version, CPU architecture, .NET and other prerequisites;
- failover clustering, availability groups, replication, and distributed features;
- installed Database Engine, Analysis Services, Integration Services, and Reporting Services components;
- deprecated, discontinued, and breaking behavior.

For example, the SQL Server 2025 in-place matrix supports specified serviced releases rather than every historical build. An unsupported direct hop must use a supported intermediate upgrade or migration. Never infer support from the fact that Setup launches.

Also verify backup/restore direction. SQL Server supports restoring older-version user database backups to supported newer versions, but not restoring a newer-version backup to an older engine.

## Inventory the Whole Instance

The database list is only the beginning. Capture:

```sql
SELECT
    SERVERPROPERTY('Edition') AS edition,
    SERVERPROPERTY('ProductVersion') AS product_version,
    SERVERPROPERTY('ProductLevel') AS product_level;

SELECT name, compatibility_level, recovery_model_desc, state_desc
FROM sys.databases
ORDER BY database_id;

SELECT feature_name
FROM sys.dm_db_persisted_sku_features;
```

Run the last query in each user database; it identifies certain edition-specific features persisted there, but it is not a complete dependency assessment.

Inventory logins and SIDs, server roles and permissions, SQL Server Agent jobs and proxies, credentials, linked servers, endpoints, certificates, encryption keys, Database Mail, alerts, operators, startup procedures, trace flags, server configuration, resource governor, auditing, replication, availability, CLR, external access, SSIS/SSRS dependencies, drivers, and client connection behavior.

Record who owns and validates each dependency. Side-by-side migrations expose missing inventory during cutover; in-place upgrades preserve more state but can expose incompatible components during startup.

## Choose In-Place When Its Constraints Fit

In-place can be appropriate when:

- the source build has a supported direct path;
- the current OS and hardware remain supported and correctly sized;
- retaining the host and instance name materially simplifies dependencies;
- the organization can accept the measured Setup and validation outage;
- a complete system-level rollback/rebuild plan has been rehearsed;
- a representative clone has passed the same upgrade first.

Its compact topology is appealing, but the blast radius is concentrated: SQL Server binaries, shared components, system databases, and user databases change on the production server. A user-database backup alone is not a complete in-place rollback plan. Capture tested full/log backups, system database protection, encryption keys, configuration, installers, service identities, and the supported host recovery method.

Do not combine a SQL Server major-version upgrade, operating-system upgrade, storage redesign, compatibility-level change, and application release into one change unless the integrated risk is deliberately accepted. Separating them makes failures easier to attribute and rollback gates clearer.

## Choose Side-by-Side When Parallel Validation Matters

Side-by-side is often a better fit when:

- the OS or hardware must change;
- the source is not eligible for a direct in-place path;
- a long production rehearsal or performance comparison is required;
- the outage must be reduced through log replay, replication, or another supported synchronization method;
- instance consolidation, edition change, storage redesign, or security redesign is part of the goal;
- preserving the untouched source through a pre-write acceptance gate is valuable.

The cost is explicit migration of instance state and endpoint dependencies. Build it as code where practical, preserve original login SIDs, and prevent source and target jobs from running the same business work simultaneously.

Choose the data movement method per database: backup/restore, repeated log restore, log shipping transition, availability-group technique, or an appropriate migration service. Test feature interactions and do not assume every method supports every source, target, or topology.

## Build a Common Pre-Upgrade Test Plan

Whichever path is selected:

1. apply required source servicing and resolve pending restarts;
2. run `DBCC CHECKDB` and resolve any consistency errors;
3. take checksummed backups and prove they restore with available keys;
4. run the target release's assessment against schema, T-SQL, and features;
5. capture performance baselines: throughput, latency, waits, plans, CPU, memory, I/O, TempDB, and log behavior;
6. replay critical application workflows and operational jobs on the target;
7. load-test representative concurrency and data distributions;
8. time every outage and recovery step;
9. rehearse the abort path before and after each irreversible boundary.

Query Store can preserve plan history and help identify regressions. Configure and validate it before the change if it is part of the comparison; do not discover during the incident that it was read-only or had already purged the baseline.

## Separate Engine Upgrade from Compatibility Level

Database compatibility level controls important optimizer and language behavior independently of the engine version. After moving to the new engine, first validate the database at its supported inherited compatibility level. Then test and deploy the compatibility-level change as a separate, observable step when possible.

```sql
SELECT name, compatibility_level
FROM sys.databases
WHERE name = N'Sales';

-- Example only after target-level testing:
ALTER DATABASE Sales SET COMPATIBILITY_LEVEL = 170;
```

Compatibility level 170 corresponds to SQL Server 2025. Use the value supported by the actual target, and evaluate Query Store, cardinality-estimator changes, and intelligent query-processing behavior across the workload before changing it.

## Define Cutover and Acceptance Gates

The runbook should state:

- when schema and application changes freeze;
- how writes stop and the final data delta is captured;
- how clients switch and connection pools drain;
- which business watermarks prove data completeness;
- which jobs remain disabled until acceptance;
- maximum error rate, latency, and resource thresholds;
- the final moment at which fallback can occur without data reconciliation;
- how post-write rollback would preserve or reconcile target transactions.

After acceptance, start and verify new backup chains, monitoring, integrity checks, and HA/DR on the target. Retain the source according to security and rollback policy, isolated from accidental client writes.

The safe upgrade path is the one whose failure modes have been rehearsed—not the one with the fewest steps on the whiteboard.

## Official Documentation

- [Upgrade SQL Server](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/upgrade-sql-server?view=sql-server-ver17)
- [Supported version and edition upgrades for SQL Server 2025](https://learn.microsoft.com/en-us/sql/database-engine/install-windows/supported-version-and-edition-upgrades-2025?view=sql-server-ver17)
- [Work with multiple versions and instances](https://learn.microsoft.com/en-us/sql/sql-server/install/work-with-multiple-versions-and-instances-of-sql-server?view=sql-server-ver17)
- [Database compatibility level](https://learn.microsoft.com/en-us/sql/relational-databases/databases/view-or-change-the-compatibility-level-of-a-database?view=sql-server-ver17)
- [Back up and restore: compatibility support](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17#compatibility-support)
