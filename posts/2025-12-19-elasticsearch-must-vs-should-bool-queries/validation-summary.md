# Validation Summary: How to Understand MUST vs SHOULD in Bool Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Query DSL
- Bool query
- Match query
- Term query
- Range query
- Geo distance query
- `minimum_should_match`

## Sources Consulted
- Elastic documentation: Boolean query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elastic documentation: `minimum_should_match` parameter - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-minimum-should-match
- Elastic documentation: Match query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elastic documentation: Term query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elastic documentation: Range query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-range-query

## Issues Found
- The post initially said at least one `should` clause must match by default without enough context. Elastic's bool query documentation states the default `minimum_should_match` is `1` only when the bool query has at least one `should` clause and no `must` or `filter` clauses; otherwise the default is `0`. Updated the `SHOULD` explanation to specify the "should-only" case.
- The post described `should` with `must` as "purely optional" without noting the `minimum_should_match` condition. Updated that explanation and the summary to say this is the default behavior unless `minimum_should_match` is set.
- The decision tree said `should` with `must` or `filter` is a "purely optional boost." Updated it to "Optional by default" to match Elasticsearch's documented behavior.

## Review Notes
The Query DSL examples use current bool query, match query, term query, range query, and geo distance query syntax. Some examples assume conventional mappings, such as keyword/boolean fields for `term` queries and geo-point mapping for `geo_distance`; those assumptions are normal for illustrative Elasticsearch examples but should be made explicit in a production tutorial.
