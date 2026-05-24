# Validation Summary: How to Create RDS with Custom Parameter Groups in Terraform

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (v1.0+)
- AWS RDS (Relational Database Service)
- AWS Provider for Terraform (`aws_db_parameter_group`, `aws_db_instance`, `aws_db_subnet_group`, `aws_security_group`)
- MySQL 8.0 engine parameters (InnoDB tuning, connection settings, logging, security)
- PostgreSQL 15 engine parameters (memory tuning, WAL settings, query planning, logging)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS RDS for PostgreSQL memory documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Tuning.concepts.memory.html
- AWS RDS PostgreSQL parameter group documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Parameters.html
- AWS RDS DB parameter groups documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html
- Terraform AWS Provider docs: `aws_db_parameter_group`, `aws_db_instance`
- PostgreSQL 15 parameter documentation (shared_buffers, effective_cache_size, wal_buffers, work_mem unit conventions)
- MySQL 8.0 reference manual for innodb_*, slow_query_log, character_set_server, require_secure_transport, local_infile

## Issues Found
1. **PostgreSQL `shared_buffers` formula was off by a factor of 8192.** The original `{DBInstanceClassMemory/4}` would set shared_buffers to (memory / 4) **8 KB pages**, equating to roughly 200% of instance memory rather than the intended 25%. Fixed to `{DBInstanceClassMemory/32768}` — the actual AWS RDS default for 25% of memory expressed in 8 KB pages.
2. **PostgreSQL `effective_cache_size` formula had the same unit-conversion error.** The original `{DBInstanceClassMemory*3/4}` evaluated to ~600% of memory in 8 KB pages. Fixed to `{DBInstanceClassMemory*3/32768}` to correctly represent 75% of memory in 8 KB pages.
3. **PostgreSQL `wal_buffers` value didn't match its comment.** The value `65536` in 8 KB page units is 512 MB, not the 64 MB the comment claimed. Fixed to `8192` (= 64 MB in 8 KB pages) to match the documented intent.

## Review Notes
- The MySQL `innodb_buffer_pool_size = "{DBInstanceClassMemory*3/4}"` is correct because MySQL's `innodb_buffer_pool_size` parameter is in bytes (not 8 KB pages), so the formula evaluates correctly to 75% of memory.
- Starting in MySQL 8.0.30, `innodb_log_file_size` is deprecated in favor of `innodb_redo_log_capacity`. The post's use of `innodb_log_file_size` still works for backwards compatibility on supported RDS MySQL 8.0 minor versions, but readers on newer versions may want to consider the replacement parameter.
- In RDS PostgreSQL, the `ssl` parameter is enabled by default and generally cannot be disabled; setting `ssl = 1` is effectively a no-op but is harmless. The more impactful security setting is `rds.force_ssl`, which is correctly included.
- The `apply_immediately = false` setting on the RDS instance is the safer default for production; readers should understand it defers changes to the next maintenance window.
- The `local.env_params[var.environment].max_connections` value is a number, but `aws_db_parameter_group.parameter.value` expects a string. Terraform handles the coercion automatically in current versions, so this is not an error, but a `tostring()` wrapper would be more explicit.
- The post references a companion guide URL on the OneUptime blog; the link follows the same dated-post URL pattern as the post being reviewed.
