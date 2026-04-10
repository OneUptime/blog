# Validation Summary: How to Use Redis for Search Suggest and Autocomplete

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Sorted Sets (ZADD, ZRANGEBYLEX)
- RediSearch (FT.SUGADD, FT.SUGGET)
- Python redis-py client library
- Redis Hashes (HSET, HGET, HINCRBYFLOAT)
- Redis Pipelining

## Sources Consulted
- Redis ZRANGEBYLEX documentation — https://redis.io/docs/latest/commands/zrangebylex/
- Redis Sorted Sets documentation — https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis FT.SUGADD documentation — https://redis.io/docs/latest/commands/ft.sugadd/
- Redis FT.SUGGET documentation — https://redis.io/docs/latest/commands/ft.sugget/
- redis-py documentation — https://redis-py.readthedocs.io/

## Issues Found

### Issue 1: ZRANGEBYLEX used with mixed scores (Critical)
**What was wrong:** The `add_term` function stored prefixes with score 0 and full terms with a non-zero popularity score in the same sorted set. The `autocomplete` function then used `ZRANGEBYLEX` to do prefix matching. However, `ZRANGEBYLEX` only produces correct results when all elements have the same score. The Redis documentation states: "If the elements in a sorted set have different scores, the returned elements are unspecified."

**What was changed:** All sorted set members are now stored with score 0. Popularity scores are stored in a separate Redis hash (`index_key + ":scores"`) using `HSET`. The `autocomplete` function retrieves scores from the hash via pipelined `HGET` calls instead of `ZSCORE`.

**Why:** This ensures `ZRANGEBYLEX` operates on a uniformly-scored sorted set, producing correct lexicographic range results as intended.

### Issue 2: Prefixes indistinguishable from full terms (Critical)
**What was wrong:** The loop `for i in range(1, len(term) + 1)` with `pipe.zadd(index_key, {prefix + "*": 0})` appended the `*` suffix to every prefix, not just full terms. For example, the term "apple" would produce members "a*", "ap*", "app*", "appl*", "apple*" — all ending with `*`. The subsequent filter `c.endswith("*")` would match prefixes as well as full terms, returning meaningless fragments like "a", "ap" in autocomplete results.

**What was changed:** The loop now uses `range(1, len(term))` (excluding the full length) and stores prefixes without the `*` suffix. Only the full term gets the `*` marker. This allows `endswith("*")` to correctly distinguish full terms from prefixes.

**Why:** Without this fix, autocomplete would return partial prefix fragments alongside actual completions.

### Issue 3: record_selection used ZINCRBY on the sorted set (Moderate)
**What was wrong:** `record_selection` used `client.zincrby(index_key, 1, member)` to boost a term's score directly in the sorted set. This would cause the boosted term's score to diverge from 0, breaking `ZRANGEBYLEX` for future queries.

**What was changed:** Replaced `zincrby` on the sorted set with `hincrbyfloat` on the separate scores hash (`index_key + ":scores"`), keeping sorted set scores at a uniform 0.

**Why:** Score modifications must happen in the separate hash to preserve `ZRANGEBYLEX` correctness.

## Review Notes
- The FT.SUGADD/FT.SUGGET section (Approach 2) is correct and uses valid syntax per the RediSearch documentation.
- The caching section is correct — uses standard Redis GET/SET with TTL and proper JSON serialization.
- The `\xff` byte used as an upper bound in the `ZRANGEBYLEX` range works correctly for ASCII terms with `decode_responses=True`, which is the typical autocomplete use case. For Unicode terms, a different upper bound strategy may be needed.
- `ZRANGEBYLEX` is considered a legacy command as of Redis 6.2 (replaced by `ZRANGE` with `BYLEX` option), but it is not deprecated and remains functional.
