# Validation Summary: How to Search Filenames in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch index mappings
- Elasticsearch custom analyzers
- Elasticsearch pattern tokenizer
- Elasticsearch edge n-gram token filter
- Elasticsearch path hierarchy tokenizer
- Elasticsearch Query DSL
- Elasticsearch Bulk API
- Elasticsearch aggregations
- Python Elasticsearch client

## Sources Consulted
- Elasticsearch custom analyzer documentation: https://www.elastic.co/docs/manage-data/data-store/text-analysis/create-custom-analyzer
- Elasticsearch edge n-gram token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenfilter
- Elasticsearch pattern tokenizer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-pattern-tokenizer
- Elasticsearch pattern analyzer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-pattern-analyzer
- Elasticsearch path hierarchy tokenizer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-pathhierarchy-tokenizer
- Elasticsearch date field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/date
- Elasticsearch Bulk API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch Search API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elasticsearch terms aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch wildcard query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query
- Official Python Elasticsearch client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python
- Python Elasticsearch client API reference: https://elasticsearch-py.readthedocs.io/en/stable/api/elasticsearch.html

## Issues Found
- The opening explanation overstated standard analyzer behavior with a concrete tokenization example and a categorical "will not match" claim. Updated the text to describe the real issue more accurately: standard analyzers are not filename-specific and can produce unreliable filename fragment matching.
- The analyzer response omitted several edge n-gram tokens that the configured `edge_ngram` filter would emit. Expanded the example response so it matches the configured `min_gram` and `max_gram` behavior.
- The Bulk API example used `Content-Type: application/json` and `curl -d` for NDJSON. Updated it to `Content-Type: application/x-ndjson` with `--data-binary` and a heredoc so newline-delimited JSON, including the final newline, is preserved.
- The "Files by Directory" aggregation targeted the `path` text field. Terms aggregations cannot run on text fields by default, and aggregating `path.keyword` would bucket full file paths rather than directories. Added a `directory` keyword field, populated it in the indexing examples and Python code, and changed the aggregation to use `directory`.
- The Python implementation indexed `path.stat().st_mtime` directly into an Elasticsearch `date` field. Elasticsearch's default numeric date format is epoch milliseconds, while `st_mtime` is seconds as a float. Updated the code to emit ISO 8601 UTC timestamps.
- The directory bulk indexing Python example omitted `modified_date`, even though the mapping and surrounding examples include it for filtering and sorting. Added `modified_date` generation using the same ISO 8601 UTC format.
- The camelCase analyzer snippet used a `pattern` analyzer with a regex that matches tokens, but the pattern analyzer's regex is used as a separator. Replaced it with a custom analyzer using a `pattern` tokenizer with `group: 0`, which captures the intended token matches.

## Review Notes
- The examples assume Unix-style `/` path separators. Windows paths would need normalization or a separate analyzer/tokenizer strategy for backslash-delimited paths.
- The Python examples keep using `verify_certs=False` for local development convenience. Production code should use proper TLS certificate verification.
