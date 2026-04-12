# Validation Summary: How to Use MySQL InnoDB ReplicaSet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- MySQL InnoDB ReplicaSet
- MySQL Shell (JavaScript mode)
- MySQL Router
- GTID-based asynchronous replication

## Sources Consulted
- MySQL Shell 8.0 Reference: InnoDB ReplicaSet — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-innodb-replicaset.html
- MySQL Shell API Reference: dba.createReplicaSet(), ReplicaSet.addInstance(), ReplicaSet.rejoinInstance(), ReplicaSet.forcePrimaryInstance() — https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1ReplicaSet.html
- MySQL Router 8.0 Reference: Bootstrapping — https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-deploying-bootstrapping.html
- MySQL 8.0 Reference: Group Replication — https://dev.mysql.com/doc/refman/8.0/en/group-replication.html

## Issues Found

1. **Description claimed "automated failover support"**: The post description stated InnoDB ReplicaSet has "automated failover support," but ReplicaSet explicitly does NOT support automatic failover — this is a key differentiator from InnoDB Cluster. Changed to "manual failover support."

2. **Wrong method to rejoin instance after forced failover**: The post used `rs.addInstance('admin@primary:3306', {recoveryMethod: 'incremental'})` to rejoin the old primary after `forcePrimaryInstance()`. The correct method is `rs.rejoinInstance('admin@primary:3306')`, which is designed for instances that are already in the ReplicaSet metadata but were invalidated. `addInstance()` is for adding new instances to the topology.

3. **Incorrect MySQL Router bootstrap flag**: The command included `--conf-target-cluster=myReplicaSet`. This flag is for InnoDB ClusterSet deployments to specify which cluster to target, not for InnoDB ReplicaSet. When bootstrapping MySQL Router against a ReplicaSet, Router auto-detects the topology type from the metadata. Removed the incorrect flag.

4. **Group Replication described as "Synchronous"**: The comparison table labeled InnoDB Cluster's Group Replication as "Synchronous." MySQL documentation describes Group Replication as "virtually synchronous" — it uses a consensus protocol (Paxos) to ensure all members acknowledge the transaction, but it is not synchronous in the traditional RDBMS sense. Changed to "Virtually Synchronous (Group Replication)."

## Review Notes
- The `binlog_format = ROW` configuration setting is correct for MySQL 8.0 but is worth noting that in MySQL 8.0.34+, `binlog_format` is deprecated since ROW is the only supported format. It does not cause errors but may produce deprecation warnings in newer versions.
- The post correctly notes that `dba.configureReplicaSetInstance()` should be run before adding replicas, which is a step sometimes overlooked in other tutorials.
- The `rs.status()` output shown is a simplified representation; actual output includes additional fields like `statusText`, `instanceErrors`, and replication lag details, but the simplification is appropriate for a tutorial.
