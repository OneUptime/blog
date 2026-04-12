# Validation Summary: How to Migrate from MongoDB to PostgreSQL

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB (mongoexport, MongoDB shell queries, aggregation pipeline)
- PostgreSQL (DDL, JSONB, SQL queries)
- Python (psycopg2, pymongo, bson, json, uuid)
- mongoexport CLI tool

## Sources Consulted
- PostgreSQL documentation for `gen_random_uuid()`, `TIMESTAMPTZ`, `JSONB`, and `NUMERIC` types: https://www.postgresql.org/docs/current/functions-uuid.html
- MongoDB `mongoexport` documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- psycopg2 documentation for parameterized queries and type adaptation: https://www.psycopg.org/docs/usage.html
- Python `datetime` module documentation for `utcnow()` deprecation (PEP 615, Python 3.12 release notes): https://docs.python.org/3/library/datetime.html
- MongoDB BSON ObjectId specification (12 bytes / 24 hex chars): https://www.mongodb.com/docs/manual/reference/bson-types/#objectid
- pymongo `count_documents()` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html

## Issues Found
1. **`datetime.utcnow()` deprecated and timezone-unsafe**: The Python migration script used `datetime.utcnow()` as a fallback for missing `createdAt` values. This function was deprecated in Python 3.12 because it returns a naive datetime (no timezone info). When inserted into a PostgreSQL `TIMESTAMPTZ` column via psycopg2, a naive datetime is interpreted using the session's timezone setting, which may not be UTC — leading to incorrect timestamps. Fixed by importing `timezone` and replacing `datetime.utcnow()` with `datetime.now(timezone.utc)`, which returns a timezone-aware datetime.

## Review Notes
- The ObjectId-to-UUID conversion function pads a 24-hex-char ObjectId to 32 hex chars and formats it as a UUID. The result is not a standards-compliant UUID (version/variant bits are not set), but this is an acceptable and common pragmatic approach for deterministic ID mapping during migration.
- The Python script generates new UUIDs for `id` columns rather than converting MongoDB `_id` values. The ObjectId conversion function is shown separately. This is fine as a teaching approach but readers should note they need to integrate both if they want to preserve ID relationships.
- The `gen_random_uuid()` function is built into PostgreSQL 13+. Earlier versions require the `pgcrypto` extension (`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`). The post doesn't mention this version requirement.
- The migration script does not use batch inserts or transactions with savepoints, which would be important for large datasets. This is acceptable for a tutorial but readers should consider `execute_batch()` or `COPY` for production migrations.
