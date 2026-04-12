# Validation Summary: How to Configure MySQL NDB Cluster Data Nodes

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL NDB Cluster 8.0
- ndbd / ndbmtd (NDB Cluster data node daemons)
- NDB Cluster management configuration (config.ini)
- systemd service configuration
- ndb_mgm (NDB management client)

## Sources Consulted
- MySQL 8.0 Reference Manual: Defining NDB Cluster Data Nodes — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbd-definition.html
- MySQL 8.0 Reference Manual: NDB Cluster Data Node Memory Management — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-data-node-memory-management.html
- MySQL 8.0 Reference Manual: Options, Variables, and Parameters Added, Deprecated or Removed in NDB 8.0 — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-added-deprecated-removed.html
- MySQL 8.0 Reference Manual: ndbinfo memoryusage Table — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbinfo-memoryusage.html

## Issues Found

### 1. Deprecated `IndexMemory` parameter in config.ini example
- **What was wrong:** The `[ndbd default]` configuration example included `IndexMemory=256M`. The `IndexMemory` parameter was deprecated in NDB 7.6.2 and remains deprecated in NDB 8.0 (the version the post targets, as shown in the `ndb_mgm -e show` example output referencing `ndb-8.0.36`). Setting `IndexMemory` in NDB 8.0 triggers a warning from the management server, and its value is silently folded into the `DataMemory` pool.
- **What was changed:** Removed `IndexMemory=256M` from the `[ndbd default]` configuration example.
- **Why:** A configuration tutorial targeting NDB 8.0 should not recommend setting a deprecated parameter that produces warnings and does not behave as readers would expect (they would assume separate memory pools for data and indexes, but in NDB 8.0 all memory is managed through `DataMemory`).

### 2. Summary referenced `IndexMemory` as a parameter to set
- **What was wrong:** The summary section stated "Set `DataMemory` and `IndexMemory` to fit your entire working dataset in memory," which recommends using a deprecated parameter.
- **What was changed:** Updated to "Set `DataMemory` to fit your entire working dataset (data and indexes) in memory," which accurately reflects NDB 8.0 behavior where `DataMemory` covers both data and index storage.
- **Why:** Consistent with the fix to the config example; readers should understand that `DataMemory` is the single parameter for all in-memory storage in NDB 8.0.

## Review Notes
- The `ALL REPORT MEMORY` section states the output shows `DataMemory` and `IndexMemory` usage percentages. In NDB 8.0, the memory report still shows separate "Data memory" and "Index memory" usage internally (indexes are tracked separately for reporting even though they draw from the `DataMemory` pool), so this description is technically accurate.
- The systemd service `ExecStop` command is hardcoded to node ID 2 (`ndb_mgm -e "2 stop"`). This is correct for that specific node but readers deploying multiple data nodes should adjust the node ID per host. This is a usability note, not a technical error.
- Configuration parameter names in config.ini (e.g., `hostname` vs `HostName`, `datadir` vs `DataDir`) use inconsistent casing. NDB Cluster config parameters are case-insensitive so both forms work, but the official documentation uses `HostName` and `DataDir`.
