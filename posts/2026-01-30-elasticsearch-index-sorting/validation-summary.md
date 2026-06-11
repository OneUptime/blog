# Validation Summary: How to Build Elasticsearch Index Sorting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch index sorting
- Elasticsearch Query DSL
- Elasticsearch search sorting
- Elasticsearch aggregations
- Elasticsearch Profile API
- Lucene segment-level search behavior

## Sources Consulted
- Elastic documentation: Index sorting settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/sorting
- Elastic documentation: Use index sorting to speed up conjunctions - https://www.elastic.co/docs/reference/elasticsearch/index-settings/sorting-conjunctions
- Elastic documentation: Sort search results - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/sort-search-results
- Elastic documentation: Profile search requests - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-profile
- Elastic documentation: Terms aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elastic documentation: Date format mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-date-format
- Elastic documentation: enabled mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/enabled

## Issues Found
- Early termination was described as Elasticsearch stopping the whole search after enough documents were found. Updated the wording and diagram to clarify that, when the search sort matches the index sort and exact total hits are not required, Elasticsearch can early terminate collection after the requested number of matching documents per segment.
- The conjunction optimization section used a timestamp range example, but Elastic recommends this optimization primarily for low-cardinality fields frequently used in filters. Updated the explanation, diagram, and example query to use low-cardinality `service` and `level` fields before `timestamp`.
- The aggregation performance note was too broad. Updated it to state that aggregations still collect all matching documents and therefore do not receive the same early-termination benefit.
- The field type restrictions listed only some numeric field types and described nested/object mappings as unsupported generally. Updated the text to say numeric types are supported and that nested/object fields are not supported as sort fields.
- The "Analyze Query Patterns First" example attempted a `terms` aggregation on `_score`, which is not a valid way to discover common sort fields. Replaced it with an example that aggregates a keyword field from separately logged search requests.

## Review Notes
- The Elasticsearch API examples use Kibana Console-style request snippets inside `json` fences. The request bodies and settings are technically valid, but future cleanup could switch those fences to `console` for more precise syntax highlighting.
- The benchmark table remains illustrative. Actual performance gains depend on shard count, segment layout, filter selectivity, index size, hardware, and whether exact hit counts or aggregations are requested.
