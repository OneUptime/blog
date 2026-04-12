# Validation Summary: How to Remove Instances from a MySQL InnoDB Cluster

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- MySQL InnoDB Cluster
- MySQL Shell (AdminAPI)
- MySQL Group Replication
- MySQL Router

## Sources Consulted
- MySQL Shell JavaScript API Reference — `dba` global object methods: https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1_Dba.html
- MySQL Shell AdminAPI — Working with InnoDB Cluster: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-innodb-cluster-working-with-cluster.html
- MySQL Router — InnoDB Cluster integration and metadata cache: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-innodb-cluster.html
- MySQL Group Replication — Fault tolerance and quorum: https://dev.mysql.com/doc/refman/8.0/en/group-replication-fault-tolerance.html
- MySQL Shell Connection Data documentation: https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/latest/connection_data.html

## Issues Found

### 1. `dba.resetInstance()` does not exist (Critical)
- **What was wrong:** The post used `dba.resetInstance('admin@node4:3306')` to clean up a removed instance. This method does not exist in the MySQL Shell AdminAPI.
- **What was changed:** Replaced with the correct method `dba.dropMetadataSchema()`, which removes the InnoDB Cluster metadata schema from the instance. Added `shell.connect()` call since `dropMetadataSchema()` operates on the current session.
- **Why:** The `dba` global object has no `resetInstance()` method. The correct method for removing cluster metadata from an instance is `dba.dropMetadataSchema()`.

### 2. Incorrect quorum claim for single-node cluster (Medium)
- **What was wrong:** The post stated "Removing a second would leave 1 node with no quorum." This is incorrect when using `removeInstance()` — proper removal updates group membership, so a 1-node cluster has quorum (1 of 1 = majority).
- **What was changed:** Corrected to explain that a 1-node cluster after `removeInstance()` has `OK_NO_TOLERANCE` status (has quorum but no fault tolerance), and clarified the difference from a node crashing without proper removal (which WOULD cause `NO_QUORUM`).
- **Why:** Quorum is based on current group membership. `removeInstance()` properly updates membership, unlike a crash.

### 3. MySQL Router restart presented as required (Low)
- **What was wrong:** The post stated "restart MySQL Router so it updates its cached topology" implying a restart is necessary.
- **What was changed:** Clarified that MySQL Router automatically detects topology changes through its metadata cache, and a restart is optional to force an immediate refresh.
- **Why:** MySQL Router maintains an active metadata cache connection and queries cluster state in real-time. It picks up membership changes automatically.

### 4. Inaccurate confirmation message output (Low)
- **What was wrong:** The example output after `removeInstance()` contained fabricated text ("Metadata cache may need to be updated") that doesn't match actual MySQL Shell output.
- **What was changed:** Updated to match the actual MySQL Shell output, which mentions "Metadata session might become invalid" and includes the "Attempting to leave from the Group Replication group..." line.
- **Why:** Example output should accurately reflect what users will see when running the commands.

## Review Notes
- The `cluster.status()` example output is simplified compared to real output (which wraps topology inside a `defaultReplicaSet` object and includes additional fields like `memberRole`, `mode`, and `version`). This is acceptable for a tutorial but readers should expect more verbose output in practice.
- The `summary` section was also updated to reference `dba.dropMetadataSchema()` instead of `dba.resetInstance()` and to note that MySQL Router updates automatically.
