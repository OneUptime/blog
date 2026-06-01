# Validation Summary: How to Enable and Use PostgreSQL Extensions in Azure Database for PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- Azure CLI
- PostgreSQL extensions
- pg_stat_statements
- PostGIS
- uuid-ossp
- pgcrypto
- pg_trgm
- hstore
- pg_partman

## Sources Consulted
- Microsoft Learn: PostgreSQL extensions in Azure Database for PostgreSQL Flexible Server - https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-extensions
- Microsoft Learn: Create extensions in Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-create-extensions
- Microsoft Learn: List of PostgreSQL extensions and modules for Azure Database for PostgreSQL Flexible Server - https://learn.microsoft.com/en-us/azure/postgresql/extensions/concepts-extensions-by-engine
- Microsoft Learn: Azure CLI `az postgres flexible-server parameter` reference - https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/parameter
- Microsoft Learn: Load libraries in Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-load-libraries
- Microsoft Learn: Shared library preloading server parameters - https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/param-client-connection-defaults-shared-library-preloading
- PostgreSQL documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: uuid-ossp - https://www.postgresql.org/docs/current/uuid-ossp.html
- PostgreSQL documentation: UUID functions - https://www.postgresql.org/docs/current/functions-uuid.html
- PostgreSQL documentation: pgcrypto - https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL documentation: pg_trgm - https://www.postgresql.org/docs/current/pgtrgm.html
- PostgreSQL documentation: hstore - https://www.postgresql.org/docs/current/hstore.html
- PostGIS documentation: ST_DWithin - https://postgis.net/docs/ST_DWithin.html
- PostGIS documentation: ST_Distance - https://postgis.net/docs/ST_Distance.html
- pg_partman documentation - https://github.com/pgpartman/pg_partman/blob/master/doc/pg_partman.md
- pg_partman README - https://github.com/pgpartman/pg_partman/blob/master/README.md

## Issues Found
- The introduction described `pg_trgm` as full-text search in multiple languages. `pg_trgm` provides trigram-based similarity matching and related index operator classes, so this was changed to "Fuzzy text search."
- The `pg_stat_statements` setup said to add it to `shared_preload_libraries` and restart the server. Current Azure Flexible Server documentation states `pg_stat_statements` is preloaded by default, while still requiring allowlisting and `CREATE EXTENSION`, so the setup command was changed to use the `azure.extensions` parameter.
- The `pg_partman` example called `partman.create_parent` after `CREATE EXTENSION pg_partman` without installing the extension into a `partman` schema. The example now creates the `partman` schema and installs the extension there.
- The `pg_partman` example used `p_type := 'native'`, which is not valid for current pg_partman 5.x. It was changed to `p_type := 'range'`.
- The allowlist example omitted `pg_partman` even though the post later creates that extension. `pg_partman` was added to the `azure.extensions` value.
- The shared preload list included `pg_qs`, but current Azure Flexible Server `shared_preload_libraries` allowed values do not include `pg_qs`. The bullet was removed.
- The shared preload example omitted `pg_partman_bgw` even though it was listed as an extension requiring preload. The sample value now includes `pg_partman_bgw`.

## Review Notes
Azure parameter-set commands replace the parameter value, so users should include any existing required values when updating `azure.extensions` or `shared_preload_libraries`. The Azure CLI was not installed locally in the review environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
