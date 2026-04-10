# How to Use Redis as Phoenix PubSub Adapter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elixir, Phoenix, PubSub, Distributed System

Description: Learn how to configure Redis as the Phoenix PubSub adapter to broadcast messages across multiple Phoenix nodes without Erlang clustering.

---

## What is Phoenix PubSub?

Phoenix PubSub is a distributed publish/subscribe system used internally by Phoenix Channels, LiveView, and Presence. By default it uses the PG2 adapter (`Phoenix.PubSub.PG2`), which relies on Erlang's `:pg` module for process group communication across connected nodes. The Redis adapter replaces this with Redis Pub/Sub, which is easier to set up in environments where Erlang node clustering is not practical.

## When to Use the Redis Adapter

- Multi-node Phoenix deployments on Kubernetes, Heroku, Fly.io, or Docker Swarm
- When you cannot configure Erlang node discovery
- When you already have a managed Redis instance (Elasticache, Upstash, Redis Cloud)
- For simpler horizontal scaling without EPMD configuration

## Setup

Add the dependency to `mix.exs`:

```elixir
defp deps do
  [
    {:phoenix_pubsub_redis, "~> 3.0"}
  ]
end
```

```bash
mix deps.get
```

## Configuration

### Static Configuration

```elixir
# config/config.exs
config :my_app, MyApp.PubSub,
  adapter: Phoenix.PubSub.Redis,
  redis_opts: "redis://localhost:6379",
  node_name: System.get_env("HOSTNAME", "node1")
```

### Runtime Configuration (Recommended for Production)

```elixir
# config/runtime.exs
import Config

config :my_app, MyApp.PubSub,
  adapter: Phoenix.PubSub.Redis,
  redis_opts: System.fetch_env!("REDIS_URL"),
  node_name: System.get_env("HOSTNAME", "phoenix-node")
```

## Application Supervisor

Start PubSub in your supervision tree:

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    pubsub_config = Application.get_env(:my_app, MyApp.PubSub)

    children = [
      {Phoenix.PubSub, [name: MyApp.PubSub] ++ pubsub_config},
      MyAppWeb.Endpoint
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: MyApp.Supervisor)
  end
end
```

Update the endpoint config to reference the PubSub server:

```elixir
# config/config.exs
config :my_app, MyAppWeb.Endpoint,
  pubsub_server: MyApp.PubSub
```

## Using PubSub Directly

### Subscribe and Broadcast

```elixir
defmodule MyApp.EventBus do
  alias Phoenix.PubSub

  def subscribe(topic) do
    PubSub.subscribe(MyApp.PubSub, topic)
  end

  def broadcast(topic, event, payload) do
    PubSub.broadcast(MyApp.PubSub, topic, {event, payload})
  end
end
```

### Subscribing in a GenServer

```elixir
defmodule MyApp.AlertWorker do
  use GenServer

  alias MyApp.EventBus

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    EventBus.subscribe("alerts:critical")
    {:ok, %{}}
  end

  @impl true
  def handle_info({:new_alert, payload}, state) do
    IO.inspect(payload, label: "Critical alert received")
    {:noreply, state}
  end
end
```

### Publishing from Business Logic

```elixir
defmodule MyApp.Orders do
  alias MyApp.EventBus

  def place_order(user_id, items) do
    order = create_order!(user_id, items)

    EventBus.broadcast("orders:#{user_id}", :order_placed, %{
      order_id: order.id,
      total:    order.total
    })

    {:ok, order}
  end

  defp create_order!(user_id, items) do
    # ... database logic
  end
end
```

## How It Works Internally

```text
Node A publishes to "orders:42"
        |
        v
  Redis Channel: "phx:Elixir.MyApp.PubSub"
        |
   +----+----+
   |         |
Node A     Node B
delivers   delivers
to local   to local
subscribers subscribers
```

The Redis adapter serializes Phoenix PubSub messages and routes them through a single Redis Pub/Sub channel per PubSub instance (e.g. `phx:Elixir.MyApp.PubSub`). All topics are multiplexed over this channel. Each Phoenix node subscribes to the Redis channel and forwards incoming messages to the appropriate local process subscribers based on the topic.

## Channel Naming

The adapter uses a single Redis channel named `phx:<adapter_name>` (e.g. `phx:Elixir.MyApp.PubSub`) to avoid conflicts with other Redis keys. You can customize the node name to distinguish log entries:

```elixir
config :my_app, MyApp.PubSub,
  adapter: Phoenix.PubSub.Redis,
  redis_opts: System.fetch_env!("REDIS_URL"),
  node_name: System.get_env("FLY_APP_NAME", "local")
```

## Monitoring Redis Traffic

Watch PubSub messages in real time:

```bash
redis-cli subscribe "phx:Elixir.MyApp.PubSub"
redis-cli psubscribe "phx:*"
```

## Summary

The Redis PubSub adapter for Phoenix routes all `Phoenix.PubSub.broadcast/3` calls through a Redis Pub/Sub channel instead of Erlang distribution. Configure it by setting `adapter: Phoenix.PubSub.Redis` with `redis_opts` pointing to your Redis URL, start it in your application supervision tree, and update your endpoint to use the PubSub server name. All Phoenix Channels, LiveView, and Presence features continue working transparently, now broadcasting across multiple nodes through Redis.
