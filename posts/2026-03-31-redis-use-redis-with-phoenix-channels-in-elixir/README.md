# How to Use Redis with Phoenix Channels in Elixir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elixir, Phoenix, Channel, Pub/Sub

Description: Learn how to integrate Redis with Phoenix Channels to enable real-time communication that scales across multiple Phoenix nodes using Redis Pub/Sub.

---

## Why Redis with Phoenix Channels?

Phoenix Channels provide real-time WebSocket communication out of the box using its built-in PubSub adapter backed by distributed Erlang. However, when deploying to environments where direct node clustering is difficult (Docker, Kubernetes, or cloud PaaS), Redis PubSub offers a simpler cross-node broadcast mechanism.

## Prerequisites

- Elixir 1.14 or higher
- Phoenix 1.7 or higher
- A running Redis server

## Adding Dependencies

Add `redix` and `phoenix_pubsub_redis` (or use Redix directly) to `mix.exs`:

```elixir
defp deps do
  [
    {:phoenix, "~> 1.7"},
    {:phoenix_pubsub, "~> 2.1"},
    {:redix, "~> 1.1"},
    {:phoenix_pubsub_redis, "~> 3.0"}
  ]
end
```

Fetch dependencies:

```bash
mix deps.get
```

## Configuring the Redis PubSub Adapter

Update `config/config.exs` (or `config/runtime.exs` for runtime config):

```elixir
config :my_app, MyAppWeb.Endpoint,
  pubsub_server: MyApp.PubSub
```

Update your `Application` supervisor to start PubSub:

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      {Phoenix.PubSub, name: MyApp.PubSub,
                       adapter: Phoenix.PubSub.Redis,
                       redis_opts: System.get_env("REDIS_URL", "redis://localhost:6379")},
      MyAppWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

## Defining a Channel

```elixir
# lib/my_app_web/channels/room_channel.ex
defmodule MyAppWeb.RoomChannel do
  use Phoenix.Channel

  def join("room:" <> room_id, _params, socket) do
    socket = assign(socket, :room_id, room_id)
    {:ok, socket}
  end

  def handle_in("new_message", %{"body" => body}, socket) do
    room_id = socket.assigns.room_id

    broadcast!(socket, "new_message", %{
      body:    body,
      user_id: socket.assigns[:user_id],
      room_id: room_id
    })

    {:noreply, socket}
  end

  def handle_in("typing", _params, socket) do
    broadcast_from!(socket, "typing", %{user_id: socket.assigns[:user_id]})
    {:noreply, socket}
  end
end
```

## Registering the Socket and Channel

```elixir
# lib/my_app_web/channels/user_socket.ex
defmodule MyAppWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", MyAppWeb.RoomChannel

  def connect(%{"token" => token}, socket, _connect_info) do
    case verify_token(token) do
      {:ok, user_id} -> {:ok, assign(socket, :user_id, user_id)}
      {:error, _}    -> :error
    end
  end

  def id(socket), do: "user_socket:#{socket.assigns.user_id}"

  defp verify_token(token) do
    Phoenix.Token.verify(MyAppWeb.Endpoint, "user socket", token, max_age: 86_400)
  end
end
```

## JavaScript Client

```javascript
import { Socket } from "phoenix";

const socket = new Socket("/socket", {
  params: { token: window.userToken }
});

socket.connect();

const channel = socket.channel("room:lobby", {});

channel.on("new_message", ({ body, user_id }) => {
  console.log(`[${user_id}]: ${body}`);
});

channel.join()
  .receive("ok", () => console.log("Joined lobby"))
  .receive("error", (err) => console.error("Join failed:", err));

// Send a message
channel.push("new_message", { body: "Hello, Phoenix!" });
```

## Publishing from Outside a Channel

Broadcast from your application code (e.g., from a LiveView, controller, or background job):

```elixir
defmodule MyApp.Notifications do
  alias MyAppWeb.Endpoint

  def notify_room(room_id, message) do
    Endpoint.broadcast("room:#{room_id}", "new_message", %{
      body: message,
      user_id: "system"
    })
  end
end
```

Call it from anywhere:

```elixir
MyApp.Notifications.notify_room("general", "Server maintenance in 5 minutes")
```

## Multi-Node Verification

With Redis as the PubSub adapter, start two Phoenix nodes:

```bash
# Node 1
REDIS_URL=redis://localhost:6379 PORT=4000 mix phx.server

# Node 2
REDIS_URL=redis://localhost:6379 PORT=4001 mix phx.server
```

A message sent by a client connected to Node 1 will be received by clients on Node 2 via Redis.

## Summary

Redis integrates with Phoenix Channels by replacing the default Erlang-based PubSub adapter with `Phoenix.PubSub.Redis`, which routes channel broadcasts through Redis Pub/Sub. This enables horizontal scaling of Phoenix applications without requiring Erlang node clustering, making it ideal for containerized or cloud deployments where nodes cannot directly discover each other.
