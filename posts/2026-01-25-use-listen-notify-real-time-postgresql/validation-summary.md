# Validation Summary: How to Use Listen/Notify for Real-Time Updates in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL LISTEN/NOTIFY
- PostgreSQL triggers and PL/pgSQL
- psycopg2
- asyncpg
- Node.js node-postgres (`pg`)
- FastAPI WebSockets
- Browser WebSocket API

## Sources Consulted
- PostgreSQL NOTIFY documentation: https://www.postgresql.org/docs/current/sql-notify.html
- PostgreSQL LISTEN documentation: https://www.postgresql.org/docs/current/sql-listen.html
- PostgreSQL system information functions (`pg_listening_channels`, `pg_notification_queue_usage`): https://www.postgresql.org/docs/current/functions-info.html
- psycopg2 asynchronous notifications documentation: https://www.psycopg.org/docs/advanced.html#asynchronous-notifications
- asyncpg API reference (`add_listener`, `remove_listener`, connection reset behavior): https://magicstack.github.io/asyncpg/current/api/index.html
- node-postgres Client events documentation: https://node-postgres.com/apis/client
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/

## Issues Found
- The introduction implied notifications are instant when data changes. PostgreSQL delivers notifications only after the notifying transaction commits, and listeners inside a transaction receive notifications only after that transaction completes. Updated the wording to say notifications arrive after transactions commit.
- The first trigger function returned `NEW` for DELETE operations. Although return values are ignored for AFTER row triggers, returning `COALESCE(NEW, OLD)` is the correct reusable trigger pattern and avoids misleading readers.
- The FastAPI example used `@app.on_event("startup")`, which FastAPI now documents as the deprecated alternative to lifespan handlers. Replaced it with an `asynccontextmanager` lifespan function and added listener task cancellation/cleanup.
- The queued notification trigger used `NEW.id`, which fails for DELETE triggers. Updated it to choose `OLD.id` for DELETE and `NEW.id` otherwise.
- The batching example selected unprocessed notifications but never marked them processed. Replaced it with a CTE that marks queued rows processed and sends grouped notifications from the marked batch.
- The monitoring query searched `pg_stat_activity.query` for `LISTEN`, which is not a reliable way to inspect listener state or pending notifications. Replaced it with `pg_listening_channels()` for the current session and `pg_notification_queue_usage()` for PostgreSQL's notification queue usage.
- The best-practice note claimed notifications may arrive out of order under load. PostgreSQL documents ordering guarantees within a transaction and by commit order across transactions, except duplicate folding. Replaced the note with transaction timing and disconnected-client caveats.

## Review Notes
The post is technically relevant and the remaining examples match the documented LISTEN/NOTIFY behavior and client-library APIs. For production code, the WebSocket frontend should avoid assigning database-derived values through `innerHTML` unless the data is trusted or escaped.
