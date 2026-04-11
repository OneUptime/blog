# Validation Summary: What Is MySQL NDB Cluster

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- MySQL NDB Cluster (NDBCLUSTER storage engine)
- ndbd / ndbmtd (data node daemons)
- ndb_mgmd (management node daemon)
- ndb_mgm (management client)
- mysqld with NDB plugin

## Sources Consulted
- MySQL 8.0 NDB Cluster documentation: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster.html
- MySQL NDB Cluster configuration parameters: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html
- ndbd command options: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndbd.html
- ndb_mgmd command options: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndb-mgmd.html
- NDB Cluster CREATE TABLE documentation: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndb-innodb-engines.html

## Issues Found
1. **Deprecated `--connect-string` flag for ndbd**: The `ndbd --connect-string=mgmt1` command used the deprecated `--connect-string` option. Changed to `ndbd --ndb-connectstring=mgmt1`, which is the canonical and current option name. This also makes the ndbd command consistent with the mysqld command on the next line, which already correctly uses `--ndb-connectstring`.

## Review Notes
- The NDB vs InnoDB comparison table describes NDB data storage as "In-memory primary," which is a reasonable simplification. NDB Cluster does support Disk Data tables (since NDB 6.2), but in-memory is the default and primary storage mode.
- The JOIN performance note "(no local joins)" is imprecise but directionally correct. NDB 7.2+ introduced pushed-down joins that improve cross-node join performance, but joins remain fundamentally weaker than InnoDB due to data distribution across nodes.
- For first-time cluster initialization, data nodes typically need `ndbd --initial`, but the post covers general startup, not first-time setup, so omitting `--initial` is acceptable.
- The post does not specify a MySQL NDB Cluster version. All information is accurate for MySQL 8.0 NDB Cluster (current GA release).
