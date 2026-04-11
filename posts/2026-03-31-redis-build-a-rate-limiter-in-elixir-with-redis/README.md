# How to Build a Rate Limiter in Elixir with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elixir, Rate Limiting, Redix, API Security

Description: Learn how to implement a Redis-backed rate limiter in Elixir using the fixed window and sliding window algorithms with Redix and Lua scripts.

---

## Why Redis for Rate Limiting in Elixir?

Elixir's lightweight processes make it easy to track request counts in-process, but a single node's state does not scale across a distributed cluster. Redis provides a shared, atomic counter that all Elixir nodes can use for consistent rate limiting across a multi-node deployment.

## Prerequisites

- Elixir 1.14 or higher
- Phoenix or Plug-based application
- A running Redis server
- Redix client

## Adding Redix

```elixir
# mix.exs
defp deps do
  [
    {:redix, "~> 1.1"},
    {:plug, "~> 1.14"}
  ]
end
```

```bash
mix deps.get
```

## Starting Redix

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      {Redix, {System.get_env("REDIS_URL", "redis://localhost:6379"), [name: :redix]}},
      MyAppWeb.Endpoint
    ]
    Supervisor.start_link(children, strategy: :one_for_one, name: MyApp.Supervisor)
  end
end
```

## Fixed Window Rate Limiter

```elixir
defmodule MyApp.RateLimiter do
  @moduledoc "Redis-backed fixed window rate limiter"

  def check_rate(key, limit, window_seconds) do
    redis_key = "rate:#{key}:#{current_window(window_seconds)}"

    case Redix.pipeline(:redix, [
      ["INCR", redis_key],
      ["EXPIRE", redis_key, window_seconds]
    ]) do
      {:ok, [count, _]} when count <= limit ->
        {:allow, limit - count}

      {:ok, [count, _]} ->
        {:deny, 0, ttl_for_window(window_seconds)}

      {:error, reason} ->
        # Fail open - allow request if Redis is unavailable
        {:allow, limit}
    end
  end

  defp current_window(window_seconds) do
    div(System.system_time(:second), window_seconds)
  end

  defp ttl_for_window(window_seconds) do
    remainder = rem(System.system_time(:second), window_seconds)
    window_seconds - remainder
  end
end
```

## Sliding Window Rate Limiter (Lua Script)

For a more accurate sliding window, use an atomic Lua script:

```elixir
defmodule MyApp.SlidingWindowLimiter do
  @lua_script """
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local ttl = tonumber(ARGV[4])

  -- Remove entries outside the window
  redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

  -- Count current entries
  local count = redis.call('ZCARD', key)

  if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, ttl)
    return {1, limit - count - 1}
  else
    return {0, 0}
  end
  """

  def check_rate(identifier, limit, window_ms) do
    now   = System.system_time(:millisecond)
    key   = "sliding:#{identifier}"
    ttl   = div(window_ms, 1000) + 1

    case Redix.command(:redix, ["EVAL", @lua_script, 1, key, now, window_ms, limit, ttl]) do
      {:ok, [1, remaining]} -> {:allow, remaining}
      {:ok, [0, _]}         -> {:deny, 0}
      {:error, _}           -> {:allow, limit} # fail open
    end
  end
end
```

## Plug Middleware for Phoenix

```elixir
defmodule MyAppWeb.Plugs.RateLimit do
  import Plug.Conn

  alias MyApp.RateLimiter

  def init(opts), do: opts

  def call(conn, opts) do
    limit   = Keyword.get(opts, :limit, 60)
    window  = Keyword.get(opts, :window, 60)
    key     = rate_key(conn)

    case RateLimiter.check_rate(key, limit, window) do
      {:allow, remaining} ->
        conn
        |> put_resp_header("x-ratelimit-limit",     to_string(limit))
        |> put_resp_header("x-ratelimit-remaining", to_string(remaining))

      {:deny, _, retry_after} ->
        conn
        |> put_resp_header("retry-after",           to_string(retry_after))
        |> put_resp_header("x-ratelimit-remaining", "0")
        |> send_resp(429, Jason.encode!(%{error: "Rate limit exceeded"}))
        |> halt()
    end
  end

  defp rate_key(conn) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    "#{ip}:#{conn.request_path}"
  end
end
```

## Using the Plug in Phoenix Router

```elixir
# lib/my_app_web/router.ex
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug MyAppWeb.Plugs.RateLimit, limit: 100, window: 60
  end

  scope "/api", MyAppWeb do
    pipe_through :api
    get "/search", SearchController, :index
  end
end
```

## Per-User Rate Limiting

For authenticated endpoints, key on user ID:

```elixir
defp rate_key(conn) do
  case conn.assigns[:current_user] do
    nil  ->
      ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
      "ip:#{ip}"
    user -> "user:#{user.id}"
  end
end
```

## Testing the Rate Limiter

```elixir
defmodule MyApp.RateLimiterTest do
  use ExUnit.Case

  test "allows requests under the limit" do
    key = "test:#{System.unique_integer()}"
    assert {:allow, _} = MyApp.RateLimiter.check_rate(key, 5, 60)
    assert {:allow, _} = MyApp.RateLimiter.check_rate(key, 5, 60)
  end

  test "denies requests over the limit" do
    key = "test:#{System.unique_integer()}"
    Enum.each(1..5, fn _ -> MyApp.RateLimiter.check_rate(key, 5, 60) end)
    assert {:deny, 0, _} = MyApp.RateLimiter.check_rate(key, 5, 60)
  end
end
```

## Summary

Building a rate limiter in Elixir with Redis involves using Redix to execute atomic Redis commands. The fixed window approach uses `INCR` and `EXPIRE` for simplicity, while the sliding window uses a sorted set with a Lua script for accuracy. Wrap the logic in a Plug to apply rate limiting to Phoenix routes, keying on IP address or user ID depending on whether the endpoint is public or authenticated.
