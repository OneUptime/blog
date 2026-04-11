# Validation Summary: How to Start and Stop MySQL NDB Cluster

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MySQL NDB Cluster
- ndb_mgmd (management server daemon)
- ndbd / ndbmtd (data node daemons)
- ndb_mgm (management client)
- systemd service management

## Sources Consulted
- MySQL 8.4 Reference Manual — Initial Startup of NDB Cluster: https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-install-first-start.html
- MySQL 8.4 Reference Manual — Safe Shutdown and Restart of NDB Cluster: https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-install-shutdown-restart.html
- MySQL 8.4 Reference Manual — ndb_mgmd (Management Server Daemon): https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-programs-ndb-mgmd.html
- MySQL 8.4 Reference Manual — ndbd (Data Node Daemon): https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-programs-ndbd.html
- MySQL 8.4 Reference Manual — Commands in the NDB Cluster Management Client: https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-mgm-client-commands.html

## Issues Found

1. **Missing `--initial` flag on first-time `ndb_mgmd` start**: The original command `ndb_mgmd --config-file=/var/lib/mysql-cluster/config.ini` will fail on NDB 8.0.26+ because `ndb_mgmd` requires `--initial` or `--reload` when `--config-file` is specified. Fixed by adding `--initial` to the first-time startup command.

2. **`ndbd --initial` misleadingly presented as routine first-time step**: The original post showed `ndbd --initial` as the standard "first-time initialization" command. Per official docs, `--initial` is not needed for first-time startup and is a destructive operation that erases all data node files and redo logs. It should only be used for software upgrades or as a last resort. Fixed by removing the `--initial` example as the default first-time command and adding a warning block explaining its actual purpose and risks.

3. **Inaccurate `-f` flag description for `restart` command**: The original described `ndb_mgm -e "2 restart -f"` as "Force restart if node is unresponsive." The `-f` flag actually means "force restart even if it would result in an incomplete cluster" (i.e., bypass the node-count check). For unresponsive nodes, the `-a` (abort) flag is more relevant. Fixed the comment to accurately describe what `-f` does.

## Review Notes
- The startup and shutdown order guidance is correct and well-structured.
- The `ndb_mgm` command syntax (`show`, `shutdown`, `node_id stop`, `node_id restart`, `all status`) is all accurate.
- The post could benefit from mentioning the `--reload` flag for `ndb_mgmd` when configuration changes are made after initial setup, but this is not an error.
- The `-a` (abort) flag for `restart` could be mentioned as an alternative when a node is truly unresponsive, but omitting it is not an error.
