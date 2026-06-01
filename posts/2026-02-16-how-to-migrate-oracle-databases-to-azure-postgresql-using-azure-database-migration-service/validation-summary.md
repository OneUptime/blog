# Validation Summary: How to Migrate Oracle Databases to Azure PostgreSQL

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- Oracle Database
- PostgreSQL
- PL/SQL
- PL/pgSQL
- ora2pg
- Azure CLI
- Azure Database Migration Service (classic)

## Sources Consulted
- Microsoft Learn: Azure Database Migration Service supported scenarios - https://learn.microsoft.com/en-us/azure/dms/resource-scenario-status
- Microsoft Learn: Azure Database Migration Service FAQ - https://learn.microsoft.com/en-us/azure/dms/faq
- Microsoft Learn: Oracle to Azure Database for PostgreSQL Ora2Pg migration guide - https://learn.microsoft.com/en-us/azure/postgresql/migrate/how-to-migrate-oracle-ora2pg
- Microsoft Learn: az postgres flexible-server firewall-rule - https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/firewall-rule
- Microsoft Learn: az postgres flexible-server - https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server
- Microsoft Learn: Supported versions of PostgreSQL in Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-supported-versions
- Ora2Pg documentation: Export Type - https://ora2pg.darold.net/docs/configuration/export-type
- PostgreSQL documentation: PL/pgSQL basic statements - https://www.postgresql.org/docs/current/plpgsql-statements.html
- PostgreSQL documentation: Date/Time Types - https://www.postgresql.org/docs/current/datatype-datetime.html
- Oracle Database SQL Language Reference: Data Types - https://docs.oracle.com/en/database/oracle/oracle-database/21/sqlrf/Data-Types.html

## Issues Found
- The post incorrectly stated that Azure Database Migration Service handles direct Oracle-to-Azure-PostgreSQL data migration and online migration for this path. Current Microsoft documentation does not list that direct DMS task flow for Oracle source to Azure Database for PostgreSQL. I changed the guide to use ora2pg for the initial data export/load and added a note that low-downtime cutovers require a CDC or replication tool that explicitly supports Oracle-to-PostgreSQL replication.
- The Azure PostgreSQL firewall CLI example used the upcoming/new-style `--server-name` form while the current official CLI documentation still documents `--name` for the server and `--rule-name` for the firewall rule. I updated the command to match the documented syntax.
- The PL/pgSQL conversion example handled `NO_DATA_FOUND` but did not use `SELECT ... INTO STRICT`, so PostgreSQL would not raise `NO_DATA_FOUND` for no rows. I added `STRICT` to the PostgreSQL example.
- The row-count validation query used Oracle `ALL_TABLES.NUM_ROWS` and PostgreSQL `pg_stat_user_tables.n_live_tup`, both of which are statistics/estimates rather than exact validation counts. I changed the example to recommend equivalent `COUNT(*)` checks.
- Metadata and wrap-up text described the post as DMS-based. I updated it to describe the ora2pg-based flow accurately.

## Review Notes
The guide is now technically valid as a practical Oracle-to-Azure-PostgreSQL migration overview. Future improvements could add more detail for large-scale data loads, parallel ora2pg export settings, and examples of supported third-party CDC tools, but those additions were outside the scope of correcting the existing post.
