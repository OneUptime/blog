# How to Use Redis in Elixir with Redix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elixir, Redix, OTP, Phoenix

Description: Learn how to use Redis in Elixir with Redix, covering connection management, pipelines, Pub/Sub, and integration with Phoenix applications.

---

Redix is the most popular Redis client for Elixir. It is built on top of OTP and provides a clean API that fits naturally with the BEAM runtime model.

## Setup

```elixir
# mix.exs
defp deps do
  [
    {:redix, "~> 1.5"},
    {:castore, ">= 0.0.0"}  # for TLS support
  ]
end
```

## Connecting

```elixir
{:ok, conn} = Redix.start_link("redis://localhost:6379")

# Or with options
{:ok, conn} = Redix.start_link(
  host: "localhost",
  port: 6379,
  password: "secret",
  database: 0
)
```

## Basic Commands

```elixir
{:ok, "OK"} = Redix.command(conn, ["SET", "user:1:name", "Alice"])
{:ok, name} = Redix.command(conn, ["GET", "user:1:name"])
IO.puts("Name: #{name}")

# INCR and EXPIRE
Redix.command(conn, ["SET", "visits", "0"])
{:ok, count} = Redix.command(conn, ["INCR", "visits"])
Redix.command(conn, ["EXPIRE", "visits", "3600"])
IO.puts("Visits: #{count}")

# Hash
Redix.command(conn, ["HSET", "profile:1", "city", "Dublin", "age", "28"])
{:ok, city} = Redix.command(conn, ["HGET", "profile:1", "city"])
IO.puts("City: #{city}")
```

## Pipelines

Send multiple commands in one round-trip:

```elixir
{:ok, results} = Redix.pipeline(conn, [
  ["SET", "a", "1"],
  ["SET", "b", "2"],
  ["MGET", "a", "b"],
  ["DEL", "a", "b"]
])
IO.inspect(results)  # ["OK", "OK", ["1", "2"], 2]
```

## Connection Pool with Supervisor

In a Phoenix app, add Redix to your supervision tree:

```elixir
# lib/my_app/application.ex
children = [
  {Redix, host: "localhost", port: 6379, name: :redix}
]
```

Then use it by name:

```elixir
Redix.command(:redix, ["SET", "key", "value"])
```

For a pool of connections:

```elixir
# Start multiple named connections
@pool_size 5

children =
  for i <- 0..(@pool_size - 1) do
    Supervisor.child_spec({Redix, host: "localhost", name: :"redix_#{i}"}, id: {Redix, i})
  end

# Pick one at random
def pool_command(cmd) do
  name = :"redix_#{Enum.random(0..(@pool_size - 1))}"
  Redix.command(name, cmd)
end
```

## Pub/Sub with Redix.PubSub

```elixir
{:ok, pubsub} = Redix.PubSub.start_link("redis://localhost:6379")

# Subscribe - messages arrive as Elixir messages
{:ok, ref} = Redix.PubSub.subscribe(pubsub, "notifications", self())

# In a GenServer or receive block
receive do
  {:redix_pubsub, ^pubsub, _ref, :message, %{channel: channel, payload: payload}} ->
    IO.puts("#{channel}: #{payload}")
end

# Publish (use a separate connection)
Redix.command(:redix, ["PUBLISH", "notifications", "Hello, Elixir!"])
```

## Error Handling

```elixir
case Redix.command(conn, ["GET", "missing_key"]) do
  {:ok, nil} -> IO.puts("Key not found")
  {:ok, value} -> IO.puts("Value: #{value}")
  {:error, reason} -> IO.puts("Error: #{inspect(reason)}")
end
```

## Summary

Redix integrates cleanly with Elixir's OTP model - connections are processes you supervise, and commands are simple function calls. Use `Redix.pipeline/2` for batching, `Redix.PubSub` for messaging, and add multiple named connections for a lightweight pool. Phoenix apps benefit from putting Redix in the supervision tree for automatic reconnection.
