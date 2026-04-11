# Validation Summary: How to Use Redis T-Digest for Latency Percentile Calculation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom / Redis Stack T-Digest module)
- Python (redis-py client library)
- FastAPI (HTTP middleware example)

## Sources Consulted
- Redis TDIGEST.CREATE documentation — https://redis.io/docs/latest/commands/tdigest.create/
- Redis TDIGEST.ADD documentation — https://redis.io/docs/latest/commands/tdigest.add/
- Redis TDIGEST.QUANTILE documentation — https://redis.io/docs/latest/commands/tdigest.quantile/
- Redis TDIGEST.CDF documentation — https://redis.io/docs/latest/commands/tdigest.cdf/
- Redis TDIGEST.INFO documentation — https://redis.io/docs/latest/commands/tdigest.info/
- Redis TDIGEST.MERGE documentation — https://redis.io/docs/latest/commands/tdigest.merge/
- redis-py TDigestCommands source code (GitHub redis/redis-py)

## Issues Found

1. **`TDIGEST.CREATE` CLI syntax missing `COMPRESSION` keyword** — The post used `TDIGEST.CREATE latency:api:get_user 100` but the correct syntax requires the `COMPRESSION` keyword: `TDIGEST.CREATE latency:api:get_user COMPRESSION 100`. Fixed.

2. **`get_digest_summary` used non-existent `TDigestInfo` attributes** — The redis-py `TDigestInfo` object does not have `.min`, `.max`, or `.mean` attributes. Min and max must be retrieved via `r.tdigest().min(key)` and `r.tdigest().max(key)`. Also, the observation count should use `info.merged_weight + info.unmerged_weight` (total observation weight), not `info.merged_nodes + info.unmerged_nodes` (number of centroids, not observations). Fixed to use the correct API calls and attribute.

3. **Percentile label collision for p99.9** — The expression `f"p{int(p * 1000) // 10}"` produces "p99" for both 0.99 and 0.999, causing a dict key collision and silently dropping the p99.9 value. Fixed by using explicit label strings.

4. **Double colon in `latency_metrics` endpoint key** — The `/metrics/latency/{endpoint}` handler used `f"latency::{endpoint}"` (double colon) while the middleware records to keys with a single colon, so the metrics endpoint would never find recorded data. Fixed to use a single colon.

## Review Notes
- `@app.on_event("startup")` is deprecated in newer FastAPI versions in favor of the `lifespan` context manager pattern, but it still functions correctly. A future update could modernize this.
- The `TDIGEST.MERGE` Python call `r.tdigest().merge(dest_key, len(keys), *keys)` is correct per the redis-py API which does accept `num_keys` as a positional argument.
- The T-Digest explanation correctly notes high accuracy at the extremes, which is the key property of the data structure.
