# MySQL InnoDB Cluster vs NDB Cluster: Which to Choose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Cluster

Description: Compare MySQL InnoDB Cluster and NDB Cluster on architecture, use cases, consistency, performance, and operational complexity to choose the right HA solution.

---

MySQL offers two distinct clustering solutions: InnoDB Cluster and NDB Cluster (MySQL Cluster). Despite both being called "clusters," they are architecturally very different and solve different problems.

## InnoDB Cluster

InnoDB Cluster is the recommended MySQL high-availability solution for most applications. It combines three components:
- **MySQL Group Replication** - synchronous multi-primary or single-primary replication
- **MySQL Router** - application-transparent failover and read scaling
- **MySQL Shell** - management interface

```bash
# Create an InnoDB Cluster using MySQL Shell
mysqlsh
JS> dba.configureInstance('root@node1:3306')
JS> var cluster = dba.createCluster('myCluster')
JS> cluster.addInstance('root@node2:3306')
JS> cluster.addInstance('root@node3:3306')
JS> cluster.status()
```

InnoDB Cluster uses the standard InnoDB storage engine. All existing MySQL applications work without modification.

## NDB Cluster

NDB Cluster (also known as MySQL Cluster) is a separate, specialized product that uses the NDB (Network DataBase) storage engine instead of InnoDB. It was designed for telecommunications and real-time systems requiring sub-millisecond response times and 99.999% availability.

```sql
-- NDB Cluster: tables must use the NDB engine
CREATE TABLE sessions (
  id BIGINT NOT NULL,
  user_id INT NOT NULL,
  data TEXT,
  PRIMARY KEY (id)
) ENGINE=NDB;

-- Tables without an explicit PRIMARY KEY get a hidden one added automatically
-- (but you cannot have an AUTO_INCREMENT column with no key), so explicit PKs are recommended
```

## Architecture Differences

InnoDB Cluster stores data on regular disk using InnoDB. Failover takes seconds.

NDB Cluster stores indexed data in memory across NDB data nodes (with disk checkpointing, and optional Disk Data tables for non-indexed columns). This enables microsecond latency but requires significant RAM. The architecture involves:
- **SQL nodes** - standard MySQL servers (using NDB storage engine)
- **Data nodes** - NDB data processes that hold partitioned, replicated data in memory
- **Management nodes** - cluster configuration and monitoring

```text
InnoDB Cluster: MySQL Node 1 - MySQL Node 2 - MySQL Node 3
               (all running standard mysqld with InnoDB)

NDB Cluster:   SQL Node 1 - SQL Node 2
                   |              |
             Data Node 1 - Data Node 2  (data in memory)
             Data Node 3 - Data Node 4
                   |
             Management Node
```

## Consistency Model

Both provide synchronous replication. InnoDB Cluster uses Group Replication's consensus protocol (Paxos-based). NDB Cluster uses a two-phase commit protocol across data nodes.

```sql
-- Check InnoDB Cluster group membership status
SELECT * FROM performance_schema.replication_group_members;
```

## Limitations of NDB

NDB Cluster has significant restrictions compared to InnoDB:

```sql
-- NDB limitations
-- Foreign keys supported since NDB 7.3 but with restrictions (e.g., ON UPDATE CASCADE is not allowed when referencing the parent table's primary key)
-- Text/BLOB columns cannot be primary key or indexed
-- Transactions are limited in size and scope
-- Complex joins across NDB tables are slow
-- Many MySQL features behave differently or are unsupported
```

## When to Use Each

| Factor | InnoDB Cluster | NDB Cluster |
|---|---|---|
| Standard MySQL application | Yes | Requires changes |
| Sub-millisecond latency requirement | No | Yes |
| In-memory data requirement | No | Yes |
| Telecom or real-time use case | Uncommon | Original use case |
| Operational simplicity | Moderate | High complexity |
| Recommended for new projects | Yes | Specialized only |

## Summary

For the vast majority of applications, InnoDB Cluster is the correct choice. It is easier to operate, uses standard InnoDB, and supports the full MySQL feature set. NDB Cluster is a specialized product designed for telecommunications and real-time applications that need in-memory data with sub-millisecond latency and extreme availability. Unless you have those specific requirements, use InnoDB Cluster.
