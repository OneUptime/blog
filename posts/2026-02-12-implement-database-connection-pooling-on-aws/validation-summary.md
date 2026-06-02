# Validation Summary: How to Implement Database Connection Pooling on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS RDS
- Amazon RDS Proxy
- AWS Secrets Manager
- AWS IAM
- AWS CLI
- AWS Lambda
- PostgreSQL
- psycopg2
- SQLAlchemy
- node-postgres / pg Pool
- HikariCP
- PgBouncer
- Amazon CloudWatch

## Sources Consulted
- AWS CLI `create-db-proxy` command reference: https://docs.aws.amazon.com/cli/v1/reference/rds/create-db-proxy.html
- AWS CLI `modify-db-proxy-target-group` command reference: https://docs.aws.amazon.com/cli/v1/reference/rds/modify-db-proxy-target-group.html
- Amazon RDS Proxy credentials documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-secrets-arns.html
- Amazon RDS Proxy overview and limitations: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html
- Amazon RDS Proxy CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.monitoring.html
- SQLAlchemy connection pooling documentation: https://docs.sqlalchemy.org/en/21/core/pooling.html
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- HikariCP configuration documentation: https://github.com/brettwooldridge/HikariCP
- PgBouncer configuration documentation: https://www.pgbouncer.org/config
- PostgreSQL wiki on connection counts: https://wiki.postgresql.org/wiki/Number_Of_Database_Connections

## Issues Found
- The introduction said AWS had "two main options" while the article later presents three options, including PgBouncer. Changed the wording to "several options" and named all three approaches.
- The IAM policy snippet was in a `json` code block but contained a `//` comment, which is not valid JSON for an IAM policy document. Removed the inline comment.
- The Lambda psycopg2 example reused a global connection without ending the implicit transaction after a `SELECT`. Set `conn.autocommit = True` and closed the cursor in a `finally` block so reused execution environments do not leave idle transactions open.
- The RDS Proxy tuning command only used `modify-db-proxy`, but `ConnectionBorrowTimeout`, `MaxConnectionsPercent`, and `MaxIdleConnectionsPercent` are target group connection pool settings. Added the correct `aws rds modify-db-proxy-target-group --connection-pool-config ...` command.
- The `IdleClientTimeout` explanation implied it frees database connections directly. Clarified that it closes idle client connections while the underlying database connection can remain in the proxy pool.
- The pool sizing section mapped `effective_spindle_count` roughly to cloud IOPS capacity. The PostgreSQL wiki says the formula has not been analyzed for SSDs, so the text now treats the formula as a starting point for SSD-backed cloud databases.
- The CloudWatch section referred to an `AWS/RDSProxy` namespace. AWS documentation places RDS Proxy metrics under RDS per-proxy metrics, so the wording was corrected.

## Review Notes
- AWS CLI was not installed in the local environment, so CLI validation was performed against official AWS CLI documentation instead of local `--help` output.
- The Node.js example uses `ssl: { rejectUnauthorized: false }`, which is accepted by node-postgres but disables certificate verification. For production, using the Amazon RDS CA bundle would be stronger.
- The HikariCP `connectionTestQuery` setting is valid, but HikariCP recommends relying on JDBC4 `Connection.isValid()` when the driver supports it.
