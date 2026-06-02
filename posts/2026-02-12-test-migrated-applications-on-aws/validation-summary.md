# Validation Summary: How to Test Migrated Applications on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS migration testing
- Amazon EC2
- Amazon RDS
- AWS CLI
- Bash and curl
- Python socket and requests
- PostgreSQL SQL functions
- Grafana k6
- Disaster recovery testing

## Sources Consulted
- AWS Prescriptive Guidance: Testing and validating your applications - https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-replatforming-cots-applications/testing-validating-application.html
- AWS Prescriptive Guidance: Test the migration - https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-database-migration/test-migration.html
- AWS EC2 User Guide: Change the time zone of your instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/change-time-zone-of-instance.html
- AWS CLI Command Reference: rds describe-db-instances - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS CLI Command Reference: rds restore-db-instance-from-db-snapshot - https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-from-db-snapshot.html
- Amazon RDS User Guide: Restoring to a DB instance - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html
- Python documentation: socket module - https://docs.python.org/3/library/socket.html
- PostgreSQL documentation: Aggregate functions - https://www.postgresql.org/docs/current/functions-aggregate.html
- PostgreSQL documentation: String functions and operators - https://www.postgresql.org/docs/current/functions-string.html
- Grafana k6 documentation: Options reference - https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 documentation: Thresholds - https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 documentation: Built-in metrics - https://grafana.com/docs/k6/latest/using-k6/metrics/reference/

## Issues Found
- The checksum SQL example was PostgreSQL-specific but not labeled as such, even though it used PostgreSQL syntax such as `id::text`, `STRING_AGG`, and `MD5`.
- The checksum row serialization used `CONCAT(id::text, customer_id::text, total::text, status)` without per-column delimiters or null markers. This can produce identical serialized values for different rows in edge cases. Updated it to use `ARRAY_TO_STRING` with a delimiter and `COALESCE` null markers before hashing.

## Review Notes
- The AWS CLI commands use valid RDS operations and parameters, but real restore tests may need environment-specific options such as subnet groups, VPC security groups, engine compatibility, and snapshot ARN usage for shared manual snapshots.
- The k6 example uses valid stages, thresholds, and built-in HTTP metrics. Current k6 documentation commonly shows `export const options`; the post's `export let options` remains valid JavaScript.
- The performance comparison script is suitable as a simple example, but production-grade percentile reporting should use a dedicated load-testing tool or a statistics library with an explicitly chosen percentile method.
