# Validation Summary: How to Perform Online Upgrades in MySQL NDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL NDB Cluster 8.0
- ndb_mgm (NDB Cluster management client)
- ndb_mgmd (NDB Cluster management server)
- ndbd (NDB Cluster data node daemon)
- mysqld (MySQL SQL node)

## Sources Consulted
- MySQL 8.0 Reference Manual — Performing a Rolling Restart of an NDB Cluster: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-rolling-restart.html
- MySQL 8.0 Reference Manual — NDB Cluster Start Phases: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-start-phases.html
- MySQL 8.0 Reference Manual — NDB Cluster Status Variables: https://dev.mysql.com/doc/mysql-cluster-excerpt/8.0/en/mysql-cluster-status-variables.html

## Issues Found

1. **Upgrade order was incorrect (critical)**: The post stated the upgrade order as "data nodes first, then management nodes, then SQL nodes." Per the official MySQL documentation, the correct order is **management nodes first, then data nodes, then SQL nodes**. The management node must be upgraded and restarted before data nodes so it can properly coordinate the cluster during the rolling upgrade. Fixed by reordering both the "Upgrade Order" list and the Step 1/Step 2 sections, swapping management and data node upgrade procedures.

2. **Startup order claim was incorrect**: The post stated "The upgrade order must follow the same sequence as startup: data nodes first" — the actual NDB Cluster startup order is also management nodes first (data nodes connect to management nodes on startup to obtain configuration). Fixed the sentence to correctly state management nodes first.

3. **Invalid MySQL status variable `ndb_connected`**: The post used `SHOW STATUS LIKE 'ndb_connected'` but no such status variable exists in MySQL. Replaced with `SHOW STATUS LIKE 'Ndb_cluster_node_id'`, which returns the SQL node's cluster node ID (non-zero when connected, 0 when not connected).

## Review Notes
- The post uses `ndbd` to start data nodes. In production environments, `ndbmtd` (multi-threaded data node) is more common for performance reasons, but `ndbd` is still valid and correct.
- For certain major version upgrades, data nodes may need the `--initial` flag when restarting. The post covers a minor/patch upgrade scenario where this is not required, which is appropriate.
- The post only shows Debian/Ubuntu package installation (`dpkg -i`). Users on RHEL/CentOS would use `rpm -Uvh` instead. This is acceptable for a tutorial but worth noting.
