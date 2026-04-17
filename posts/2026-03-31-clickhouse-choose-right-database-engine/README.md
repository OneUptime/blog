# How to Choose the Right Database Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database Engine, Atomic, Replicated, MaterializedMySQL, Architecture

Description: Learn how to choose the right ClickHouse database engine for your use case, from the default Atomic engine to specialized replication and federation options.

---

ClickHouse supports multiple database engines, each designed for a specific use case. Choosing the right one determines how your tables are managed, whether DDL operations replicate automatically, and how data flows from external systems. This guide walks through the available options and when to use each.

## Available Database Engines

```text
Atomic              - Default; supports atomic renames and UUID-based tables
Ordinary            - Legacy; avoid for new deployments
Replicated          - Replicates DDL across cluster nodes
Lazy                - Memory-efficient for many infrequently accessed Log tables
MySQL               - Federated queries to a MySQL server
PostgreSQL          - Federated queries to a PostgreSQL server
SQLite              - Queries against a local SQLite file
MaterializedMySQL   - Live CDC replica of a MySQL database
MaterializedPostgreSQL - Live CDC replica of a PostgreSQL database
```

## Decision Tree

### Single Node or Cloud Deployment

Use **Atomic** (the default) for standalone or ClickHouse Cloud deployments:

```sql
CREATE DATABASE mydb ENGINE = Atomic;
-- Or simply:
CREATE DATABASE mydb;
```

### Self-Hosted Cluster (Multi-Node)

Use **Replicated** to automatically sync DDL across nodes:

```sql
CREATE DATABASE mydb
ENGINE = Replicated('/clickhouse/databases/mydb', '{shard}', '{replica}');
```

Without Replicated, you must use `ON CLUSTER` for every schema change.

### Many Infrequently Accessed Small Tables

Use **Lazy** for archival or multi-tenant setups with hundreds of Log tables:

```sql
CREATE DATABASE archive
ENGINE = Lazy(7200);
```

The single positional argument is `expiration_time_in_seconds` — how long a table is kept in RAM after its last access. Lazy can only host `*Log` family tables.

### Federated Queries to MySQL

Use **MySQL** database engine for live cross-database queries:

```sql
CREATE DATABASE mysql_db
ENGINE = MySQL('host:3306', 'dbname', 'user', 'pass');
```

### Analytics on MySQL Data (CDC)

Use **MaterializedMySQL** for a maintained local replica:

```sql
CREATE DATABASE mysql_analytics
ENGINE = MaterializedMySQL('host:3306', 'dbname', 'user', 'pass');
```

### Analytics on PostgreSQL Data (CDC)

Use **MaterializedPostgreSQL** for a maintained local replica:

```sql
CREATE DATABASE pg_analytics
ENGINE = MaterializedPostgreSQL('host:5432', 'dbname', 'user', 'pass');
```

## Comparison Table

| Engine | DDL Auto-Replication | Live External Queries | Local Storage | Use Case |
|---|---|---|---|---|
| Atomic | No | No | Yes | Default |
| Replicated | Yes | No | Yes | Cluster DDL sync |
| Lazy | No | No | Yes | Many small Log tables |
| MySQL | No | Yes | No | MySQL federation |
| PostgreSQL | No | Yes | No | PG federation |
| MaterializedMySQL | No | No | Yes | MySQL CDC |
| MaterializedPostgreSQL | No | No | Yes | PG CDC |

## Migration from Ordinary to Atomic

All legacy Ordinary databases should be upgraded. First, check what engines you currently have:

```sql
SELECT name, engine FROM system.databases;
```

ClickHouse does not provide a `MODIFY ENGINE` SQL command. To convert all `Ordinary` databases to `Atomic`, create a flag file in the server's `flags` directory and restart the server (requires ClickHouse 22.8+):

```bash
sudo touch /var/lib/clickhouse/flags/convert_ordinary_to_atomic
sudo chown clickhouse:clickhouse /var/lib/clickhouse/flags/convert_ordinary_to_atomic
sudo systemctl restart clickhouse-server
```

On startup, every `Ordinary` database will be migrated to `Atomic` automatically.

## Summary

For most new deployments, start with **Atomic** on standalone instances and **Replicated** on multi-node clusters. Use **MaterializedMySQL** or **MaterializedPostgreSQL** when you need real-time analytics on relational database data without impacting those databases. Reserve **Lazy** for high-cardinality multi-tenant log scenarios. Avoid the legacy **Ordinary** engine for all new databases.
