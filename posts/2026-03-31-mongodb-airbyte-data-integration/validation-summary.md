# Validation Summary: How to Use MongoDB with Airbyte for Data Integration

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- MongoDB (source and destination)
- Airbyte (open-source ELT platform)
- MongoDB Change Streams / CDC
- BigQuery, Snowflake, Redshift, PostgreSQL (mentioned as destinations)
- Docker

## Sources Consulted
- Airbyte MongoDB V2 Source Connector documentation: https://docs.airbyte.com/integrations/sources/mongodb-v2
- Airbyte Sync Modes documentation: https://docs.airbyte.com/platform/using-airbyte/core-concepts/sync-modes
- Airbyte OSS Quickstart guide: https://docs.airbyte.com/using-airbyte/getting-started/oss-quickstart
- Airbyte API documentation: https://docs.airbyte.com/developers/api-documentation
- Airbyte API Reference (List Jobs): https://reference.airbyte.com/reference/listjobs

## Issues Found

1. **Outdated installation method**: The post used `git clone https://github.com/airbytehq/airbyte.git && docker compose up`. Changed to the current recommended `abctl` CLI approach (`curl -LsfS https://get.airbyte.com | bash - && abctl local install`).

2. **Incorrect incremental sync description (cursor-based vs CDC)**: The post described MongoDB incremental sync as cursor-based ("uses a cursor field to sync only new/changed documents") with a manual "Cursor Field: updatedAt" setting. The Airbyte MongoDB source connector uses CDC via change streams, not cursor-based incremental. Removed the cursor field instruction and updated the description to reflect CDC behavior.

3. **Wrong sync mode naming**: Changed "Incremental - Deduped + History" to "Incremental | Append + Deduped" and updated all sync mode names to use the current Airbyte pipe-delimiter format (e.g., "Full Refresh | Overwrite" instead of "Full Refresh - Overwrite").

4. **Outdated MongoDB user roles**: The post granted `read` on `myDatabase` and `read` on `local`. The current Airbyte MongoDB connector documentation recommends the `readAnyDatabase` role on `admin`. Updated the `db.createUser()` command accordingly.

5. **Incorrect API endpoint for job monitoring**: The post used `POST http://localhost:8001/api/v1/jobs/list` with a JSON body. The correct endpoint is `GET http://localhost:8000/api/public/v1/jobs?connectionId=<id>` with an Authorization header. Fixed the URL, HTTP method, and parameters.

6. **Incorrect incremental sync explanation in example**: The post stated "Airbyte only fetches documents where `createdAt > last_sync_time`", which describes cursor-based behavior. Updated to explain CDC-based change stream tracking. Also removed the "Cursor: createdAt" line from the example configuration.

## Review Notes
- The post mentions Airbyte can be used as a MongoDB destination connector. This is correct, though the MongoDB destination connector has fewer configuration options documented compared to the source connector.
- The schema inference description (sampling documents) is accurate for the MongoDB source connector.
- The replica set requirement explanation is correct -- CDC via change streams requires a replica set or Atlas cluster.
