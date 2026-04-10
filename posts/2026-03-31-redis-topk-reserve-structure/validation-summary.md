# Validation Summary: How to Use TOPK.RESERVE in Redis to Create a Top-K Structure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RedisBloom / Redis Stack module)
- TOPK.RESERVE, TOPK.ADD, TOPK.LIST, TOPK.INFO commands
- Python (redis-py client library)
- Probabilistic data structures (Top-K / HeavyKeeper algorithm)

## Sources Consulted
- TOPK.RESERVE official docs: https://redis.io/docs/latest/commands/topk.reserve/
- TOPK.ADD official docs: https://redis.io/docs/latest/commands/topk.add/
- TOPK.INFO official docs: https://redis.io/docs/latest/commands/topk.info/
- TOPK.LIST official docs: https://redis.io/docs/latest/commands/topk.list/
- Top-K overview: https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/

## Issues Found
No technical issues found.

## Review Notes
- The `decay` parameter description in the post ("Decay factor for older counts") is a simplification. The official Redis documentation describes it as "The probability of reducing a counter in an occupied bucket (decay ^ bucket[i].counter)." The blog's phrasing is an acceptable simplification for a tutorial audience and is not incorrect.
- The Python code uses `r.execute_command()` rather than the native `r.topk()` API available in redis-py 4.x+. This is a valid approach and works across all redis-py versions, so it is not an error.
- The memory estimates in the "Choosing the Right Parameters" section (~1KB, ~5KB, ~10KB) are rough approximations and will vary depending on the value of `k` and the items stored. They are presented with the `~` prefix, which appropriately signals they are approximate.
- The command syntax, default values (width=8, depth=7, decay=0.9), TOPK.ADD return behavior (nil vs displaced item name), TOPK.INFO output format, and TOPK.LIST usage were all verified as correct against official documentation.
