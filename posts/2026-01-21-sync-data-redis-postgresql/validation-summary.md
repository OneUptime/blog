# Validation Summary: How to Sync Data Between Redis and PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis
- PostgreSQL
- Python
- redis-py
- psycopg2
- PostgreSQL triggers
- PostgreSQL LISTEN/NOTIFY
- Redis Streams

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- redis-py pipelines documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- PostgreSQL NOTIFY documentation: https://www.postgresql.org/docs/current/sql-notify.html
- PostgreSQL CREATE TRIGGER documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL PL/pgSQL trigger function documentation: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- psycopg2 connection documentation: https://www.psycopg.org/docs/connection.html
- psycopg2 asynchronous notification documentation: https://www.psycopg.org/docs/advanced.html

## Issues Found
- Replaced `redis.setex(...)` examples with `redis.set(..., ex=...)` because Redis documents `SETEX` as deprecated and recommends `SET` with the `EX` option for new code.
- Fixed the dual-write examples so Redis is updated after the PostgreSQL transaction commits. The original code wrote to Redis before the context manager committed PostgreSQL, which could leave stale cache data if the commit failed.
- Added an allow-list for dynamic update fields in the dual-write example and changed `RETURNING *` to explicit columns. The original dynamic SQL interpolated arbitrary update keys as column names and relied on table column order.
- Changed the PostgreSQL `LISTEN/NOTIFY` section from "Change Data Capture" wording to trigger-based notification wording. PostgreSQL notifications are useful for lightweight real-time signals, but they are not a durable CDC stream.
- Updated the cache-aside update method to return whether a row was actually updated instead of always returning `True`.

## Review Notes
The examples are suitable as illustrative patterns. For production systems with strict delivery guarantees, the event-driven example would usually need an outbox table or another durable handoff so a Redis Stream write cannot be lost after the PostgreSQL commit.
