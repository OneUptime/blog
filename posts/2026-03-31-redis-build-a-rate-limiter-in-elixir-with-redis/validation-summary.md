# Validation Summary: How to Build a Rate Limiter in Elixir with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elixir 1.14+
- Redis
- Redix (~> 1.1) — Elixir Redis client
- Plug (~> 1.14) — HTTP middleware
- Phoenix Framework (router/pipeline usage)
- Lua scripting (for Redis EVAL)
- ExUnit (testing)

## Sources Consulted
- Redix official documentation — https://hexdocs.pm/redix/
- Redix child_spec/1 and start_link/2 API for URI + options tuple format
- Redix.pipeline/3 and Redix.command/3 return value specifications
- Elixir System module — https://hexdocs.pm/elixir/System.html (system_time/1, unique_integer/0)
- Plug.Conn module — https://hexdocs.pm/plug/Plug.Conn.html (put_resp_header/3, send_resp/3, halt/1)
- ExUnit.Case — https://hexdocs.pm/ex_unit/ExUnit.Case.html
- Redis INCR, EXPIRE, EVAL, ZADD, ZREMRANGEBYSCORE, ZCARD command references — https://redis.io/commands/

## Issues Found
1. **Undefined `format_ip/1` function in per-user rate limiting section**: The "Per-User Rate Limiting" code snippet called `format_ip(conn.remote_ip)`, but this function was never defined in the post. Replaced with the inline approach used earlier in the Plug middleware: `conn.remote_ip |> Tuple.to_list() |> Enum.join(".")`.

## Review Notes
- The sliding window Lua script uses `now` (the current timestamp) as both the sorted set score and member in `ZADD`. If two requests arrive within the same millisecond, the second overwrites the first, causing undercounting. This is a well-known trade-off in sliding window tutorials and acceptable for the scope of this post, but production implementations should use a unique member (e.g., concatenating the timestamp with a random value).
- The fixed window implementation uses a pipeline with separate INCR and EXPIRE commands, which is not fully atomic. In rare failure scenarios the EXPIRE could fail to execute, leaving a key without a TTL. A Lua script (as demonstrated in the sliding window section) would be the fully atomic alternative. This is a standard simplification for introductory material.
- The IPv6 handling in `rate_key/1` produces a dot-separated numeric string rather than standard colon-separated IPv6 notation. Since it is only used as a Redis key (not displayed to users), this is functionally correct but worth noting.
