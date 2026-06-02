# Validation Summary: How to Set Up RDS Proxy for Connection Pooling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS Proxy
- Amazon RDS for PostgreSQL
- Amazon Aurora and RDS target registration
- AWS Secrets Manager
- AWS Identity and Access Management (IAM)
- AWS Key Management Service (KMS)
- AWS CLI
- PostgreSQL `psql` and `psycopg2`
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- AWS CLI Command Reference: `create-db-proxy`: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- AWS CLI Command Reference: `modify-db-proxy-target-group`: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-proxy-target-group.html
- Amazon RDS User Guide: Amazon RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html
- Amazon RDS User Guide: Setting up database credentials for RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-secrets-arns.html
- Amazon RDS User Guide: Avoiding pinning an RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html
- Amazon RDS User Guide: RDS Proxy concepts and terminology: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html
- Amazon RDS User Guide: Planning where to use RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-planning.html
- Amazon RDS User Guide: Monitoring RDS Proxy metrics with Amazon CloudWatch: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.monitoring.html
- AWS RDS Proxy pricing: https://aws.amazon.com/rds/proxy/pricing/

## Issues Found
- The `create-db-proxy` example used `"IAMAuth": "ALLOWED"`, but the current AWS CLI valid values are `DISABLED`, `REQUIRED`, and `ENABLED`, with `ENABLED` only valid for SQL Server. Changed the PostgreSQL/password-auth example to `"IAMAuth": "DISABLED"` and adjusted the surrounding explanation.
- The post described the proxy creation command as enabling IAM authentication while the later connection examples used standard username/password authentication. Updated the description to say the proxy uses Secrets Manager credentials for client authentication, and changed the IAM benefit wording to describe IAM authentication as optional support.
- The PostgreSQL target-group example included `SessionPinningFilters: ["EXCLUDE_VARIABLE_SETS"]`, but AWS documents this setting as supported only for MySQL engine family databases. Removed it from the PostgreSQL command and clarified the MySQL-only behavior in the text.
- The connection pinning list included a generic "functions with side effects" claim. Replaced it with PostgreSQL-specific sequence function examples and clarified that stored procedures/functions themselves do not automatically cause pinning unless they change session state.
- The CloudWatch metric list referenced `ClientConnectionsSetupFailed`, which is not the documented metric name. Changed it to `ClientConnectionsSetupFailedAuth`, and added the documented PostgreSQL Extended Protocol caveat for `QueryRequests`.
- The failover section gave an overly specific "under 10 seconds" claim. Replaced it with the more accurate AWS-documented behavior that RDS Proxy typically reduces failover impact by preserving connections and routing to the new primary.
- The pricing section described pricing as approximately 15-20% of the RDS instance cost and gave a fixed monthly estimate. Updated it to AWS's current pricing model: per vCPU-hour for provisioned RDS/Aurora instances or per ACU-hour for Aurora Serverless, with regional rates.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference and Amazon RDS documentation rather than local `aws help` output.
