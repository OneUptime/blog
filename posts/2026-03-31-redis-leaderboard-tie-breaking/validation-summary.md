# Validation Summary: How to Handle Tie-Breaking in Redis Leaderboards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets, ZADD, ZREVRANGE, ZRANGEBYSCORE)
- Python (redis-py client library)
- redis-cli

## Sources Consulted
- Redis official documentation for Sorted Sets: https://redis.io/docs/data-types/sorted-sets/ — confirms lexicographic ordering of equal-score members
- Redis ZREVRANGE documentation: https://redis.io/commands/zrevrange/ — confirms reverse lexicographic order for equal scores
- Redis ZRANGEBYSCORE documentation: https://redis.io/commands/zrangebyscore/ — confirms exclusive range syntax with `(`
- redis-py documentation: https://redis-py.readthedocs.io/ — confirmed ZADD dict syntax, zrevrange withscores, and pipeline API

## Issues Found

### Issue 1: Strategy 2 lexicographic tie-breaking was inverted
- **What was wrong:** The `encode_member` function used the raw timestamp as part of the member name (`f"{int(achieved_at):020d}:{player_id}"`). Since `ZREVRANGE` returns equal-score members in **reverse** lexicographic order, a later (larger) timestamp would produce a lexicographically higher member name and thus rank first. This means later achievers would rank higher — the opposite of the blog's stated goal that "ties usually should be broken by who achieved the score first."
- **What was changed:** Inverted the timestamp in `encode_member` using `10**20 - int(achieved_at)` so that earlier timestamps produce lexicographically higher member names, ranking first under `ZREVRANGE`. Also updated `get_top_lex` to reverse the inversion when decoding the original timestamp for display (`10**20 - int(ts_str)`).
- **Why:** Without inversion, the strategy contradicts the post's core premise of "first achiever wins the tie."

### Issue 2: Monitoring ZRANGEBYSCORE command would never match composite scores
- **What was wrong:** The command `redis-cli ZRANGEBYSCORE leaderboard:tiebreak 1000 1000` performs an exact score match on 1000. However, the composite score strategy adds a fractional tiebreak component (e.g., `1000.0000083...`), so no member would ever have an exact score of 1000.
- **What was changed:** Updated to `redis-cli ZRANGEBYSCORE leaderboard:tiebreak 1000 "(1001"` which uses an exclusive upper bound to capture all composite scores with base score 1000 (i.e., scores in the range [1000, 1001)).
- **Why:** The original command would always return an empty result, making it useless for its stated purpose of checking for ties.

## Review Notes
- The `ZREVRANGE` command was deprecated in Redis 6.2 in favor of `ZRANGE` with the `REV` option. The code still works but could be updated to use `r.zrange("key", 0, n-1, rev=True, withscores=True)` for forward compatibility. Not changed since the current API remains functional.
- The composite score approach (Strategy 1) relies on IEEE 754 double-precision floating point, which provides ~15-16 significant digits. For very large base scores (above ~1e9), tiebreak precision may degrade. This is an inherent limitation worth noting but not an error in the code.
- The `1e10` constant in Strategy 1 provides headroom until approximately year 2286, which is adequate.
