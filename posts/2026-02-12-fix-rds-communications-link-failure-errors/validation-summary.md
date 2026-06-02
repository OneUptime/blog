# Validation Summary: How to Fix RDS 'Communications Link Failure' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Amazon RDS
- Amazon RDS Proxy
- AWS CLI
- AWS CloudWatch
- MySQL
- PostgreSQL
- Java / Spring Boot / HikariCP
- Python / SQLAlchemy / PyMySQL
- Node.js / Sequelize

## Sources Consulted
- AWS CLI Command Reference: create-db-proxy - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- AWS CLI Command Reference: register-db-proxy-targets - https://docs.aws.amazon.com/cli/latest/reference/rds/register-db-proxy-targets.html
- Amazon RDS User Guide: Creating a proxy for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-creating.html
- Amazon RDS User Guide: RDS Proxy concepts and terminology - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html
- Amazon RDS User Guide: Failing over a Multi-AZ DB instance - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Spring Boot Common Application Properties - https://docs.spring.io/spring-boot/appendix/application-properties/
- SQLAlchemy Documentation: Connection Pooling - https://docs.sqlalchemy.org/en/21/core/pooling.html
- Sequelize Documentation: Connection Pool - https://sequelize.org/docs/v6/other-topics/connection-pool/
- MySQL Connector/J Developer Guide: Troubleshooting Connector/J Applications - https://dev.mysql.com/doc/connector-j/en/connector-j-usagenotes-troubleshooting.html

## Issues Found
- The Spring Boot HikariCP snippet was fenced as Java and used `//` for the first `application.properties` comment. In Java properties files, `#` or `!` are comments, so I changed the fence to `properties` and changed the first line to a `#` comment.
- The SQLAlchemy retry example used `text(...)` without importing it. I added `from sqlalchemy import text` so the example runs as shown.
- The retry guidance applied broadly to database operations. I added a caveat that retries should be used only for idempotent or otherwise safe-to-retry operations, because retrying writes after a connection drop can duplicate work if the database already committed the transaction.
- The RDS Proxy command created the proxy but did not associate a database target. I added `aws rds register-db-proxy-targets --db-instance-identifiers my-database`, matching AWS CLI documentation for associating an RDS instance with a proxy target group.

## Review Notes
- The AWS CLI was not installed in the local environment, so AWS command validation was performed against official AWS CLI and Amazon RDS documentation rather than local `aws --help` output.
- The HikariCP `connection-test-query=SELECT 1` setting is valid, though HikariCP can normally use JDBC4 validation without a test query when the JDBC driver supports it.
- The CloudWatch alarm threshold is an example absolute connection count; production thresholds should be sized against the DB instance class and `max_connections`.
