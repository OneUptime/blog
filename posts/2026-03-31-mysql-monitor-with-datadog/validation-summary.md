# Validation Summary: How to Monitor MySQL with Datadog

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6, 5.7, 8.0+)
- Datadog Agent 7
- Datadog MySQL Integration
- Datadog Database Monitoring (DBM)
- performance_schema

## Sources Consulted
- Datadog MySQL Integration documentation: https://docs.datadoghq.com/integrations/mysql/?tab=host
- Datadog Database Monitoring setup for MySQL: https://docs.datadoghq.com/database_monitoring/setup_mysql/selfhosted/
- Datadog Agent install script (verified at https://install.datadoghq.com/scripts/install_script_agent7.sh)
- Datadog Agent install script (verified at https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)
- Datadog MySQL metrics reference: https://docs.datadoghq.com/integrations/mysql/?tab=host#metrics

## Issues Found
1. **Incorrect Agent install script URL**: The post used `https://s3.amazonaws.com/dd-agent-bootstrap/datadog_agent7_setup.sh`, which is not a valid Datadog install endpoint. Changed to the official URL `https://install.datadoghq.com/scripts/install_script_agent7.sh`.
2. **Incorrect metric name**: The post listed `mysql.innodb.buffer_pool_free_pages` as a key metric, but the correct Datadog metric name is `mysql.innodb.buffer_pool_free`. Fixed the metric name.

## Review Notes
- The `mysql.replication.seconds_behind_master` metric is valid but Datadog notes it is deprecated in favor of `mysql.replication.seconds_behind_source` (aligned with MySQL 8.0.22+ inclusive language changes). The original name still works but users on newer MySQL versions may want to use the newer metric name.
- The `UPDATE performance_schema.setup_consumers` SQL statement in the DBM section enables consumers at runtime but will not persist across MySQL restarts. For production use, these should also be set in the MySQL configuration file (my.cnf/my.ini). This is not incorrect but could be noted as a caveat.
- The DBM configuration shows `collect_settings`, `query_activity`, and `query_metrics` sub-keys with explicit values. While these are valid advanced configuration options, the official docs show a minimal configuration with just `dbm: true` and sensible defaults. The values shown in the post are reasonable.
