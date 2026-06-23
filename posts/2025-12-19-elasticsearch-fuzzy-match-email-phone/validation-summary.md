# Validation Summary: How to Fuzzy Match Email or Phone Numbers in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch mappings and analyzers
- Elasticsearch Query DSL
- Elasticsearch fuzzy, term, wildcard, match, bool, exists, and multi_match queries
- Elasticsearch ngram token filter and uax_url_email tokenizer
- Python Elasticsearch client
- Python regular expressions for phone normalization

## Sources Consulted
- Elasticsearch UAX URL email tokenizer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-uaxurlemail-tokenizer
- Elasticsearch ngram token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-ngram-tokenfilter
- Elasticsearch match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch wildcard query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query
- Elasticsearch term query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elasticsearch Python client querying documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/querying
- Elasticsearch Python client examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples
- Google libphonenumber project documentation: https://github.com/google/libphonenumber

## Issues Found
- The `phone_ngram` filter used `min_gram: 3` and `max_gram: 10` without increasing `index.max_ngram_diff`. Added `"max_ngram_diff": 7` so the index creation request is valid with current Elasticsearch defaults.
- The indexing example stored the original phone number in `phone_raw`, but the mapping did not define that field. Added `phone_raw` as a `keyword` field.
- The partial phone wildcard query targeted the analyzed `phone` text field. Changed it to `phone.keyword` so the wildcard query runs against the normalized exact-value subfield.
- The combined Python search function used a `term` query against the analyzed `phone` text field. Changed it to `phone.keyword` to avoid exact term queries on text fields.
- The Python client examples used `body=` for search requests. Updated them to use current typed parameters / body unpacking supported by the official Python client examples.
- The `international_contacts` index referenced `phone_analyzer` without defining it. Added the matching analyzer and char filter settings to that index creation snippet.

## Review Notes
- The simple `parse_international_phone` function is acceptable as an illustrative example, but production international phone parsing should use a maintained library such as libphonenumber because country-code and national-number rules are more complex than the example covers.
- The email `autocomplete` subfield uses the standard analyzer for simple part matching. This is technically valid, but a production autocomplete implementation may benefit from a dedicated edge-ngram or `search_as_you_type` field depending on expected query behavior.
