# Validation Summary: How to Handle Failover in MySQL InnoDB Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL InnoDB Cluster
- MySQL Group Replication
- MySQL Shell (mysqlsh)
- MySQL Router
- systemd (for service management)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Cluster (https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html)
- MySQL Shell AdminAPI Reference: Cluster.setPrimaryInstance() (https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1Cluster.html)
- MySQL 8.0 Reference Manual: Group Replication (https://dev.mysql.com/doc/refman/8.0/en/group-replication.html)
- MySQL Shell AdminAPI Reference: dba.rebootClusterFromCompleteOutage() (https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1Dba.html)
- MySQL 8.0 Reference Manual: Fault Tolerance (https://dev.mysql.com/doc/refman/8.0/en/group-replication-fault-tolerance.html)

## Issues Found
No technical issues found.

## Review Notes
- The `user@host:port` connection URI format used in `setPrimaryInstance()`, `rejoinInstance()`, and `forceQuorumUsingPartitionOf()` is valid but less common in official documentation, which typically shows `host:port`. Both formats work correctly in MySQL Shell.
- The `clusterName` parameter in `dba.rebootClusterFromCompleteOutage('myCluster')` was deprecated in MySQL Shell 8.0.29+ (auto-detection was added), but it remains functional for backward compatibility.
- In MySQL 8.0.16+, with `group_replication_start_on_boot=ON` (the default when configured via MySQL Shell), members may auto-rejoin the group on restart without needing `rejoinInstance()`. The post's approach of explicitly calling `rejoinInstance()` is still correct and is the safer/more reliable approach.
- The post uses both `dba.getCluster()` (no parameter) and `dba.getCluster('myCluster')` (with cluster name) across different sections. Both are valid — the parameterless form returns the default cluster.
