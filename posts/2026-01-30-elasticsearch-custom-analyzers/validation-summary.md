# Validation Summary: How to Build Elasticsearch Custom Analyzers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch custom analyzers
- Elasticsearch Analyze API
- Elasticsearch character filters
- Elasticsearch tokenizers
- Elasticsearch token filters
- Lucene text analysis concepts

## Sources Consulted
- Elastic Docs: Create a custom analyzer: https://www.elastic.co/docs/manage-data/data-store/text-analysis/create-custom-analyzer
- Elastic Docs: Anatomy of an analyzer: https://www.elastic.co/docs/manage-data/data-store/text-analysis/anatomy-of-an-analyzer
- Elastic Docs: Get tokens from text analysis API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze
- Elastic Docs: N-gram tokenizer: https://www.elastic.co/docs/reference/text-analysis/analysis-ngram-tokenizer
- Elastic Docs: Edge n-gram tokenizer: https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenizer
- Elastic Docs: General index settings, including index.max_ngram_diff: https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
- Elastic Docs: Mapping character filter: https://www.elastic.co/docs/reference/text-analysis/analysis-mapping-charfilter
- Elastic Docs: Stop token filter: https://www.elastic.co/docs/reference/text-analysis/analysis-stop-tokenfilter
- Elastic Docs: Synonym token filter: https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter
- Elastic Docs: Synonym graph token filter: https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-graph-tokenfilter
- Elastic Docs: Word delimiter graph token filter: https://www.elastic.co/docs/reference/text-analysis/analysis-word-delimiter-graph-tokenfilter
- Elastic Docs: Flatten graph token filter: https://www.elastic.co/docs/reference/text-analysis/analysis-flatten-graph-tokenfilter

## Issues Found
- The post said every analyzer consists of all three analysis components. Custom analyzers require one tokenizer, while character filters and token filters are optional. Updated the wording to avoid implying every analyzer always has all three.
- The n-gram tokenizer example used `min_gram: 3` and `max_gram: 6` without setting `index.max_ngram_diff`. Current Elasticsearch defaults only allow a difference of `1`, so the index creation request could fail. Added `"index.max_ngram_diff": 3` to that index settings block.
- The e-commerce analyzer defined `brand_synonyms` but did not include it in either analyzer filter chain, while the sample output claimed `HP` expands to `hewlett packard`. Added `brand_synonyms` to both the index and search analyzer filter chains.

## Review Notes
The JSON request bodies embedded in the curl examples were parsed successfully after the edits. The post's advice to consider `synonym_graph` for better multi-word synonym accuracy is consistent with Elastic documentation, with the caveat that Elastic documents `synonym_graph` as search-analyzer-oriented and the standard `synonym` filter as the index-time option.
