# Validation Summary: How to Use Redis Bloom Filters for URL Deduplication in Crawlers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RedisBloom module / Redis Stack)
- Python (`redis` client library)
- Bloom Filter data structure
- Python `urllib.parse` for URL normalization
- Python `hashlib` for MD5 hashing

## Sources Consulted
- Redis Bloom Filter commands documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html
- Python `urlencode` behavior with `doseq` parameter: https://docs.python.org/3/library/urllib.parse.html#urllib.parse.urlencode
- Bloom filter size formula verification (m = -n * ln(p) / (ln 2)^2)

## Issues Found
1. **Bug in `normalize_url`: `urlencode` missing `doseq=True`**
   - **What was wrong:** `parse_qs()` returns values as lists (e.g., `{'a': ['1'], 'b': ['2']}`). When these list values are passed to `urlencode()` without `doseq=True`, the list objects are stringified and percent-encoded, producing mangled output like `a=%5B%271%27%5D` instead of the correct `a=1`.
   - **What was changed:** Added `doseq=True` to the `urlencode()` call in `normalize_url`.
   - **Why:** Without this fix, URL normalization would produce incorrect query strings, causing the same logical URL to hash differently and defeating deduplication.

## Review Notes
- The `url.strip().lower()` call lowercases the entire URL before parsing, including the path component. Per RFC 3986, only the scheme and host are case-insensitive; paths are technically case-sensitive. However, for crawler deduplication this is a common and reasonable tradeoff, since many web servers are case-insensitive and the cost of a false duplicate (skipping a URL) is low. Not changed.
- The memory estimate of ~1.8 GB for 1 billion URLs at 0.1% false positive rate is mathematically correct per the Bloom filter size formula.
- The `BF.RESERVE`, `BF.EXISTS`, `BF.ADD`, `BF.MADD`, and `BF.INFO` commands all use correct syntax and argument order.
- The `BF.INFO` field name parsing (`'Number of items inserted'`, `'Size'`, `'Capacity'`) matches the Redis documentation for the flat-list response format.
- The Docker image `redis/redis-stack-server:latest` is correct for getting RedisBloom module support.
- There is a minor race condition in `enqueue_batch` where multiple workers could simultaneously check `should_crawl` for the same URL before either marks it visited. The post partially addresses this by calling `mark_visited` before crawling in the worker, which is a reasonable approach and a known tradeoff in distributed crawlers.
