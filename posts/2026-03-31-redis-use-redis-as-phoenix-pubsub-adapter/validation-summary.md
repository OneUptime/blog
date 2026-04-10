# Validation Summary: How to Use Redis as Phoenix PubSub Adapter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub)
- Elixir
- Phoenix Framework (PubSub, Channels, LiveView, Presence)
- phoenix_pubsub_redis library
- Redix (Elixir Redis client)
- GenServer (OTP)

## Sources Consulted
- Phoenix.PubSub v2.x official docs — https://hexdocs.pm/phoenix_pubsub/Phoenix.PubSub.html
- Phoenix.PubSub.PG2 docs — https://hexdocs.pm/phoenix_pubsub/Phoenix.PubSub.PG2.html
- phoenix_pubsub_redis on hex.pm — https://hex.pm/packages/phoenix_pubsub_redis
- phoenix_pubsub_redis GitHub repo — https://github.com/phoenixframework/phoenix_pubsub_redis
- phoenix_pubsub_redis v3.1.0 docs and CHANGELOG
- phoenix_pubsub_redis source (redis_server.ex) for channel naming internals
- Redis SUBSCRIBE command docs — https://redis.io/docs/latest/commands/subscribe/
- Redis PSUBSCRIBE command docs — https://redis.io/docs/latest/commands/psubscribe/

## Issues Found

1. **Outdated PG2 reference**: The post stated the default adapter is "PG2-based," implying use of the deprecated Erlang `:pg2` module. Modern Phoenix PubSub (2.0+) uses Erlang's `:pg` module internally, even though the adapter module is still named `Phoenix.PubSub.PG2`. Fixed to clarify the adapter uses `:pg`.

2. **Deprecated `url` config option**: All configuration examples used `url:` to specify the Redis connection string. In `phoenix_pubsub_redis` v3.1.0, the `url` option was deprecated in favor of `redis_opts`. Since the post specifies `"~> 3.0"` which resolves to v3.1.0, all instances of `url:` were changed to `redis_opts:`.

3. **Unnecessary `redix` dependency**: The post listed `{:redix, "~> 1.1"}` as a required dependency alongside `phoenix_pubsub_redis`. Redix is a transitive dependency of `phoenix_pubsub_redis` and does not need to be listed separately. Removed from the deps list.

4. **Incorrect Redis channel naming**: The "How It Works Internally" diagram and "Channel Naming" section incorrectly showed per-topic Redis channels (e.g., `phx:orders:42`). In reality, `phoenix_pubsub_redis` uses a single Redis Pub/Sub channel per PubSub instance, named `phx:<adapter_name>` (e.g., `phx:Elixir.MyApp.PubSub`). All Phoenix topics are multiplexed over this single channel. Fixed the diagram, explanation, and channel naming section.

5. **Incorrect monitoring command**: The `redis-cli subscribe "phx:orders:42"` example would not match any real channel. Changed to `redis-cli subscribe "phx:Elixir.MyApp.PubSub"` to match the actual channel name. The `psubscribe "phx:*"` pattern remains correct.

## Review Notes
- The Elixir code examples (GenServer, EventBus module, supervision tree setup) are syntactically correct and follow idiomatic patterns.
- The `Phoenix.PubSub.subscribe/2` and `Phoenix.PubSub.broadcast/3` API usage is correct.
- The pattern of reading config from application env and merging into the child spec is valid, though the canonical approach shown in the phoenix_pubsub_redis README passes options directly inline in the supervision tree.
- The post could benefit from mentioning that `phoenix_pubsub_redis` also depends on `poolboy` for connection pooling, but this is not an error.
