# Validation Summary: How to Use ClickHouse with Preset

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (SQL DDL, DML, settings profiles, user management, XML configuration)
- Preset (managed Apache Superset)
- clickhouse-connect (SQLAlchemy driver, `clickhousedb://` dialect)
- Python (requests library for Preset API)
- Apache Superset (SQL Lab, certified datasets, chart builder, dashboards)

## Sources Consulted
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse CREATE SETTINGS PROFILE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse GRANT documentation: https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse query cache settings: https://clickhouse.com/docs/en/operations/query-cache
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse functions reference (generateUUIDv4, randCanonical, toStartOfMonth, dateDiff, toYYYYMM)
- clickhouse-connect SQLAlchemy integration: https://clickhouse.com/docs/en/integrations/python#sqlalchemy
- Preset documentation: https://docs.preset.io
- Preset IP allowlist documentation: https://docs.preset.io/docs/ip-allowlist

## Issues Found
No technical issues found.

## Review Notes
- The `IDENTIFIED WITH plaintext_password BY` syntax is technically correct but stores the password in plaintext in ClickHouse access control files. For production use, `IDENTIFIED BY 'password'` (which uses the server default, typically SHA256) or `IDENTIFIED WITH sha256_password` would be more secure. Acceptable for an example.
- The `?secure=true` query parameter in the SQLAlchemy URI is redundant with the `secure: true` in `connect_args`, but this redundancy is harmless and does not cause errors.
- The Preset API section simplifies the authentication flow. In practice, Preset requires exchanging an API key and secret for a JWT via a POST to `/api/v1/auth/` before making authenticated requests. The blog's use of a direct Bearer token is a reasonable simplification for illustrative purposes.
- The IP ranges in the XML configuration (34.72.0.0/13, 34.80.0.0/12) are correctly labeled as examples; readers should consult Preset's published IP allowlist for current ranges.
- All ClickHouse array indexing uses 1-based indices with modulo operations that correctly match the array sizes (7, 5, 4 elements respectively).
- The cohort retention SQL query in the SQL Lab section is well-structured and uses valid ClickHouse functions and syntax.
