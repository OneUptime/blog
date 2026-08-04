# Near-Zero-Downtime Database Migration Across Clouds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database Migration, Change Data Capture, PostgreSQL, Replication, Zero Downtime, Cloud Portability, Data Integrity

Description: Minimize cross-cloud database cutover downtime with a consistent seed, CDC, controlled write freeze, validation, and a rollback plan that respects the new writer.

---

Strict zero downtime is an unsafe promise for many database moves. Even when change data capture keeps a target current, the final authority handoff must handle in-flight transactions, sequence state, connection caches, schema changes, and writes after promotion.

Aim for a measured write pause or read-only interval small enough for the service objective. Describe it honestly as near-zero downtime unless the complete application and data protocol proves otherwise.

## Establish the Migration Contract

Record:

```yaml
source: rds-postgresql/16
target: azure-postgresql-flexible/16
dataset: 8.2TB
peak_change_rate: 18MB/s
rpo: 0s_at_cutover
write_pause_budget: 120s
read_availability_during_pause: required
rollback_data_loss: 0s
```

The service names and versions here are illustrative. Confirm versions, extensions, migration-service support, and region availability against current provider documentation.

Define who can pause writes, promote the target, cross the rollback boundary, and accept an RPO exception.

## Choose the Replication Mechanism

Common options include:

- engine-native logical replication;
- a managed migration service such as AWS DMS, Azure's PostgreSQL migration service, or Google Database Migration Service;
- a CDC platform based on database logs, such as Debezium;
- engine or vendor physical replication when both endpoints support it.

Select from an exact source-target support matrix. Test data types, large objects, partitioning, DDL, generated values, extension tables, conflict behavior, TLS, network path, and failover. A tool supporting both brands independently does not prove it supports the pair and versions you need.

## Run a Pre-Migration Audit

For PostgreSQL, inventory engine settings and objects:

```sql
SELECT version();

SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

SELECT n.nspname, c.relname, c.relreplident
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1, 2;

SELECT schemaname, sequencename, last_value
FROM pg_sequences
ORDER BY 1, 2;
```

Find tables without a suitable primary key or replica identity. Inventory roles, grants, ownership, collations, encodings, extensions, foreign data wrappers, large objects, scheduled jobs, and application-created DDL.

PostgreSQL native logical replication does not replicate schema DDL, sequence state, or large objects. Managed tools may add features but have their own limitation lists.

## Build and Validate the Target Schema

Create target infrastructure and apply schema before replication according to the chosen tool's procedure. Match compatible data types and required replica identities. Install only extensions and versions supported by the target.

During CDC, adopt a migration-safe DDL policy:

- freeze risky DDL, or route it through a coordinated migration process;
- apply additive target schema changes before source writes require them;
- avoid dropping or narrowing columns until both sides and CDC are safe;
- monitor replication errors after every release.

Do not let an application deployment independently mutate only the source schema.

## Seed from a Consistent Point

The initial copy and change stream must share a consistent boundary. The chosen replication system usually records a log position and copies table data while retaining later changes.

Monitor source impact:

- replication slot or log retention size;
- CPU, disk reads, IOPS, and network;
- long-running snapshot transactions and vacuum effects;
- target load, index maintenance, and apply throughput;
- replication lag in bytes and time.

If apply throughput is below the sustained source change rate, lag cannot converge. Fix that before scheduling cutover.

## Validate Continuously During Catch-Up

Compare source and target without relying only on a migration tool's green status:

- exact row counts for small tables;
- partitioned counts and deterministic aggregates for large tables;
- hashes of stable key ranges or samples;
- null, minimum, maximum, and uniqueness checks;
- schema and extension inventories;
- application read-only contract tests;
- CDC lag and error/dead-letter records.

Define expected differences, such as CDC control tables. Use a repeatable report that records source and target positions.

## Prefer One Writer Over Dual Writes

Application dual writes appear to remove the cutover pause but introduce an ambiguous failure:

```text
commit source succeeds
network timeout occurs
commit target status is unknown
```

Ordinary local transactions cannot atomically commit across two independent cloud databases. Retry can create duplicates or reorder changes.

Prefer a single authoritative source plus CDC until cutover. If business requirements force dual writes, build a protocol with:

- stable operation IDs and idempotent writes;
- durable outbox or write-ahead intent;
- explicit ordering and conflict rules;
- continuous bidirectional reconciliation;
- backpressure when either destination is unhealthy;
- a named system of record at every moment.

This is a product feature, not a temporary extra SDK call.

## Execute a Short Controlled Cutover

A PostgreSQL-oriented sequence is:

1. stop schema changes and background writers;
2. enter application read-only mode;
3. drain transactions and connection pools;
4. record the final source WAL/CDC position;
5. wait until the target confirms that position is applied;
6. run final critical-table validation;
7. synchronize sequence values and nonreplicated state;
8. disable or fence the source writer;
9. promote or enable writes on the target;
10. switch connection configuration and restart or recycle pools;
11. perform a canary write and read it through normal application paths;
12. open traffic and watch business plus database metrics.

Use provider-supported methods to inspect and advance sequences. Set values above all existing keys and account for application-side ID allocation.

DNS alone may not switch database clients promptly because connection pools and resolvers cache addresses. Prefer a configuration-controlled endpoint and deliberately recycle clients after draining them.

## Define Rollback Before Promotion

Before the target accepts writes, rollback can usually resume the source after removing read-only mode. After the first target-only write, the source is stale.

Choose one post-promotion strategy in advance:

- configure and validate reverse replication before cutover;
- retain target writes in a durable change stream that can be replayed;
- accept a documented RPO with executive authority;
- fix forward on the target.

Do not route back to the source merely because target latency is high. That creates split-brain data unless new target changes are reconciled.

Keep the source fenced and read-only during the observation period. Monitor attempted source writes to find forgotten clients.

## Measure the Result

Capture:

```text
write pause = first rejected/paused write to first successful target write
RPO = age or extent of the newest committed source change absent from the target at promotion
RTO = start of service impact to full SLO recovery
```

Use the replication system's comparison functions to prove that the target reached the recorded source position. WAL locations and provider CDC tokens are identifiers with system-specific comparison rules, not generally subtractable time values.

Also record replication duration, peak lag, validation differences, source resource impact, target performance, and actual rollback availability.

Run at least one production-shaped rehearsal and one aborted cutover. An abort before promotion is a critical procedure worth testing.

## Official Documentation

- [PostgreSQL logical replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [AWS DMS change data capture](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [AWS DMS data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)
- [Azure Database for PostgreSQL online migration](https://learn.microsoft.com/en-us/azure/postgresql/migrate/migration-service/tutorial-migration-service-iaas-online)
- [Google Database Migration Service for PostgreSQL](https://cloud.google.com/database-migration/docs/postgres/quickstart)
- [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)

## Conclusion

Near-zero-downtime migration comes from a consistent seed, CDC that can outrun change, continuous validation, and a brief controlled authority handoff. Keep one writer until promotion, synchronize state the log does not carry, and treat post-promotion rollback as a data migration. The metric is not whether replication ran; it is whether the target became authoritative with measured RPO and service impact.
