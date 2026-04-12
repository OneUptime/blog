# Validation Summary: How to Configure Flow Control in MySQL Group Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- MySQL Group Replication
- MySQL Performance Schema (`replication_group_member_stats`, `replication_group_members`)
- Flow control system variables (`group_replication_flow_control_*`)

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication Flow Control — https://dev.mysql.com/doc/refman/8.0/en/group-replication-flow-control.html
- MySQL 8.0 Reference Manual: Group Replication System Variables — https://dev.mysql.com/doc/refman/8.0/en/group-replication-options.html
- MySQL 8.0 Reference Manual: replication_group_member_stats Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-member-stats-table.html
- MySQL 8.0 Reference Manual: replication_group_members Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html
- MySQL 8.0 Reference Manual: Group Replication Status Variables — https://dev.mysql.com/doc/refman/8.0/en/group-replication-status-variables.html

## Issues Found

1. **`SHOW STATUS` used instead of `SHOW VARIABLES`**: The post used `SHOW STATUS LIKE 'group_replication_flow_control%'` to check flow control status. There are no MySQL server status variables with the `group_replication_flow_control` prefix — these are all system variables. The query would return an empty result set. Fixed by changing to `SHOW VARIABLES LIKE 'group_replication_flow_control%'` and updating the description from "Check whether flow control is currently active" to "Check the current flow control configuration."

2. **Misleading SQL comments on threshold variables**: The comment for `group_replication_flow_control_certifier_threshold` said "Maximum certified transactions waiting" which implies transactions that have already been certified. In reality, these are transactions waiting *to be* certified (in the certifier queue). Similarly, the applier threshold comment said "Maximum applied transactions waiting" but they are transactions waiting *to be* applied. Fixed both comments to say "Maximum transactions in the certifier/applier queue."

## Review Notes
- The `group_replication_flow_control_period` variable has a valid range of 1-60 seconds per the MySQL docs. The post doesn't mention the upper limit, which could be useful for readers considering tuning this value.
- MySQL 8.0.2+ added additional flow control variables (`group_replication_flow_control_hold_percent`, `group_replication_flow_control_max_quota`, `group_replication_flow_control_min_quota`, `group_replication_flow_control_min_recovery_quota`, `group_replication_flow_control_member_quota_percent`, `group_replication_flow_control_release_percent`) that provide finer-grained tuning. The post covers the core variables which is appropriate for an introductory guide.
- All SQL queries are syntactically correct and reference valid performance_schema columns.
- The JOIN between `replication_group_member_stats` and `replication_group_members` using `MEMBER_ID` is correct.
