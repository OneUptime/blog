# Validation Summary: How to Set Up MySQL NDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL NDB Cluster (NDB 8.0)
- Management nodes (`ndb_mgmd`)
- Data nodes (`ndbd` / `ndbmtd`)
- SQL nodes (`mysqld` with NDB engine)
- `ndb_mgm` management client

## Sources Consulted
- MySQL NDB Cluster 8.0 official documentation: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster.html
- MySQL NDB Cluster configuration parameters (ndbd default): https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html
- MySQL NDB Cluster `IndexMemory` deprecation notice (removed in NDB 8.0): https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html#ndbparam-ndbd-indexmemory
- `ndbinfo.memory_per_fragment` table reference: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbinfo-memory-per-fragment.html
- `ndb_transid_mysql_connection_map` table reference: https://dev.mysql.com/doc/refman/8.0/en/information-schema-ndb-transid-mysql-connection-map-table.html

## Issues Found

1. **`IndexMemory` parameter removed in NDB 8.0**: The `[ndbd default]` section in `config.ini` included `IndexMemory = 128M`. This parameter was deprecated in NDB 7.6 and removed in NDB 8.0. Since the post references NDB 8.0.28 in its SHOW output, this parameter is invalid. In NDB 8.0+, `DataMemory` manages both data and index storage. **Fix:** Removed the `IndexMemory = 128M` line from the config.

2. **Wrong table for verifying data distribution**: The query to verify data distribution used `information_schema.ndb_transid_mysql_connection_map`, which only contains columns for mapping NDB transaction IDs to MySQL connection IDs (`mysql_connection_id`, `node_id`). It does not have `fragment_num` or `fixed_elem_count` columns. **Fix:** Changed the query to use `ndbinfo.memory_per_fragment` with a `WHERE fq_name LIKE '%orders%'` filter, which correctly exposes `node_id`, `fragment_num`, and `fixed_elem_count` for fragment-level data distribution inspection.

## Review Notes
- The Mermaid diagram shows 4 data nodes across 2 node groups, while the actual config.ini only defines 2 data nodes (forming a single node group). The diagram is illustrative of a larger deployment architecture, but readers may find the mismatch with the tutorial config confusing. A future revision could either align the diagram to 2 data nodes or expand the config to 4 data nodes.
- The data node configuration section includes a `[mysqld]` section in `/etc/my.cnf`, which is unnecessary for hosts that only run `ndbd`. Data nodes read their configuration from the management server. This is harmless but slightly misleading.
- The `--initial` flag on `ndb_mgmd` and `ndbd` is correctly noted for first-time startup. The post could benefit from a warning that `--initial` should NOT be used on subsequent restarts as it wipes local data node state.
