# Validation Summary: How to Update Multiple Documents by Query in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Update By Query API
- Elasticsearch Tasks API
- Painless scripting
- Python Elasticsearch client
- JavaScript Elasticsearch client
- Elasticsearch index settings

## Sources Consulted
- Elasticsearch Update By Query API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query
- Elasticsearch v9 Update By Query API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v9/operation/operation-update-by-query
- Painless update-by-query context documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-update-by-query-context
- Painless operators documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-operators
- Python Elasticsearch client API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- JavaScript Elasticsearch client API documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Elasticsearch Update API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update

## Issues Found
- The Painless examples used `ctx.op = 'noop'` for update-by-query no-op handling. Current Elastic Painless update-by-query context documentation specifies `ctx.op = 'none'` for no operation and `ctx.op = 'delete'` for deletion, so both no-op examples were changed to `ctx.op = 'none'`.
- The Python progress helper named its fourth parameter `batch_size` but passed it to `requests_per_second`, which is a throttle rate rather than a batch size. The helper now uses separate `scroll_size` and `requests_per_second` parameters and passes them to the matching client arguments.
- The Python examples used legacy request bodies where current client documentation exposes `query`, `script`, and update `script` as top-level client parameters. These calls were updated to current client-style arguments.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. It now uses `datetime.now(timezone.utc).isoformat()`.
- The batch update helper accepted an `id_field` parameter but ignored it while also defaulting to `_id` despite the documented input shape using `id`. The default is now `id`, and the helper uses `update[id_field]`.
- The JavaScript examples wrapped `query` and `script` in `body`; current generated client documentation lists them as top-level request parameters. These examples were updated accordingly.

## Review Notes
The Elasticsearch REST examples are written in Kibana Console style rather than strict JSON, which is appropriate for the shown `POST` requests, comments, and triple-quoted Painless scripts. Future revisions could mention version assumptions for Elasticsearch and the official clients, but the corrected examples match the current documentation reviewed on 2026-06-23.
