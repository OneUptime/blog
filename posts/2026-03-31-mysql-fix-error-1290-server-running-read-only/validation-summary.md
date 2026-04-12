# Validation Summary: How to Fix ERROR 1290 MySQL Server Running with --read-only Option

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- MySQL Replication (read_only, super_read_only system variables)
- AWS RDS (read replica promotion)
- Google Cloud SQL
- Django (database routing configuration)
- systemd (MySQL service management)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables: read_only, super_read_only, transaction_read_only (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual — SHOW REPLICA STATUS (https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)
- MySQL 8.0 Reference Manual — Server Error Message Reference, ERROR 1290 (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
- AWS CLI Reference — rds promote-read-replica (https://docs.aws.amazon.com/cli/latest/reference/rds/promote-read-replica.html)
- Django Documentation — Multiple databases and database routers (https://docs.djangoproject.com/en/stable/topics/db/multi-db/)

## Issues Found
No technical issues found.

## Review Notes
- The post shows disabling `super_read_only` before `read_only` as a two-step process. In practice, `SET GLOBAL read_only = OFF` alone is sufficient because MySQL automatically sets `super_read_only = OFF` when `read_only` is disabled (the inverse relationship: setting `super_read_only = ON` forces `read_only = ON`). The two-command approach shown in the post is not wrong — it works correctly — but a single `SET GLOBAL read_only = OFF` would also suffice. This is a stylistic choice rather than a technical error.
- The `SHOW REPLICA STATUS` syntax and `Source_Host` field name are the modern MySQL 8.0.22+ equivalents. Users on older MySQL versions would need `SHOW SLAVE STATUS` and `Master_Host`. The post does not mention this version caveat but targets a modern audience, which is reasonable.
- The `systemctl restart mysql` command assumes Debian/Ubuntu naming. On RHEL/CentOS systems, the service is typically named `mysqld`. This is a common variation and not an error per se.
