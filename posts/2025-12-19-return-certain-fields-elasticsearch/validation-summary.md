# Validation Summary: How to Return Only Certain Fields in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Search API
- Elasticsearch `_source` filtering
- Elasticsearch `stored_fields`
- Elasticsearch `docvalue_fields`
- Elasticsearch `script_fields`
- elasticsearch-py
- `@elastic/elasticsearch` JavaScript client
- Elasticsearch Java API Client

## Sources Consulted
- Elasticsearch documentation: Retrieve selected fields from a search, https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrieve-selected-fields
- Elasticsearch Search API reference, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elasticsearch Python client examples, https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples
- Python Elasticsearch client API documentation, https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- Elasticsearch JavaScript client API reference, https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Elasticsearch Java API Client documentation, https://www.elastic.co/docs/reference/elasticsearch/clients/java

## Issues Found
- The `docvalue_fields` example requested `timestamp` twice: once as a plain field and once with a date format. I removed the duplicate plain `timestamp` entry so the example demonstrates the formatted date field cleanly.
- The Python client examples mixed older request-body style with the current keyword-argument style. I updated them to use top-level `query`, `source_includes`, and `source` parameters supported by the current Python client.
- The JavaScript client example used a `body` wrapper. I updated it to use current top-level `query` and `_source` request parameters.
- The performance table gave fixed percentage latency improvements that are not guaranteed by Elasticsearch documentation. I changed it to a qualitative fetch-behavior comparison because `_source` filtering still loads and parses `_source`, while `stored_fields` and `docvalue_fields` use different retrieval paths.
- The production best-practice examples used placeholder `...` inside JSON. I replaced those placeholders with valid `match_all` queries.

## Review Notes
The core field retrieval mechanisms are accurate. Official Elasticsearch documentation notes that the `fields` option is typically preferred for many selected-field retrieval cases unless you specifically need `_source`, `stored_fields`, or `docvalue_fields`; this post focuses on the latter mechanisms and could mention `fields` in a future broader update.
