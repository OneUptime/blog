# Validation Summary: How to Use PostgreSQL Extensions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL extensions
- pg_stat_statements
- uuid-ossp
- pgcrypto
- hstore
- citext
- pg_trgm
- tablefunc
- btree_gist
- PostGIS
- pgvector
- pg_cron
- pg_partman

## Sources Consulted
- PostgreSQL documentation: CREATE EXTENSION - https://www.postgresql.org/docs/current/sql-createextension.html
- PostgreSQL documentation: Additional Supplied Modules and Extensions - https://www.postgresql.org/docs/current/contrib.html
- PostgreSQL documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: uuid-ossp - https://www.postgresql.org/docs/current/uuid-ossp.html
- PostgreSQL documentation: pgcrypto - https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL documentation: hstore - https://www.postgresql.org/docs/current/hstore.html
- PostgreSQL documentation: citext - https://www.postgresql.org/docs/current/citext.html
- PostgreSQL documentation: pg_trgm - https://www.postgresql.org/docs/current/pgtrgm.html
- PostgreSQL documentation: tablefunc - https://www.postgresql.org/docs/current/tablefunc.html
- PostgreSQL documentation: btree_gist - https://www.postgresql.org/docs/current/btree-gist.html
- PostGIS documentation: ST_Distance - https://postgis.net/docs/ST_Distance.html
- PostGIS documentation: Data Management - https://postgis.net/docs/using_postgis_dbmanagement.html
- pgvector documentation - https://github.com/pgvector/pgvector
- pg_cron documentation - https://github.com/citusdata/pg_cron
- pg_partman documentation - https://access.crunchydata.com/documentation/pg-partman/latest/pg_partman/
- pg_partman how-to guide - https://access.crunchydata.com/documentation/pg-partman/latest/pg_partman_howto/
- PostgreSQL Yum Repository package index - https://download.postgresql.org/pub/repos/yum/16/redhat/rhel-8-x86_64/
- PostgreSQL Linux downloads for Ubuntu - https://www.postgresql.org/download/linux/ubuntu/
- PostGIS Ubuntu/Debian install documentation - https://postgis.net/documentation/getting_started/install_ubuntu/

## Issues Found
- The prerequisites said PostgreSQL 12+ was sufficient, but the current pg_partman documentation requires PostgreSQL 14+ for pg_partman 5.x. Updated the prerequisite to PostgreSQL 14+.
- The prerequisites said superuser access was required for extension installation. PostgreSQL supports trusted extensions that can be installed by users with CREATE privilege on the database, so the statement was narrowed to untrusted extension installation.
- The pgvector example used `VECTOR(1536)` and placeholder literals like `[0.1, 0.2, ...]`, which are not valid vector literals and made the example non-executable. Changed the example to `VECTOR(3)` with complete three-dimensional vector literals and a model-neutral dimension comment.
- The pg_partman example used the older `partman.create_parent(..., 'native', 'monthly')` style. Current pg_partman documentation uses `partman.create_partition` with named parameters, `p_type := 'range'`, and interval text such as `1 month`. Updated the example accordingly.
- The dependency installation example claimed to install dependencies but omitted `CASCADE`; PostgreSQL requires `CASCADE` to automatically install missing dependent extensions. Added `CASCADE`.
- The dependency inspection query cast a referenced extension OID to `regclass`, which is incorrect because extension OIDs are not relation OIDs. Rewrote the query to join `pg_extension` for the referenced dependency name.
- The best-practice note said to install extensions in a schema without caveat. PostgreSQL documents that only extensions which allow relocation can use the `SCHEMA` clause, so the note now says to do this when supported.

## Review Notes
The remaining SQL examples, extension commands, and configuration snippets align with current PostgreSQL, PostGIS, pgvector, pg_cron, and pg_partman documentation. Some OS package names are repository- and distribution-specific; the examples are plausible for PostgreSQL community packages but should still be checked against the target operating system repository before production use.
