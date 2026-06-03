# Validation Summary: How to Connect to an RDS Instance from an EC2 Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon RDS
- Amazon VPC security groups
- AWS CLI
- IAM database authentication
- PostgreSQL and psql
- MySQL and MariaDB client
- SQL Server sqlcmd
- Python, psycopg2, and Boto3
- Node.js pg
- Java HikariCP
- AWS Secrets Manager
- RDS Proxy

## Sources Consulted
- AWS CLI `authorize-security-group-ingress` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI `generate-db-auth-token` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/generate-db-auth-token.html
- Amazon RDS IAM database authentication overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
- Amazon RDS database accounts for IAM authentication: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html
- Amazon RDS IAM authentication with AWS CLI and psql: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.AWSCLI.PostgreSQL.html
- Amazon RDS PostgreSQL connection documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToPostgreSQLInstance.html
- Amazon RDS MySQL command-line client installation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-install-cli.html
- AWS Secrets Manager Boto3 `get_secret_value` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/secretsmanager/client/get_secret_value.html
- Psycopg 2 connection pool documentation: https://www.psycopg.org/docs/pool.html
- HikariCP configuration documentation: https://github.com/brettwooldridge/HikariCP

## Issues Found
- The IAM database access policy used a 9-digit sample account ID and an inaccurate RDS DB resource ID shape. Updated the ARN to use a 12-digit account ID and a `db-...` resource identifier placeholder, matching the `rds-db:connect` resource format.
- The PostgreSQL IAM authentication example generated a token but did not include TLS certificate validation in the `psql` connection. Updated it to use `sslmode=verify-full` and `sslrootcert`, matching the RDS IAM authentication documentation.
- The MySQL IAM authentication SQL created an IAM-authenticated user but did not require SSL. Added `ALTER USER ... REQUIRE SSL`, matching AWS guidance for IAM-authenticated MySQL/MariaDB users.
- The Amazon Linux 2023 MySQL client section implied `mysql-community-client` is generally installable. Clarified that it applies only when the MySQL Community repository is configured; the default RDS-documented command remains `sudo dnf install mariadb105`.
- The Secrets Manager Python example used `psycopg2.connect()` without importing `psycopg2`. Added the missing import.
- The connectivity test comment referenced installing `nmap` for `nc`. Updated it to `nmap-ncat`, which is the relevant package naming convention on Amazon Linux family systems.

## Review Notes
- The guide is technically relevant and contains implementation details, commands, SQL, and code examples.
- The language examples are illustrative snippets and assume dependencies such as `psycopg2`, `pg`, MySQL Connector/J, HikariCP, and `boto3` are installed.
- For production SSL connections in application code, consider adding examples that load the current Amazon RDS CA bundle explicitly.
