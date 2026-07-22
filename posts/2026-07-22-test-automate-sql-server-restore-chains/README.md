# How to Test and Automate Full, Differential, and Log Restore Chains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Restore Automation, Differential Backup, Transaction Log, Disaster Recovery Testing

Description: Build an automated SQL Server restore drill that selects backups by LSN, restores them safely, validates integrity and business state, and records RPO and RTO.

---

An automated restore test should select a full, optional differential, and continuous log sequence from metadata; restore them to an isolated target; run database and business checks; and record the achieved recovery point and total recovery time. Verifying that backup jobs succeeded or running `RESTORE VERIFYONLY` is not enough.

The goal is repeatable evidence that a promised recovery point can become a usable application database.

## Define the Test Contract

For every protected database, store:

- target RPO and RTO;
- recovery model and retention window;
- expected full, differential, and log cadence;
- source database identity, not only its name;
- target SQL Server versions and compatibility limits;
- logical-to-physical file mapping policy;
- TDE or backup-encryption key identifiers;
- integrity and application validation queries;
- notification and escalation owners.

Randomly test current and older recovery points. Include a late-cycle point where the differential is largest and many logs follow. A drill immediately after a full exercises the easiest path.

## Inventory Media by Header

Read `RESTORE HEADERONLY` for every backup set and `RESTORE FILELISTONLY` for data backups. Capture exact numeric values without floating-point conversion:

- database name, creation date, and backup set GUIDs;
- backup type and set `Position`;
- `FirstLSN`, `LastLSN`, checkpoint and database backup LSN;
- differential base LSN and GUID;
- copy-only, checksum, compression, and encryption fields;
- media families for striped backups.

Use `msdb.dbo.backupset` as an additional index, but make the recovery catalog independent of the failed source server. Associate each set with immutable object URI, byte size, cryptographic hash, availability tier, and retention.

## Select the Restore Path

For a target time under full recovery:

1. Choose a valid data backup completed before the target.
2. If using a differential, find its exact full base.
3. Select the newest valid differential no later than the target when it improves the path.
4. Find a continuous sequence of log backups that covers the state after the selected data backup through the target.
5. Include a tail log when an actual incident provides one.

Fail closed when a base is missing, LSN ranges have a gap, media is expired, a stripe is absent, or a key is unavailable. Print the dependency graph for operator review.

## Generate Explicit Restore Commands

Restore into a disposable database name and unique paths:

```sql
RESTORE DATABASE Sales_Drill
FROM DISK = 'E:\Drill\Sales_full.bak'
WITH FILE = 1,
     MOVE 'Sales_Data' TO 'F:\SQLData\Sales_Drill.mdf',
     MOVE 'Sales_Log'  TO 'G:\SQLLog\Sales_Drill.ldf',
     NORECOVERY, CHECKSUM, STATS = 10;

RESTORE DATABASE Sales_Drill
FROM DISK = 'E:\Drill\Sales_diff.bak'
WITH FILE = 1, NORECOVERY, CHECKSUM;

RESTORE LOG Sales_Drill
FROM DISK = 'E:\Drill\Sales_log_001.trn'
WITH FILE = 1, NORECOVERY, CHECKSUM;

RESTORE LOG Sales_Drill
FROM DISK = 'E:\Drill\Sales_log_target.trn'
WITH FILE = 1,
     STOPAT = '2026-07-22T14:37:00',
     NORECOVERY, CHECKSUM;

RESTORE DATABASE Sales_Drill WITH RECOVERY;
```

Parameterize identifiers safely and tightly validate generated paths. Do not add `REPLACE` by default. The automation should refuse a target that is not its own disposable drill database.

## Validate in Layers

After recovery:

1. Confirm database state, expected recovery time, and file placement.
2. Run `DBCC CHECKDB` at the rigor required by policy.
3. Check schema version, critical table counts, and application invariants.
4. Verify the target business event is present and later events are absent for point-in-time drills.
5. Start an isolated application instance and execute read/write smoke tests.
6. Check users, login mappings, jobs, linked servers, certificates, and instance-level dependencies.

Treat restoring an untrusted backup as running untrusted code. Use an isolated network and instance with no production credentials or outbound access until the source is trusted.

## Measure the Real RTO

Timestamp each stage:

```text
detection and approval
infrastructure provisioning
object retrieval and key access
full restore
differential restore
log replay
recovery
DBCC CHECKDB
application validation
cutover preparation
```

Publish achieved RPO and RTO, the slowest stage, backup ages, bytes restored, validation results, and all deviations. Trends matter: growing differential restore time or cold-storage retrieval can consume the RTO before any job fails.

## Inject Failures

A mature drill rotates through:

- missing latest differential, forcing an older path;
- one missing middle log, proving the gap is detected;
- expired credentials or unavailable TDE certificate;
- corrupt or truncated backup object;
- absent stripe from a striped media set;
- unavailable primary region;
- unexpected normal full that changed the differential base;
- failover between availability-group backup jobs;
- destination with different file paths or limited capacity.

The automation should choose a valid alternative when policy permits and otherwise produce a precise, actionable failure-not silently select a later or less-protected recovery point.

## Clean Up Safely

Record results before dropping the disposable database. Resolve and validate the exact drill target; never construct destructive cleanup from an unchecked environment variable or wildcard. Keep failed targets long enough for diagnosis when storage permits.

Review drill failures like production defects. Repair retention, catalog logic, key escrow, monitoring, or runbooks, then rerun the same scenario. A green backup dashboard is useful; a history of successful adversarial restores is evidence.

## Official Documentation

- [Microsoft SQL Server backup and restore overview](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-and-restore-of-sql-server-databases?view=sql-server-ver17)
- [RESTORE statements reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE VERIFYONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17)
- [DBCC CHECKDB reference](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17)
- [Restore a SQL Server database to a point in time](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
