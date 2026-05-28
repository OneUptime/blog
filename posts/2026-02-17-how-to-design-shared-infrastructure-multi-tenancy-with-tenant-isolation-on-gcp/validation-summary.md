# Validation Summary: How to Design Shared Infrastructure Multi-Tenancy with Tenant Isolation on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Load Balancing
- Cloud SQL for PostgreSQL
- PostgreSQL Row-Level Security
- Python
- PyJWT
- SQLAlchemy
- Cloud Storage
- Memorystore for Redis
- Redis
- Cloud Monitoring custom metrics

## Sources Consulted
- PostgreSQL Row Security Policies documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL Runtime Configuration Functions documentation: https://www.postgresql.org/docs/current/functions-admin.html
- SQLAlchemy 2.0 ORM persistence and `Session.execute()` documentation: https://docs.sqlalchemy.org/en/20/orm/persistence_techniques.html
- PyJWT usage documentation: https://pyjwt.readthedocs.io/en/stable/usage.html
- Google Cloud Storage upload from memory documentation: https://docs.cloud.google.com/storage/docs/uploading-objects-from-memory
- Google Cloud Storage list objects documentation: https://docs.cloud.google.com/storage/docs/listing-objects
- Memorystore for Redis overview: https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis sorted set command documentation: https://redis.io/docs/latest/commands/zadd/
- Cloud Monitoring custom metrics documentation: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Cloud Monitoring metric model and cardinality documentation: https://docs.cloud.google.com/monitoring/api/v3/metric-model

## Issues Found
- The PostgreSQL RLS example only showed a `USING` clause and described the policy as a general safety net. Updated the policy to `FOR ALL` with an explicit `WITH CHECK` clause so writes are tenant-scoped too.
- The RLS discussion did not mention that table owners bypass RLS unless forced. Added `ALTER TABLE orders FORCE ROW LEVEL SECURITY` and clarified that the safety-net behavior applies when the application role is subject to RLS.
- The RLS policy used `current_setting('app.current_tenant_id')`, which raises an error when the setting is missing. Updated it to `current_setting('app.current_tenant_id', true)` so missing tenant context fails closed by producing no matching rows.
- The SQL table comment described the foreign key constraint as a composite index. Updated the comment so it accurately describes linking each row to its tenant.
- The Python middleware referenced `self.public_key` without initializing it. Updated the constructor to accept and store `public_key`.
- The Python middleware imported unused Flask globals and did not clear the `ContextVar` after the request. Removed the unused imports and reset the tenant context before and after the wrapped WSGI app runs.
- The SQLAlchemy example passed a plain SQL string to `db.session.execute`. Updated it to use SQLAlchemy's `text()` construct and PostgreSQL `set_config(..., true)` for a transaction-local tenant setting.

## Review Notes
The Cloud Storage examples use current Python client methods for bucket blobs, uploads from memory, prefix-based listing, object existence checks, and byte downloads. The Redis cache and rate-limiter snippets use current Redis concepts and redis-py style calls. The Cloud Monitoring example matches the documented `TimeSeries`, `Point`, and `create_time_series` flow, but future production guidance should mention that per-tenant metric labels can create high cardinality when tenant counts are large.
