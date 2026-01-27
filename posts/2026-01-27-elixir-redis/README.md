# How to Use Elixir with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elixir, Redis, Redix, Caching, Pub/Sub, Connection Pooling, Session Storage

Description: Learn how to integrate Redis with Elixir applications using Redix, including connection pooling, pub/sub, caching, and common patterns.

---

> Redis and Elixir make a powerful combination. While Elixir handles concurrency through its lightweight processes, Redis provides lightning-fast data storage and messaging. Together, they enable highly scalable, real-time applications with minimal complexity.

Elixir's process model and Redis's single-threaded efficiency complement each other well. This guide covers practical patterns for using Redis in Elixir applications, from basic operations to production-ready configurations.

---

## Why Use Redis with Elixir

While Elixir has excellent built-in tools like ETS and GenServer for in-memory state, Redis adds capabilities that are difficult to replicate:

- **Persistence** - Data survives application restarts
- **Shared state** - Multiple Elixir nodes can share data
- **Pub/Sub** - Real-time messaging across distributed systems
- **TTL support** - Automatic expiration for cache entries
- **Rich data structures** - Sorted sets, lists, hashes, and more

---

## Installing Redix

Redix is the most popular Redis client for Elixir. It's lightweight, battle-tested, and uses a connection-per-process model that fits Elixir's philosophy.

Add Redix to your `mix.exs`:

```elixir
# mix.exs
defp deps do
  [
    # Core Redis client for Elixir
    {:redix, "~> 1.3"},
    # Connection pooling (choose one)
    {:nimble_pool, "~> 1.0"},
    # Alternative: {:poolboy, "~> 1.5"}
  ]
end
```

Fetch dependencies:

```bash
mix deps.get
```

---

## Basic Connection and Operations

### Starting a Connection

The simplest way to use Redix is to start a named connection in your application supervisor.

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      # Start a named Redix connection
      # The name allows you to reference it anywhere in your app
      {Redix, name: :redix, host: "localhost", port: 6379}
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

### Basic Get and Set Operations

```elixir
# Basic string operations using the named connection
# SET stores a key-value pair
{:ok, "OK"} = Redix.command(:redix, ["SET", "user:1:name", "Alice"])

# GET retrieves the value for a key
{:ok, "Alice"} = Redix.command(:redix, ["GET", "user:1:name"])

# SETEX sets a key with expiration in seconds
# Useful for cache entries that should auto-expire
{:ok, "OK"} = Redix.command(:redix, ["SETEX", "session:abc123", "3600", "user_data"])

# DEL removes one or more keys
# Returns the number of keys deleted
{:ok, 1} = Redix.command(:redix, ["DEL", "user:1:name"])
```

### Increment Operations

```elixir
# INCR atomically increments a counter
# Creates the key with value 1 if it doesn't exist
{:ok, 1} = Redix.command(:redix, ["INCR", "page:views"])
{:ok, 2} = Redix.command(:redix, ["INCR", "page:views"])

# INCRBY increments by a specific amount
{:ok, 12} = Redix.command(:redix, ["INCRBY", "page:views", "10"])

# DECR decrements by 1
{:ok, 11} = Redix.command(:redix, ["DECR", "page:views"])
```

### Working with Hashes

```elixir
# HSET stores field-value pairs in a hash
# Great for storing objects with multiple attributes
{:ok, 1} = Redix.command(:redix, ["HSET", "user:1", "name", "Alice"])
{:ok, 1} = Redix.command(:redix, ["HSET", "user:1", "email", "alice@example.com"])

# HMSET sets multiple fields at once
{:ok, "OK"} = Redix.command(:redix, [
  "HMSET", "user:2",
  "name", "Bob",
  "email", "bob@example.com",
  "role", "admin"
])

# HGET retrieves a single field
{:ok, "Alice"} = Redix.command(:redix, ["HGET", "user:1", "name"])

# HGETALL retrieves all fields and values as a flat list
{:ok, ["name", "Bob", "email", "bob@example.com", "role", "admin"]} =
  Redix.command(:redix, ["HGETALL", "user:2"])

# Helper function to convert flat list to map
defmodule RedisHelper do
  def to_map(list) when is_list(list) do
    list
    |> Enum.chunk_every(2)
    |> Enum.map(fn [k, v] -> {k, v} end)
    |> Map.new()
  end
end

# Usage: %{"name" => "Bob", "email" => "bob@example.com", "role" => "admin"}
{:ok, result} = Redix.command(:redix, ["HGETALL", "user:2"])
user_map = RedisHelper.to_map(result)
```

---

## Connection Pooling with NimblePool

For production applications, a single connection creates a bottleneck. NimblePool provides lightweight, efficient connection pooling.

```elixir
# lib/my_app/redis_pool.ex
defmodule MyApp.RedisPool do
  @behaviour NimblePool

  @pool_size 10

  # Start the pool as part of your supervision tree
  def start_link(opts) do
    NimblePool.start_link(
      worker: {__MODULE__, opts},
      pool_size: @pool_size,
      name: __MODULE__
    )
  end

  # Execute a command using a pooled connection
  # The pool handles checkout/checkin automatically
  def command(command) do
    NimblePool.checkout!(__MODULE__, :checkout, fn _from, conn ->
      result = Redix.command(conn, command)
      {result, conn}
    end)
  end

  # Execute multiple commands in a pipeline
  def pipeline(commands) do
    NimblePool.checkout!(__MODULE__, :checkout, fn _from, conn ->
      result = Redix.pipeline(conn, commands)
      {result, conn}
    end)
  end

  # NimblePool callbacks
  @impl NimblePool
  def init_worker(opts) do
    # Create a new Redis connection for this worker
    {:ok, conn} = Redix.start_link(opts)
    {:ok, conn, opts}
  end

  @impl NimblePool
  def handle_checkout(:checkout, _from, conn, pool_state) do
    {:ok, conn, conn, pool_state}
  end

  @impl NimblePool
  def handle_checkin(conn, _old_conn, pool_state) do
    {:ok, conn, pool_state}
  end

  @impl NimblePool
  def terminate_worker(_reason, conn, pool_state) do
    # Clean up the connection when the worker terminates
    Redix.stop(conn)
    {:ok, pool_state}
  end
end
```

Add the pool to your supervision tree:

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    # Get Redis config from environment
    redis_opts = [
      host: System.get_env("REDIS_HOST", "localhost"),
      port: String.to_integer(System.get_env("REDIS_PORT", "6379")),
      password: System.get_env("REDIS_PASSWORD")
    ]

    children = [
      # Start the Redis connection pool
      {MyApp.RedisPool, redis_opts}
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

Using the pool:

```elixir
# Commands are executed through the pool
{:ok, "OK"} = MyApp.RedisPool.command(["SET", "key", "value"])
{:ok, "value"} = MyApp.RedisPool.command(["GET", "key"])

# Pipeline multiple commands for efficiency
{:ok, results} = MyApp.RedisPool.pipeline([
  ["SET", "a", "1"],
  ["SET", "b", "2"],
  ["MGET", "a", "b"]
])
# results = ["OK", "OK", ["1", "2"]]
```

---

## Pub/Sub Messaging

Redis Pub/Sub enables real-time messaging between processes. Redix.PubSub handles subscriptions with automatic reconnection.

```elixir
# lib/my_app/pub_sub.ex
defmodule MyApp.PubSub do
  use GenServer
  require Logger

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  # Subscribe to a channel
  def subscribe(channel) do
    GenServer.call(__MODULE__, {:subscribe, channel})
  end

  # Unsubscribe from a channel
  def unsubscribe(channel) do
    GenServer.call(__MODULE__, {:unsubscribe, channel})
  end

  # Publish a message to a channel
  # Note: Publishing uses a regular Redix connection, not PubSub
  def publish(channel, message) do
    MyApp.RedisPool.command(["PUBLISH", channel, message])
  end

  # GenServer callbacks
  @impl true
  def init(opts) do
    # Start the PubSub connection
    {:ok, pubsub} = Redix.PubSub.start_link(opts)
    {:ok, %{pubsub: pubsub, subscriptions: MapSet.new()}}
  end

  @impl true
  def handle_call({:subscribe, channel}, _from, state) do
    # Subscribe and register this process to receive messages
    :ok = Redix.PubSub.subscribe(state.pubsub, channel, self())
    new_state = %{state | subscriptions: MapSet.put(state.subscriptions, channel)}
    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:unsubscribe, channel}, _from, state) do
    :ok = Redix.PubSub.unsubscribe(state.pubsub, channel, self())
    new_state = %{state | subscriptions: MapSet.delete(state.subscriptions, channel)}
    {:reply, :ok, new_state}
  end

  # Handle incoming messages from subscribed channels
  @impl true
  def handle_info({:redix_pubsub, _pubsub, _ref, :message, %{channel: channel, payload: payload}}, state) do
    Logger.info("Received message on #{channel}: #{payload}")
    # Broadcast to Phoenix PubSub or handle directly
    Phoenix.PubSub.broadcast(MyApp.PubSub, channel, {:redis_message, payload})
    {:noreply, state}
  end

  # Handle subscription confirmation
  @impl true
  def handle_info({:redix_pubsub, _pubsub, _ref, :subscribed, %{channel: channel}}, state) do
    Logger.info("Subscribed to #{channel}")
    {:noreply, state}
  end

  # Handle disconnection - Redix.PubSub will auto-reconnect
  @impl true
  def handle_info({:redix_pubsub, _pubsub, _ref, :disconnected, _reason}, state) do
    Logger.warning("Redis PubSub disconnected, will auto-reconnect")
    {:noreply, state}
  end
end
```

Usage example:

```elixir
# Subscribe to channels
MyApp.PubSub.subscribe("notifications")
MyApp.PubSub.subscribe("chat:room:1")

# Publish messages from anywhere in your app
MyApp.PubSub.publish("notifications", "New order received")
MyApp.PubSub.publish("chat:room:1", Jason.encode!(%{user: "Alice", text: "Hello!"}))
```

---

## Caching Patterns

### Simple Cache Module

```elixir
# lib/my_app/cache.ex
defmodule MyApp.Cache do
  @default_ttl 3600  # 1 hour in seconds

  # Get a value from cache
  def get(key) do
    case MyApp.RedisPool.command(["GET", key]) do
      {:ok, nil} -> {:error, :not_found}
      {:ok, value} -> {:ok, value}
      error -> error
    end
  end

  # Set a value with optional TTL
  def set(key, value, ttl \\ @default_ttl) do
    MyApp.RedisPool.command(["SETEX", key, to_string(ttl), value])
  end

  # Delete a cached value
  def delete(key) do
    MyApp.RedisPool.command(["DEL", key])
  end

  # Get or compute pattern
  # Returns cached value if exists, otherwise computes and caches
  def fetch(key, ttl \\ @default_ttl, compute_fn) do
    case get(key) do
      {:ok, value} ->
        # Cache hit - return cached value
        {:ok, value}

      {:error, :not_found} ->
        # Cache miss - compute, store, and return
        value = compute_fn.()
        set(key, value, ttl)
        {:ok, value}
    end
  end

  # Cache with JSON serialization for complex data
  def get_json(key) do
    case get(key) do
      {:ok, json} -> {:ok, Jason.decode!(json)}
      error -> error
    end
  end

  def set_json(key, value, ttl \\ @default_ttl) do
    set(key, Jason.encode!(value), ttl)
  end
end
```

### Using the Cache

```elixir
# Simple string caching
MyApp.Cache.set("greeting", "Hello, World!", 60)
{:ok, "Hello, World!"} = MyApp.Cache.get("greeting")

# Cache expensive database queries
def get_user_stats(user_id) do
  cache_key = "user:#{user_id}:stats"

  MyApp.Cache.fetch(cache_key, 300, fn ->
    # This runs only on cache miss
    stats = MyApp.Repo.get_user_stats(user_id)
    Jason.encode!(stats)
  end)
  |> case do
    {:ok, json} -> Jason.decode!(json)
    error -> error
  end
end

# Cache with pattern-based invalidation
def invalidate_user_cache(user_id) do
  # Get all keys matching the pattern
  {:ok, keys} = MyApp.RedisPool.command(["KEYS", "user:#{user_id}:*"])

  # Delete all matching keys
  if Enum.any?(keys) do
    MyApp.RedisPool.command(["DEL" | keys])
  end
end
```

---

## Session Storage

Using Redis for session storage enables sharing sessions across multiple application instances.

```elixir
# lib/my_app/session_store.ex
defmodule MyApp.SessionStore do
  @session_ttl 86400  # 24 hours
  @prefix "session:"

  # Create a new session
  def create(session_id, data) when is_map(data) do
    key = @prefix <> session_id
    encoded = Jason.encode!(data)
    MyApp.RedisPool.command(["SETEX", key, to_string(@session_ttl), encoded])
  end

  # Get session data
  def get(session_id) do
    key = @prefix <> session_id

    case MyApp.RedisPool.command(["GET", key]) do
      {:ok, nil} -> {:error, :not_found}
      {:ok, encoded} -> {:ok, Jason.decode!(encoded)}
      error -> error
    end
  end

  # Update session data
  def update(session_id, data) when is_map(data) do
    key = @prefix <> session_id

    # Update and refresh TTL
    encoded = Jason.encode!(data)
    MyApp.RedisPool.command(["SETEX", key, to_string(@session_ttl), encoded])
  end

  # Delete a session
  def delete(session_id) do
    key = @prefix <> session_id
    MyApp.RedisPool.command(["DEL", key])
  end

  # Refresh session TTL without changing data
  def touch(session_id) do
    key = @prefix <> session_id
    MyApp.RedisPool.command(["EXPIRE", key, to_string(@session_ttl)])
  end

  # Generate a secure session ID
  def generate_id do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end
end
```

Plug integration for Phoenix:

```elixir
# lib/my_app_web/plugs/session.ex
defmodule MyAppWeb.Plugs.Session do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    # Get session ID from cookie
    session_id = get_session_cookie(conn)

    case session_id && MyApp.SessionStore.get(session_id) do
      {:ok, session_data} ->
        # Session exists - attach to conn and refresh TTL
        MyApp.SessionStore.touch(session_id)
        assign(conn, :session_id, session_id)
        |> assign(:current_session, session_data)

      _ ->
        # No session - create new one
        new_id = MyApp.SessionStore.generate_id()
        MyApp.SessionStore.create(new_id, %{})

        conn
        |> put_resp_cookie("session_id", new_id, http_only: true, secure: true)
        |> assign(:session_id, new_id)
        |> assign(:current_session, %{})
    end
  end

  defp get_session_cookie(conn) do
    conn.cookies["session_id"]
  end
end
```

---

## Sorted Sets for Leaderboards

Redis sorted sets are perfect for leaderboards and ranking systems.

```elixir
# lib/my_app/leaderboard.ex
defmodule MyApp.Leaderboard do
  @key "leaderboard:global"

  # Add or update a player's score
  # ZADD automatically maintains sort order
  def update_score(player_id, score) do
    MyApp.RedisPool.command(["ZADD", @key, to_string(score), player_id])
  end

  # Increment a player's score atomically
  def increment_score(player_id, amount) do
    MyApp.RedisPool.command(["ZINCRBY", @key, to_string(amount), player_id])
  end

  # Get top N players (highest scores first)
  def top(count \\ 10) do
    # ZREVRANGE returns members in descending score order
    # WITHSCORES includes the scores in the result
    {:ok, result} = MyApp.RedisPool.command([
      "ZREVRANGE", @key, "0", to_string(count - 1), "WITHSCORES"
    ])

    # Convert flat list to list of tuples
    result
    |> Enum.chunk_every(2)
    |> Enum.with_index(1)
    |> Enum.map(fn {[player_id, score], rank} ->
      %{rank: rank, player_id: player_id, score: String.to_integer(score)}
    end)
  end

  # Get a player's rank (1-indexed, highest score = rank 1)
  def get_rank(player_id) do
    case MyApp.RedisPool.command(["ZREVRANK", @key, player_id]) do
      {:ok, nil} -> {:error, :not_found}
      {:ok, rank} -> {:ok, rank + 1}  # Convert 0-indexed to 1-indexed
    end
  end

  # Get a player's score
  def get_score(player_id) do
    case MyApp.RedisPool.command(["ZSCORE", @key, player_id]) do
      {:ok, nil} -> {:error, :not_found}
      {:ok, score} -> {:ok, String.to_integer(score)}
    end
  end

  # Get player rank and surrounding players
  def get_rank_with_neighbors(player_id, neighbor_count \\ 2) do
    with {:ok, rank} <- get_rank(player_id) do
      start = max(0, rank - neighbor_count - 1)
      stop = rank + neighbor_count - 1

      {:ok, result} = MyApp.RedisPool.command([
        "ZREVRANGE", @key, to_string(start), to_string(stop), "WITHSCORES"
      ])

      neighbors =
        result
        |> Enum.chunk_every(2)
        |> Enum.with_index(start + 1)
        |> Enum.map(fn {[pid, score], r} ->
          %{rank: r, player_id: pid, score: String.to_integer(score)}
        end)

      {:ok, %{player_rank: rank, neighbors: neighbors}}
    end
  end

  # Remove a player from the leaderboard
  def remove(player_id) do
    MyApp.RedisPool.command(["ZREM", @key, player_id])
  end

  # Get total number of players
  def count do
    {:ok, count} = MyApp.RedisPool.command(["ZCARD", @key])
    count
  end
end
```

Usage:

```elixir
# Update scores
MyApp.Leaderboard.update_score("player:1", 1500)
MyApp.Leaderboard.update_score("player:2", 2000)
MyApp.Leaderboard.increment_score("player:1", 100)

# Get top 5 players
top_players = MyApp.Leaderboard.top(5)
# [%{rank: 1, player_id: "player:2", score: 2000}, ...]

# Get a specific player's rank
{:ok, 2} = MyApp.Leaderboard.get_rank("player:1")
```

---

## Error Handling and Reconnection

Redix handles reconnection automatically, but you should handle connection errors gracefully.

```elixir
# lib/my_app/redis_client.ex
defmodule MyApp.RedisClient do
  require Logger

  # Execute with retry logic for transient failures
  def command_with_retry(command, retries \\ 3) do
    case MyApp.RedisPool.command(command) do
      {:ok, result} ->
        {:ok, result}

      {:error, %Redix.ConnectionError{} = error} when retries > 0 ->
        # Connection error - retry after brief delay
        Logger.warning("Redis connection error, retrying: #{inspect(error)}")
        Process.sleep(100 * (4 - retries))  # Backoff: 100ms, 200ms, 300ms
        command_with_retry(command, retries - 1)

      {:error, error} ->
        Logger.error("Redis command failed: #{inspect(error)}")
        {:error, error}
    end
  end

  # Execute with fallback value
  def get_with_fallback(key, fallback) do
    case command_with_retry(["GET", key]) do
      {:ok, nil} -> fallback
      {:ok, value} -> value
      {:error, _} -> fallback
    end
  end

  # Circuit breaker pattern for Redis
  def safe_command(command, default \\ nil) do
    case command_with_retry(command, 1) do
      {:ok, result} -> result
      {:error, _} -> default
    end
  end
end
```

Configuration for production with sentinel:

```elixir
# config/prod.exs
config :my_app, :redis,
  sentinel: [
    sentinels: [
      [host: "sentinel-1.example.com", port: 26379],
      [host: "sentinel-2.example.com", port: 26379],
      [host: "sentinel-3.example.com", port: 26379]
    ],
    group: "mymaster"
  ],
  password: System.get_env("REDIS_PASSWORD"),
  socket_opts: [:inet6],  # Enable IPv6 if needed
  timeout: 5000  # Connection timeout in ms
```

---

## Testing with Redis

Use a separate Redis database for tests and clean up between test runs.

```elixir
# config/test.exs
config :my_app, :redis,
  host: "localhost",
  port: 6379,
  database: 15  # Use database 15 for tests
```

Test helper:

```elixir
# test/support/redis_case.ex
defmodule MyApp.RedisCase do
  use ExUnit.CaseTemplate

  setup do
    # Flush the test database before each test
    {:ok, conn} = Redix.start_link(database: 15)
    Redix.command!(conn, ["FLUSHDB"])
    Redix.stop(conn)
    :ok
  end
end
```

Example tests:

```elixir
# test/my_app/cache_test.exs
defmodule MyApp.CacheTest do
  use MyApp.RedisCase

  describe "Cache.set/3 and Cache.get/1" do
    test "stores and retrieves a value" do
      assert {:ok, "OK"} = MyApp.Cache.set("test:key", "value")
      assert {:ok, "value"} = MyApp.Cache.get("test:key")
    end

    test "returns error for missing key" do
      assert {:error, :not_found} = MyApp.Cache.get("nonexistent")
    end

    test "respects TTL" do
      # Set with 1 second TTL
      MyApp.Cache.set("short:ttl", "value", 1)
      assert {:ok, "value"} = MyApp.Cache.get("short:ttl")

      # Wait for expiration
      Process.sleep(1100)
      assert {:error, :not_found} = MyApp.Cache.get("short:ttl")
    end
  end

  describe "Cache.fetch/3" do
    test "returns cached value on hit" do
      MyApp.Cache.set("cached", "existing")

      # compute_fn should not be called
      {:ok, value} = MyApp.Cache.fetch("cached", 60, fn ->
        raise "Should not be called"
      end)

      assert value == "existing"
    end

    test "computes and caches on miss" do
      {:ok, value} = MyApp.Cache.fetch("new:key", 60, fn ->
        "computed"
      end)

      assert value == "computed"
      assert {:ok, "computed"} = MyApp.Cache.get("new:key")
    end
  end
end
```

Mock Redis for unit tests:

```elixir
# test/support/mocks.ex
Mox.defmock(MyApp.RedisMock, for: MyApp.RedisClient.Behaviour)

# Use in tests
defmodule MyApp.ServiceTest do
  use ExUnit.Case
  import Mox

  setup :verify_on_exit!

  test "handles cache miss gracefully" do
    expect(MyApp.RedisMock, :get, fn _key ->
      {:error, :not_found}
    end)

    # Test your service logic with mocked Redis
  end
end
```

---

## Best Practices Summary

1. **Use connection pooling** - NimblePool or Poolboy for production workloads
2. **Set appropriate TTLs** - Prevent unbounded memory growth
3. **Use pipelines** - Batch multiple commands for efficiency
4. **Handle errors gracefully** - Implement retry logic and fallbacks
5. **Namespace your keys** - Use prefixes like `cache:`, `session:`, `leaderboard:`
6. **Serialize consistently** - Use Jason for JSON encoding of complex data
7. **Clean up in tests** - Flush test database between runs
8. **Monitor memory** - Set `maxmemory` and eviction policies in Redis
9. **Use the right data structure** - Hashes for objects, sorted sets for rankings, lists for queues

---

*Need to monitor your Elixir and Redis infrastructure? [OneUptime](https://oneuptime.com) provides comprehensive monitoring with real-time alerts, uptime tracking, and incident management to keep your applications running smoothly.*
