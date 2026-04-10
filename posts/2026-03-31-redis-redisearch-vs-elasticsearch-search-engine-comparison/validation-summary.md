# Validation Summary: RediSearch vs Elasticsearch: Search Engine Comparison

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- RediSearch (Redis Stack)
- Elasticsearch
- Redis CLI (FT.CREATE, FT.SEARCH, FT.AGGREGATE)
- Elasticsearch REST API
- redis-benchmark
- wrk (HTTP benchmarking tool)

## Sources Consulted
- Elasticsearch 8.x official documentation — mapping parameters (boost deprecation/removal): https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-boost.html
- Elasticsearch 8.0 migration guide — mapping changes confirming boost removal
- Elasticsearch official documentation — analysis custom analyzers and token filters: https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-custom-analyzer.html
- RediSearch official documentation — FT.CREATE command syntax (LANGUAGE_FIELD placement): https://redis.io/docs/latest/commands/ft.create/
- Redis official documentation — redis-benchmark command syntax and custom commands: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/

## Issues Found

1. **Elasticsearch `boost` in field mapping (line 45)**: The `"boost": 3.0` parameter in the Elasticsearch index mapping is deprecated since ES 5.0 and removed in ES 8.0+. Removed it from the mapping. In current ES versions, boosting should be applied at query time (e.g., `"title^3"` in multi_match queries).

2. **Missing `english_stop` filter definition (line 168-170)**: The custom analyzer referenced an `english_stop` filter in its filter chain, but the `filter` section did not define it. `english_stop` is not a built-in token filter name in Elasticsearch. Added the missing definition: `"english_stop": { "type": "stop", "stopwords": "_english_" }`.

3. **RediSearch `LANGUAGE_FIELD` placement (line 187-189)**: `LANGUAGE_FIELD` is an index-level option that must appear before `SCHEMA`, not after a field definition inside the schema block. Moved `LANGUAGE_FIELD lang` before `SCHEMA` in the FT.CREATE command.

4. **Invalid `redis-benchmark --command` flag (line 211-212)**: The `--command` flag does not exist in `redis-benchmark`. Custom commands are passed as positional arguments after all flags. Changed to: `redis-benchmark -n 50000 -c 20 FT.SEARCH idx:articles "redis" LIMIT 0 10`.

## Review Notes
- The operational comparison table states RediSearch requires "Drop/recreate index" for schema updates. This is a simplification — `FT.ALTER` allows adding new fields to an existing index, but modifying existing field definitions does require drop/recreate. Acceptable for a comparison table.
- The performance benchmark numbers (p99 latency) are presented as rough estimates. Actual numbers vary significantly by hardware, dataset size, and query complexity. The relative comparison (RediSearch faster for in-memory datasets) is directionally correct.
- The `wrk` benchmark example references a `search.lua` script that is not provided. This is acceptable as illustrative but readers would need to write their own script.
