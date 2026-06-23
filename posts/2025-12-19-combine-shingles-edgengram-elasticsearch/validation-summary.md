# Validation Summary: How to Combine Shingles and edgeNgram for Flexible Search

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Elasticsearch text analysis
- Shingle token filter
- Edge n-gram token filter
- Elasticsearch multi-fields
- Elasticsearch Query DSL
- Python Elasticsearch client

## Sources Consulted
- Elasticsearch edge n-gram token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenfilter
- Elasticsearch shingle token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-shingle-tokenfilter
- Elasticsearch index settings documentation for `index.max_ngram_diff`: https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
- Elasticsearch multi-fields mapping documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/multi-fields
- Elasticsearch `index_options` mapping documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/index-options
- Elasticsearch `match` query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch `match_phrase` query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase
- Elasticsearch `multi_match` query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Python Elasticsearch client API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The original feature table said shingles provide "word order flexibility." Shingles preserve adjacent token order, so this was corrected to "word order awareness."
- The shingle explanation was tightened to say shingles match ordered phrases and adjacent word combinations, avoiding the implication that shingles broadly handle reordered or loosely different queries.
- The search strategy explanation described the main `title` field as "exact matches." Elasticsearch `match` queries analyze text and are not exact-term queries, so this was corrected to "standard full-text matches."
- The combined analyzer example omitted the next token group after the repeated `quick` prefixes, making the sample less representative of the shingle-plus-edge-ngram stream. The example was clarified by showing the `brown` prefix group.
- The `index_options` optimization snippet used a dotted `title.edge` key as if it were a complete mapping fragment. This was changed to a valid `mappings.properties.title.fields.edge` structure.

## Review Notes
- The main analyzer and mapping configuration is technically valid for current Elasticsearch. The configured `max_gram` and `min_gram` require `index.max_ngram_diff: 19`, which the post includes.
- The Python example uses `body` with `Elasticsearch.search()`, which is still accepted by the current official Python client. Newer examples often pass top-level request parameters such as `query`, `size`, `source`, and `highlight`, but the existing code remains valid.
- Elastic's documentation recommends considering `index_phrases` for phrase-query optimization and `search_as_you_type` for built-in as-you-type use cases. Those are alternatives to evaluate for future improvements, not correctness issues in this post.
