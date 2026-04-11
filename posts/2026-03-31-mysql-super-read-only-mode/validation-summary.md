# Validation Summary: How to Enable and Disable MySQL Super Read-Only Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+
- MySQL super_read_only and read_only system variables
- MySQL replication (SHOW REPLICA STATUS, STOP REPLICA)
- MySQL InnoDB Cluster / Group Replication
- MySQL performance_schema
- MySQL Orchestrator and MHA (failover tools)

## Sources Consulted
- MySQL WL#6799: Super-read-only that also blocks SUPER users — https://dev.mysql.com/worklog/task/?id=6799
- MySQL 8.0 Reference Manual: Server System Variables (super_read_only) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_super_read_only
- MySQL 8.0 Error Reference (Error 1290 / ER_OPTION_PREVENTS_STATEMENT) — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0: Single-Primary Mode — https://dev.mysql.com/doc/refman/8.0/en/group-replication-single-primary-mode.html
- MySQL 8.0: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- Patroni Documentation — https://patroni.readthedocs.io/en/latest/README.html (confirmed PostgreSQL-only)

## Issues Found
1. **Patroni incorrectly listed as a MySQL failover tool (line 85):** The post originally stated "Orchestrator or Patroni for MySQL" as automated failover tools. Patroni is exclusively a PostgreSQL HA tool and does not support MySQL. Changed to "Orchestrator or MHA (Master High Availability)" which are actual MySQL failover tools.

## Review Notes
- The failover sequence explicitly runs `SET GLOBAL super_read_only = OFF` then `SET GLOBAL read_only = OFF` as separate steps. Since setting `read_only = OFF` automatically sets `super_read_only = OFF` (per MySQL WL#6799 FR3), the first step is technically redundant. However, the explicit two-step approach is not incorrect and is arguably clearer for operational runbooks, so it was left as-is.
- The comparison table simplifies the privilege model by only referencing "SUPER Users" without mentioning CONNECTION_ADMIN. The body text correctly mentions both privileges, so the table serves as a reasonable simplification.
- The post uses modern MySQL 8.0.22+ syntax throughout (REPLICA instead of SLAVE), which is appropriate for current documentation.
