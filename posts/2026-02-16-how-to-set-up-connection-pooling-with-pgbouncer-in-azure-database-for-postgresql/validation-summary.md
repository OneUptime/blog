# Validation Summary: How to Set Up Connection Pooling with PgBouncer in Azure Database for PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- PgBouncer
- PostgreSQL
- Azure CLI
- psql
- Python psycopg2
- SQLAlchemy

## Sources Consulted
- Azure Database for PostgreSQL Flexible Server PgBouncer documentation: https://learn.microsoft.com/en-us/azure/postgresql/connectivity/concepts-pgbouncer
- Azure Database for PostgreSQL server parameters: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/concepts-server-parameters
- Azure PgBouncer server parameter reference: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-pgbouncer
- Azure server parameter CLI documentation: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/how-to-server-parameters-set-value
- Azure CLI `az postgres flexible-server` reference: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server
- PgBouncer feature compatibility documentation: https://www.pgbouncer.org/features.html
- PgBouncer usage and admin console documentation: https://www.pgbouncer.org/usage
- SQLAlchemy engine and pooling documentation: https://docs.sqlalchemy.org/en/20/core/engines.html

## Issues Found
- Removed the `pgbouncer.server_lifetime` configuration example because Azure Database for PostgreSQL Flexible Server does not list it as a supported built-in PgBouncer server parameter.
- Added a `pgbouncer.stats_users` configuration command before connecting to the `pgbouncer` virtual database, because Azure exposes this parameter to allow users to run read-only PgBouncer console queries.
- Clarified transaction-pooling limitations: `LISTEN`, SQL-level prepared statements, session-level advisory locks, and persistent temporary tables are not compatible across transactions; protocol-level named prepared statements require `pgbouncer.max_prepared_statements` to be non-zero.
- Corrected the prepared statement troubleshooting note to distinguish SQL-level prepared statements from protocol-level prepared statements.
- Corrected the `query_wait_timeout` troubleshooting note. This timeout controls how long a client query can wait to be assigned a server connection; it is not a timeout for already-running long queries.
- Adjusted the `SET` command troubleshooting note so it does not imply that transaction pooling reliably preserves session-level state after a transaction.

## Review Notes
- The Azure CLI is not installed in the local workspace, so command syntax was verified against official Azure CLI and Azure Database for PostgreSQL documentation rather than local `az --help` output.
- The post uses example usernames and passwords. They are syntactically fine as placeholders, but real deployments should use secret management rather than embedding credentials in source code.
