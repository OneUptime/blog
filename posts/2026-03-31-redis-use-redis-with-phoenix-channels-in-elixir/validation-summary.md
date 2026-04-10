# Validation Summary: How to Use Redis with Phoenix Channels in Elixir

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub)
- Elixir 1.14+
- Phoenix 1.7+
- Phoenix Channels (WebSocket)
- phoenix_pubsub_redis (~> 3.0)
- Redix (~> 1.1)
- Phoenix JavaScript client

## Sources Consulted
- Elixir `System` module docs: https://hexdocs.pm/elixir/System.html
- phoenix_pubsub_redis Hex package: https://hex.pm/packages/phoenix_pubsub_redis
- phoenix_pubsub_redis docs and source (NimbleOptions schema for configuration options): https://hexdocs.pm/phoenix_pubsub_redis/Phoenix.PubSub.Redis.html
- Phoenix PubSub docs: https://hexdocs.pm/phoenix_pubsub/Phoenix.PubSub.html
- Phoenix Channels guide: https://hexdocs.pm/phoenix/channels.html

## Issues Found

### 1. Deprecated `:url` option replaced with `:redis_opts`
**What was wrong:** The application.ex code block used `url: System.get_env("REDIS_URL", "redis://localhost:6379")` as the option key for the Redis connection. In `phoenix_pubsub_redis` 3.0+, the `:url` top-level option is deprecated. The correct option is `:redis_opts`, which accepts either a Redis URL string or a keyword list of connection options.
**What was changed:** Replaced `url:` with `redis_opts:` in the `Phoenix.PubSub` child spec in the application.ex code block.

### 2. Removed dead config block for `MyApp.PubSub`
**What was wrong:** The config section included a `config :my_app, MyApp.PubSub, adapter: Phoenix.PubSub.Redis, url: ...` block. In Phoenix 1.7 with `phoenix_pubsub` 2.x, PubSub configuration is provided directly in the supervision tree child spec, not in application config files. This config block would not be read by `Phoenix.PubSub` and was dead/misleading configuration.
**What was changed:** Removed the unused `config :my_app, MyApp.PubSub` block from the config.exs example, keeping only the necessary `config :my_app, MyAppWeb.Endpoint, pubsub_server: MyApp.PubSub` line.

## Review Notes
- The multi-node verification section assumes the Phoenix app is configured to read the `PORT` environment variable (e.g., via `config/runtime.exs`). This is common in production setups but is not the default in a freshly generated Phoenix app. Readers following the tutorial from scratch may need to add `http: [port: String.to_integer(System.get_env("PORT") || "4000")]` to their endpoint runtime config.
- The channel, socket, and JavaScript client code are all correct and follow current Phoenix 1.7 conventions.
- The `Endpoint.broadcast/3` pattern for publishing from outside a channel is correct.
