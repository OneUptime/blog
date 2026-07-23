# SQL Server Production Setup Checklist: Memory, TempDB, Storage, and Service Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Database Administration, TempDB, Performance, Security

Description: Configure a new SQL Server instance with deliberate memory, TempDB, storage, and service-account settings before production traffic arrives.

---

SQL Server Setup produces a working instance, not a production-ready one. The safest build process records the workload assumptions, makes a small set of evidence-based configuration choices, and tests restart and recovery behavior before the server accepts traffic.

This checklist targets the SQL Server Database Engine. Windows and Linux use different service and storage controls, so apply the platform-specific Microsoft guidance linked below.

## Record the Starting Point

Before changing anything, capture the exact engine edition, build, host resources, and current configuration:

```sql
SELECT
    SERVERPROPERTY('MachineName') AS machine_name,
    SERVERPROPERTY('ServerName') AS server_name,
    SERVERPROPERTY('Edition') AS edition,
    SERVERPROPERTY('ProductVersion') AS product_version,
    SERVERPROPERTY('ProductLevel') AS product_level;

SELECT name, value, value_in_use, is_dynamic
FROM sys.configurations
WHERE name IN
(
    'min server memory (MB)',
    'max server memory (MB)',
    'max degree of parallelism',
    'cost threshold for parallelism',
    'backup checksum default'
)
ORDER BY name;
```

Patch to a supported cumulative update according to the organization's change policy. Do not copy instance settings from another server merely because its CPU count or RAM is similar; edition, workload, co-located services, and availability design all matter.

## Set a Deliberate Memory Ceiling

The default `max server memory (MB)` is effectively unrestricted. Establish a ceiling that leaves memory for Windows or Linux, drivers, backup agents, monitoring, clustering, and any other processes on the host. The setting does not cap every allocation made by the SQL Server process, so also leave headroom for worker stacks, backup buffers, linked-server providers, and other memory outside its control. The correct reserve is workload-specific, so observe operating-system memory and SQL Server memory counters under representative load instead of applying a universal percentage.

```sql
EXEC sys.sp_configure 'show advanced options', 1;
RECONFIGURE;

-- Example only: 57344 MB is not a recommendation for every 64-GB host.
EXEC sys.sp_configure 'max server memory (MB)', 57344;
RECONFIGURE;
```

Leave `min server memory (MB)` at its default unless testing demonstrates a reason to reserve memory after SQL Server has acquired it. Confirm the live values:

```sql
SELECT name, value_in_use
FROM sys.configurations
WHERE name LIKE '%server memory (MB)';
```

Monitor for operating-system paging and low-memory notifications after the change. A configured maximum is a starting guardrail, not proof that the host is correctly sized.

## Configure TempDB Before Load Testing

Inspect the files first:

```sql
USE tempdb;
SELECT
    file_id,
    name,
    type_desc,
    size * 8.0 / 1024 AS size_mb,
    CASE WHEN is_percent_growth = 1
         THEN CONCAT(growth, '%')
         ELSE CONCAT(growth * 8.0 / 1024, ' MB')
    END AS growth_setting,
    physical_name
FROM sys.database_files
ORDER BY type, file_id;
```

Microsoft's starting guidance for SQL Server 2016 and later is multiple equally sized TempDB data files: one per logical processor up to eight. If allocation contention remains, test adding files in groups of four, without exceeding the logical processor count. This is a starting point, not a reason to create dozens of files automatically.

Pre-size files for the observed peak, keep data files the same size and growth increment, and use fixed-megabyte growth rather than percentage growth. For example:

```sql
USE master;
ALTER DATABASE tempdb MODIFY FILE
    (NAME = tempdev, SIZE = 8192MB, FILEGROWTH = 512MB);
ALTER DATABASE tempdb MODIFY FILE
    (NAME = templog, SIZE = 4096MB, FILEGROWTH = 512MB);
```

Add data files with explicit paths only after verifying the target volume and free space. SQL Server recreates TempDB at service start, so perform a controlled restart test and verify every configured path is available. On SQL Server 2019 and later, memory-optimized TempDB metadata is an optional response to proven metadata contention, not a default switch for every installation.

## Design Storage Around I/O Patterns

Map each workload to measurable latency, throughput, capacity, durability, and recovery requirements. At minimum, assess these paths separately:

- user data files, which commonly perform random reads and checkpoint writes;
- transaction logs, which require ordered, durable writes and can be latency-sensitive;
- TempDB data and log files;
- backup targets, including the effect of concurrent backup throughput.

Separate volumes can provide independent capacity, failure, and performance control, but different drive letters backed by the same saturated storage do not provide isolation. Confirm that the entire I/O path honors SQL Server write-ahead logging requirements. Do not place database or log files on a filesystem-compressed volume.

Pre-size data and log files to avoid predictable autogrowth during peak load. Keep autogrowth enabled as a safety mechanism, alert on it, and choose meaningful fixed increments. Grant the Database Engine service the `Perform volume maintenance tasks` right when instant file initialization is approved; remember that its behavior and log-file support vary by SQL Server version, so do not use it as a substitute for pre-sizing.

## Use Isolated, Low-Privilege Service Identities

On Windows, prefer virtual accounts, managed service accounts, or group managed service accounts where suitable. Use separate identities for separate SQL Server services and grant only the permissions each service needs. Do not run the Database Engine under a personal administrator account or add its service account to broad local or domain administrator groups.

Change startup accounts and passwords through SQL Server Configuration Manager, which updates required permissions and service configuration. If SQL Server accesses a remote backup path or file share, explicitly grant the service identity access; a virtual account authenticates remotely as the computer account.

Also verify:

- SQL Server Agent has the identity and proxy design required for its jobs;
- service principal names and delegation are configured only when the authentication design requires them;
- the service identity can read any configured TLS certificate private key;
- database, TempDB, error-log, and backup directories have narrowly scoped ACLs.

## Prove the Build

Before cutover, run a representative workload and a controlled service restart. Confirm that:

1. every database and TempDB file comes online at the intended path;
2. the OS retains healthy available memory under load;
3. data, log, TempDB, and backup latency remain within the tested target;
4. SQL Server Agent jobs and remote-share access work under their service identities;
5. full and log backups complete with checksums and can be restored on an isolated instance;
6. monitoring captures disk capacity, file growth, memory pressure, failed jobs, and SQL Server errors.

Export the final configuration and record why each nondefault value exists. A production checklist is complete only when another operator can rebuild and verify the same instance without relying on undocumented knowledge.

## Official Documentation

- [Server memory configuration options](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/server-memory-server-configuration-options?view=sql-server-ver17)
- [TempDB database](https://learn.microsoft.com/en-us/sql/relational-databases/databases/tempdb-database?view=sql-server-ver17)
- [Configure Windows service accounts and permissions](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-windows-service-accounts-and-permissions?view=sql-server-ver17)
- [Database instant file initialization](https://learn.microsoft.com/en-us/sql/relational-databases/databases/database-instant-file-initialization?view=sql-server-ver17)
- [SQL Server Database Engine disk input/output requirements](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/database-file-operations/database-engine-input-output-requirements)
