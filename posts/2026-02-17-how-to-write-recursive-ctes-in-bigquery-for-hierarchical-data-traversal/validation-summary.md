# Validation Summary: How to Write Recursive CTEs in BigQuery for Hierarchical Data Traversal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- GoogleSQL
- Recursive Common Table Expressions
- Hierarchical data traversal
- Graph traversal

## Sources Consulted
- Google Cloud BigQuery documentation: Work with recursive CTEs - https://docs.cloud.google.com/bigquery/docs/recursive-ctes
- Google Cloud BigQuery GoogleSQL reference: Query syntax - https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- Google Cloud BigQuery documentation: Introduction to clustered tables - https://docs.cloud.google.com/bigquery/docs/clustered-tables
- Google Cloud BigQuery documentation: Querying clustered tables - https://docs.cloud.google.com/bigquery/docs/querying-clustered-tables
- Google Cloud BigQuery documentation: Search indexes - https://docs.cloud.google.com/bigquery/docs/search-index

## Issues Found
- The graph traversal example used `STRPOS(r.path, n.target_server) = 0` for cycle prevention. This can incorrectly reject valid nodes when one node ID is a substring of another node ID. Changed the path to an `ARRAY<STRING>` and used `n.target_server NOT IN UNNEST(r.path)` with `ARRAY_CONCAT` so cycle checks compare whole node IDs.
- The graph traversal explanation said cycles would cause infinite recursion. BigQuery enforces a recursive CTE iteration limit, so unbounded recursion fails when the limit is reached. Updated the text to say the query continues until BigQuery's recursion limit is reached and the query fails.
- The recursion limit section described the 500-iteration limit as a default without noting that BigQuery enforces it. Updated the wording to "enforces a recursion limit of 500 iterations by default" to align with official documentation.
- The performance section said to use "indexed or clustered columns" for selective recursive joins. BigQuery does not have conventional table indexes for normal join optimization; search indexes are specialized for search and some supported operators. Updated the guidance to focus on narrow, consistently typed join keys and clustering large source tables on commonly filtered columns.
- The performance section described each recursive iteration as a separate stage. Official documentation describes recursive CTEs as iterative recursive-term execution; updated the wording to avoid over-specifying BigQuery's execution-plan internals.

## Review Notes
The SQL examples are illustrative and assume the referenced project, dataset, table, and column names exist with compatible types. No deprecations were found for the BigQuery recursive CTE syntax used in the post.
