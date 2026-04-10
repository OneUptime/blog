# Validation Summary: How to Use SORT and SORT_RO in Redis for List and Set Sorting

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (SORT command, available since Redis 1.0.0)
- Redis (SORT_RO command, available since Redis 7.0.0)
- Redis data structures: lists, sets, sorted sets

## Sources Consulted
- Official Redis SORT documentation: https://redis.io/docs/latest/commands/sort/
- Official Redis SORT_RO documentation: https://redis.io/docs/latest/commands/sort_ro/

## Issues Found
No technical issues found.

All nine key technical claims were verified against official Redis documentation:

1. **SORT works on lists, sets, and sorted sets** — Confirmed. Docs state: "Returns or stores the elements contained in the list, set or sorted set at key."
2. **SORT_RO was added in Redis 7.0** — Confirmed. Docs state: "Since: Redis Open Source 7.0.0."
3. **SORT_RO is identical to SORT but without STORE** — Confirmed. Docs state: "Read-only variant of the SORT command. It is exactly like the original SORT but refuses the STORE option."
4. **Time complexity is O(N+M*log(M))** — Confirmed. Matches official complexity description exactly.
5. **BY pattern syntax `key:*->field` for hash fields** — Confirmed. The `->` separator between key pattern and hash field name is correct.
6. **GET pattern syntax `key:*->field` for hash fields** — Confirmed. Same `->` notation as BY.
7. **LIMIT takes offset and count parameters** — Confirmed.
8. **ALPHA flag enables lexicographic sorting** — Confirmed.
9. **Default sort order is numeric ascending** — Confirmed.

All code examples produce the correct output, including the LIMIT pagination example where `LIMIT 3 3` correctly returns only 2 elements (date, elderberry) since only 2 remain after offset 3.

## Review Notes
- The SORT command documentation notes that in Redis Cluster mode, external key patterns (BY/GET) were not allowed before Redis 7.4. From 7.4 onward, patterns with hash tags mapping to the same slot as the key are permitted. The blog post does not mention this cluster-mode caveat, which could be relevant for readers using Redis Cluster.
- The SORT command is very old (since Redis 1.0.0) and Redis documentation recommends using sorted sets (ZADD/ZRANGE) for frequently sorted data, which the blog post correctly notes in the Performance Considerations and Summary sections.
