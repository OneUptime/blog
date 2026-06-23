# Validation Summary: How to Combine must with OR in Elasticsearch Bool Query

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elasticsearch
- Query DSL
- Bool query
- Term and terms queries
- Match and range queries
- Explain API

## Sources Consulted
- Elasticsearch Boolean query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Terms query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-query
- Elasticsearch Term query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elasticsearch Explain API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain

## Issues Found
- The post described `filter` clauses as cached and faster for repeated queries. Elasticsearch documents filter clauses as running in filter context, where scoring is ignored and clauses are considered for caching, but caching and speedups are not guaranteed for every query. Updated the wording to say filter clauses are cacheable, considered for caching, and eligible for caching.

## Review Notes
- The bool query examples are syntactically valid Query DSL and correctly demonstrate `must` as AND logic, `should` as OR logic, nested bool queries for grouped OR conditions, and `minimum_should_match` when `should` clauses must be required alongside `must` or `filter` clauses.
- The examples use `term` and `terms` queries for exact matches. In a real index, fields such as `category`, `brand`, and `status` should be mapped as `keyword` or another exact-value type for these examples to behave as shown.
