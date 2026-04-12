# What Is the BLACKHOLE Storage Engine in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Storage Engine, Blackhole, Replication, Relay

Description: The MySQL BLACKHOLE storage engine accepts and discards all data written to it while still writing to the binary log, making it useful for replication relay and benchmarking.

---

## Overview

The BLACKHOLE storage engine is MySQL's equivalent of `/dev/null`. Any data written to a BLACKHOLE table is accepted by MySQL and immediately discarded - nothing is stored. SELECT queries on a BLACKHOLE table always return an empty result set. The engine does no actual storage work.

Despite this apparent uselessness, BLACKHOLE serves real purposes in specific architectural scenarios, particularly in replication topologies.

## Creating a BLACKHOLE Table

```sql
CREATE TABLE event_relay (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type VARCHAR(100) NOT NULL,
  payload JSON,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id)
) ENGINE=BLACKHOLE;

-- Inserts succeed but data is discarded
INSERT INTO event_relay (event_type, payload, created_at)
VALUES ('user.login', '{"user_id": 42}', NOW());

-- SELECT always returns empty
SELECT * FROM event_relay; -- 0 rows
```

## The Binary Log Connection

The key behavior that makes BLACKHOLE useful is that writes to BLACKHOLE tables are still written to the MySQL binary log, provided binary logging is enabled. The data is discarded from storage, but the binary log entry is created.

```sql
-- Enable binary logging on the server (in my.cnf)
-- log_bin = /var/log/mysql/mysql-bin.log
-- binlog_format = STATEMENT

-- Verify binary logging is active
SHOW VARIABLES LIKE 'log_bin';
SHOW BINARY LOG STATUS;
```

Note: Use `binlog_format = STATEMENT` or `MIXED` when working with BLACKHOLE tables. With `ROW` format, DML operations on BLACKHOLE tables are not logged to the binary log because no rows are actually changed.

## Replication Relay Topology

The most common production use of BLACKHOLE is building a replication relay server. A relay server sits between a primary and multiple replicas. The relay server uses BLACKHOLE tables to accept data from the primary, write it to its own binary log, and fan it out to downstream replicas - without actually storing any data itself.

```text
Primary --> Relay Server (BLACKHOLE tables) --> Replica A
                                             --> Replica B
                                             --> Replica C
```

This pattern reduces load on the primary by limiting the number of direct replica connections. The relay server handles the fan-out.

```sql
-- On the relay server, enable log_replica_updates in my.cnf so that
-- events received from the primary are written to the relay's own binary log:
-- log_replica_updates = ON

-- On the relay server, replicate from primary
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'primary-host',
  SOURCE_USER = 'replication_user',
  SOURCE_PASSWORD = 'secret',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;

-- Relay server's tables are BLACKHOLE - data passes through, not stored
-- Downstream replicas connect to the relay server instead of the primary
```

## Benchmarking Without Storage Overhead

BLACKHOLE is also useful for benchmarking MySQL's query processing, network, and binary log overhead in isolation from storage I/O:

```sql
-- Benchmark INSERT throughput without disk write overhead
CREATE TABLE bench_test (
  id INT NOT NULL AUTO_INCREMENT,
  data VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=BLACKHOLE;

-- Run your benchmark INSERTs - measures everything except storage
```

## Checking if BLACKHOLE Is Available

```sql
SHOW ENGINES;
-- Look for BLACKHOLE in the output
-- Support should be YES or DEFAULT
```

## Summary

The MySQL BLACKHOLE storage engine discards all data written to it while still generating binary log entries. Its primary production use is as a replication relay node that fans out changes from a single primary to many replicas without storing data. It is also valuable for benchmarking write paths and testing replication configurations. For any actual data storage need, use InnoDB. BLACKHOLE is a specialized infrastructure component for replication architectures.
