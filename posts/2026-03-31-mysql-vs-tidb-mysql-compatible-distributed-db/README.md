# MySQL vs TiDB: MySQL-Compatible Distributed Database Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, TiDB, Distributed Database

Description: Compare MySQL and TiDB to understand how TiDB extends MySQL compatibility with horizontal scalability, HTAP workloads, and distributed ACID transactions.

---

TiDB is an open-source, distributed SQL database that is MySQL-compatible. Unlike CockroachDB (which uses the PostgreSQL wire protocol), TiDB is designed to be a drop-in replacement for MySQL at the protocol level - making it a compelling upgrade path for MySQL deployments that need horizontal scalability.

## Wire Protocol Compatibility

TiDB speaks the MySQL protocol. Existing MySQL clients, ORMs, and drivers work without modification.

```bash
# Connect to TiDB using the standard MySQL client
mysql -h 127.0.0.1 -P 4000 -u root

# TiDB responds to standard MySQL commands
SHOW DATABASES;
SELECT VERSION();
-- 5.7.25-TiDB-v7.x.x
```

## Architecture

MySQL uses a monolithic storage engine (InnoDB). TiDB separates compute and storage:
- **TiDB Server** - stateless SQL layer, handles queries
- **TiKV** - distributed key-value storage with Raft consensus
- **PD (Placement Driver)** - metadata service, schedules data rebalancing

```text
Client -> TiDB Server (SQL) -> TiKV (distributed storage)
                           -> TiFlash (columnar storage for analytics)
```

## Horizontal Scaling

MySQL requires Vitess or manual sharding for horizontal write scaling. TiDB scales horizontally by adding TiKV nodes. Data is automatically split into regions (96 MB by default) and rebalanced.

```sql
-- TiDB: check region distribution for a table
SHOW TABLE orders REGIONS;
-- Shows how data is split across TiKV nodes
```

## HTAP: Hybrid Transactional and Analytical Processing

TiDB includes TiFlash, a columnar storage engine synchronized with TiKV. This enables HTAP - running analytical queries alongside OLTP without a separate data warehouse.

```sql
-- TiDB: hint to use TiFlash for analytical query
SELECT /*+ READ_FROM_STORAGE(TIFLASH[orders]) */
  YEAR(created_at) AS yr,
  SUM(total) AS revenue
FROM orders
GROUP BY yr;
```

MySQL requires a separate replica or ETL pipeline to run analytics without impacting OLTP performance.

## Distributed Transactions

TiDB supports distributed ACID transactions across all nodes using the Percolator protocol. MySQL InnoDB transactions are single-node.

```sql
-- TiDB: this transaction spans multiple TiKV nodes transparently
BEGIN;
INSERT INTO orders (id, user_id, total) VALUES (5001, 10, 199.99);
UPDATE wallets SET balance = balance - 199.99 WHERE user_id = 10;
COMMIT;
```

## Compatibility Gaps

TiDB is not 100% MySQL-compatible. Notable differences:

```sql
-- MySQL: auto_increment guarantees sequential values
-- TiDB: auto_increment is not strictly sequential (distributed)
-- Use AUTO_RANDOM for distributed-friendly primary keys
CREATE TABLE orders (
  id BIGINT AUTO_RANDOM PRIMARY KEY,
  total DECIMAL(10,2)
);
```

TiDB also does not support some MySQL-specific features like `SELECT ... INTO OUTFILE`, certain stored procedure constructs, and some spatial functions.

## Operational Complexity

MySQL is simpler to operate - one process, well-understood tooling. TiDB involves multiple components (TiDB server, PD, TiKV, TiFlash) and requires more infrastructure.

| Factor | MySQL | TiDB |
|---|---|---|
| MySQL wire compatibility | Native | Yes (not 100%) |
| Horizontal scaling | Needs Vitess | Native |
| HTAP | Needs separate replica | TiFlash built-in |
| Operational complexity | Low | Medium-High |
| Ecosystem | Very large | Growing |

## Summary

TiDB is the best option when you are running MySQL but have outgrown its single-node capacity and want to stay on the MySQL protocol. It provides horizontal scalability, distributed transactions, and HTAP without abandoning your existing MySQL stack. For workloads that fit comfortably on a single MySQL node with read replicas, plain MySQL is simpler and easier to operate.
