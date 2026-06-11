# Validation Summary: How to Build PostgreSQL Logical Decoding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (logical decoding, replication slots, WAL, publications, REPLICA IDENTITY)
- pgoutput output plugin
- wal2json output plugin
- test_decoding, decoderbufs (mentioned)
- psycopg2 (LogicalReplicationConnection)
- pg_recvlogical CLI
- Debezium 2.4 (PostgreSQL connector)
- Apache Kafka / Kafka Connect
- Docker Compose
- Python (signal handling, smtplib for alerts)

## Sources Consulted
- PostgreSQL Logical Replication docs: https://www.postgresql.org/docs/current/logical-replication.html
- PostgreSQL Logical Decoding docs: https://www.postgresql.org/docs/current/logicaldecoding.html
- pg_recvlogical reference: https://www.postgresql.org/docs/current/app-pgrecvlogical.html
- PostgreSQL `wal_keep_size` history (pgPedia / depesz)
- PostgreSQL 16 `reserved_connections` (pganalyze, dbi-services)
- wal2json GitHub README: https://github.com/eulerto/wal2json
- Homebrew wal2json formula: https://formulae.brew.sh/formula/wal2json
- Debezium 2.4 PostgreSQL Connector docs: https://debezium.io/documentation/reference/2.4/connectors/postgresql.html
- Confluent docs on Debezium V2 backward-incompatible changes (renaming `database.server.name` → `topic.prefix`)
- psycopg2 logical replication docs: https://www.psycopg.org/docs/extras.html#logical-replication-support

## Issues Found

1. **Incorrect RPM package name for wal2json on CentOS/RHEL** — The post listed `wal2json14` but the upstream PGDG yum convention uses an underscore: `wal2json_14`. Fixed.

2. **Debezium connector config included both `database.server.name` and `topic.prefix`** — In Debezium 2.0 the property `database.server.name` was renamed to `topic.prefix` (same semantics). Keeping both in a 2.4 connector config is incorrect and at minimum will produce an "unknown configuration" warning. Removed `database.server.name`.

3. **`wal_keep_size` claimed valid for "PostgreSQL 10 or later"** — `wal_keep_size` was actually added in PostgreSQL 13 (replacing `wal_keep_segments`). Added a comment noting the PG 13+ requirement and pointing readers on older PG to `wal_keep_segments`.

4. **`reserved_connections` setting** — `reserved_connections` was added in PostgreSQL 16 only; older versions only have `superuser_reserved_connections`. Changed the recommendation to `superuser_reserved_connections` (works on all supported versions) and added a comment noting the existence of `reserved_connections` on PG 16+.

## Review Notes

- `brew install wal2json` is actually correct — wal2json has an official Homebrew core formula (currently 2.6). Initially suspected wrong but verified.
- The `pgoutput` `proto_version` `'1'` is fine; PostgreSQL has added v2/v3/v4 for newer features (streaming in-progress transactions, two-phase, parallel apply) but v1 remains supported.
- `psycopg2` is deprecated in favor of `psycopg` (v3) for new projects, but the API used in the post is still valid and works. Not flagged because the choice of driver is a stylistic preference.
- The Debezium image tag `debezium/connect:2.4` matches a real released minor-line; for production use a specific patch tag (e.g. `2.4.2.Final`) is preferable.
- The `docker-compose.yml` uses `version: '3.8'`; modern Compose ignores the `version` field (now considered obsolete), but it does not cause errors.
- The pgoutput "Message Types" mermaid diagram is conceptual rather than wire-format-accurate; pgoutput also emits Relation/Type/Origin messages and ORIGIN/COMMIT-prepared variants, but a conceptual sketch is fine for an introductory tutorial.
- The Debezium "lsn" example value (`12345678`) is fine as a placeholder; real LSN values from Debezium are 64-bit integers.
