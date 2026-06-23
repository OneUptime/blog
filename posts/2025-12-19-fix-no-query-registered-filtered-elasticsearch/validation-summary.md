# Validation Summary: How to Fix 'no [query] registered for [filtered]' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Elasticsearch
- Elasticsearch Query DSL
- Bool query
- Filter context
- Python

## Sources Consulted
- Elasticsearch 2.3 Filtered Query documentation: https://www.elastic.co/guide/en/elasticsearch/reference/2.3/query-dsl-filtered-query.html
- Elasticsearch current Bool Query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Query DSL query and filter context documentation: https://www.elastic.co/docs/explore-analyze/query-filter/languages/querydsl
- Elasticsearch 2.3 And Query documentation: https://www.elastic.co/guide/en/elasticsearch/reference/2.3/query-dsl-and-query.html
- Elasticsearch 2.3 Or Query documentation: https://www.elastic.co/guide/en/elasticsearch/reference/2.3/query-dsl-or-query.html
- Elasticsearch 2.3 Not Query documentation: https://www.elastic.co/guide/en/elasticsearch/reference/2.3/query-dsl-not-query.html
- Elasticsearch Terms Query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-query
- Elastic blog, "Lost in Translation: Boolean Operations and Filters in the Bool Query": https://www.elastic.co/blog/lost-in-translation-boolean-operations-and-filters-in-the-bool-query

## Issues Found
- The Elasticsearch Dev Tools examples that include `GET /products/_search` were fenced as `json`, even though the method/path line is not JSON. Changed those fences to `console`.
- The bool query reference table said `filter` clauses are "cached". Elasticsearch documentation is more precise: filter clauses run in filter context and are considered for caching, with frequently used filters cached automatically. Updated the wording.
- The best practices section said filters are cached and faster. Updated it to say filters skip scoring and frequently used filters can be cached.
- The migration script listed deprecated `and/or` filter handling but the post also discusses `not` filters. Added `not` handling that maps to `bool.must_not`.
- Removed an unused Python `re` import from the migration script.

## Review Notes
The main migration guidance is accurate: use `bool.must` for scoring query clauses and `bool.filter` for non-scoring filters when replacing deprecated `filtered` queries. For filter-only migrations, the bool-filter and constant_score forms both match the same documents, but they differ in score behavior: bool filter-only queries return score 0, while `constant_score` assigns a constant score.
