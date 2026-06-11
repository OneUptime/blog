# Validation Summary: How to Build Elasticsearch Function Score Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch `function_score` query
- Elasticsearch `field_value_factor`, decay functions, and `script_score`
- Painless scripting
- Elasticsearch rescore, explain, and profiling features

## Sources Consulted
- Elasticsearch Function score query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-function-score-query
- Elasticsearch Script score query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-script-score-query
- Elasticsearch Rescore search results documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/rescore-search-results
- Elasticsearch Painless datetime documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/using-datetime-in-painless
- Elasticsearch Boolean query / named query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query

## Issues Found
- The parameter table stated that `functions` is required. Elasticsearch allows single scoring functions such as `weight`, `script_score`, or `field_value_factor` directly inside `function_score`, so the table now says `functions` is optional for single-function queries and useful for multiple functions or per-function filters.
- The `log` and `ln` modifier descriptions said only that the value must be greater than zero. Elasticsearch scores must be non-negative, and logarithm modifiers can error or produce invalid negative scores depending on the field value, factor, and missing value. The wording now calls out that those inputs must not produce illegal operations or negative scores.
- The date decay example described the configuration as a 7-day half-life even though the query includes a 1-day `offset`, so the score reaches `decay: 0.5` after offset plus scale. The wording now describes the 1-day offset plus 7-day scale accurately.
- The performance section suggested using `min_score` to filter low-scoring documents early. Elasticsearch documents that `min_score` requires returned documents to be scored and then filtered, so the guidance now says to use it only when low-scoring documents need to be excluded after scoring.
- The rescore example used a placeholder script source that would not compile. It now uses a valid Painless scoring expression with a missing-value guard.

## Review Notes
The post remains accurate for current Elasticsearch documentation. Elastic's current docs recommend the standalone `script_score` query for simpler custom scripted scoring, but `script_score` inside `function_score` is still documented and valid.
