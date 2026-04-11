# MySQL vs CockroachDB: Distributed SQL Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CockroachDB, Distributed Database

Description: Compare MySQL and CockroachDB on distributed SQL, global consistency, horizontal scalability, and when each database fits your architecture.

---

MySQL and CockroachDB both speak SQL, but they are architected for very different operational models. MySQL is a single-node relational database (with bolt-on replication), while CockroachDB is built from the ground up for multi-region, distributed SQL with automatic sharding and geo-replication.

## Architecture

MySQL uses a primary-replica replication model. Writes go to the primary, replicas are eventually consistent. For true HA with automatic failover, you need InnoDB Cluster or Galera.

CockroachDB uses a distributed consensus model based on the Raft protocol. Every write must be acknowledged by a quorum of nodes. There is no single primary - any node can accept reads and writes.

```bash
# Start a local CockroachDB cluster (3 nodes)
cockroach start --insecure --store=node1 --listen-addr=localhost:26257 --http-addr=localhost:8080 --join=localhost:26257,localhost:26258,localhost:26259 &
cockroach start --insecure --store=node2 --listen-addr=localhost:26258 --http-addr=localhost:8081 --join=localhost:26257,localhost:26258,localhost:26259 &
cockroach start --insecure --store=node3 --listen-addr=localhost:26259 --http-addr=localhost:8082 --join=localhost:26257,localhost:26258,localhost:26259 &
cockroach init --insecure --host=localhost:26257
```

## SQL Compatibility

CockroachDB is PostgreSQL-wire-compatible, not MySQL-compatible. Applications written for MySQL cannot connect to CockroachDB without changes.

```sql
-- Both support standard SQL DML
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice');
SELECT * FROM users WHERE email = 'alice@example.com';

-- Standard LIMIT/OFFSET syntax (supported by both MySQL and CockroachDB)
SELECT * FROM users LIMIT 10 OFFSET 20;

-- MySQL-specific comma syntax (not supported in CockroachDB)
SELECT * FROM users LIMIT 20, 10; -- MySQL offset,count syntax
```

## Transactions and Consistency

MySQL InnoDB provides ACID transactions within a single node. Distributed transactions across multiple MySQL nodes require application-level coordination.

CockroachDB provides serializable distributed transactions across all nodes, globally, by default. This is one of its key differentiators.

```sql
-- CockroachDB: distributed transaction across regions
BEGIN;
INSERT INTO orders (id, user_id, region) VALUES (1001, 42, 'us-east');
UPDATE inventory SET stock = stock - 1 WHERE product_id = 7;
COMMIT;
-- This transaction is consistent across all CockroachDB nodes globally
```

## Horizontal Scaling

MySQL horizontal scaling requires Vitess or application-level sharding. CockroachDB scales horizontally by adding nodes - ranges are automatically rebalanced across the cluster.

```sql
-- CockroachDB: set table locality for geo-partitioning
ALTER TABLE user_sessions SET LOCALITY REGIONAL BY ROW;
```

## Operational Considerations

MySQL has a massive ecosystem - tooling, cloud services (RDS, Cloud SQL, Aurora), and community support are unmatched. CockroachDB has a smaller ecosystem but offers CockroachDB Cloud as a managed service.

| Factor | MySQL | CockroachDB |
|---|---|---|
| Architecture | Primary-replica | Distributed consensus |
| SQL dialect | MySQL | PostgreSQL-compatible |
| Auto-sharding | No (needs Vitess) | Yes |
| Serializable distributed transactions | No | Yes |
| Ecosystem | Very large | Smaller |
| Managed cloud options | RDS, Aurora, Cloud SQL | CockroachDB Cloud |

## When to Choose Each

Choose MySQL when your application is single-region, you need maximum ecosystem compatibility, or you are already using MySQL-based tooling. Choose CockroachDB when you need multi-region active-active writes with strong consistency, when automatic horizontal sharding is required, or when you are building a globally distributed application.

## Summary

MySQL and CockroachDB solve different problems. MySQL is the right default for most web applications. CockroachDB is compelling for applications that need strong consistency across distributed regions without managing Vitess or sharding logic manually.
