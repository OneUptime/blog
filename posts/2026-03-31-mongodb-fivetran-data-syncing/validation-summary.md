# Validation Summary: How to Use MongoDB with Fivetran for Data Syncing

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- MongoDB (replica sets, oplog, change data capture)
- Fivetran (managed ELT, MongoDB connector, REST API)
- Data warehouses (Snowflake, BigQuery, Redshift)
- MongoDB Atlas

## Sources Consulted
- Fivetran MongoDB connector documentation: https://fivetran.com/docs/connectors/databases/mongodb
- Fivetran REST API reference: https://fivetran.com/docs/rest-api/connectors
- Fivetran system tables (metadata logging): https://fivetran.com/docs/logs/fivetran-log
- MongoDB documentation on replica sets and oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB `db.createUser()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createUser/

## Issues Found

1. **Incorrect Fivetran metadata schema name (line 122)**: The SQL query referenced `fivetran_audit.log` but Fivetran's metadata schema is named `fivetran_log`, not `fivetran_audit`. Changed to `fivetran_log.log`.

2. **Incorrect Fivetran API call for pausing a connector (lines 135-137)**: Three errors in the curl command:
   - **Wrong endpoint**: Used a non-existent `/pause` sub-endpoint. The correct approach is to PATCH the connector resource at `/v1/connectors/{connectorId}` with `{"paused": true}` in the request body.
   - **Wrong HTTP method**: Used `POST` instead of `PATCH`.
   - **Wrong authentication**: Used `Bearer` token auth, but Fivetran's REST API uses Basic authentication with an API key and API secret. Changed to `Basic` auth header.

## Review Notes
- The post correctly describes CDC via the oplog. Technically, modern Fivetran MongoDB connectors use MongoDB change streams (introduced in MongoDB 3.6), which are built on top of the oplog. The post's description is a reasonable simplification.
- The monitoring SQL query column names (`schema_name`, `table_name`, `rows_synced`, `sync_time`) are illustrative but may not exactly match the actual `fivetran_log.log` table schema, which varies by destination. The query serves its purpose as an example.
- The MongoDB user roles (`read` on source database, `read` on `local`, `clusterMonitor` on `admin`) are accurate per Fivetran's requirements.
- The document flattening behavior described (top-level fields to columns, nested objects as JSON, arrays as child tables) is accurate.
