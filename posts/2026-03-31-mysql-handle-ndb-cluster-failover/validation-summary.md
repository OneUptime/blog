# Validation Summary: How to Handle NDB Cluster Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL NDB Cluster 8.0
- ndb_mgm (NDB Cluster management client)
- ndbd (NDB Cluster data node daemon)
- ndb_mgmd (NDB Cluster management server daemon)
- HAProxy (for SQL node load balancing)

## Sources Consulted
- MySQL NDB Cluster Management Client Commands: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-mgm-client-commands.html
- NDB Cluster Data Node Configuration Parameters: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html
- Summary of NDB Cluster Start Phases: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-start-phases.html
- ndbd — The NDB Cluster Data Node Daemon: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndbd.html
- ndb_mgmd — The NDB Cluster Management Server Daemon: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndb-mgmd.html

## Issues Found

1. **Incorrect ndb_mgm startup phase output format**: The blog showed `Node 2: starting, StartPhase 4 of 6` which is not the actual output format. NDB Cluster has start phases 0-9 plus 100-101 (not just 6), and the real output uses the format `Node 2: starting (Last completed phase 4) (mysql-8.0.36 ndb-8.0.36)`. Fixed to match actual ndb_mgm output.

2. **TimeBetweenLocalCheckpoints in failover prevention section**: This parameter controls how frequently local checkpoints (LCPs) are taken based on write volume (expressed as a base-2 logarithm). It has nothing to do with heartbeats or failover detection. Removed it from the "Preventing False Failovers" configuration block, which now correctly contains only the heartbeat parameters.

3. **Missing --reload flag for ndb_mgmd restart**: Starting with NDB 8.0.26, `ndb_mgmd` refuses to start if `--config-file` is specified without also specifying `--reload` or `--initial`, because the management server uses a configuration cache by default. Added `--reload` to the restart command.

## Review Notes
- The HeartbeatIntervalDbDb and HeartbeatIntervalDbApi values of 15000ms shown in the blog are 10x the default of 1500ms. This is a valid configuration choice for preventing false failovers on unstable networks, but readers should be aware this increases failure detection time to approximately 45 seconds (3 missed heartbeats x 15 seconds). The blog could benefit from noting this trade-off.
- The HAProxy configuration shown uses `option mysql-check` which performs a basic MySQL handshake check. For production use, a more thorough health check (e.g., querying a status table) would be more robust.
- The advice to avoid `--initial` when restarting an existing data node is correct and important — using `--initial` erases recovery files and forces a full data sync from the surviving replica, which is unnecessary and much slower.
