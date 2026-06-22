# Validation Summary: How to Implement Site Search with Elasticsearch

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elasticsearch index mappings and analyzers
- Elasticsearch Query DSL
- Elasticsearch aggregations
- Elasticsearch suggesters
- Elasticsearch highlighting
- Elasticsearch search templates
- Elasticsearch request cache settings
- Elasticsearch ingest pipelines
- Python Elasticsearch client

## Sources Consulted
- Elasticsearch mapping and text analysis documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-pathhierarchy-tokenizer
- Elasticsearch multi-match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Elasticsearch bool query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch function score query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-function-score-query
- Elasticsearch terms aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch search suggester documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-suggesters
- Elasticsearch highlighting documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/highlighting
- Elasticsearch search template documentation: https://www.elastic.co/docs/solutions/search/search-templates
- Elasticsearch HTML strip processor documentation: https://www.elastic.co/docs/reference/enrich-processor/htmlstrip-processor
- Elasticsearch Python client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python

## Issues Found
- The path aggregation used a `terms` aggregation on the `path` text field. Elasticsearch does not allow terms aggregations on `text` fields by default because fielddata is disabled; the official guidance is to use a keyword sub-field when aggregating exact values. Changed the aggregation to use `path.keyword` and adjusted the include regex so nested paths still match.
- The stored search template placed Mustache section tags directly inside a JSON object. That makes the `_scripts/site-search` request body invalid JSON before Elasticsearch can store it. Changed the template source to a string template, which is the documented pattern for Mustache templates containing conditional sections.

## Review Notes
The remaining examples are broadly accurate for modern Elasticsearch 8/9-style APIs. The phrase suggester example is syntactically valid, but in production it would usually work better with a dedicated shingle-backed suggestion field instead of the main `content` field.
