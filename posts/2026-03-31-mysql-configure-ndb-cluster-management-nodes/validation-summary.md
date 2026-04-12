# Validation Summary: How to Configure MySQL NDB Cluster Management Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL NDB Cluster 8.0
- ndb_mgmd (management node daemon)
- ndb_mgm (management client)
- systemd service configuration
- config.ini cluster topology definition

## Sources Consulted
- MySQL 8.0 Reference Manual -- Defining NDB Cluster Data Nodes (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html)
- MySQL NDB Cluster 8.0 -- Data Node Memory Management (https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-data-node-memory-management.html)
- MySQL NDB Cluster 8.0 -- Safe Shutdown and Restart (https://dev.mysql.com/doc/mysql-cluster-excerpt/8.0/en/mysql-cluster-install-shutdown-restart.html)
- What is New in NDB Cluster 7.6 (https://dev.mysql.com/doc/mysql-cluster-excerpt/5.7/en/mysql-cluster-what-is-new-7-6.html)

## Issues Found

### 1. `IndexMemory` parameter is deprecated in NDB 8.0
- **What was wrong:** The config.ini examples and key parameters section included `IndexMemory=128M`. The `IndexMemory` parameter was deprecated in NDB 7.6.2 and generates a warning in NDB 8.0. In NDB 8.0, all memory for data and indexes is allocated from `DataMemory`. The post targets NDB 8.0.36 (visible in the example output), so this parameter should not be used.
- **What was changed:** Removed `IndexMemory=128M` from the minimal config.ini example and the key parameters section. Updated the `DataMemory` comment to clarify it covers both table data and indexes. Removed the `IndexMemory` mention from the summary paragraph.
- **Why:** Including a deprecated parameter in a tutorial misleads readers and produces management server warnings. The official NDB 8.0 documentation states that IndexMemory is folded into DataMemory.

### 2. `ExecStop` command would shut down the entire cluster
- **What was wrong:** The systemd service file used `ExecStop=/usr/bin/ndb_mgm -e shutdown`. The `SHUTDOWN` command in ndb_mgm terminates all management nodes and all data nodes in the cluster -- not just the local management node process. Using this as ExecStop means that running `systemctl stop ndb_mgmd` or `systemctl restart ndb_mgmd` would cause a full cluster outage.
- **What was changed:** Replaced with `ExecStop=/bin/kill -TERM $MAINPID` to stop only the management node process.
- **Why:** A service stop command should only affect the service being stopped. Shutting down the entire cluster when stopping a single management node is dangerous and unexpected behavior.

## Review Notes
- The post correctly describes the role of the management node, the config.ini structure, and the use of `--initial` flag.
- The `ndb_mgm -e show` verification command and example output are accurate.
- The systemd service `Type=forking` is correct since ndb_mgmd daemonizes by default.
- The default management port 1186 shown in the example output is correct.
- Parameter names in config.ini use lowercase (`hostname`, `datadir`) while official docs use PascalCase (`HostName`, `DataDir`). Both work since the config parser is case-insensitive, so this is not an error.
