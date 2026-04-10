# Validation Summary: Redis vs Elasticsearch for Search

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Redis (RediSearch / Redis Stack)
- Elasticsearch
- redis-benchmark

## Sources Consulted
- RediSearch official documentation (https://redis.io/docs/latest/develop/interact/search-and-query/)
- Elasticsearch 8.x mapping parameters documentation (https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-boost.html)
- Elasticsearch 8.x query DSL documentation (https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- Redis benchmark documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/)
- RediSearch scoring documentation (https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/scoring/)

## Issues Found

1. **Elasticsearch mapping-level `boost` is deprecated**: The `"boost": 2.0` parameter in the Elasticsearch field mapping was deprecated in Elasticsearch 5.0 and produces deprecation warnings in 7.x/8.x. Removed the `boost` from the mapping definition since query-time boosting is the recommended approach.

2. **RediSearch default scorer incorrectly stated as BM25**: The text said "RediSearch also uses BM25" which implies it is the default scorer, matching Elasticsearch. RediSearch actually defaults to TF-IDF scoring. BM25 is available as an optional scorer via the `SCORER` parameter. Changed the text to clarify that RediSearch defaults to TF-IDF but supports BM25 and other scorers.

3. **Invalid `redis-benchmark --command` flag**: The `--command` flag does not exist in redis-benchmark. Custom commands are passed as positional arguments after the benchmark options. Also removed the redundant `-P 1` flag (pipelining of 1 is the default). Fixed the command to use the correct positional argument syntax.

## Review Notes
- The JSON code blocks on lines 80 and 131 contain `//` comments which are invalid JSON syntax. This is a common convention in technical blog posts for illustrative purposes and was left as-is since it's a widely understood stylistic choice rather than a functional error.
- The post correctly identifies the key trade-offs between RediSearch and Elasticsearch. The guidance on when to use each tool is sound.
- RediSearch does support language-specific stemmers and synonyms (not mentioned in the post), though Elasticsearch's text analysis ecosystem is significantly more comprehensive. The "When to Use Elasticsearch" section's mention of "advanced text analysis" is fair.
