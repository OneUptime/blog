# Validation Summary: How to Configure MySQL Group Replication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- MySQL Group Replication
- MySQL replication and GTID configuration
- MySQL Performance Schema
- MySQL Router
- MySQL Connector/Python
- SSL/TLS for MySQL replication

## Sources Consulted
- MySQL 8.4 Reference Manual: Configuring an Instance for Group Replication: https://dev.mysql.com/doc/refman/8.4/en/group-replication-configuring-instances.html
- MySQL 8.4 Reference Manual: User Credentials For Distributed Recovery: https://dev.mysql.com/doc/refman/8.4/en/group-replication-user-credentials.html
- MySQL 8.4 Reference Manual: Bootstrapping the Group: https://dev.mysql.com/doc/refman/8.4/en/group-replication-bootstrap.html
- MySQL 8.4 Reference Manual: Adding Instances to the Group: https://dev.mysql.com/doc/refman/8.4/en/group-replication-adding-instances.html
- MySQL 8.4 Reference Manual: Group Replication Variables: https://dev.mysql.com/doc/refman/8.4/en/group-replication-options.html
- MySQL 8.4 Reference Manual: Options and Variables Added, Deprecated, or Removed: https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/added-deprecated-removed.html
- MySQL 8.4 Reference Manual: Group Replication primary function: https://dev.mysql.com/doc/refman/8.4/en/group-replication-functions-for-new-primary.html
- MySQL 8.4 Reference Manual: Group Replication mode functions: https://dev.mysql.com/doc/refman/8.4/en/group-replication-functions-for-mode.html
- MySQL 8.4 Reference Manual: replication_group_member_stats table: https://dev.mysql.com/doc/refman/8.4/en/group-replication-replication-group-member-stats.html
- MySQL 8.4 Reference Manual: Responses to Failure Detection and Network Partitioning: https://dev.mysql.com/doc/refman/8.4/en/group-replication-responses-failure.html
- MySQL 8.4 Reference Manual: Securing Group Communication Connections with SSL: https://dev.mysql.com/doc/refman/8.4/en/group-replication-secure-socket-layer-support-ssl.html
- MySQL Router 8.4 Manual: Bootstrapping MySQL Router: https://dev.mysql.com/doc/mysql-router/8.4/en/mysql-router-deploying-bootstrapping.html
- MySQL Router 8.4 Manual: mysqlrouter command line options: https://dev.mysql.com/doc/mysql-router/8.4/en/mysqlrouter.html
- MySQL Connector/Python Manual: Connection Arguments and failover: https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html

## Issues Found
- The post used `MySQL 8.0 or later` while the examples use replication terminology and options introduced in later 8.0 releases. Changed the prerequisite to MySQL 8.0.26 or later.
- The configuration used deprecated or removed replication options: `log_slave_updates`, `master_info_repository`, `relay_log_info_repository`, `transaction_write_set_extraction`, `slave_parallel_workers`, `slave_preserve_commit_order`, and `slave_parallel_type`. Updated to current `replica_*` names where applicable and removed options that are removed or unnecessary in current MySQL.
- The primary-check query used the removed `group_replication_primary_member` status variable. Replaced it with a check against the `MEMBER_ROLE` column in `performance_schema.replication_group_members`.
- The rejoin troubleshooting commands used old `SLAVE` terminology. Updated `SHOW SLAVE STATUS` and `RESET SLAVE` to `SHOW REPLICA STATUS` and `RESET REPLICA`.
- The MySQL Router section implied that Router bootstrapping works directly against the manually configured Group Replication setup. Clarified that bootstrapping applies to InnoDB Cluster deployments built on Group Replication, and changed the bootstrap example to use an administrative bootstrap account instead of the replication user.
- The MySQL Router start command used `systemctl` after creating a self-contained `--directory` configuration. Updated it to start Router with the generated configuration file.
- The Connector/Python failover example included `priority` keys, which are not listed as permitted failover dictionary values in the official Connector/Python documentation. Removed those keys.

## Review Notes
The remaining examples are broadly accurate for a MySQL 8.0.26+ / 8.4-oriented Group Replication tutorial. For future improvement, the guide could explicitly distinguish a manually configured Group Replication group from a MySQL Shell AdminAPI-managed InnoDB Cluster, because MySQL Router's metadata-cache bootstrap workflow is designed for InnoDB Cluster metadata.
