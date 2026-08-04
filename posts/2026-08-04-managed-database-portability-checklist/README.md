# Check Managed Database Portability Before You Commit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Managed Databases, PostgreSQL, Database Migration, Cloud Portability, Replication, Backup and Restore, Vendor Lock-In

Description: Evaluate schemas, extensions, privileges, backups, replication, integrations, and performance before adopting a managed database or calling an engine compatible.

---

A managed service can speak PostgreSQL or MySQL and still create a difficult exit. Protocol compatibility gets an application connected; it does not guarantee compatible extensions, privileges, backup artifacts, replication, collation, performance, or operational APIs.

Run a portability assessment before adoption, then repeat it when the schema or service tier changes. The cheapest time to discover that an extension is unavailable elsewhere is before production data depends on it.

## Define the Exact Exit Target

`PostgreSQL-compatible` is too vague. Record:

- source service, engine, major and minor version;
- candidate target service and supported versions;
- region, architecture, and availability topology;
- maximum dataset, write rate, and change rate in the decision horizon;
- recovery point and recovery time objectives;
- maximum acceptable read-only and write outage;
- features allowed to change during migration.

An exit to self-managed PostgreSQL has different constraints from an exit to RDS for PostgreSQL, Azure Database for PostgreSQL, Cloud SQL, or a distributed service exposing a PostgreSQL wire protocol.

## Inventory the Schema Surface

For PostgreSQL, collect at least:

```sql
SELECT current_setting('server_version');

SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

SELECT n.nspname AS schema_name,
       c.relkind,
       count(*) AS objects
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname, c.relkind
ORDER BY n.nspname, c.relkind;

SELECT collname, collprovider, collversion
FROM pg_collation
WHERE collname IN (
  SELECT DISTINCT collation_name
  FROM information_schema.columns
  WHERE collation_name IS NOT NULL
);
```

Also inspect:

- custom data types, domains, operators, and casts;
- functions, procedures, triggers, and languages;
- generated columns, partitioning, and identity columns;
- full-text search configurations;
- materialized views and foreign data wrappers;
- tablespaces, large objects, and unlogged tables;
- ownership, grants, row-level security, and default privileges.

Test schema creation on the target from a clean export. Do not infer support from a marketing compatibility statement.

## Treat Extensions as Product Dependencies

Managed providers publish extension lists by engine version and restrict installation or configuration. The same extension name can be available at a different version or require a parameter and restart. Some extensions need superuser capabilities that a managed administrative role does not provide.

Create a matrix:

| Extension | Source version | Target version | Upgrade path | Configuration data | Replacement |
| --- | --- | --- | --- | --- | --- |
| `postgis` | measured | measured | tested/not tested | spatial reference and topology | none or service change |
| `pg_cron` | measured | measured | recreate jobs | job definitions | external scheduler |
| `postgres_fdw` | measured | measured | relink servers/users | user mappings | application integration |

Extension configuration tables deserve special attention. A logical export may include some extension-managed state and omit other operational configuration. Recreate jobs, background workers, external links, and server parameters explicitly.

## Test the Privilege Model

Managed databases commonly withhold true operating-system access and PostgreSQL superuser. Provider administrative roles have special restrictions.

Replay administrative tasks using the target role:

- create databases, schemas, roles, and grants;
- install and upgrade required extensions;
- change required server parameters;
- terminate sessions and inspect locks;
- create replication users and slots;
- read monitoring views needed by operations;
- import data and reset ownership;
- rotate TLS certificates and credentials.

If the target cannot perform an operation, decide whether the provider automates it, the application must change, or the target is unsuitable.

## Prove a Portable Backup

A provider snapshot is excellent for recovery inside that provider. It is usually not an artifact another managed service can restore.

Maintain at least one exit-capable path:

- logical export such as `pg_dump`/`pg_restore` for selected databases;
- engine-native physical backup when the target explicitly supports its format and version;
- table or object exports for services without portable physical backups;
- schema and role exports stored separately;
- encryption keys and restore credentials controlled outside the source failure domain.

Test at production-like scale. Logical restore can be CPU, WAL, index-build, or network bound. Measure restore duration, temporary storage, connection limits, and post-restore analysis.

A successful backup job is not evidence of portability. A clean target restore with application verification is.

## Audit Replication Before Depending on Low Downtime

For PostgreSQL native logical replication, the official restrictions include important migration work:

- schema definitions and DDL are not replicated;
- sequence state is not replicated;
- large objects are not replicated;
- target tables and compatible columns must exist;
- updates and deletes need a usable replica identity;
- privileges and ownership need separate handling.

Query tables that lack primary keys before promising CDC:

```sql
SELECT n.nspname, c.relname, c.relreplident
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = c.oid
      AND i.indisprimary
  );
```

Provider migration services have their own supported source/target versions, data types, DDL behavior, and networking requirements. Validate current limitation pages and run a complete rehearsal.

## Find Non-SQL Lock-In

The database is also connected to its cloud environment. Inventory:

- identity-based authentication and token acquisition;
- private endpoints, DNS zones, and firewall rules;
- key-management integrations;
- audit-log destinations and metric names;
- automatic backup retention and point-in-time recovery;
- read replica, global database, and failover APIs;
- serverless scaling and proprietary connection proxies;
- event streams, object-storage import/export, and analytics links;
- provider SDK calls in deployment and operations code.

These features can be valuable. Record how each one is replaced rather than banning it by default.

## Benchmark Semantics and Performance

The same SQL can behave differently because of versions, parameters, storage, planner statistics, collation libraries, connection handling, and available compute.

Replay representative production queries and write patterns. Validate:

- transaction isolation and retry behavior;
- time-zone and collation-sensitive results;
- query plans and tail latency;
- maximum connections and pooling;
- failover connection behavior and DNS caching;
- storage growth, IOPS, WAL generation, and maintenance;
- replication lag under peak writes.

Define result correctness before comparing performance. A faster target that sorts or rounds differently is not compatible.

## Put Portability Gates in Delivery

Automate recurring checks:

1. restore the latest exit backup into a clean supported target;
2. apply schema migrations from the released application version;
3. compare schema inventories and required extensions;
4. run application contract and data integrity tests;
5. measure restore and catch-up time;
6. alert when the measured RTO or target version support changes.

Require a portability review for new extensions, provider-specific data types, global-database features, or privileged operational dependencies.

## Official Documentation

- [PostgreSQL backup and restore](https://www.postgresql.org/docs/current/backup.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Amazon RDS for PostgreSQL extensions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.Extensions.html)
- [Logical replication on Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication.html)
- [Azure Database for PostgreSQL extensions](https://learn.microsoft.com/en-us/azure/postgresql/extensions/concepts-extensions-versions)
- [Cloud SQL for PostgreSQL extensions](https://cloud.google.com/sql/docs/postgres/extensions)
- [Cloud SQL logical replication and decoding](https://cloud.google.com/sql/docs/postgres/replication/configure-logical-replication)

## Conclusion

Managed database portability is wider than SQL syntax. Validate schema objects, extension versions, privileges, export formats, replication limits, integrations, and production behavior against a named target. Use provider-native features when their value is clear, but keep a restored and measured exit path proportional to the cost of being unable to move.
