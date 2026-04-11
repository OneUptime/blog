# Validation Summary: How to Set Up MySQL On-Call Procedures

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (8.0.x)
- Performance Schema
- information_schema
- PagerDuty (alerting/incident management)
- ProxySQL (database proxy)
- Grafana / OneUptime (monitoring dashboards)
- Slack (incident communication)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE USER: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — Performance Schema: https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html
- MySQL 8.0 Reference Manual — Privileges: https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html

## Issues Found
No technical issues found.

## Review Notes
- The SQL for creating a monitoring user is correct and uses appropriately scoped privileges (SELECT on performance_schema/information_schema, PROCESS, REPLICATION CLIENT). This is a good minimal-privilege setup for a monitoring account.
- The YAML alert severity definitions are illustrative examples not tied to a specific alerting tool. The thresholds chosen (e.g., replication lag > 10 min for P1, disk > 85% for P2) are reasonable industry-standard values.
- The MySQL version upgrade example (8.0.35 to 8.0.37) references real MySQL releases.
- The post is primarily procedural/operational guidance. The code content is limited to one SQL block and one YAML config example, but both are technically correct.
