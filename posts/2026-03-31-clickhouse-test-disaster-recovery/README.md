# How to Test ClickHouse Disaster Recovery Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disaster Recovery, Testing, Operation, Reliability

Description: Learn how to design and execute ClickHouse disaster recovery tests to validate backup and restore procedures before a real incident occurs.

---

An untested disaster recovery plan is not a plan - it is a hope. Regular DR testing validates that your backups are restorable, your runbooks are accurate, and your team knows what to do when things go wrong.

## Defining Recovery Objectives

Before testing, establish your targets:

- **RTO (Recovery Time Objective)** - maximum acceptable downtime
- **RPO (Recovery Point Objective)** - maximum acceptable data loss

Document these in your DR runbook and measure against them in every test.

## DR Test Types

Three levels of ClickHouse DR tests cover different failure scenarios:

1. **Backup validation** - verify backup files are complete and readable
2. **Isolated restore test** - restore to a test environment and validate data
3. **Full failover simulation** - simulate complete cluster failure and recovery

## Test 1: Backup Integrity Validation

Verify backup files are complete without running a full restore:

```sql
SELECT
    name,
    status,
    start_time,
    end_time,
    num_files,
    total_size,
    error
FROM system.backups
ORDER BY start_time DESC
LIMIT 10;
```

A status of `BACKUP_CREATED` with no error indicates a valid backup.

## Test 2: Isolated Restore Test

Spin up a test ClickHouse instance and restore from backup:

```bash
docker run -d --name ch-restore-test \
    -v /mnt/backups:/backup:ro \
    -p 18123:8123 -p 19000:9000 \
    clickhouse/clickhouse-server:latest
```

Run restore and validate:

```sql
RESTORE DATABASE production AS production_test
FROM Disk('backups', 'production_backup_2026-03-28/');

-- Verify row counts
SELECT count() FROM production_test.events;

-- Check data freshness
SELECT max(event_time) FROM production_test.events;
```

## Test 3: Full Failover Simulation

During a planned maintenance window, simulate cluster failure:

```bash
# Stop ClickHouse on primary
systemctl stop clickhouse-server

# Restore on standby
clickhouse-client --host standby-host --query "
RESTORE DATABASE production
FROM Disk('backups', 'production_backup_2026-03-31/')
"

# Validate and measure elapsed time against RTO
```

## DR Test Checklist

```text
[ ] Latest backup is less than RPO hours old
[ ] Backup files are accessible from restore location
[ ] Test environment is isolated from production
[ ] Restore completed without errors
[ ] Row counts match production snapshot
[ ] Most recent event timestamps are within RPO window
[ ] Application can connect and query successfully
[ ] Total elapsed time is within RTO
[ ] Runbook steps were accurate
[ ] Issues documented for remediation
```

## Documenting Test Results

Track DR test outcomes over time:

```sql
CREATE TABLE dr_test_log (
    test_date Date,
    backup_name String,
    restore_start DateTime,
    restore_end DateTime,
    rto_minutes UInt32,
    rpo_hours UInt32,
    row_count_matched UInt8,
    issues String
) ENGINE = MergeTree() ORDER BY test_date;
```

## Summary

ClickHouse DR testing requires validating backups at three levels: integrity checks, isolated restore tests, and full failover simulations. Run tests quarterly at minimum, measure actual RTO and RPO against targets, document issues, and update runbooks after each test. A tested DR plan dramatically reduces incident duration and stress.
