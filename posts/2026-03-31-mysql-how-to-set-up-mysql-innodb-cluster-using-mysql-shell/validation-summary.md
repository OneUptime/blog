# Validation Summary: How to Set Up MySQL InnoDB Cluster Using MySQL Shell

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (InnoDB Cluster)
- MySQL Group Replication
- MySQL Shell AdminAPI
- MySQL Router

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Cluster: https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html
- MySQL 8.0 Reference Manual — Group Replication: https://dev.mysql.com/doc/refman/8.0/en/group-replication.html
- MySQL Shell AdminAPI Reference: https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/group__AdminAPI.html
- MySQL Router Documentation: https://dev.mysql.com/doc/mysql-router/8.0/en/

## Issues Found
1. **Group Replication described as "synchronous"** — Changed to "virtually synchronous." MySQL Group Replication uses a certification-based consensus protocol where transactions are certified by the group before commit on the originator, but applied asynchronously on other members. The official MySQL documentation consistently uses the term "virtually synchronous" to describe this behavior. Calling it simply "synchronous" overstates the consistency guarantee.

## Review Notes
- The AdminAPI calls (`dba.configureInstance`, `dba.createCluster`, `cluster.addInstance`, `cluster.status`, `cluster.removeInstance`, `cluster.rejoinInstance`, `cluster.forceQuorumUsingPartitionOf`, `cluster.dissolve`) are all correct and current for MySQL 8.0+.
- MySQL Router default ports 6446 (R/W) and 6447 (R/O) are correct.
- Port 33061 for Group Replication communication is the correct default.
- The `cluster.status()` output structure accurately reflects a single-primary 3-node cluster.
- The prerequisite about MySQL Shell being needed "on each node" is slightly imprecise — you only need MySQL Shell on the machine running admin commands — but it is not wrong advice and having it available on each node is reasonable for operational convenience.
