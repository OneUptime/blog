# Validation Summary: How to Use ZINCRBY in Redis to Increment Sorted Set Scores

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (sorted sets)
- ZINCRBY command
- ZADD with INCR option
- ZRANGE, ZREVRANGE, ZSCORE commands

## Sources Consulted
- Official Redis ZINCRBY documentation: https://redis.io/docs/latest/commands/zincrby/
- Official Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Official Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Official Redis ZREVRANGE documentation: https://redis.io/docs/latest/commands/zrevrange/
- Official Redis sorted set documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/

## Issues Found
- **Word Frequency Counting example output ordering**: In the ZREVRANGE output, members "set" and "sorted" both have score 1. Redis orders same-score members lexicographically, and ZREVRANGE returns them in reverse lexicographic order. Since "sorted" > "set" lexicographically, "sorted" should appear before "set" in ZREVRANGE output. Fixed the output order from `"set", "1", "sorted", "1"` to `"sorted", "1", "set", "1"`.

## Review Notes
- ZREVRANGE (used in the Vote/Like Counter and Word Frequency Counting examples) is deprecated as of Redis 6.2.0 in favor of `ZRANGE ... REV`. This is not incorrect for the purposes of this ZINCRBY-focused post, but readers targeting Redis 6.2+ should prefer the newer syntax.
- The `--` comment syntax used in Redis code blocks (e.g., `-- Upvote`) is not valid redis-cli syntax but is a common convention in blog tutorials for annotating commands.
