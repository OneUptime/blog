# Validation Summary: How to Write a MySQL Health Check Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+, 8.0+)
- Bash scripting
- Kubernetes (liveness probes)
- bc (arbitrary precision calculator)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Status Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema System Variable Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html)
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS (https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- Kubernetes documentation: Configure Liveness, Readiness, and Startup Probes (https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## Issues Found
1. **Buffer pool hit rate calculation bug (line 52):** The `bc` expression `(1 - $BP_READS / $BP_REQUESTS) * 100` with `scale=0` uses integer division, which means `$BP_READS / $BP_REQUESTS` evaluates to `0` whenever reads < requests (the normal case). This causes the hit rate to always be reported as 100%, making the check completely ineffective. Fixed by rearranging the formula to `($BP_REQUESTS - $BP_READS) * 100 / $BP_REQUESTS`, which multiplies before dividing to preserve precision with integer arithmetic.

## Review Notes
- `SHOW SLAVE STATUS` (used in the replication check) was deprecated in MySQL 8.0.22 in favor of `SHOW REPLICA STATUS`, and the field names changed from `Slave_IO_Running`/`Seconds_Behind_Master` to `Replica_IO_Running`/`Seconds_Behind_Source`. The old syntax still works in current MySQL 8.x releases, but a future-proof version of the script could try `SHOW REPLICA STATUS` first and fall back to `SHOW SLAVE STATUS`.
- The `FLUSH PRIVILEGES` in the user creation SQL is unnecessary after `GRANT` statements (it is only needed when directly modifying the mysql grant tables), but including it is harmless.
- The script passes the password via `-p${HEALTH_CHECK_PASSWORD}` on the command line, which causes a MySQL warning about insecure usage. For production, a `mysql_config_editor` or a `.my.cnf` file with restricted permissions would be more secure.
- The Kubernetes YAML uses this as a `livenessProbe`. Since the script checks more than just "is the process alive" (it also checks replication lag, connection count, etc.), it may be more appropriate as a `readinessProbe` to avoid unnecessary pod restarts for transient warning conditions.
