# Validation Summary: How to Use Redis for Gaming Leaderboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis sorted sets
- Redis Pub/Sub
- Redis Lua scripting
- Redis pipelining
- redis-py
- Python
- Flask-SocketIO

## Sources Consulted
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis pipelining documentation: https://redis.io/docs/latest/develop/using-commands/pipelining/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- redis-py Lua scripting documentation: https://redis.readthedocs.io/en/stable/lua_scripting.html

## Issues Found
- The `get_rank` docstring said the method returned a 0-indexed rank, but the implementation adds 1 to `ZREVRANK`. Updated the docstring to say it returns a 1-indexed rank.
- The time-based leaderboard pipeline return mapping assumed every period queued exactly two Redis commands. That failed for custom period lists and for `alltime`, which does not queue an expiration command. Added explicit result indexing for the `ZINCRBY` results.
- The high-score and low-score examples used truthiness checks such as `current_score or 0` and `current_score or float('inf')`. These mishandle valid zero scores and can produce incorrect final scores for negative values. Replaced them with explicit `is not None` checks.
- The player profile example used the same truthiness pattern when returning the stored high score. Replaced it with an explicit `is not None` check.
- The percentile calculation returned `0` for first place because `rank` is `0` for the top player and was tested as a truthy value. Updated the condition to check `rank is not None`.
- The batch update example used `random.randint()` without importing `random`. Added the missing import.

## Review Notes
The Redis command usage is consistent with current official documentation: `ZADD` supports `GT`/`LT`, `ZREVRANK` returns a zero-based descending rank, sorted-set range queries are documented as `O(log(N)+M)`, and Pub/Sub is appropriate for live broadcasts but remains non-durable with at-most-once delivery semantics. The Python code blocks were parsed with Python's `ast` module after edits and all eight blocks were syntactically valid.
