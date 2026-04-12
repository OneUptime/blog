# How to Use TiDB as a MySQL-Compatible Distributed Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, TiDB, Distributed Database, HTAP, Horizontal Scaling

Description: Deploy and use TiDB, a MySQL-compatible distributed database that provides horizontal scaling, ACID transactions, and HTAP workloads.

---

## What is TiDB?

TiDB is an open-source distributed SQL database built by PingCAP. It is compatible with the MySQL 5.7 protocol and provides horizontal scalability, strong ACID transactions, and hybrid transactional/analytical processing (HTAP) in a single system.

Key components:
- **TiDB Server** - Stateless SQL layer (MySQL-compatible)
- **TiKV** - Distributed transactional key-value store
- **TiFlash** - Columnar storage replica for analytical queries
- **PD (Placement Driver)** - Cluster manager and scheduler

## Quick Start with TiUP

TiUP is the official TiDB cluster management tool:

```bash
# Install TiUP
curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh

# Start TiDB Playground (single-node for development)
tiup playground --db 1 --kv 3 --pd 1 --tiflash 1 --tag dev
```

## Connecting to TiDB

TiDB uses the MySQL protocol on port 4000:

```bash
mysql -u root -h 127.0.0.1 -P 4000
```

The default root password is empty for playground. Change it immediately:

```sql
ALTER USER 'root'@'%' IDENTIFIED BY 'StrongPass123!';
```

## MySQL Compatibility

TiDB is compatible with most MySQL 5.7 syntax. Common operations work as expected:

```sql
-- Create a database and table
CREATE DATABASE ecommerce;
USE ecommerce;

CREATE TABLE products (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    stock      INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT NOW()
);

-- Standard DML
INSERT INTO products (name, price, stock) VALUES ('Widget', 9.99, 100);
SELECT * FROM products WHERE price < 20 ORDER BY name;
UPDATE products SET stock = stock - 1 WHERE id = 1;
```

## Auto-Sharding

TiDB automatically distributes data across TiKV nodes. There is no manual sharding configuration - just insert data and TiDB handles distribution.

Check how regions (shards) are distributed:

```sql
-- Show table regions
SHOW TABLE products REGIONS;
```

## HTAP: Adding TiFlash for Analytics

Enable TiFlash columnar replicas for a table to accelerate analytical queries:

```sql
-- Replicate to TiFlash for HTAP
ALTER TABLE products SET TIFLASH REPLICA 1;

-- Check replication progress
SELECT * FROM information_schema.tiflash_replica
WHERE TABLE_SCHEMA='ecommerce' AND TABLE_NAME='products';
```

Once replicated, TiDB automatically routes analytical queries to TiFlash:

```sql
-- This query will use TiFlash (columnar scan)
SELECT FLOOR(price/10)*10 AS price_range, COUNT(*), AVG(price)
FROM products
GROUP BY FLOOR(price/10)*10;
```

## Distributed Transactions

TiDB supports full ACID distributed transactions:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

## Production Deployment with TiUP

```yaml
# topology.yaml
global:
  user: "tidb"
  deploy_dir: "/tidb-deploy"
  data_dir: "/tidb-data"

pd_servers:
  - host: 192.168.1.101
  - host: 192.168.1.102
  - host: 192.168.1.103

tidb_servers:
  - host: 192.168.1.104
  - host: 192.168.1.105

tikv_servers:
  - host: 192.168.1.106
  - host: 192.168.1.107
  - host: 192.168.1.108
```

```bash
tiup cluster deploy tidb-prod v7.5.0 topology.yaml --user root
tiup cluster start tidb-prod
```

## Migrating Data from MySQL

Use TiDB Data Migration (DM) to migrate from MySQL:

```bash
# Install DM
tiup install dm

# Start DM cluster
tiup dm deploy dm-prod v7.5.0 dm-topology.yaml --user root
tiup dm start dm-prod
```

## Monitoring TiDB

TiDB includes a built-in Prometheus and Grafana stack:

```bash
# Access Grafana dashboard
tiup cluster display tidb-prod | grep grafana
```

Key dashboards: TiDB Summary, TiKV Details, PD dashboard.

## Summary

TiDB provides MySQL 5.7 protocol compatibility while offering automatic horizontal scaling through TiKV's distributed storage and TiFlash's columnar engine for HTAP workloads. Applications connect on port 4000 using standard MySQL clients, and data is automatically sharded and replicated across TiKV nodes. TiUP simplifies cluster deployment and lifecycle management for both development and production environments.
