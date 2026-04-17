# Validation Summary: How to Use ClickPipes for Data Ingestion in ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- ClickPipes (managed ingestion)
- Apache Kafka (MSK, Confluent Cloud, Redpanda)
- Amazon S3
- Google Cloud Storage
- Azure Blob Storage
- Amazon Kinesis
- ClickHouse Cloud REST API
- ClickHouse system tables

## Sources Consulted
- ClickPipes overview docs: https://clickhouse.com/docs/integrations/clickpipes
- ClickPipes for Kafka docs: https://clickhouse.com/docs/integrations/clickpipes/kafka
- ClickPipes Kafka reference: https://clickhouse.com/docs/integrations/clickpipes/kafka/reference
- ClickHouse Cloud API / OpenAPI swagger: https://clickhouse.com/docs/cloud/manage/api/swagger
- Evolution of ClickPipes blog (system table & monitoring): https://clickhouse.com/blog/evolution-of-clickpipes
- ClickPipes flexible scaling and enhanced monitoring blog: https://clickhouse.com/blog/clickpipes-flexible-scaling-monitoring

## Issues Found
1. **Incorrect supported source — HTTP/HTTPS endpoints**: The original post listed "HTTP/HTTPS endpoints" as a supported ClickPipes source. ClickPipes does not currently expose HTTP/HTTPS as a source connector. Replaced this entry with the actually supported Postgres and MySQL CDC sources, and expanded the Kafka entry to include Azure Event Hubs and WarpStream (which are supported via the Kafka connector), plus DigitalOcean Spaces under object storage.
2. **Wrong system table for ClickPipes monitoring**: The post recommended querying `system.kafka_consumers` to monitor a ClickPipe. That table is part of the open-source ClickHouse Kafka *engine* infrastructure and is not where ClickPipes exposes its operational state. The correct table is `system.clickpipes_log`, which aggregates ClickPipes operational logs (with a 7-day TTL) across Kafka/Kinesis/S3 pipelines. Updated the SQL example accordingly and removed the `database = 'analytics'` filter (which doesn't apply to that schema).

## Review Notes
- Per-pipe data errors (malformed messages, schema mismatches) are stored in a sibling table named `<destination_table>_clickpipes_error` next to the destination table — worth knowing in addition to `system.clickpipes_log`.
- Some sources noted in the docs are still in beta/preview at time of review (e.g., MySQL CDC public beta, MongoDB private preview); the post's general framing remains accurate.
- The Cloud API endpoint path `POST /v1/organizations/{orgId}/services/{serviceId}/clickpipes` matches the documented ClickHouse Cloud OpenAPI structure; the example body is illustrative and may need additional fields (e.g., authentication credentials) in real usage.
