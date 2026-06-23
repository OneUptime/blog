# Validation Summary: How to Search for Part of a Word in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Query DSL
- Wildcard queries
- Prefix queries
- Regexp queries
- Match and multi-match queries
- Match phrase prefix queries
- Elasticsearch analyzers
- N-gram and edge n-gram tokenizers

## Sources Consulted
- Elasticsearch wildcard query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query
- Elasticsearch prefix query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-prefix-query
- Elasticsearch regexp query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-regexp-query
- Elasticsearch match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch match phrase prefix query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase-prefix
- Elasticsearch multi-match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Elasticsearch rewrite parameter documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-term-rewrite
- Elasticsearch n-gram tokenizer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-ngram-tokenizer
- Elasticsearch edge n-gram tokenizer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenizer

## Issues Found
- The n-gram analyzer example used `max_gram: 4` but searched for `artph`, a 5-character token. With the configured `search_analyzer`, that query would not match because only n-grams up to 4 characters are indexed. Changed the example query and explanation from `artph` to `artp`.
- The post described wildcard, prefix, and regexp queries as having "No" scoring. Elasticsearch multi-term queries use constant scoring by default and can be configured with rewrite methods, so this was too absolute. Updated the wording and comparison table to say "constant scoring by default."

## Review Notes
The query and analyzer examples use current Elasticsearch Query DSL and analysis settings. The article could later mention `search.allow_expensive_queries` and `index_prefixes` as additional production caveats for wildcard and prefix queries, but the existing guidance is technically correct after the fixes above.
