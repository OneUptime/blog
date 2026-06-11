# Validation Summary: How to Implement Elasticsearch Normalizers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Elasticsearch keyword field mappings
- Elasticsearch normalizers
- Elasticsearch Analyze API
- Elasticsearch Reindex API
- Elasticsearch term queries, sorting, and aggregations

## Sources Consulted
- Elasticsearch normalizer mapping parameter: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/normalizer
- Elasticsearch normalizers reference: https://www.elastic.co/docs/reference/text-analysis/normalizers
- Elasticsearch Analyze API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze
- Elasticsearch keyword field type reference: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch update mapping examples: https://www.elastic.co/docs/manage-data/data-store/mapping/update-mappings-examples
- Elasticsearch mapping character filter reference: https://www.elastic.co/docs/reference/text-analysis/analysis-mapping-charfilter
- Elasticsearch pattern replace character filter reference: https://www.elastic.co/docs/reference/text-analysis/analysis-pattern-replace-charfilter

## Issues Found
- The introduction said keyword fields "require" normalizers. Keyword fields do not require normalizers; normalizers are used when keyword values need preprocessing. Updated the wording to clarify that normalizers are used for this preprocessing.
- The multi-field diagram described normalized values as "Stored." Elasticsearch keeps the original value in `_source`; the normalized value is used for indexed terms and doc values. Updated the diagram labels to say "Indexed/doc values."
- The case-insensitive multi-field query used an already-lowercase term. Elasticsearch applies the normalizer at search time for term-level queries on keyword fields with a normalizer, so the example was changed to use `USER GUIDE` to demonstrate that behavior.
- The lowercase sorting example implied a deterministic order between values that normalize to the same term (`apple` and `Apple`). That tie order is not guaranteed without a secondary sort, so the example now shows both possible orders.
- The product catalog C++ query did not match the configured mapping character filter. With `+ => plus`, `C++ Programming Guide` normalizes to `cplusplus programming guide`, not `c plus plus programming guide`. Updated the query and comment accordingly.
- The troubleshooting section suggested `_update_by_query` to apply changed normalizers to existing data. Changing a normalizer for an existing field requires a new mapping and reindexing into a new index. Replaced the example with `_reindex` and retained `_update_by_query` only for the valid case of backfilling a newly added multi-field.

## Review Notes
The examples target current Elasticsearch behavior and APIs. The post does not specify an Elasticsearch version; the reviewed behavior matches current Elastic documentation as of 2026-06-11.
