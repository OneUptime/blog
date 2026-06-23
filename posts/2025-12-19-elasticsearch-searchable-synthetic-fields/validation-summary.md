# Validation Summary: How to Create Searchable Synthetic Fields in Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elasticsearch runtime fields
- Elasticsearch ingest pipelines
- Elasticsearch Painless scripting
- Elasticsearch Query DSL and aggregations
- Python Elasticsearch client

## Sources Consulted
- Elasticsearch runtime fields documentation: https://www.elastic.co/docs/manage-data/data-store/mapping/runtime-fields
- Map a runtime field: https://www.elastic.co/docs/manage-data/data-store/mapping/map-runtime-field
- Define runtime fields in a search request: https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request
- Retrieve selected fields and script fields: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrieve-selected-fields
- Painless datetime `now` guidance: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-datetime-now
- Painless datetime input examples: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-datetime-input
- Elasticsearch ingest pipelines documentation: https://www.elastic.co/docs/manage-data/ingest/transform-enrich/ingest-pipelines
- Script processor reference: https://www.elastic.co/docs/reference/enrich-processor/script-processor
- Lowercase processor reference: https://www.elastic.co/docs/reference/enrich-processor/lowercase-processor
- Sum aggregation scripting guidance: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-sum-aggregation

## Issues Found
- The post described scripted fields as an aggregation mechanism. Elasticsearch script fields are fetch-only values in search responses; runtime fields are the searchable and aggregatable query-time mechanism. Updated the description and list item to avoid implying that script fields are searchable or aggregatable.
- Runtime examples used `ZonedDateTime.now()` directly. Elasticsearch's Painless documentation recommends passing the current time as a parameter in most contexts. Updated runtime field examples to use an explicit `as_of` script parameter.
- The ingest pipeline calculated `age` with `ZonedDateTime.now()`, which creates a stale age value and does not follow the ingest pipeline metadata pattern. Updated it to calculate `age_at_indexing` from `_ingest.timestamp`.
- The text transformation example declared a runtime field with `"type": "text"`, which is not a supported runtime field type. Changed it to `"keyword"`.
- The text transformation example accessed a `text` field through `doc["name"].value`, but text fields do not have doc values by default. Updated the script to read `name` from `params._source`.
- Updated Mustache snippets in ingest `set` processors to triple braces so field values are inserted without escaping, matching Elasticsearch documentation.

## Review Notes
The examples are generally accurate for modern Elasticsearch 8.x/9.x APIs. For production use, runtime fields that depend on a fixed `as_of` parameter should be defined in `runtime_mappings` per request when the reference time needs to change dynamically.
