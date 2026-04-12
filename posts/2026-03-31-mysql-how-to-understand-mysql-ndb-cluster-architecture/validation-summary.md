# Validation Summary: How to Understand MySQL NDB Cluster Architecture

## Status
validated

## Post Type
Tutorial / Architectural Guide

## Technologies Covered
- MySQL NDB Cluster (NDB storage engine)
- ndb_mgmd (management node daemon)
- ndbd / ndbmtd (data node daemons)
- mysqld with NDBCLUSTER engine
- ndb_mgm (management client)
- ndbinfo system database

## Sources Consulted
- MySQL NDB Cluster 8.0 official documentation: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster.html
- NDB Cluster configuration parameters (ndbd default): https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html
- NDB Cluster `IndexMemory` deprecation notes: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html#ndbparam-ndbd-indexmemory
- NDB Cluster foreign key support: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndb-innodb-engines.html
- ndbinfo.memoryusage table: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbinfo-memoryusage.html

## Issues Found

1. **`IndexMemory` parameter in config snippet (line 64)**: The `[ndbd default]` config snippet included `IndexMemory=128M`. This parameter was deprecated in NDB Cluster 7.6 and removed in NDB 8.0. Since the post references NDB 8.0.32 in the example output, this parameter is invalid. In NDB 8.0, index memory is managed as part of `DataMemory`. Removed the `IndexMemory=128M` line.

2. **Incorrect version reference and misleading FK statement (line 158)**: The original text read "No foreign key enforcement across nodes (limited support in MySQL 7.3+)". Two problems: (a) There is no "MySQL 7.3" — the correct product name is "NDB Cluster 7.3" (which shipped with MySQL 5.6). (b) NDB Cluster 7.3+ fully supports foreign keys, not merely "limited support." There are specific restrictions (e.g., SET DEFAULT action is not supported, and ON UPDATE CASCADE is not supported where the reference is to the parent table's primary key). Changed to: "Foreign keys supported since NDB Cluster 7.3, but with some restrictions (e.g., SET DEFAULT not supported)".

## Review Notes
- The `--connect-string` flag used with `ndbd` is a historically supported synonym; the canonical flag in NDB 8.0 documentation is `--ndb-connectstring`. Both work, but future posts may want to use the canonical form.
- The claim "Tables must fit in data node memory (DataMemory setting)" is accurate for the default in-memory storage mode, but NDB 8.0 also supports Disk Data tables where only indexes reside in memory. This is a valid simplification for an introductory article.
- The startup command uses `--initial` on both management and data nodes, which is correct for a first-time start but would destroy existing data on subsequent starts. The post doesn't explicitly warn about this, which could be worth noting in a future revision.
- All SQL syntax, ndb_mgm commands, config file structure, and the ndbinfo query are correct.
