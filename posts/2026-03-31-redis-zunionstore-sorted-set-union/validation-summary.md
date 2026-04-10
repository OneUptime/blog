# Validation Summary: How to Use ZUNIONSTORE in Redis for Sorted Set Union

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (ZUNIONSTORE, ZUNION, ZADD, ZRANGE, ZREVRANGE)
- Redis Sorted Sets

## Sources Consulted
- Redis official documentation for ZUNIONSTORE: https://redis.io/docs/latest/commands/zunionstore/
- Redis official documentation for ZUNION: https://redis.io/docs/latest/commands/zunion/
- Redis official documentation for ZRANGE: https://redis.io/docs/latest/commands/zrange/

## Issues Found

1. **Basic Union SUM output ordering was wrong** — ZRANGE returns members in ascending score order. The output showed alice(100), charlie(300), bob(250) but bob(250) should appear before charlie(300). Fixed to: alice(100), bob(250), charlie(300).

2. **MIN Aggregate output ordering was wrong** — With MIN aggregation, bob's score is 50. The output showed alice(100) first, but bob(50) has the lowest score and should appear first in ZRANGE ascending output. Fixed to: bob(50), alice(100), charlie(300).

3. **Weighted Union output ordering was wrong** — After weighting, charlie's score is 150 and alice's is 200. The output showed alice(200) before charlie(150), but ZRANGE ascending should show charlie first. Fixed to: charlie(150), alice(200), bob(425).

4. **Three-Set Union output ordering was wrong** — The output showed diana(150), charlie(300), alice(110), bob(250) which is not sorted by score at all. Fixed to ascending order: alice(110), diana(150), bob(250), charlie(300).

5. **Game scores use case output ordering was wrong** — ZREVRANGE returns members in descending score order. alice(800) should appear before bob(700). The output had bob first. Fixed to: alice(800), bob(700), charlie(200).

6. **Time complexity was inaccurate** — The post stated O(N log N) where N is total members. The official Redis documentation states O(N)+O(M log(M)) where N is the sum of the sizes of the input sorted sets and M is the number of elements in the resulting sorted set. Fixed to match official documentation.

## Review Notes
- The `--` comment syntax used in the ZUNION vs ZUNIONSTORE comparison section is not valid Redis syntax, but is a common convention in blog posts to annotate code examples. It is clearly non-executable annotation and unlikely to confuse readers.
- The MAX Aggregate and Non-Existent Key examples had correct output ordering and needed no changes.
- All score calculations (SUM, MIN, MAX, weighted) were mathematically correct throughout the post; only the display ordering of results was wrong.
