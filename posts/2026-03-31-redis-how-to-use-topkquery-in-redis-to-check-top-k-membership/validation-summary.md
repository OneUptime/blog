# Validation Summary: How to Use TOPK.QUERY in Redis to Check Top-K Membership

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom module, TOPK data structure)
- Python (redis-py client)
- Flask (batch API example)

## Sources Consulted
- Redis official documentation for TOPK.QUERY: https://redis.io/commands/topk.query/
- Redis official documentation for TOPK.RESERVE: https://redis.io/commands/topk.reserve/
- Redis official documentation for TOPK.ADD: https://redis.io/commands/topk.add/
- Redis official documentation for TOPK.LIST: https://redis.io/commands/topk.list/
- redis-py client documentation and source for TopK command support

## Issues Found
1. **Incorrect time complexity for TOPK.QUERY**: The blog stated O(K) in two places (the comparison table and the summary paragraph). The official Redis documentation states the complexity is O(n) where n is the number of items being queried, not O(K). Fixed both occurrences:
   - In the "QUERY vs LIST" comparison table: changed `O(K)` to `O(n) where n = items queried`.
   - In the Summary paragraph: changed `O(K) membership testing` to `O(n) membership testing (where n is the number of items queried)`.

## Review Notes
- The Python examples use `execute_command()` which is correct but the redis-py client also provides native `topk().query()` methods via the RedisBloom integration. Either approach works.
- The TOPK.QUERY return type differs between RESP2 (integers 0/1) and RESP3 (booleans true/false). The blog correctly describes the RESP2 behavior, which is the default protocol.
- TOPK.LIST complexity is correctly stated as O(K) in the comparison table.
