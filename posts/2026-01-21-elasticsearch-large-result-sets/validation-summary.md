# Validation Summary: How to Handle Large Result Sets in Elasticsearch

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Elasticsearch Search API
- Elasticsearch `from`/`size` pagination
- Elasticsearch `search_after`
- Elasticsearch Point In Time (PIT) API
- Elasticsearch Scroll API and sliced scroll
- Python Elasticsearch client
- Bash, curl, and jq

## Sources Consulted
- Elasticsearch documentation: Paginate search results - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch API documentation: Open a point in time - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time
- Elasticsearch API documentation: Close a point in time - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-close-point-in-time
- Elasticsearch API documentation: Scroll API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll
- Elasticsearch API documentation: Clear scroll API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-clear-scroll
- Elasticsearch mapping documentation: `_id` field - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field
- Python Elasticsearch client API documentation - https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The post used `_id` as a sort field and recommended it as a usual tiebreaker. Elasticsearch restricts `_id` from sorting; the documentation recommends copying it into another field with `doc_values` enabled if it is needed for sorting. Replaced non-PIT `_id` sort examples with `tie_breaker_id`, and clarified that it should be a unique doc-values-backed field.
- PIT examples and export code sorted by `_id`. Updated PIT examples to use the PIT-supported `_shard_doc` tiebreaker for full exports, and relied on the implicit `_shard_doc` tiebreaker for sorted PIT pagination.
- PIT search examples did not mention that Elasticsearch can return a new PIT ID from each search. Added guidance to use the latest `pit_id`, and updated Python examples to carry the latest PIT ID forward before cleanup.
- Python client examples used `localhost:9200` without a URL scheme and used the older `body=query` style. Updated examples to use `http://localhost:9200` and pass search request fields as keyword arguments.
- The Scroll vs PIT table incorrectly said scroll has no custom sort and no parallel request support. Updated it to reflect that scroll can use custom sort, is fastest with `_doc`, and supports parallelism through sliced scroll.
- The clear-all-scrolls example used the deprecated scroll ID path parameter. Replaced it with the request body form using `"scroll_id": "_all"`.
- The Bash scroll export used unquoted `echo $RESPONSE` before piping to `jq`, which can alter JSON. Replaced it with quoted `printf '%s\n' "$RESPONSE"` calls and quoted the output path.

## Review Notes
The core guidance is current: Elasticsearch no longer recommends scroll for deep pagination when a consistent view is needed, and recommends `search_after` with PIT for paging beyond 10,000 hits. The examples remain schematic around authentication and TLS for localhost Elasticsearch; a production-ready version should show either a trusted CA certificate or environment-based connection settings.
