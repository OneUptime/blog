# Validation Summary: How to Connect Airbyte to ClickHouse for Data Ingestion

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Airbyte
- ClickHouse
- Docker / abctl
- Kubernetes / Helm
- PostgreSQL CDC
- MySQL CDC
- REST API connectors
- Python requests
- SQL

## Sources Consulted
- Airbyte ClickHouse destination documentation: https://docs.airbyte.com/integrations/destinations/clickhouse
- Airbyte ClickHouse destination migration guide: https://docs.airbyte.com/integrations/destinations/clickhouse-migrations
- Airbyte abctl deployment documentation: https://docs.airbyte.com/platform/deploying-airbyte/abctl
- Airbyte Helm values reference: https://docs.airbyte.com/platform/deploying-airbyte/values
- Airbyte API documentation: https://docs.airbyte.com/developers/api-documentation
- Airbyte API access token documentation: https://docs.airbyte.com/platform/using-airbyte/configuring-api-access
- Airbyte sync modes documentation: https://docs.airbyte.com/platform/using-airbyte/core-concepts/sync-modes
- Airbyte typing and deduping documentation: https://docs.airbyte.com/platform/using-airbyte/core-concepts/typing-deduping
- Airbyte metadata fields documentation: https://docs.airbyte.com/platform/understanding-airbyte/airbyte-metadata-fields
- Airbyte PostgreSQL source connector documentation: https://docs.airbyte.com/integrations/sources/postgres
- Airbyte MySQL source connector documentation: https://docs.airbyte.com/integrations/sources/mysql
- ClickHouse Airbyte integration documentation: https://clickhouse.com/docs/integrations/airbyte
- ClickHouse GRANT statement documentation: https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse system.tables documentation: https://clickhouse.com/docs/operations/system-tables/tables

## Issues Found
- The Docker Compose installation instructions were outdated for current Airbyte OSS. Replaced the clone and `docker-compose up` flow with the current `abctl` install, local install, and credentials commands.
- The Kubernetes values snippet used older chart assumptions, including `deploymentMode` and `scheduler`. Updated it to Helm chart v2-style values using `edition: community`, `global.jobs.resources`, and `workloadLauncher`.
- The ClickHouse destination configuration used legacy `ssl` and numeric `port` fields. Updated the snippet to use `protocol`, string `port`, and `enable_json`, matching the current connector field names.
- The ClickHouse grants were incomplete for the current destination connector. Added `ALTER`, `TRUNCATE`, `CREATE`, `CREATE DATABASE`, and the documented `async_insert = 0` setting.
- The article described Airbyte normalization and raw JSON tables. Updated the architecture, examples, and conclusion to reflect current ClickHouse destination v2 behavior: typed destination tables plus typing and deduping.
- The MySQL CDC configuration represented `replication_method` as a string, but the connector defines it as an object. Changed it to an object with `method: CDC`.
- The ClickHouse optimization, materialized view, monitoring, freshness, and troubleshooting SQL queried legacy `_airbyte_raw_*`, `_airbyte_data`, and `_airbyte_emitted_at` fields. Rewrote the examples to use typed tables and `_airbyte_extracted_at`.
- The programmatic sync example used the deprecated Airbyte Configuration API (`/api/v1/connections/sync` and `/jobs/get`). Replaced it with the public API base URL, bearer token header, `POST /jobs`, and `GET /jobs/{job_id}` flow.
- The deduplication note did not mention ClickHouse's eventual merge behavior. Added guidance to use `FINAL` when queries require fully deduplicated results at query time.

## Review Notes
- The REST API source JSON remains illustrative because Airbyte custom API connectors are usually configured through Connector Builder or a declarative manifest; exact field names depend on the chosen connector implementation.
- The sync configuration YAML remains conceptual UI/API terminology rather than a full Airbyte connection payload.
- ClickHouse's own Airbyte integration page still contains some older Docker Compose and normalization language, so Airbyte's current destination connector documentation was treated as authoritative for current connector behavior.
