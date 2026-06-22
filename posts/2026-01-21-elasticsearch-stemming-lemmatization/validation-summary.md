# Validation Summary: How to Implement Stemming and Lemmatization in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch text analysis
- Elasticsearch built-in language analyzers
- Elasticsearch token filters: stemmer, porter_stem, snowball, stemmer_override, keyword_marker, hunspell, stop, elision
- Elasticsearch Analyze API, Search API, Bulk API, and multi_match queries
- Stemming, lemmatization, and language-specific search analysis

## Sources Consulted
- Elasticsearch Language analyzers documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-lang-analyzer
- Elasticsearch Stemmer token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-stemmer-tokenfilter
- Elasticsearch Porter stem token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-porterstem-tokenfilter
- Elasticsearch Snowball token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-snowball-tokenfilter
- Elasticsearch Stemmer override token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-stemmer-override-tokenfilter
- Elasticsearch Keyword marker token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-keyword-marker-tokenfilter
- Elasticsearch Hunspell token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-hunspell-tokenfilter
- Elasticsearch Elision token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-elision-tokenfilter
- Elasticsearch Analyze API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze
- Elasticsearch Bulk API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch multi_match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query

## Issues Found
- The introduction implied default stemming would match the irregular form "ran" from a query for "running". I changed this to explain that "ran" requires custom overrides, because Elasticsearch's stemmers are algorithmic and do not generally perform full lemmatization for irregular forms.
- The built-in analyzer section said language analyzers include stemming by default. I changed this to "Many language analyzers" because not every built-in language analyzer is stemmer-based.
- The English analyzer output listed `quick`, but the default English/Porter-style stemming output is `quickli`. I corrected the output token list.
- The Snowball language list omitted currently documented values: Estonian, Irish, and Serbian. I added them.
- The stemmer language list was incomplete for current Elasticsearch documentation. I added missing supported values including `lovins`, `estonian`, `light_nynorsk`, `minimal_nynorsk`, `persian`, `portuguese_rslp`, `serbian`, and `spanish_plural`, and noted that `dutch_kp` and `lovins` are deprecated in Elasticsearch 8.16.
- The pattern-based keyword marker example referenced `english_stemmer` without defining it in that index creation request. I added the missing stemmer filter definition so the snippet is self-contained and valid.

## Review Notes
The examples use current Elasticsearch analysis APIs and token filter names. The bulk example uses newline-delimited request content; Elasticsearch documentation allows `application/json` or `application/x-ndjson`, though `application/x-ndjson` is often clearer for Bulk API examples. No additional changes were required.
