# Validation Summary: How to Create Elasticsearch Flattened Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elasticsearch mappings
- Elasticsearch flattened field type
- Elasticsearch Query DSL
- Elasticsearch reindex and aliases APIs
- Kibana Console request syntax

## Sources Consulted
- Elasticsearch Reference: Flattened field type - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/flattened
- Elasticsearch Reference: Mapping limit settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/mapping-limit
- Elasticsearch Reference: doc_values - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/doc-values
- Elasticsearch Reference: similarity mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/similarity
- Elastic Docs: Run API requests with Console - https://www.elastic.co/docs/explore-analyze/query-filter/tools/console

## Issues Found
- The post claimed direct `wildcard` queries are supported for flattened fields. Elastic's flattened field reference lists supported query types and does not include the direct `wildcard` query, so the example was changed to a supported `query_string` query using a wildcard pattern.
- The limitations diagram and wording said range queries were not supported at all. Elastic's documentation says `range` queries are supported, but flattened values are treated as string keywords. The text was updated to clarify that numeric and date range semantics are not supported.
- The limitations section contradicted itself by saying sub-field aggregations were unsupported while later showing a sub-field `terms` aggregation. The wording was changed to describe the actual limitation: simple keyword-style aggregations are supported, but typed numeric/date aggregation semantics are not.
- The sorting limitation was too broad. Elastic documents keyword-style sorting on flattened fields with lexicographic comparison, so the text now recommends dedicated typed fields when numeric, date, or frequently sorted attributes need typed behavior.

## Review Notes
The examples use Kibana Console-style request syntax, including multiple requests in one code block and comments in JSON-looking snippets. Elastic's Console documentation supports this syntax, but these snippets are not strict standalone JSON payloads.
