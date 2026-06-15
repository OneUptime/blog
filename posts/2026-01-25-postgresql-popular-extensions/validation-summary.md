# Validation Summary: How to Extend PostgreSQL with Popular Extensions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL extensions
- pg_stat_statements
- pgcrypto
- uuid-ossp
- PostGIS
- pg_trgm
- hstore
- citext
- pg_cron
- pg_repack
- TimescaleDB
- postgres_fdw
- pgvector

## Sources Consulted
- PostgreSQL CREATE EXTENSION documentation: https://www.postgresql.org/docs/current/sql-createextension.html
- PostgreSQL ALTER EXTENSION documentation: https://www.postgresql.org/docs/current/sql-alterextension.html
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL pgcrypto documentation: https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL UUID functions documentation: https://www.postgresql.org/docs/current/functions-uuid.html
- PostgreSQL uuid-ossp documentation: https://www.postgresql.org/docs/current/uuid-ossp.html
- PostgreSQL pg_trgm documentation: https://www.postgresql.org/docs/current/pgtrgm.html
- PostgreSQL hstore documentation: https://www.postgresql.org/docs/current/hstore.html
- PostgreSQL citext documentation: https://www.postgresql.org/docs/current/citext.html
- PostgreSQL postgres_fdw documentation: https://www.postgresql.org/docs/current/postgres-fdw.html
- PostGIS geography and ST_DWithin documentation: https://postgis.net/docs/geography.html and https://postgis.net/docs/ST_DWithin.html
- pg_cron official README: https://github.com/citusdata/pg_cron
- pgvector official README: https://github.com/pgvector/pgvector
- TimescaleDB add_compression_policy documentation: https://github.com/timescale/docs/blob/latest/api/compression/add_compression_policy.md
- TimescaleDB supported platforms documentation: https://www.tigerdata.com/docs/get-started/choose-your-path/supported-platforms

## Issues Found
- The pgcrypto symmetric encryption example used raw `encrypt`/`decrypt` functions, which PostgreSQL documentation discourages because they lack PGP encryption features such as integrity checking. Changed the example to use `pgp_sym_encrypt` and `pgp_sym_decrypt`.
- The post described `gen_random_uuid()` as coming from pgcrypto. In modern PostgreSQL it is a built-in UUID generation function. Updated the comments and uuid-ossp text to avoid implying that pgcrypto is required for UUID v4 generation on current PostgreSQL.
- The PostGIS geography examples created points without setting SRID 4326 before casting to geography. Updated inserts and query points to use `ST_SetSRID(..., 4326)::geography`.
- The pg_trgm similarity examples used `similarity(...) > threshold` predicates after creating a trigram index. PostgreSQL documents index support for trigram operators, so the examples were updated to use `%` and `<%`.
- The TimescaleDB compression policy example called `add_compression_policy` without first enabling compression on the hypertable. Added `ALTER TABLE metrics SET (timescaledb.compress);`.
- The pgvector semantic search example used an ellipsis in a vector literal, which is invalid SQL, and a short vector would not match the declared `VECTOR(1536)` column. Updated it to use an application-supplied `$1::vector` parameter.
- The pgvector compatibility matrix listed PostgreSQL 11 as the minimum version. Current pgvector source installation documentation states support for PostgreSQL 13 and later, so the matrix was updated to 13.

## Review Notes
- Some installation package names are distribution- and repository-specific, so they should be treated as examples rather than universal commands.
- The TimescaleDB examples use APIs that are still supported, but Timescale's current documentation is moving some compression terminology toward newer columnstore and hypercore APIs.
