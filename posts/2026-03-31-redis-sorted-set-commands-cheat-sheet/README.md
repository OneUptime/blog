# Redis Sorted Set Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, Command, Cheat Sheet, Leaderboard

Description: Complete Redis sorted set commands reference covering ZADD, ZRANGE, ZRANK, ZSCORE, ZRANGEBYSCORE, and all ranking and aggregation operations.

---

Redis sorted sets store unique members each associated with a floating-point score, kept in order. They power leaderboards, priority queues, and range queries. Here is the complete command reference.

## Add and Update Members

```bash
# Add members with scores
ZADD leaderboard 9500 "alice"
ZADD leaderboard 8200 "bob" 11000 "carol"   # multiple at once

# Add only if not exists (NX)
ZADD leaderboard NX 9500 "alice"

# Update only if exists (XX)
ZADD leaderboard XX 9800 "alice"

# Only update if new score > current score (GT)
ZADD leaderboard GT 9000 "alice"

# Only update if new score < current score (LT)
ZADD leaderboard LT 9000 "alice"

# Return changed count instead of added count (CH)
ZADD leaderboard CH 9800 "alice"

# Increment score (like ZINCRBY)
ZADD leaderboard INCR 500 "alice"

# Atomic increment
ZINCRBY leaderboard 500 "alice"
```

## Get Members and Scores

```bash
# Get score of a member
ZSCORE leaderboard "alice"

# Get multiple scores at once
ZMSCORE leaderboard "alice" "bob"

# Count members
ZCARD leaderboard

# Count members within score range
ZCOUNT leaderboard 8000 10000
ZCOUNT leaderboard -inf +inf    # all members

# Count members in lexicographic range
ZLEXCOUNT myset "[a" "[z"
```

## Range Queries

```bash
# By index, ascending (0 = lowest score)
ZRANGE leaderboard 0 -1              # all
ZRANGE leaderboard 0 9 WITHSCORES   # lowest 10 with scores
ZRANGE leaderboard 0 9 REV          # reverse order (highest first)

# By score range
ZRANGE leaderboard 8000 10000 BYSCORE WITHSCORES
ZRANGE leaderboard "(8000" "+inf" BYSCORE   # exclusive lower bound

# By lex range (equal scores only)
ZRANGE myset "[alice" "[carol" BYLEX
```

## Rank Queries

```bash
# Rank (0 = lowest score)
ZRANK leaderboard "alice"
ZRANK leaderboard "alice" WITHSCORE   # returns rank and score

# Rank from highest (0 = highest score)
ZREVRANK leaderboard "alice"
```

## Remove Members

```bash
# Remove specific members
ZREM leaderboard "alice" "bob"

# Remove by rank range
ZREMRANGEBYRANK leaderboard 0 9     # remove bottom 10

# Remove by score range
ZREMRANGEBYSCORE leaderboard 0 1000

# Pop N members with lowest/highest scores
ZPOPMIN leaderboard 3
ZPOPMAX leaderboard 3

# Blocking pop (waits until a member is available)
BZPOPMIN queue1 queue2 5
BZPOPMAX queue1 5

# Pop from multiple sorted sets (Redis 7.0+)
ZMPOP 2 queue1 queue2 MIN COUNT 3
BZMPOP 5 2 queue1 queue2 MIN
```

## Set Operations

```bash
# Union
ZUNIONSTORE dest 2 zset1 zset2
ZUNIONSTORE dest 2 zset1 zset2 WEIGHTS 2 1   # weight scores

# Intersection
ZINTERSTORE dest 2 zset1 zset2
ZINTERSTORE dest 2 zset1 zset2 AGGREGATE MAX

# Difference (Redis 6.2+)
ZDIFFSTORE dest 2 zset1 zset2

# Without storing result
ZUNION 2 zset1 zset2 WITHSCORES
ZINTER 2 zset1 zset2 WITHSCORES
ZDIFF 2 zset1 zset2 WITHSCORES
```

## Random and Scan

```bash
# Random member
ZRANDMEMBER leaderboard 3
ZRANDMEMBER leaderboard -3   # may repeat
ZRANDMEMBER leaderboard 3 WITHSCORES

# Cursor-based iteration
ZSCAN leaderboard 0 COUNT 10 MATCH "player:*"
```

## Summary

Redis sorted set commands cover all ranking scenarios: ZADD with GT/LT for conditional updates, ZREVRANK for top-N leaderboards, ZRANGE BYSCORE for score windows, and ZPOPMIN/BZMPOP for priority queues. Set operations with WEIGHTS and AGGREGATE enable combining multiple sorted sets into a unified ranking.
