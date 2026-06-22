# Validation Summary: ClickHouse vs Elasticsearch for Log Analytics

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- ClickHouse
- Elasticsearch
- Lucene
- Logstash
- Vector
- Kafka
- Python
- clickhouse-driver

## Sources Consulted
- ClickHouse full-text search with text indexes: https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes
- ClickHouse data skipping index examples: https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse string search functions: https://clickhouse.com/docs/sql-reference/functions/string-search-functions
- ClickHouse asynchronous inserts: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse INSERT INTO syntax: https://clickhouse.com/docs/sql-reference/statements/insert-into
- ClickHouse JSONEachRow format: https://clickhouse.com/docs/interfaces/formats/JSONEachRow
- ClickHouse Kafka table engine: https://clickhouse.com/docs/integrations/kafka/kafka-table-engine
- Vector ClickHouse sink configuration: https://vector.dev/docs/reference/configuration/sinks/clickhouse/
- Elasticsearch match query: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch similarity settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity
- Elasticsearch Bulk API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch highlighting: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/highlighting
- Elasticsearch nested field type: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch Python client: https://www.elastic.co/docs/reference/elasticsearch/clients/python
- clickhouse-driver quickstart: https://clickhouse-driver.readthedocs.io/en/latest/quickstart.html

## Issues Found
- ClickHouse text search was based on `tokenbf_v1`, which ClickHouse documentation now marks deprecated for full-text search in versions 26.2 and newer. Updated the comparison, architecture diagram, query example, and schema to use ClickHouse `text` indexes with `hasAllTokens`.
- Elasticsearch examples used JavaScript-style comments inside `json` code fences, making them invalid JSON. Removed the comments from the JSON snippets.
- The Elasticsearch Bulk API command used a bare host and `application/json`. Updated it to use `http://localhost:9200/_bulk` and `application/x-ndjson`, matching the Bulk API's NDJSON request format.
- The ClickHouse direct insert example omitted most non-materialized schema fields. Added representative values for `service`, `host`, `trace_id`, `labels`, and `response_time`.
- The Kafka ingestion example used `CREATE TABLE logs_kafka AS logs`, which would copy destination-table details that are not appropriate for a Kafka engine source table. Replaced it with an explicit Kafka source schema and explicit materialized-view column list.
- The Vector ClickHouse sink example omitted the required `inputs` field and was shown inside a SQL code block. Added `inputs = ["logs"]` and moved it to a TOML code block.
- The Python migration snippet used a host string without a URL scheme for the Elasticsearch client, inserted into ClickHouse without a column list, omitted several required fields, and did not flush the final partial batch. Updated the client URL, inserted with explicit columns, populated all non-materialized target columns, and added a final batch flush.

## Review Notes
Performance and cost figures remain workload-dependent estimates. They are plausible as illustrative comparisons, but future revisions would be stronger with versioned benchmark methodology, hardware details, dataset shape, and index settings.
