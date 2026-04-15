# Validation Summary: How to Build a Self-Hosted Log Management Platform with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, Map types, codecs, TTL, tokenbf_v1 skipping index)
- Fluent Bit (tail input, kubernetes filter, http output)
- Grafana (ClickHouse data source plugin, Logs panel, template variables and time macros)
- OneUptime (alerting)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, data types, codecs — https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse documentation: DateTime64 type — https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation: Skipping indexes (tokenbf_v1) — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse documentation: hasToken function — https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#hastoken
- ClickHouse documentation: TTL expressions — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- Fluent Bit documentation: Tail input plugin — https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit documentation: Kubernetes filter — https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Fluent Bit documentation: HTTP output plugin — https://docs.fluentbit.io/manual/pipeline/outputs/http
- Grafana ClickHouse data source plugin documentation — https://clickhouse.com/docs/en/integrations/grafana

## Issues Found
No technical issues found.

## Review Notes
- The `SETTINGS index_granularity = 8192` is the default value; specifying it explicitly is harmless but redundant.
- Cost estimates are approximate and will vary by cloud provider, instance type, contract terms, and Datadog pricing tier. The 10-20x savings claim is directionally correct for high-volume log ingestion scenarios.
- The Fluent Bit configuration uses the HTTP output plugin to insert directly into ClickHouse. In production, a buffer or queue (e.g., Kafka) between Fluent Bit and ClickHouse is common for resilience, but the approach shown is valid and simpler for smaller deployments.
