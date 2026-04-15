# Validation Summary: How to Use TRUNCATE TABLE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL, DDL statements)
- TRUNCATE TABLE statement
- ALTER TABLE DROP PARTITION
- MergeTree and ReplicatedMergeTree table engines
- ClickHouse cluster (ON CLUSTER clause)

## Sources Consulted
- ClickHouse official documentation: TRUNCATE statement — https://clickhouse.com/docs/en/sql-reference/statements/truncate
- ClickHouse official documentation: ALTER TABLE PARTITION — https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse official documentation: DELETE statement — https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse official documentation: Replication — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication

## Issues Found

### 1. Self-contradictory replication behavior claims (Fixed)
**What was wrong:** The ON CLUSTER section (line 41) stated "TRUNCATE TABLE only affects the local replica by default," but later (line 53) correctly stated that "truncating on one replica is replicated to the other replicas automatically." The official docs confirm that TRUNCATE on ReplicatedMergeTree tables IS propagated to other replicas asynchronously by default. The first statement was misleading and contradicted the second.

**What was changed:** Rewrote the introductory paragraph of the ON CLUSTER section to accurately explain that ReplicatedMergeTree tables automatically replicate truncation, and that ON CLUSTER is needed for non-replicated engines or Distributed tables. Removed the contradictory claim.

### 2. Missing SYNC keyword (Fixed)
**What was wrong:** The official TRUNCATE TABLE syntax includes an optional `SYNC` keyword (`TRUNCATE TABLE [IF EXISTS] [db.]name [ON CLUSTER cluster] [SYNC]`) that makes truncation synchronous across replicas. This was not mentioned anywhere in the post despite the post covering replicated/cluster setups.

**What was changed:** Added a brief explanation of the `SYNC` keyword with a code example in the ON CLUSTER section, noting that truncation on replicated tables is asynchronous by default and `SYNC` can be used to wait for all replicas.

## Review Notes
- The post does not mention that TRUNCATE TABLE is not supported for certain table engines (View, File, URL, Buffer, Null). This is a minor omission that could be added in a future update.
- ALTER TABLE DROP PARTITION physically deletes data after approximately 10 minutes (it first tags the partition as inactive). The blog does not mention this delay, which could be relevant for users expecting immediate disk space reclamation.
- All SQL syntax examples are correct and follow ClickHouse conventions.
- The comparison table (TRUNCATE vs DROP vs DROP PARTITION) is accurate.
- The practical example with CREATE TABLE, INSERT, and TRUNCATE is syntactically correct and uses valid ClickHouse types and engine settings.
