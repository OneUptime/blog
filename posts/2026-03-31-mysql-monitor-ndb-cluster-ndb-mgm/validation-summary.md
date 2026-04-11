# Validation Summary: How to Monitor MySQL NDB Cluster with ndb_mgm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL NDB Cluster
- ndb_mgm (NDB Cluster management client)
- ndb_mgmd (NDB Cluster management server)
- ndbinfo (NDB Cluster information database)
- Bash scripting for monitoring automation

## Sources Consulted
- MySQL 8.0 Reference Manual — ndb_mgm client commands: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-mgm-client-commands.html
- MySQL 8.0 Reference Manual — ndb_mgm program options: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-programs-ndb-mgm.html
- MySQL 8.0 Reference Manual — ndbinfo.transporters table: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-ndbinfo-transporters.html
- MySQL 8.0 Reference Manual — NDB Cluster event reports: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-event-reports.html

## Issues Found

1. **Invalid report type `all report events`**: The REPORT command does not accept "events" as a report type. The valid report types are `MemoryUsage`, `BackupStatus`, and `EventLog`. Changed `all report events` to `ALL REPORT EventLog` in both the interactive and non-interactive command examples.

2. **Incorrect description of `-e` flag as `--events`**: The post described the `-e` flag as the `--events` flag. The `-e` flag is short for `--execute`, which runs a single ndb_mgm command non-interactively. Corrected the description and added guidance on real-time event monitoring via the interactive console and `CLUSTERLOG` commands.

3. **Invalid command `show backups`**: There is no `show backups` command in ndb_mgm. The `SHOW` command only displays cluster configuration. Changed to `ALL REPORT BackupStatus`, which is the correct command to check backup status.

4. **Misleading SQL comment "Transaction statistics"**: The `ndbinfo.transporters` table shows inter-node transport connection information (bytes sent/received, connection status, overload indicators), not database transaction statistics. Changed the comment to "Inter-node transporter statistics".

## Review Notes
- The monitoring bash script uses `grep -oP` (Perl-compatible regex), which requires GNU grep. This works on Linux but not on macOS with the default BSD grep. This is acceptable since NDB Cluster is typically deployed on Linux.
- The `ALL REPORT EventLog` command retrieves events from the data node event log buffers as a one-time snapshot. For continuous real-time event monitoring, the interactive ndb_mgm console or the cluster log file should be used instead. The post now mentions this distinction.
- The `ndbinfo.nodes` table query is correct for MySQL 8.0. The `memoryusage` table query is also correct.
- The default management node port 1186 is correct.
