# Validation Summary: How to Use Elixir with Redis

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Elixir
- Redis
- Redix
- Redix.PubSub
- NimblePool
- Phoenix PubSub
- Jason
- Mox

## Sources Consulted
- Redix official documentation: https://hexdocs.pm/redix/Redix.html
- Redix.PubSub official documentation: https://hexdocs.pm/redix/Redix.PubSub.html
- NimblePool official documentation: https://hexdocs.pm/nimble_pool/NimblePool.html
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis HMSET command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis keyspace and KEYS warning documentation: https://redis.io/docs/latest/develop/using-commands/keyspace/

## Issues Found
- Replaced deprecated Redis `SETEX` examples with `SET ... EX ...`, because Redis marks `SETEX` as deprecated in favor of `SET` with the `EX` option.
- Replaced deprecated Redis `HMSET` with multi-field `HSET` and corrected the expected return value from `"OK"` to the number of newly added fields.
- Replaced deprecated `ZREVRANGE` leaderboard examples with `ZRANGE ... REV ... WITHSCORES`.
- Corrected the `NimblePool.handle_checkin/4` callback example. The post used a three-argument callback, but NimblePool defines `handle_checkin(client_state, from, worker_state, pool_state)`.
- Corrected `Redix.PubSub.subscribe/3` handling. The function returns `{:ok, reference}`, not `:ok`, so the example now stores the returned reference.
- Renamed the Redis Pub/Sub GenServer from `MyApp.PubSub` to `MyApp.RedisPubSub` to avoid colliding with the conventional Phoenix PubSub server name used in `Phoenix.PubSub.broadcast/3`.
- Replaced production-style pattern invalidation using `KEYS` with an incremental `SCAN` loop, because Redis warns that `KEYS` can block the server and should be used with extreme care in production.
- Added the missing `:mox` dependency and a minimal behaviour definition for the Mox example so the test mock snippet has the required dependency and behaviour target.

## Review Notes
- Redix supports automatic reconnection and Sentinel configuration as described in the post.
- NimblePool can technically pool Redix connection process references, but NimblePool's own documentation cautions that it may not be the best abstraction for managing process-based resources; Poolboy may be a better fit for some production systems.
