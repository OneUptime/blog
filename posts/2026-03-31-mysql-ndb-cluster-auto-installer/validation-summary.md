# Validation Summary: How to Use NDB Cluster Auto-Installer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL NDB Cluster
- NDB Cluster Auto-Installer (`ndb_setup.py`)
- NDB Cluster configuration (`config.ini`)
- NDB management client (`ndb_mgm`)

## Sources Consulted
- MySQL NDB Cluster 7.6 documentation for `ndb_setup.py` command-line options (https://dev.mysql.com/doc/refman/5.7/en/mysql-cluster-installer.html)
- MySQL NDB Cluster configuration parameter reference for `IndexMemory` and `DataMemory` (https://dev.mysql.com/doc/refman/5.7/en/mysql-cluster-ndbd-definition.html)
- MySQL NDB Cluster release notes for Auto-Installer introduction history (NDB 7.3)

## Issues Found

1. **Incorrect introduction version**: The post stated the Auto-Installer was "introduced in MySQL Cluster 7.5". It was actually introduced in MySQL Cluster NDB 7.3. Fixed to "introduced in MySQL Cluster 7.3".

2. **Incorrect command-line flag**: The post used `--host=0.0.0.0` as a flag for `ndb_setup.py`. The correct option name is `--server-name`. Fixed to `--server-name=0.0.0.0`.

3. **Missing IndexMemory deprecation note**: The post listed `IndexMemory` as a configuration parameter and included it in the `config.ini` example without noting that it is deprecated in NDB 7.6 and removed in NDB 8.0. Since the post explicitly covers NDB 7.6 and early 8.0, a deprecation note was added advising readers to size `DataMemory` to cover both data and index storage in NDB 7.6+.

## Review Notes
- The `config.ini` example uses lowercase parameter names (`hostname`, `datadir`) rather than the PascalCase forms used in official documentation (`HostName`, `DataDir`). NDB Cluster configuration parameters are case-insensitive, so this is not technically wrong, but it differs from the canonical style in MySQL documentation.
- The Auto-Installer itself is deprecated and removed in NDB 8.0.22+. The post already notes this, which is good. Readers using current NDB 8.0 releases will need to configure clusters manually or use other tooling.
- The default port 8081 used in the examples is correct for `ndb_setup.py`.
