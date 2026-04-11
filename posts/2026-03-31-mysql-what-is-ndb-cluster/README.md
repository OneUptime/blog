# What Is MySQL NDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Distributed Database, High Availability, NDBCLUSTER

Description: MySQL NDB Cluster is a distributed, shared-nothing database using the NDB storage engine that delivers high availability and linear scalability across commodity hardware.

---

## Overview

MySQL NDB Cluster (also called MySQL Cluster) is a distributed database system that uses the `NDBCLUSTER` storage engine. Unlike InnoDB-based replication solutions, NDB Cluster distributes data across multiple data nodes automatically, providing true shared-nothing architecture with no single point of failure. It is designed for applications requiring extreme read/write throughput, sub-millisecond latency, and 99.999% availability.

## Architecture Components

NDB Cluster has three node types:

**Management Nodes (ndb_mgmd)**: Coordinate the cluster. Store configuration, monitor node health, and arbitrate. Typically deployed in pairs.

**Data Nodes (ndbd or ndbmtd)**: Store and process data in memory and on disk. Data is automatically partitioned and replicated across node groups.

**SQL Nodes (mysqld)**: Standard MySQL server instances using the NDB storage engine. Applications connect to SQL nodes using normal MySQL protocols.

```text
Application -> SQL Node 1 -> [Data Nodes: group 1]
Application -> SQL Node 2 -> [Data Nodes: group 2]
```

## Data Distribution

NDB Cluster partitions table rows across data nodes using a hashing algorithm. Rows are grouped into partitions, and each partition is stored on one data node with replicas on others (controlled by `NoOfReplicas`, typically 2).

```sql
-- Create a table using NDB storage engine
CREATE TABLE sessions (
  session_id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  data TEXT
) ENGINE = NDBCLUSTER;
```

## Basic Configuration

The management node configuration file (`config.ini`) defines the topology:

```ini
[ndbd default]
NoOfReplicas = 2
DataMemory = 512M

[ndb_mgmd]
NodeId = 1
HostName = mgmt1

[ndbd]
NodeId = 2
HostName = data1

[ndbd]
NodeId = 3
HostName = data2

[mysqld]
NodeId = 4
HostName = sql1
```

## Starting the Cluster

```bash
# Start management node
ndb_mgmd -f /etc/mysql-cluster/config.ini

# Start data nodes
ndbd --ndb-connectstring=mgmt1

# Start SQL nodes (standard mysqld with NDB plugin enabled)
mysqld --ndbcluster --ndb-connectstring=mgmt1
```

Monitor cluster status:

```bash
ndb_mgm -e "SHOW"
```

## NDB vs InnoDB: Key Differences

| Feature | NDB Cluster | InnoDB |
|---|---|---|
| Data storage | In-memory primary | Disk-based |
| Latency | Sub-millisecond | Low millisecond |
| JOIN performance | Weaker (no local joins) | Strong |
| Transactions | Yes | Yes |
| Full-text search | No | Yes |
| Geographic distribution | Yes | Via replication |

NDB Cluster excels at high-frequency, small-row lookups by primary key. Complex JOINs perform poorly because rows may reside on different data nodes, requiring network round trips.

## Typical Use Cases

- Telecom billing and subscriber management
- Real-time session storage
- High-frequency trading reference data
- Online gaming state management

## Summary

MySQL NDB Cluster is a distributed shared-nothing database designed for high availability and extreme throughput using in-memory, partitioned storage across multiple data nodes. It guarantees no single point of failure and supports automatic data replication. Its architecture is fundamentally different from InnoDB replication and is best suited for workloads requiring near-constant uptime and very high transactional throughput on small, primary-key-based operations.
