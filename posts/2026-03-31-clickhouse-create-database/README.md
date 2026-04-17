# How to Create a Database in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Database, Create

Description: Learn how to create databases in ClickHouse using CREATE DATABASE, including IF NOT EXISTS, ON CLUSTER, and choosing the right database engine.

---

ClickHouse organizes tables and views inside databases, much like other relational systems. Before you can store any data you need at least one database. ClickHouse ships with several database engines - each with different semantics around transaction support, replication awareness, and lazy loading. Understanding the differences helps you pick the right engine for your workload from day one.

## Basic CREATE DATABASE Syntax

The minimal form creates a database with the default engine (Atomic on modern ClickHouse versions):

```sql
CREATE DATABASE my_database;
```

Use `IF NOT EXISTS` to make the statement idempotent - useful in migration scripts and CI pipelines:

```sql
CREATE DATABASE IF NOT EXISTS my_database;
```

Drop a database and everything inside it with:

```sql
DROP DATABASE IF EXISTS my_database;
```

## Choosing a Database Engine

Specify an engine with the `ENGINE` clause. The engine controls internal metadata handling and replication integration.

### Atomic (default, recommended)

Atomic is the default since ClickHouse 20.5. It provides atomic `RENAME TABLE` and `EXCHANGE TABLES` operations and is recommended for `ReplicatedMergeTree` tables - it allows the simplified creation syntax that relies on the `{uuid}` macro instead of hard-coded ZooKeeper paths.

```sql
CREATE DATABASE analytics ENGINE = Atomic;
```

### Ordinary (legacy)

Ordinary was the default before 20.5. New projects should prefer Atomic, but existing clusters may still have Ordinary databases.

```sql
CREATE DATABASE legacy_db ENGINE = Ordinary;
```

### Memory

Memory stores all metadata only in RAM. The database and its tables vanish on server restart. Useful for ephemeral testing environments.

```sql
CREATE DATABASE temp_db ENGINE = Memory;
```

### Lazy (removed in recent versions)

Lazy keeps tables in RAM only when they are actively used, expiring them after a configurable idle period. It was only ever compatible with `Log`-family tables. The engine takes a single positional argument - the expiration time in seconds:

```sql
CREATE DATABASE archive ENGINE = Lazy(3600);
```

Note: the `Lazy` engine has been removed from ClickHouse as of early 2026. For backward compatibility, ClickHouse now interprets `Lazy` as `Atomic`. New projects should use `Atomic` (optionally with the `lazy_load_tables = 1` setting) instead.

### MySQL and PostgreSQL Engines

ClickHouse can proxy a remote MySQL or PostgreSQL schema as a local database. Every table in the remote schema becomes accessible through ClickHouse SQL.

```sql
-- MySQL proxy database
CREATE DATABASE mysql_mirror
ENGINE = MySQL('mysql-host:3306', 'source_db', 'reader_user', 'secret');

-- PostgreSQL proxy database
CREATE DATABASE pg_mirror
ENGINE = PostgreSQL('pg-host:5432', 'source_db', 'reader_user', 'secret');
```

Queries against these databases are pushed down to the remote engine.

### SQLite Engine

Map a local SQLite file as a ClickHouse database:

```sql
CREATE DATABASE sqlite_db ENGINE = SQLite('/var/lib/sqlite/data.db');
```

## Creating a Database on a Cluster (ON CLUSTER)

In a replicated or sharded cluster, `CREATE DATABASE` only runs on the node that receives the query unless you add `ON CLUSTER`:

```sql
CREATE DATABASE IF NOT EXISTS analytics ON CLUSTER '{cluster}';
```

The `{cluster}` macro is defined in `config.xml` or `config.d/` on each node. Using a literal cluster name also works:

```sql
CREATE DATABASE IF NOT EXISTS analytics ON CLUSTER production_cluster;
```

## Inspecting Databases

List all databases on the current server:

```sql
SHOW DATABASES;
```

Query the system catalog for engine details:

```sql
SELECT
    name,
    engine,
    data_path,
    comment
FROM system.databases
ORDER BY name;
```

Show the DDL that would recreate a database:

```sql
SHOW CREATE DATABASE analytics;
```

## Setting a Comment

You can attach a human-readable comment to a database for documentation purposes:

```sql
CREATE DATABASE analytics
ENGINE = Atomic
COMMENT 'Production analytics database - owned by data-eng team';
```

Comments appear in `system.databases.comment`.

## Practical Example - Analytics Pipeline

A common pattern is to have separate databases for raw ingestion, intermediate transformations, and serving:

```sql
-- Raw event ingestion
CREATE DATABASE IF NOT EXISTS raw ENGINE = Atomic;

-- Cleaned and transformed data
CREATE DATABASE IF NOT EXISTS warehouse ENGINE = Atomic;

-- Pre-aggregated tables for dashboards
CREATE DATABASE IF NOT EXISTS marts ENGINE = Atomic;
```

Keeping workloads in separate databases makes it easier to manage permissions, monitor disk usage per database, and apply different merge settings to each layer.

## Summary

`CREATE DATABASE` in ClickHouse supports several engines suited for different use cases - Atomic is the right choice for most production workloads. The `IF NOT EXISTS` guard and `ON CLUSTER` clause make the command safe to run in automated pipelines and distributed deployments. Use `system.databases` to inspect the current state of all databases on a server.
