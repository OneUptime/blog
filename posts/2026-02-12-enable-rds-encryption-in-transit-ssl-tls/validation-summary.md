# Validation Summary: How to Enable RDS Encryption in Transit (SSL/TLS)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon RDS
- SSL/TLS
- MySQL on Amazon RDS
- PostgreSQL on Amazon RDS
- AWS CLI
- MySQL command-line client
- psql/libpq SSL modes
- Node.js mysql2
- Python psycopg2
- Java JDBC with MySQL Connector/J

## Sources Consulted
- Amazon RDS User Guide: Using SSL/TLS to encrypt a connection to a DB instance or cluster: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html
- Amazon RDS User Guide: Connecting to your MySQL DB instance with SSL/TLS from the MySQL command-line client: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToInstanceSSL.CLI.html
- Amazon RDS User Guide: Requiring SSL/TLS for all connections to a MySQL DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-ssl-connections.require-ssl.html
- Amazon RDS User Guide: Using SSL with a PostgreSQL DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- AWS CLI Command Reference: modify-db-parameter-group: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-parameter-group.html
- MySQL Connector/J Developer Guide: Security connection properties: https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html
- MySQL Connector/J Developer Guide: Setting up server authentication: https://dev.mysql.com/doc/connector-j/en/connector-j-server-authentication.html
- MySQL Reference Manual: ALTER USER / CREATE USER SSL/TLS options: https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- PostgreSQL Documentation: libpq SSL support and sslmode behavior: https://www.postgresql.org/docs/current/libpq-ssl.html
- Psycopg 2 documentation: connection handling and libpq parameters: https://www.psycopg.org/docs/connection.html

## Issues Found
- The metadata description mentioned SQL Server, but the post does not cover SQL Server configuration. Removed SQL Server from the description.
- The certificate-bundle text said AWS moved to regional certificate bundles as of 2024. AWS currently documents both global and regional bundles, so the text now says AWS provides both.
- The global bundle comment said it works for all regions. AWS documents it for commercial AWS Regions, so the comment now says that explicitly.
- The MySQL `REQUIRE X509` comment described requiring a specific certificate. MySQL `REQUIRE X509` requires a valid client X.509 certificate; specific certificate attributes require additional options such as issuer or subject checks. Updated the comment.
- The PostgreSQL `rds.force_ssl` section omitted the current default behavior: RDS for PostgreSQL 15 and later defaults this parameter to 1, while 14 and earlier default to 0. Added the version-specific caveat.
- The PostgreSQL parameter group instructions did not mention that attaching a new custom parameter group to an existing instance requires a reboot for the instance to use the new group. Added a short note.
- The Python psycopg2 example used `os.environ` without importing `os`. Added the missing import.
- The Java MySQL JDBC example used deprecated Connector/J SSL properties (`useSSL`, `requireSSL`, and `verifyServerCertificate`) and did not enable hostname identity verification. Replaced them with `sslMode=VERIFY_IDENTITY`.
- The performance section gave an unsupported fixed 5-10% overhead estimate. Reworded it to note that impact is usually small but workload-dependent.

## Review Notes
The post is technically relevant and salvageable as a practical RDS SSL/TLS guide. The examples use placeholder endpoints and credentials, so they are illustrative rather than directly runnable without substitution.
