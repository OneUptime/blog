# Speed Up Large Azure MySQL Imports with Measured Parallelism

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Performance, Database Migration

Description: Tune large Azure MySQL imports by measuring loader throughput, index creation, compute limits, and IOPS, then verify the full restore before scaling down.

Increasing loader threads from four to sixteen can make an import slower. More workers might compete for the same storage, overwhelm the target's CPU, or leave a long index-building phase after the data appears finished. The useful question is where time is being spent and which resource is limiting progress.

This guide focuses on importing a completed MyDumper backup into a new Azure Database for MySQL Flexible Server. The examples use MyLoader **1.0.19-1** and MySQL **8.0**. They are configuration examples for rehearsal, not benchmark results. Keep the target isolated from normal application traffic while testing.

## Define completion before measuring speed

Measure the entire path from starting the loader to having a verified database ready for its next stage. That includes schema creation, row loading, indexes, constraints, other required objects, and validation. A faster row-loading phase can still produce a slower overall restore.

Use one immutable dump for comparisons. Record its size, table distribution, largest tables, schema, tool version, client host, target configuration, and test start time. Each trial needs a fresh disposable target or an explicitly prepared empty destination. Running the same command against a partially loaded database does not create a comparable experiment.

Agree on the success criteria first: no unexplained loader errors, required objects present, expected data checks passing, and acceptable load on the target. If replication follows the import, include enough remaining source-log retention for catch-up. Do not declare success while the initial load has consumed the entire migration window.

## Find the limiting stage

Place the loader near the destination, with adequate local disk and network throughput. A large target cannot compensate for a client struggling to read or decompress its input. Microsoft's [large-database migration guidance](https://learn.microsoft.com/en-us/azure/mysql/migrate/concepts-migrate-mydumper-myloader) discusses client placement and capacity.

Observe both machines over the same interval:

| Observation | Next experiment |
|---|---|
| Loader CPU is saturated while the target is quiet | Check decompression and client CPU capacity |
| Loader disk reads are slow | Move the dump to adequate local storage |
| Network throughput limits transfer to the target | Review placement and path capacity |
| Target CPU is saturated | Compare fewer workers or more target compute |
| Target storage reaches its supported I/O limit | Review IOPS allocation and compute ceilings |
| Row loading ends but indexes continue for a long time | Measure and tune the index phase separately |

Use Azure's documented metrics rather than assuming a similarly named chart measures application work alone. Host CPU, storage activity, and connection metrics have defined scopes in the [monitoring reference](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference).

Record throughput over several intervals. A brief burst from a cache or CPU credits does not describe the sustained rate of a multi-hour import.

## Start with bounded loader concurrency

Prepare a dedicated configuration file so the trial does not inherit unrelated machine-wide defaults. For this example, save the following as `/absolute/path/import.cnf`:

```ini
[myloader]
verbose=3
```

Use the reviewed [MyDumper/MyLoader 1.0.19-1 release](https://github.com/mydumper/mydumper/releases/tag/v1.0.19-1). Replace the endpoint, account, dump directory, and CA path below. The account needs the privileges required by the objects being restored, and the target must not contain an existing application dataset.

```bash
myloader --defaults-file='/absolute/path/import.cnf' \
  --host='TARGET.mysql.database.azure.com' \
  --user='IMPORT_USER' --ask-password \
  --directory='/absolute/path/completed-dump' \
  --ssl-mode=VERIFY_IDENTITY --ca='/absolute/path/azure-ca-bundle.pem' \
  --threads=4 --max-threads-per-table=2 \
  --max-threads-for-index-creation=1 \
  --max-threads-for-schema-creation=1 \
  --max-threads-for-post-actions=1 \
  --optimize-keys=AFTER_IMPORT_PER_TABLE \
  --enable-binlog
```

The example uses four general workers and limits how aggressively a single table and the index/schema/post-action stages run. These controls are not a promise of exactly four total database connections. Inspect the actual connection count during the trial. The options and index modes are defined in the [tagged argument source](https://github.com/mydumper/mydumper/blob/v1.0.19-1/src/myloader/myloader_arguments.c).

For this pinned version, `--enable-binlog` avoids the loader's default attempt to disable session binary logging. Upstream still supports the flag but marks it discouraged, so review behavior before changing versions. This example retains logging and budgets for its storage cost. The relevant initialization is in the [tagged loader implementation](https://github.com/mydumper/mydumper/blob/v1.0.19-1/src/myloader/myloader.c).

After a clean baseline, change one concurrency setting and repeat against a comparable empty target. For example, compare four and eight general workers while keeping the other caps unchanged. Keep the setting only if complete restore time improves without unacceptable contention or errors.

The backup must expose enough independent work for added workers to help. One dominant table or a poorly chunked dump can limit useful parallelism. Inspect the input layout before assuming that another doubling of threads will help.

## Treat index creation as part of the import

`AFTER_IMPORT_PER_TABLE` defers eligible index creation until a table's data has loaded. `AFTER_IMPORT_ALL_TABLES` moves that work later, after all table data is imported. Compare these modes only with the same dump and explicit index-worker limits. The [MyLoader reference](https://mydumper.github.io/mydumper/docs/html/myloader_usage.html) documents their meanings.

Deferring work can reduce contention during row loading, but it does not remove the work. Budget time, temporary space, and I/O for index construction. Avoid treating a high rows-per-second figure as the final result when an hour of index creation still remains.

After the loader finishes, use a diagnostic account to inspect index definitions. Replace `appdb` with the restored database:

```sql
SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'appdb'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

Compare this output with the expected schema, including column order and uniqueness. The query is read-only and uses the [MySQL 8.0 STATISTICS table](https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html). Functional indexes require examining expression metadata as well; this compact query is not a complete schema comparison. Validate foreign keys and other required objects separately.

## Scale the resource that the evidence identifies

IOPS means input/output operations per second. Azure offers pre-provisioned and autoscale IOPS, but autoscaling does not bypass the maximum supported by the server's service tier and compute size. More IOPS allocation is useful only when storage is actually limiting the workload. See [Azure's IOPS guidance](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-storage-iops).

Temporary compute can be appropriate for a CPU-bound import or a compute-limited I/O ceiling. Make the change before the measured load begins. Compute scaling restarts the server and interrupts connections, so scaling in the middle of a load can invalidate the trial and require recovery work.

Plan the return path too. Azure permits compute to scale down, while provisioned storage size can only increase. Expanding storage to chase performance is therefore not equivalent to renting larger compute for an hour. Review the [service-tier and scaling rules](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage) for the actual deployment before changing capacity.

Retain the logging, durability, and access policies required for the migration. A benchmark obtained by dropping required controls describes a different operational contract. Review loader session behavior rather than adding a collection of untested global parameter changes.

## Finish with an evidence-based configuration

Keep a trial record containing total elapsed time, time spent on indexes and validation, peak client and server utilization, errors, and the exact changed setting. Compare like-for-like runs, and repeat a surprising result before adopting it.

After the winning configuration passes data and schema validation, measure the target at its intended steady-state size. A configuration that imports quickly may still be unsuitable for normal queries. Schedule the compute reduction as a connection-interrupting operation, rerun application checks afterward, and verify that backup and monitoring requirements are satisfied. The result should be a repeatable import procedure with a measured resource budget, not simply the highest thread count that started successfully.
