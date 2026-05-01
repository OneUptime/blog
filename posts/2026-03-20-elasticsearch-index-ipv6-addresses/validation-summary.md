# Validation Summary: How to Configure Elasticsearch to Index IPv6 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elasticsearch
- Elasticsearch index mappings and index templates
- Elasticsearch Query DSL
- Elasticsearch aggregations
- Elasticsearch Python client
- IPv6
- Python

## Sources Consulted
- Elastic Docs: IP field type - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ip
- Elastic Docs: IP prefix aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-ipprefix-aggregation
- Elastic Docs: Terms query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-query
- Elastic Docs: Terms aggregation - https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html
- Elastic Docs: Templates - https://www.elastic.co/docs/manage-data/data-store/templates
- Elastic Docs: Create or update an index template - https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-template.html
- Elastic Docs: Elasticsearch Python client examples - https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples
- Elastic Docs: Querying with the Python client - https://www.elastic.co/docs/reference/elasticsearch/clients/python/querying

## Issues Found
- The original "Top /48 prefixes by request count" example used a `terms` aggregation on `client_ip`, which buckets exact IP values rather than IPv6 prefixes. I replaced it with the documented `ip_prefix` aggregation using `prefix_length: 48`, `is_ipv6: true`, and `append_prefix_length: true`.
- The original multi-subnet example used a `terms` query with CIDR values. Elastic explicitly documents CIDR matching on `ip` fields with `term` queries, so I rewrote the example as a `bool.should` filter containing individual `term` clauses for each subnet.
- The Python helper used `es_client.search(..., body=query)`. I updated it to the current parameterized client style shown in Elastic's Python client examples: `query=`, `aggs=`, and `size=`.
- I removed a comment and conclusion wording that implied automatic IPv6 normalization behavior and a stronger performance claim than the cited docs explicitly support.

## Review Notes
- The REST API snippets use Elasticsearch console-style request syntax (`PUT /index` with a JSON body). If the blog renderer supports it, `console` or `http` code fences would be clearer than `json`, but the request content itself is correct.
