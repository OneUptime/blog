# Validation Summary: How to Use Redis as a Cache for Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3
- Redis (via redis-py)
- Elasticsearch (via elasticsearch-py)
- hashlib (Python standard library)
- json (Python standard library)

## Sources Consulted
- elasticsearch-py 8.x migration guide: https://www.elastic.co/guide/en/elasticsearch/client/python-api/8.19/migration.html
- elasticsearch-py API docs: https://elasticsearch-py.readthedocs.io/en/v8.17.0/api/elasticsearch.html
- redis-py documentation and source: https://github.com/redis/redis-py
- Redis SET command docs: https://redis.io/docs/latest/commands/set/
- Redis SCAN command docs: https://redis.io/docs/latest/commands/scan/
- Python json module docs: https://docs.python.org/3/library/json.html
- Python hashlib module docs: https://docs.python.org/3/library/hashlib.html

## Issues Found
- **Non-deterministic cache key in `cached_aggregation`**: The function used `str(agg_query)` to serialize the query dict for hashing into a cache key. Python's `str()` on a dict reflects insertion order, not sorted order, so two logically equivalent dicts constructed with different insertion orders would produce different cache keys, causing cache misses. Fixed by replacing `str(agg_query)` with `json.dumps(agg_query, sort_keys=True)` to match the deterministic approach already used in `build_cache_key`.

## Review Notes
- The `body` parameter used in `es.search()` and `es.index()` calls is deprecated in elasticsearch-py 8.x (though it still functions). The recommended 8.x approach is to pass top-level body keys as keyword arguments (e.g., `query=`, `aggs=`, `size=`) or use `document=` for `es.index()`. The `body` parameter is expected to be removed in 9.0. The code as written is functional across both 7.x and 8.x, so this was not changed, but it is worth noting for future updates.
- The `cached_search` function properly handles both elasticsearch-py 7.x (dict response) and 8.x (`ObjectApiResponse` with `.body` attribute), which is good cross-version compatibility.
- The SCAN-based cache invalidation pattern is correct and production-appropriate (uses cursor iteration rather than the blocking KEYS command).
