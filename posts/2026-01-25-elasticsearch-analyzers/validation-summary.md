# Validation Summary: How to Configure Analyzers in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch Analyze API
- Elasticsearch analyzers, character filters, tokenizers, token filters, and normalizers
- Elasticsearch Python client
- curl

## Sources Consulted
- Elasticsearch Analyze API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze
- Elasticsearch custom analyzer documentation: https://www.elastic.co/docs/manage-data/data-store/text-analysis/create-custom-analyzer
- Elasticsearch language analyzer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-lang-analyzer
- Elasticsearch Porter stem token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-porterstem-tokenfilter
- Elasticsearch stop token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-stop-tokenfilter
- Elasticsearch normalizer mapping documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/normalizer
- Elasticsearch Python client indices API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/indices.html

## Issues Found
- The English analyzer output was inaccurate. The post said `foxes` remained unstemmed and that `were` was removed. The documented English analyzer uses lowercase, English stop words, and English stemming; `foxes` stems to `fox`, `quickly` stems to `quickli`, and `were` is not in the default English stop word list. Updated the output comment accordingly.
- The ASCII folding example used unaccented input, so it did not demonstrate accent folding. Changed the input to `Café résumé naïve` and added the expected folded output.
- The Python utility used `body=` for Analyze API and Create Index API calls. The current Python client documents explicit keyword arguments such as `analyzer`, `text`, `tokenizer`, `filter`, `char_filter`, and `settings`. Updated the examples to use those parameters.
- The Python `analyze_with_details` helper returned only `detail.tokenizer.tokens`, which is empty for named analyzer explanations that return `detail.analyzer.tokens`. Updated it to return analyzer tokens when present, the final token filter tokens for custom component explanations, and tokenizer tokens as a fallback.

## Review Notes
The curl examples and Elasticsearch analysis configuration structure are consistent with the official Analyze API and custom analyzer documentation. I could not run the examples against a local Elasticsearch node because nothing was listening on `localhost:9200` in this environment, so validation was performed against official documentation.
