# Validation Summary: How to Configure NDB Cluster Memory Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL NDB Cluster (NDB 7.x and 8.0)
- NDB Cluster Management Client (ndb_mgm)
- NDB Cluster configuration (config.ini)
- ndbinfo schema for monitoring

## Sources Consulted
- MySQL NDB Cluster 8.0 Documentation: DataMemory parameter — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html#ndbparam-ndbd-datamemory
- MySQL NDB Cluster 8.0 Documentation: IndexMemory deprecation — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html#ndbparam-ndbd-indexmemory
- MySQL NDB Cluster 8.0 Documentation: TransactionMemory — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html#ndbparam-ndbd-transactionmemory
- MySQL NDB Cluster 8.0 Documentation: ndbinfo.memoryusage table — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbinfo-memoryusage.html
- MySQL NDB Cluster 8.0 Documentation: Node groups and replicas — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-nodes-groups.html

## Issues Found

### Issue 1: IndexMemory deprecation not mentioned
- **What was wrong:** The post presented `IndexMemory` as a current, actively-used parameter alongside `TransactionMemory` (MySQL 8.0+), without noting that `IndexMemory` is deprecated in NDB 8.0. In NDB 8.0, hash indexes are allocated from `DataMemory`, and setting `IndexMemory` generates a warning.
- **What was changed:** Added a deprecation note to the IndexMemory section clarifying it applies to NDB 7.6 and earlier. Updated the inline comment in the key parameters snippet. Updated the summary paragraph to include the version caveat.
- **Why:** Readers using MySQL 8.0 would configure a deprecated parameter; those planning new clusters need to know that hash index memory comes from `DataMemory` in NDB 8.0.

### Issue 2: Incorrect node group calculation in sizing example
- **What was wrong:** The example stated "50GB of row data distributed across 2 data nodes with `NoOfReplicas=2`" and then calculated "split across 2 node groups = 25GB per node." With 2 data nodes and `NoOfReplicas=2`, there is only 1 node group (node_groups = data_nodes / NoOfReplicas = 2/2 = 1). Each node in that single group stores the full 50GB dataset.
- **What was changed:** Changed "2 data nodes" to "4 data nodes" so the calculation is correct: 4 nodes / NoOfReplicas=2 = 2 node groups, with data partitioned across the 2 groups at ~25GB per node.
- **Why:** The original calculation would lead readers to dramatically under-provision memory (allocating 30GB when 60GB+ is needed), causing immediate `Table is full` errors in production.

## Review Notes
- The post covers both pre-8.0 and 8.0 NDB configurations, which is useful but increases the chance of readers applying version-mismatched advice. The added deprecation notes help mitigate this.
- The claim that memory changes require only a rolling restart is correct for increasing `DataMemory`. Decreasing `DataMemory` may require an initial restart (with `--initial` flag) depending on the NDB version, but this edge case is acceptable to omit in a getting-started guide.
- The `ndb_mgm -e "2 restart"` syntax and `ndbinfo.memoryusage` query are correct and verified.
- The 40 bytes per row rule of thumb for primary key hash indexes is a reasonable approximation (actual overhead is ~21-25 bytes plus the primary key column size).
