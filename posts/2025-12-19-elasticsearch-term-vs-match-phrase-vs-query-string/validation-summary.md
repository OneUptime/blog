# Validation Summary: How to Understand Term vs Match Phrase vs Query String

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch text analysis and mappings
- Elasticsearch bulk and search APIs
- Elasticsearch Python client
- curl

## Sources Consulted
- Elastic documentation: Term query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elastic documentation: Match query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elastic documentation: Match phrase query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase
- Elastic documentation: Match phrase prefix query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase-prefix
- Elastic documentation: Query string query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-query-string-query
- Elastic documentation: Simple query string query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-simple-query-string-query
- Elastic Python client API documentation - https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The bulk indexing example used `Content-Type: application/json` with `curl -d`. Elastic's bulk API expects newline-delimited JSON and recommends `application/x-ndjson` with `--data-binary` so newline delimiters are preserved. Updated the bulk curl example accordingly.
- The Python example used `es.search(index="articles", body=body)`. The current Python client exposes `query` as a direct search API parameter for Query DSL searches. Updated the sample to call `es.search(index="articles", query=queries[query_type])`.

## Review Notes
The query behavior explanations for `term`, `match`, `match_phrase`, `match_phrase_prefix`, `query_string`, and `simple_query_string` match the official Elasticsearch documentation. The examples assume a local secured Elasticsearch cluster at `https://localhost:9200`; depending on local TLS configuration, users may also need to configure certificate trust or pass an appropriate curl TLS option.
