# Validation Summary: How to Add Nodes to a MySQL NDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL NDB Cluster
- NDB management node (ndb_mgmd)
- NDB data nodes (ndbd)
- NDB management client (ndb_mgm)
- SQL/API nodes in NDB Cluster

## Sources Consulted
- MySQL NDB Cluster documentation: Adding NDB Cluster Data Nodes Online (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-online-add-node.html)
- MySQL NDB Cluster documentation: ndb_mgmd — The NDB Cluster Management Server Daemon (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndb-mgmd.html)
- MySQL NDB Cluster documentation: NDB Cluster Configuration (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-configuration.html)
- MySQL NDB Cluster documentation: Commands in the NDB Cluster Management Client (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-mgm-client-commands.html)

## Issues Found

1. **Overview incorrectly stated a rolling restart is required**: The overview claimed "Adding data nodes requires a rolling restart of the cluster to redistribute data across the new nodes." This is inaccurate for the online node addition procedure described in the post (available since NDB 7.4+). Existing data nodes do not need to be restarted. Changed to accurately describe the steps: updating configuration, starting new nodes, creating a node group, and redistributing data.

2. **Missing CREATE NODEGROUP step**: After starting new data nodes with `--initial`, the post went directly to redistributing data. A critical step was missing: you must explicitly create the new node group using `CREATE NODEGROUP` in the management client before the new nodes can store data. Added as Step 6 with the command `ndb_mgm -e "CREATE NODEGROUP 4,5"`.

3. **Management node reload requires stop first**: Both instances of `ndb_mgmd --reload` were presented as if they could be run while the management node was already running. The `--reload` flag is a startup option — if the management node is already running and bound to its port, a new instance would fail to start. Added `ndb_mgm -e "1 stop"` before each `ndb_mgmd --reload` command and updated the heading/description to clarify this is a stop-and-restart procedure.

4. **Summary missing CREATE NODEGROUP mention**: Updated the summary paragraph to include the `CREATE NODEGROUP` step in the list of required actions.

## Review Notes
- The config parameter names use lowercase (`hostname`, `datadir`) rather than the conventional CamelCase (`HostName`, `DataDir`) from the documentation. Both work since NDB config parameters are case-insensitive, but CamelCase would better match official documentation style.
- The post does not specify which NDB Cluster version the procedure applies to. The online node addition procedure described is available in NDB 7.4 and later. Earlier versions required a full rolling restart.
- The post assumes a single management node with ID 1. In production clusters with multiple management nodes, the stop-and-restart procedure would need to be adapted for a rolling restart of all management nodes.
