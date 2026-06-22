# Validation Summary: How to Bulk Load Data into PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL COPY
- PostgreSQL bulk loading and performance tuning
- PostgreSQL WAL configuration
- PostgreSQL unlogged tables
- Python psycopg 3
- pg_bulkload
- Unix shell tools: zcat, gunzip, split, tail

## Sources Consulted
- PostgreSQL documentation: COPY - https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL documentation: Populating a Database - https://www.postgresql.org/docs/current/populate.html
- Psycopg 3 documentation: Using COPY TO and COPY FROM - https://www.psycopg.org/psycopg3/docs/basic/copy.html
- pg_bulkload documentation - https://ossc-db.github.io/pg_bulkload/pg_bulkload.html
- AWS RDS documentation: Using the \copy command to import data to a table on PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.Copy.html

## Issues Found
- The heading, best-practice wording, and conclusion called COPY the "fastest" method. PostgreSQL documents COPY as optimized and almost always faster than INSERT, but pg_bulkload's own documentation describes it as a faster COPY alternative. Changed the wording to "Fast built-in method."
- The WAL optimization section was titled "Disable WAL" and omitted `archive_mode = off`. PostgreSQL documents this technique as disabling WAL archival and streaming replication by setting `wal_level = minimal`, `archive_mode = off`, and `max_wal_senders = 0`; it does not universally disable all WAL. Renamed the section to "Reduce WAL for Initial Load" and added `archive_mode = off`.
- The parallel loading snippet split the header row into only the first chunk and used server-side `COPY` against relative local-looking filenames. Changed it to strip the original CSV header before splitting and use psql `\copy`, which reads client-side files.

## Review Notes
- Server-side `COPY FROM '/path/to/file'` examples are valid when the file is accessible from the PostgreSQL server process and permissions allow it; client-side imports should use psql `\copy`.
- Temporarily increasing `maintenance_work_mem` is useful mainly for rebuilding indexes and adding foreign keys after the load, not for COPY itself.
- pg_bulkload requires installation and elevated privileges in typical setups, and its direct-loading modes have recovery and replication caveats.
