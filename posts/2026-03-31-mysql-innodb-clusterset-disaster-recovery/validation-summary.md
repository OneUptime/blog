# Validation Summary: How to Set Up MySQL InnoDB ClusterSet for Disaster Recovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.27+
- MySQL InnoDB ClusterSet
- MySQL Shell (JavaScript API)
- MySQL Group Replication
- Asynchronous replication

## Sources Consulted
- MySQL Shell 8.0 Reference: InnoDB ClusterSet — https://dev.mysql.com/doc/mysql-shell/8.0/en/innodb-clusterset.html
- MySQL 8.0 Reference: Group Replication — https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL Shell 8.0 API: ClusterSet class — https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1ClusterSet.html

## Issues Found

1. **"synchronous Group Replication" → "virtually synchronous Group Replication"**: MySQL Group Replication uses a virtually synchronous replication protocol (Paxos-based consensus), not truly synchronous replication. The official documentation consistently uses the term "virtually synchronous." Changed to match official terminology.

2. **`clusterSetName` → `domainName` in status output**: The `clusterSet.status()` output uses the field name `domainName`, not `clusterSetName`. Updated the example output to match the actual MySQL Shell output format.

3. **Misleading invalidation wording in emergency failover section**: The original text stated "you must invalidate it before rejoining," implying a manual step. In reality, `forcePrimaryCluster()` automatically marks the old primary cluster as INVALIDATED in the metadata. Rewrote to clarify that invalidation is automatic and the user only needs to call `rejoinCluster()` after recovery.

## Review Notes
- The `clusterSet.status()` example output is simplified compared to real output (which includes additional fields like `statusText`, topology details per member, etc.). This is acceptable for a tutorial but readers should expect more verbose output in practice.
- The post could mention that MySQL Shell 8.0.27+ is also required (not just MySQL Server 8.0.27+), though this is implied by the use of MySQL Shell APIs.
- For monitoring replication lag, `clusterSet.status({extended: 1})` provides ClusterSet-specific replication lag information and may be more convenient than running `SHOW REPLICA STATUS` directly on individual nodes. Both approaches are valid.
- The prerequisite about port 3306 is correct for ClusterSet cross-DC replication, though individual InnoDB Cluster nodes also need ports 33061 (Group Replication) and 33060 (X Protocol) open within each data center.
