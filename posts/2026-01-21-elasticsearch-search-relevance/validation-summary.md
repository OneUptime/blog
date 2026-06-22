# Validation Summary: How to Boost Search Relevance in Elasticsearch

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Elasticsearch
- Elasticsearch Query DSL
- BM25 scoring
- Field boosting
- Function score query
- Field value factor
- Decay functions
- Painless scripting
- Explain API
- Rank Evaluation API

## Sources Consulted
- Elasticsearch function score query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-function-score-query
- Elasticsearch boosting query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-boosting-query
- Elasticsearch constant score query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-constant-score-query
- Elasticsearch similarity settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity
- Elasticsearch Explain API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain
- Elasticsearch Ranking Evaluation API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval
- Elasticsearch 7.17 mapping boost documentation, for deprecation history: https://www.elastic.co/guide/en/elasticsearch/reference/7.17/mapping-boost.html

## Issues Found
- The post showed a field mapping `boost` example under "At Index Time". Current Elasticsearch documentation no longer lists `boost` as a mapping parameter, and the older mapping boost documentation states that index-time boosting was deprecated in Elasticsearch 5.0. I replaced the stale mapping example with a current query-time `match` query boost example and updated the surrounding note.
- The `field_value_factor` modifier list did not mention that Elasticsearch applies `factor` before the modifier, and it described `log`, `log1p`, and `log2p` generically. I added the factor-order note and clarified that these are common logarithm modifiers, while `ln` variants are natural logarithms.
- The script score examples explicitly multiplied by `_score` but did not set `boost_mode` to `replace`. In `function_score`, the script score is multiplied with the query score by default, which would multiply the query score twice. I added `"boost_mode": "replace"` to both script score examples so the script controls the final score as written.

## Review Notes
The examples assume appropriate mappings for queried fields, such as numeric fields for `field_value_factor`, date/numeric/geo fields for decay functions, keyword-style fields for exact `term` filters, and doc values for fields used in scripts. Those assumptions are typical for a concise relevance-tuning guide but should be made explicit in a fuller production tutorial.
