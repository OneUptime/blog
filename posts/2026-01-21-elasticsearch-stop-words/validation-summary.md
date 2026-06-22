# Validation Summary: How to Handle Stop Words in Elasticsearch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- Elasticsearch text analysis
- Stop token filter
- Language analyzers
- Custom analyzers
- Multi-fields
- Bulk API

## Sources Consulted
- Elasticsearch Reference: Stop token filter: https://www.elastic.co/docs/reference/text-analysis/analysis-stop-tokenfilter
- Elasticsearch Reference: Language analyzers: https://www.elastic.co/docs/reference/text-analysis/analysis-lang-analyzer
- Elasticsearch API Documentation: Analyze API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze
- Elasticsearch API Documentation: Bulk API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch Reference: Multi-fields mapping: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/multi-fields
- Elasticsearch Reference: search_analyzer mapping parameter: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/search-analyzer

## Issues Found
- The supported language stop word list omitted `_serbian_`, which is listed in the official Elasticsearch stop token filter and language analyzer documentation. Added `_serbian_` to the list.
- The `remove_trailing` section said stop words could be removed only at the end of phrases. The `stop` token filter removes configured stop words generally; `remove_trailing` only controls whether the final token is removed when it is a stop word. Updated the wording to describe the actual behavior.
- The Bulk API example used `Content-Type: application/json` with `-d`. Elasticsearch accepts JSON or NDJSON content types for bulk requests, but the official guidance is NDJSON with a final newline, and `--data-binary` preserves the newline-delimited payload. Updated the example to use `application/x-ndjson` and `--data-binary`.

## Review Notes
The remaining analyzer, stop filter, custom stop word, `stopwords_path`, `ignore_case`, language analyzer, multi-field, and `search_analyzer` examples match current Elasticsearch documentation. The examples assume each `PUT /articles` request is run independently or against a fresh index, since creating the same index repeatedly would otherwise return a resource-already-exists error.
