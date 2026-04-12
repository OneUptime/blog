# Validation Summary: How to Configure MySQL NDB Cluster SQL Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL NDB Cluster
- MySQL Server (mysqld) as SQL/API node
- NDB Cluster management node (ndb_mgm)
- NDB storage engine

## Sources Consulted
- MySQL NDB Cluster documentation: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster.html
- MySQL NDB Cluster SQL Node configuration: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-options-variables.html
- MySQL NDB Cluster status variables: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-status-variables.html
- MySQL NDB Cluster config.ini reference: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-api-definition.html
- MySQL NDB Cluster connection pooling: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-options-variables.html#option_mysqld_ndb-cluster-connection-pool

## Issues Found
1. **Non-existent `ndb_connected` status variable**: The post used `SHOW STATUS LIKE 'ndb_connected'` and showed it returning "ON". There is no MySQL status variable called `ndb_connected`. Replaced with `Ndb_cluster_node_id` (a non-zero value confirms the SQL node is connected) and `Ndb_number_of_data_nodes` as a secondary check. Also updated the summary paragraph that referenced this variable.

2. **`ndb-cluster-connection-pool` and `ndb-cluster-connection-pool-nodeids` mismatch**: The pool size was set to 4 but only 2 node IDs were listed (4, 5). The number of IDs in `ndb-cluster-connection-pool-nodeids` must match the `ndb-cluster-connection-pool` value. Fixed pool size to 2 to match the 2 node IDs and the 2 SQL nodes used throughout the example.

3. **`ndb-batch-size=32768` is the default value**: The comment said "Increase API batch sizes" but 32768 bytes is the default for `ndb_batch_size`. Changed the value to 65536 so it actually represents an increase, and updated the comment to note the default.

## Review Notes
- The `ndb-cluster-connection-pool-nodeids` parameter requires that each listed node ID has a corresponding `[mysqld]` slot in the management node's `config.ini`. Users following this tutorial would need to add additional `[mysqld]` sections if using a pool size greater than 1.
- The `ENGINE=NDBCLUSTER` syntax is correct; MySQL also accepts `ENGINE=NDB` as an alias.
- The `DEFAULT NOW()` expression in the CREATE TABLE is valid for MySQL 8.0+ with NDB tables.
