# Validation Summary: How to Understand store:yes in Elasticsearch Mapping

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch mappings
- Elasticsearch `_source` field
- Elasticsearch stored fields
- Elasticsearch doc values
- Elasticsearch Search and Get APIs
- Python Elasticsearch client
- curl

## Sources Consulted
- Elasticsearch Reference: `store` mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-store
- Elasticsearch Reference: `_source` field - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-source-field
- Elasticsearch Reference: Retrieve selected fields - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrieve-selected-fields
- Elasticsearch API Reference: Get a document by ID - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get
- Elasticsearch API Reference: Search API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elasticsearch Reference: `doc_values` mapping parameter - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/doc-values
- Python Elasticsearch client API documentation - https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The `articles_optimized` example retrieved stored fields without indexing a document into that index. Added an indexing command so the stored-fields GET request can return the documented fields.
- The search examples requested `stored_fields` from the `articles` index, whose mapping did not mark those fields with `store: true`. Updated those requests to use `articles_optimized`, where `title`, `author`, and `published_date` are stored.
- The Python benchmark used `es.get(..., _source=[...])`, which is not the current Python client keyword argument. Updated it to `source_includes=[...]`.
- The `_source` disabled log example said storage is saved when the full payload is rarely needed. Clarified that storage is saved only when the payload does not need to be retrieved from Elasticsearch, because a non-stored field with `_source` disabled is not retrievable from Elasticsearch.
- The benchmark section claimed a fixed 2-5x speedup for documents over 10KB. Replaced the unverified fixed performance claim with a measured-use-case statement.
- The trade-off table said full document retrieval with `store: true` must reconstruct from fields. Corrected this to explain that full retrieval still uses `_source` when enabled, and is unavailable when `_source` is disabled.

## Review Notes
Elasticsearch documentation generally recommends source filtering before using stored fields, and notes that disabling `_source` removes important features such as update, update_by_query, reindex, Kibana Discover field display, and on-the-fly highlighting. The post now preserves that caution while focusing on the intended stored-fields optimization use case.
