# Validation Summary: How Redis Skiplist Implementation Works

## Status
validated

## Post Type
Technical deep-dive / Reference

## Technologies Covered
- Redis (Sorted Sets, skip list internals)
- C (Redis source code structs)
- JavaScript (skip list level simulation)
- Bash / redis-cli (command examples)

## Sources Consulted
- Redis source code `server.h` — `ZSKIPLIST_MAXLEVEL` defined as 32 with comment "Should be enough for 2^64 elements", `ZSKIPLIST_P` defined as 0.25
- Redis source code `server.h` — `zskiplistNode` and `zskiplist` struct definitions
- Redis source code `t_zset.c` — `zslGetRank` function (returns 1-based rank), `zsetRank` function (converts to 0-based for ZRANK command)
- Redis official documentation for ZRANK — confirms O(log N) complexity and 0-indexed return value
- Redis official documentation for ZCOUNT — confirms O(log N) complexity
- Redis official documentation for ZRANGE, ZRANGEBYSCORE — confirms O(log N + M) complexity
- Redis source code `config.c` — confirms `zset-max-listpack-entries` as the config parameter name in Redis 7.0+

## Issues Found
1. **Section header "O(1)" should be "O(log N)"**: The section "Span Field for O(1) Rank Queries" incorrectly stated O(1) complexity. ZRANK is O(log N), as correctly stated in the body text of that same section. Fixed header to "Span Field for O(log N) Rank Queries".

2. **Maximum level capacity was wrong (2^32 vs 2^64)**: The post claimed "Maximum level: 32 (can store 2^32 elements efficiently)". With p=0.25, 32 levels can handle (1/0.25)^32 = 4^32 = 2^64 elements. The Redis source comment on `ZSKIPLIST_MAXLEVEL` explicitly says "Should be enough for 2^64 elements". Fixed to 2^64.

3. **ZRANK result off by one**: The rank calculation example stated "rank 3 (0-indexed)" but `zslGetRank` returns 1-based rank (3 in this case), and ZRANK subtracts 1 to return 0-indexed rank 2. Fixed to "rank 2 (0-indexed)".

4. **Wrong source file for struct definitions**: The comment `// From redis/src/t_zset.c` was incorrect. The `zskiplistNode` and `zskiplist` structs are defined in `redis/src/server.h`. The `t_zset.c` file contains the implementation functions. Fixed to `server.h`.

5. **Truncated complexity in comparison table**: The Hash Table row showed "O(N log)" for ZRANGE, which is an incomplete expression. Fixed to "O(N log N)" (sort-then-scan complexity).

## Review Notes
- The comparison table is simplified and omits the +M term for range operations (e.g., skip list ZRANGE is technically O(log N + M)). This is acceptable for a high-level comparison but readers should be aware.
- The JavaScript simulation correctly approximates the average level (~1.33 with p=0.25), which matches the expected value of 1/(1-p) = 1/0.75 = 1.333.
- The C struct definitions are accurate and match Redis 7.x source code.
- All redis-cli commands use correct syntax for Redis 7.0+ (including ZRANGE ... REV syntax added in 6.2).
