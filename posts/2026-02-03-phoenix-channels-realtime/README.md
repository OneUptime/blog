# How to Build Real-Time Features with Phoenix Channels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elixir, Phoenix, Channels, WebSockets, Real-Time

Description: Learn how to build real-time features with Phoenix Channels. This guide covers channel setup, presence tracking, broadcasting, and scaling considerations.

---

Phoenix Channels provide a powerful abstraction for building real-time features in Elixir applications. Built on top of WebSockets with automatic fallback to long polling, Channels offer features like topic-based pub/sub, presence tracking, and seamless horizontal scaling through the Erlang VM's distributed capabilities. This guide covers everything you need to build production-ready real-time applications with Phoenix.

## Understanding Phoenix Channels Architecture

Phoenix Channels consist of several interconnected components that work together to provide real-time communication.

**Socket**: The persistent connection between client and server. Each socket can subscribe to multiple channels and maintains connection state.

**Channel**: A conversation on a specific topic. Channels handle incoming messages, manage state, and broadcast updates to subscribers.

**Topic**: A string identifier that routes messages to the correct channel. Topics follow the pattern "topic:subtopic" (e.g., "room:lobby", "user:123").

**Transport**: The underlying protocol. Phoenix supports WebSockets and long polling, with automatic fallback for environments where WebSockets are unavailable.

**PubSub**: The backend system that distributes messages across processes and nodes. Phoenix PubSub handles broadcasting efficiently even in distributed clusters.

## Setting Up Phoenix Channels

### Installation and Configuration

If you are starting a new Phoenix project, channels are included by default. For existing projects, ensure your dependencies include Phoenix.

```elixir
# mix.exs
defp deps do
  [
    {:phoenix, "~> 1.7"},
    {:phoenix_pubsub, "~> 2.1"},
    {:phoenix_live_view, "~> 0.20"},
    {:jason, "~> 1.4"}
  ]
end
```

Configure the PubSub adapter in your application supervision tree. The default PG adapter uses Erlang's pg module for distributed pub/sub.

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start the PubSub system
      {Phoenix.PubSub, name: MyApp.PubSub},
      # Start the Endpoint (http/https)
      MyAppWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

### Creating a Socket

The socket module defines the entry point for WebSocket connections. It handles authentication, assigns connection metadata, and specifies which channels clients can join.

```elixir
# lib/my_app_web/channels/user_socket.ex
defmodule MyAppWeb.UserSocket do
  use Phoenix.Socket

  # Channel routes - maps topic patterns to channel modules
  # The asterisk (*) captures the rest of the topic as a parameter
  channel "room:*", MyAppWeb.RoomChannel
  channel "notifications:*", MyAppWeb.NotificationChannel
  channel "presence:*", MyAppWeb.PresenceChannel

  # Socket connection callback
  # Called when a client first establishes a WebSocket connection
  # Returns {:ok, socket} to allow connection or :error to reject
  @impl true
  def connect(params, socket, _connect_info) do
    case authenticate(params["token"]) do
      {:ok, user_id} ->
        # Assign user_id to socket for use in channels
        {:ok, assign(socket, :user_id, user_id)}

      :error ->
        :error
    end
  end

  # Identifies the socket connection
  # Used for targeting specific users when broadcasting
  # Return nil for anonymous connections
  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"

  # Token authentication helper
  defp authenticate(token) when is_binary(token) do
    case Phoenix.Token.verify(MyAppWeb.Endpoint, "user auth", token, max_age: 86400) do
      {:ok, user_id} -> {:ok, user_id}
      {:error, _reason} -> :error
    end
  end

  defp authenticate(_), do: :error
end
```

Register the socket in your endpoint configuration.

```elixir
# lib/my_app_web/endpoint.ex
defmodule MyAppWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :my_app

  # Socket mount point
  # All WebSocket connections to /socket will use UserSocket
  socket "/socket", MyAppWeb.UserSocket,
    websocket: [
      timeout: 45_000,           # Connection timeout in milliseconds
      compress: true,            # Enable per-message deflate compression
      check_origin: true         # Validate origin header matches allowed hosts
    ],
    longpoll: [
      timeout: 45_000            # Long polling timeout
    ]

  # Rest of endpoint configuration...
end
```

### Creating a Channel

Channels handle the actual message processing. Each channel module defines callbacks for joining topics and handling incoming events.

```elixir
# lib/my_app_web/channels/room_channel.ex
defmodule MyAppWeb.RoomChannel do
  use MyAppWeb, :channel

  # Called when a client attempts to join a channel
  # The first argument is the full topic string
  # The second argument contains any parameters sent with the join request
  # The third argument is the socket with any assigns from the socket module
  @impl true
  def join("room:" <> room_id, _params, socket) do
    # Validate that the user can access this room
    user_id = socket.assigns.user_id

    case authorize_room_access(user_id, room_id) do
      :ok ->
        # Send a welcome message after join completes
        send(self(), :after_join)

        # Store room_id in socket assigns for later use
        socket = assign(socket, :room_id, room_id)

        # Return {:ok, socket} to allow the join
        # Optionally return {:ok, reply, socket} to send data with the join response
        {:ok, %{room_id: room_id}, socket}

      {:error, reason} ->
        # Return {:error, reason} to reject the join
        {:error, %{reason: reason}}
    end
  end

  # Handle the after_join message sent to self
  @impl true
  def handle_info(:after_join, socket) do
    room_id = socket.assigns.room_id

    # Load and send recent messages to the newly joined client
    messages = Messages.list_recent(room_id, limit: 50)

    push(socket, "message_history", %{
      messages: messages,
      room_id: room_id
    })

    {:noreply, socket}
  end

  # Handle incoming "new_message" events from clients
  @impl true
  def handle_in("new_message", %{"body" => body}, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id

    # Validate message content
    case validate_message(body) do
      :ok ->
        # Persist the message to database
        {:ok, message} = Messages.create(%{
          body: body,
          user_id: user_id,
          room_id: room_id
        })

        # Broadcast to all subscribers of this topic, including sender
        broadcast!(socket, "new_message", %{
          id: message.id,
          body: message.body,
          user_id: user_id,
          inserted_at: message.inserted_at
        })

        # Return :reply to send acknowledgment back to sender
        {:reply, {:ok, %{message_id: message.id}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  # Handle typing indicator events
  @impl true
  def handle_in("typing", %{"typing" => is_typing}, socket) do
    user_id = socket.assigns.user_id

    # Broadcast to others (not the sender) using broadcast_from!
    broadcast_from!(socket, "user_typing", %{
      user_id: user_id,
      typing: is_typing
    })

    {:noreply, socket}
  end

  # Handle leaving the channel
  @impl true
  def terminate(_reason, socket) do
    # Clean up any resources associated with this channel
    room_id = socket.assigns.room_id
    user_id = socket.assigns.user_id

    # Notify others that user left
    broadcast!(socket, "user_left", %{user_id: user_id})

    :ok
  end

  # Private helper functions
  defp authorize_room_access(user_id, room_id) do
    if Rooms.member?(room_id, user_id) do
      :ok
    else
      {:error, "not_authorized"}
    end
  end

  defp validate_message(body) when is_binary(body) do
    cond do
      String.length(body) == 0 -> {:error, "message_empty"}
      String.length(body) > 10_000 -> {:error, "message_too_long"}
      true -> :ok
    end
  end

  defp validate_message(_), do: {:error, "invalid_message"}
end
```

## Client-Side Implementation

### JavaScript Client Setup

Phoenix provides a JavaScript client library that handles connection management, reconnection, and channel subscriptions.

```javascript
// assets/js/socket.js
import { Socket } from "phoenix";

// Create socket connection with authentication token
const socket = new Socket("/socket", {
  params: { token: window.userToken },
  // Reconnection settings
  reconnectAfterMs: (tries) => {
    // Exponential backoff: 1s, 2s, 5s, 10s, then 10s forever
    return [1000, 2000, 5000, 10000][tries - 1] || 10000;
  },
  // Heartbeat interval (milliseconds)
  heartbeatIntervalMs: 30000,
  // Logger for debugging
  logger: (kind, msg, data) => {
    console.log(`${kind}: ${msg}`, data);
  },
});

// Connection lifecycle callbacks
socket.onOpen(() => {
  console.log("Socket connected");
});

socket.onClose(() => {
  console.log("Socket disconnected");
});

socket.onError((error) => {
  console.error("Socket error:", error);
});

// Establish the connection
socket.connect();

export default socket;
```

### Joining Channels and Handling Events

```javascript
// assets/js/room.js
import socket from "./socket";

class RoomChannel {
  constructor(roomId) {
    this.roomId = roomId;
    this.channel = null;
    this.callbacks = new Map();
  }

  // Join the room channel
  join() {
    return new Promise((resolve, reject) => {
      // Create channel instance for the specific room topic
      this.channel = socket.channel(`room:${this.roomId}`, {});

      // Attempt to join
      this.channel
        .join()
        .receive("ok", (response) => {
          console.log(`Joined room ${this.roomId}`, response);
          this.setupEventHandlers();
          resolve(response);
        })
        .receive("error", (response) => {
          console.error(`Failed to join room ${this.roomId}`, response);
          reject(response);
        })
        .receive("timeout", () => {
          console.error("Join timeout");
          reject(new Error("timeout"));
        });
    });
  }

  // Set up handlers for server events
  setupEventHandlers() {
    // Handle message history sent after joining
    this.channel.on("message_history", (payload) => {
      console.log("Received message history:", payload.messages.length);
      this.emit("history", payload.messages);
    });

    // Handle new messages
    this.channel.on("new_message", (message) => {
      console.log("New message:", message);
      this.emit("message", message);
    });

    // Handle typing indicators
    this.channel.on("user_typing", (payload) => {
      this.emit("typing", payload);
    });

    // Handle user left events
    this.channel.on("user_left", (payload) => {
      this.emit("user_left", payload);
    });

    // Handle channel errors
    this.channel.onError((error) => {
      console.error("Channel error:", error);
      this.emit("error", error);
    });

    // Handle channel close
    this.channel.onClose(() => {
      console.log("Channel closed");
      this.emit("close");
    });
  }

  // Send a message to the room
  sendMessage(body) {
    return new Promise((resolve, reject) => {
      this.channel
        .push("new_message", { body })
        .receive("ok", (response) => {
          resolve(response);
        })
        .receive("error", (response) => {
          reject(response);
        })
        .receive("timeout", () => {
          reject(new Error("timeout"));
        });
    });
  }

  // Send typing indicator
  sendTyping(isTyping) {
    // Use push without waiting for response for fire-and-forget events
    this.channel.push("typing", { typing: isTyping });
  }

  // Leave the channel
  leave() {
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
  }

  // Simple event emitter for internal callbacks
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  emit(event, data) {
    const handlers = this.callbacks.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }
}

// Usage example
async function initRoom(roomId) {
  const room = new RoomChannel(roomId);

  room.on("message", (message) => {
    appendMessage(message);
  });

  room.on("typing", ({ user_id, typing }) => {
    updateTypingIndicator(user_id, typing);
  });

  room.on("history", (messages) => {
    messages.forEach(appendMessage);
  });

  try {
    await room.join();
    console.log("Room initialized");
  } catch (error) {
    console.error("Failed to initialize room:", error);
  }

  return room;
}

export { RoomChannel, initRoom };
```

## Phoenix Presence for User Tracking

Phoenix Presence provides a distributed, conflict-free system for tracking users across nodes. It automatically handles node failures and synchronizes state across the cluster.

### Setting Up Presence

```elixir
# lib/my_app_web/channels/presence.ex
defmodule MyAppWeb.Presence do
  use Phoenix.Presence,
    otp_app: :my_app,
    pubsub_server: MyApp.PubSub

  @doc """
  Fetch user data for presence tracking.
  Called when presence data needs to be enriched with user information.
  """
  def fetch(_topic, presences) do
    # Get all user IDs from presences
    user_ids =
      presences
      |> Map.keys()
      |> Enum.map(&String.to_integer/1)

    # Batch load users from database
    users =
      Accounts.get_users(user_ids)
      |> Map.new(fn user -> {to_string(user.id), user} end)

    # Merge user data into presences
    for {user_id, presence} <- presences, into: %{} do
      user = Map.get(users, user_id, %{})

      enriched_metas =
        Enum.map(presence.metas, fn meta ->
          Map.merge(meta, %{
            username: user[:username] || "Unknown",
            avatar_url: user[:avatar_url]
          })
        end)

      {user_id, %{presence | metas: enriched_metas}}
    end
  end
end
```

### Presence Channel Implementation

```elixir
# lib/my_app_web/channels/presence_channel.ex
defmodule MyAppWeb.PresenceChannel do
  use MyAppWeb, :channel
  alias MyAppWeb.Presence

  @impl true
  def join("presence:" <> room_id, _params, socket) do
    # Authorize access
    if authorized?(socket.assigns.user_id, room_id) do
      send(self(), :after_join)
      {:ok, assign(socket, :room_id, room_id)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id

    # Track this user's presence
    # The third argument contains metadata about this specific connection
    {:ok, _ref} =
      Presence.track(socket, to_string(user_id), %{
        online_at: System.system_time(:second),
        device: get_device_info(socket),
        status: "online"
      })

    # Push the current presence state to the newly joined client
    push(socket, "presence_state", Presence.list(socket))

    {:noreply, socket}
  end

  # Handle status updates from clients
  @impl true
  def handle_in("update_status", %{"status" => status}, socket)
      when status in ["online", "away", "busy", "offline"] do
    user_id = socket.assigns.user_id

    # Update presence metadata
    Presence.update(socket, to_string(user_id), fn meta ->
      Map.put(meta, :status, status)
    end)

    {:noreply, socket}
  end

  # Get list of online users
  @impl true
  def handle_in("get_online_users", _params, socket) do
    presences = Presence.list(socket)

    online_users =
      presences
      |> Enum.map(fn {user_id, %{metas: metas}} ->
        # Get the most recent meta (in case of multiple connections)
        meta = List.first(metas)
        %{user_id: user_id, status: meta.status, username: meta.username}
      end)

    {:reply, {:ok, %{users: online_users}}, socket}
  end

  defp authorized?(user_id, room_id) do
    Rooms.member?(room_id, user_id)
  end

  defp get_device_info(socket) do
    # Extract device info from connection if available
    case socket.transport_pid do
      nil -> "unknown"
      _pid -> "web"
    end
  end
end
```

### Handling Presence Events on the Client

```javascript
// assets/js/presence.js
import { Presence } from "phoenix";
import socket from "./socket";

class PresenceTracker {
  constructor(roomId) {
    this.roomId = roomId;
    this.channel = null;
    this.presence = null;
    this.onSync = null;
    this.onJoin = null;
    this.onLeave = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.channel = socket.channel(`presence:${this.roomId}`, {});

      // Initialize Presence tracking
      this.presence = new Presence(this.channel);

      // Called whenever presence state changes
      this.presence.onSync(() => {
        const users = this.getUsers();
        if (this.onSync) {
          this.onSync(users);
        }
      });

      // Called when a new user joins
      this.presence.onJoin((userId, currentPresence, newPresence) => {
        // currentPresence is undefined if this is the user's first device
        if (!currentPresence && this.onJoin) {
          const meta = newPresence.metas[0];
          this.onJoin({
            userId,
            username: meta.username,
            status: meta.status,
          });
        }
      });

      // Called when a user leaves
      this.presence.onLeave((userId, currentPresence, leftPresence) => {
        // currentPresence is empty if this was the user's last device
        if (currentPresence.metas.length === 0 && this.onLeave) {
          this.onLeave({ userId });
        }
      });

      // Join the channel
      this.channel
        .join()
        .receive("ok", () => {
          resolve();
        })
        .receive("error", (error) => {
          reject(error);
        });
    });
  }

  // Get formatted list of online users
  getUsers() {
    const users = [];

    this.presence.list((userId, { metas }) => {
      // User might have multiple connections (devices/tabs)
      // metas is an array of all their connection metadata
      const meta = metas[0]; // Use first connection's data
      const connectionCount = metas.length;

      users.push({
        userId,
        username: meta.username,
        avatarUrl: meta.avatar_url,
        status: meta.status,
        onlineAt: meta.online_at,
        connectionCount,
      });
    });

    return users;
  }

  // Update own status
  updateStatus(status) {
    this.channel.push("update_status", { status });
  }

  disconnect() {
    if (this.channel) {
      this.channel.leave();
    }
  }
}

// Usage example
async function initPresence(roomId) {
  const tracker = new PresenceTracker(roomId);

  tracker.onSync = (users) => {
    console.log("Online users:", users);
    renderUserList(users);
  };

  tracker.onJoin = (user) => {
    console.log(`${user.username} joined`);
    showNotification(`${user.username} is now online`);
  };

  tracker.onLeave = (user) => {
    console.log(`User ${user.userId} left`);
  };

  await tracker.connect();
  return tracker;
}

export { PresenceTracker, initPresence };
```

## Broadcasting from Outside Channels

Often you need to broadcast messages from outside the channel context, such as from a controller, background job, or another process.

### Using Phoenix.Endpoint.broadcast

```elixir
# From a controller after creating a notification
defmodule MyAppWeb.NotificationController do
  use MyAppWeb, :controller

  def create(conn, %{"user_id" => user_id, "message" => message}) do
    # Create notification in database
    {:ok, notification} = Notifications.create(%{
      user_id: user_id,
      message: message
    })

    # Broadcast to the user's notification channel
    # This works across all nodes in a cluster
    MyAppWeb.Endpoint.broadcast(
      "notifications:#{user_id}",
      "new_notification",
      %{
        id: notification.id,
        message: notification.message,
        inserted_at: notification.inserted_at
      }
    )

    json(conn, %{status: "ok"})
  end
end

# From a background job (using Oban)
defmodule MyApp.Workers.BroadcastWorker do
  use Oban.Worker, queue: :broadcasts

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"room_id" => room_id, "event" => event, "payload" => payload}}) do
    MyAppWeb.Endpoint.broadcast("room:#{room_id}", event, payload)
    :ok
  end
end

# From a GenServer monitoring external events
defmodule MyApp.PriceMonitor do
  use GenServer

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    schedule_check()
    {:ok, %{}}
  end

  @impl true
  def handle_info(:check_prices, state) do
    prices = fetch_current_prices()

    # Broadcast price updates to all subscribers
    MyAppWeb.Endpoint.broadcast("prices:updates", "price_change", %{
      prices: prices,
      timestamp: DateTime.utc_now()
    })

    schedule_check()
    {:noreply, state}
  end

  defp schedule_check do
    Process.send_after(self(), :check_prices, :timer.seconds(5))
  end

  defp fetch_current_prices do
    # Fetch from external API
    %{btc: 50000, eth: 3000}
  end
end
```

### Creating a Broadcast Module

For complex applications, create a dedicated module for broadcasting.

```elixir
# lib/my_app/broadcast.ex
defmodule MyApp.Broadcast do
  @moduledoc """
  Centralized broadcasting functions for real-time updates.
  """

  alias MyAppWeb.Endpoint

  @doc """
  Broadcast a message to a specific room.
  """
  def to_room(room_id, event, payload) do
    Endpoint.broadcast("room:#{room_id}", event, payload)
  end

  @doc """
  Broadcast a notification to a specific user.
  """
  def to_user(user_id, event, payload) do
    Endpoint.broadcast("notifications:#{user_id}", event, payload)
  end

  @doc """
  Broadcast to all users in an organization.
  """
  def to_organization(org_id, event, payload) do
    Endpoint.broadcast("org:#{org_id}", event, payload)
  end

  @doc """
  Broadcast a system-wide announcement.
  """
  def system_announcement(message) do
    Endpoint.broadcast("system:announcements", "announcement", %{
      message: message,
      timestamp: DateTime.utc_now()
    })
  end

  @doc """
  Disconnect a user from all their channels.
  Useful for logout or account suspension.
  """
  def disconnect_user(user_id) do
    Endpoint.broadcast("user_socket:#{user_id}", "disconnect", %{})
  end
end

# Usage from anywhere in your application
MyApp.Broadcast.to_room("lobby", "new_message", %{body: "Hello!"})
MyApp.Broadcast.to_user(123, "new_notification", %{title: "Alert"})
```

## Channel Authentication and Authorization

### Token-Based Authentication

Generate tokens server-side and verify them during socket connection.

```elixir
# lib/my_app_web/controllers/page_controller.ex
defmodule MyAppWeb.PageController do
  use MyAppWeb, :controller

  def index(conn, _params) do
    # Generate a token for the current user
    token = if user = conn.assigns[:current_user] do
      Phoenix.Token.sign(MyAppWeb.Endpoint, "user auth", user.id)
    end

    render(conn, :index, user_token: token)
  end
end
```

```html
<!-- In your layout template -->
<script>
  window.userToken = "<%= @user_token %>";
</script>
```

### Per-Channel Authorization

Implement fine-grained access control in channel join callbacks.

```elixir
defmodule MyAppWeb.DocumentChannel do
  use MyAppWeb, :channel

  alias MyApp.Documents
  alias MyApp.Permissions

  @impl true
  def join("document:" <> doc_id, params, socket) do
    user_id = socket.assigns.user_id
    requested_access = Map.get(params, "access_level", "read")

    case Permissions.check_document_access(user_id, doc_id, requested_access) do
      {:ok, :owner} ->
        socket =
          socket
          |> assign(:doc_id, doc_id)
          |> assign(:access_level, :owner)

        {:ok, %{access_level: "owner"}, socket}

      {:ok, :editor} ->
        socket =
          socket
          |> assign(:doc_id, doc_id)
          |> assign(:access_level, :editor)

        {:ok, %{access_level: "editor"}, socket}

      {:ok, :viewer} ->
        socket =
          socket
          |> assign(:doc_id, doc_id)
          |> assign(:access_level, :viewer)

        {:ok, %{access_level: "viewer"}, socket}

      {:error, :not_found} ->
        {:error, %{reason: "document_not_found"}}

      {:error, :forbidden} ->
        {:error, %{reason: "access_denied"}}
    end
  end

  # Only allow edits from users with editor or owner access
  @impl true
  def handle_in("edit", params, socket) do
    case socket.assigns.access_level do
      level when level in [:owner, :editor] ->
        apply_edit(params, socket)

      :viewer ->
        {:reply, {:error, %{reason: "insufficient_permissions"}}, socket}
    end
  end

  defp apply_edit(%{"operation" => op, "data" => data}, socket) do
    doc_id = socket.assigns.doc_id

    case Documents.apply_operation(doc_id, op, data) do
      {:ok, result} ->
        broadcast!(socket, "document_updated", %{operation: op, data: result})
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end
end
```

## Scaling Phoenix Channels

Phoenix Channels scale horizontally out of the box thanks to Erlang's distributed capabilities and Phoenix PubSub.

### Multi-Node Configuration

Configure your nodes to form a cluster using libcluster or manual configuration.

```elixir
# config/runtime.exs
import Config

if config_env() == :prod do
  # Configure node name for clustering
  config :my_app, MyApp.Endpoint,
    server: true

  # Configure PubSub for distributed operation
  config :my_app, MyApp.PubSub,
    name: MyApp.PubSub,
    adapter: Phoenix.PubSub.PG2

  # Configure libcluster for automatic node discovery
  config :libcluster,
    topologies: [
      k8s: [
        strategy: Cluster.Strategy.Kubernetes.DNS,
        config: [
          service: "my-app-headless",
          application_name: "my_app"
        ]
      ]
    ]
end
```

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies, [])

    children = [
      # Cluster supervisor for node discovery
      {Cluster.Supervisor, [topologies, [name: MyApp.ClusterSupervisor]]},
      # PubSub
      {Phoenix.PubSub, name: MyApp.PubSub},
      # Presence
      MyAppWeb.Presence,
      # Endpoint
      MyAppWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

### Using Redis PubSub Adapter

For environments where Erlang distribution is not feasible, use the Redis PubSub adapter.

```elixir
# mix.exs
defp deps do
  [
    {:phoenix_pubsub_redis, "~> 3.0"}
  ]
end

# config/prod.exs
config :my_app, MyApp.PubSub,
  adapter: Phoenix.PubSub.Redis,
  host: System.get_env("REDIS_HOST", "localhost"),
  port: String.to_integer(System.get_env("REDIS_PORT", "6379")),
  node_name: System.get_env("NODE_NAME", "node1")
```

### Load Balancer Configuration

When running multiple Phoenix nodes behind a load balancer, configure sticky sessions for WebSocket connections.

```nginx
# NGINX configuration for Phoenix Channels
upstream phoenix {
    ip_hash;  # Sticky sessions based on client IP
    server app1:4000;
    server app2:4000;
    server app3:4000;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://phoenix;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout (24 hours)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

## Rate Limiting and Backpressure

Protect your channels from abuse with rate limiting.

```elixir
# lib/my_app_web/channels/rate_limiter.ex
defmodule MyAppWeb.RateLimiter do
  @moduledoc """
  Token bucket rate limiter for channel events.
  """

  use GenServer

  @default_rate 10        # Messages per second
  @default_burst 20       # Maximum burst size
  @cleanup_interval 60_000 # Clean up old entries every minute

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def check(key, cost \\ 1) do
    GenServer.call(__MODULE__, {:check, key, cost})
  end

  @impl true
  def init(_opts) do
    schedule_cleanup()
    {:ok, %{buckets: %{}}}
  end

  @impl true
  def handle_call({:check, key, cost}, _from, state) do
    now = System.monotonic_time(:millisecond)
    bucket = Map.get(state.buckets, key, new_bucket(now))

    # Refill tokens based on elapsed time
    bucket = refill_bucket(bucket, now)

    if bucket.tokens >= cost do
      # Allow request, consume tokens
      new_bucket = %{bucket | tokens: bucket.tokens - cost, last_update: now}
      new_state = put_in(state.buckets[key], new_bucket)
      {:reply, :ok, new_state}
    else
      # Rate limited
      {:reply, {:error, :rate_limited}, state}
    end
  end

  @impl true
  def handle_info(:cleanup, state) do
    now = System.monotonic_time(:millisecond)
    cutoff = now - 60_000

    # Remove buckets that have not been used in the last minute
    buckets =
      state.buckets
      |> Enum.reject(fn {_key, bucket} -> bucket.last_update < cutoff end)
      |> Map.new()

    schedule_cleanup()
    {:noreply, %{state | buckets: buckets}}
  end

  defp new_bucket(now) do
    %{tokens: @default_burst, last_update: now}
  end

  defp refill_bucket(bucket, now) do
    elapsed = now - bucket.last_update
    refill = elapsed * @default_rate / 1000
    new_tokens = min(bucket.tokens + refill, @default_burst)
    %{bucket | tokens: new_tokens, last_update: now}
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end
end

# Usage in a channel
defmodule MyAppWeb.RateLimitedChannel do
  use MyAppWeb, :channel
  alias MyAppWeb.RateLimiter

  @impl true
  def handle_in(event, payload, socket) do
    key = "#{socket.assigns.user_id}:#{socket.topic}"

    case RateLimiter.check(key) do
      :ok ->
        process_event(event, payload, socket)

      {:error, :rate_limited} ->
        {:reply, {:error, %{reason: "rate_limited", retry_after: 1}}, socket}
    end
  end

  defp process_event("message", %{"body" => body}, socket) do
    # Process the message
    {:reply, :ok, socket}
  end
end
```

## Error Handling and Monitoring

### Channel Error Handling

```elixir
defmodule MyAppWeb.RobustChannel do
  use MyAppWeb, :channel
  require Logger

  @impl true
  def join(topic, params, socket) do
    try do
      do_join(topic, params, socket)
    rescue
      e ->
        Logger.error("Channel join error: #{inspect(e)}")
        {:error, %{reason: "internal_error"}}
    end
  end

  @impl true
  def handle_in(event, payload, socket) do
    try do
      do_handle_in(event, payload, socket)
    rescue
      e ->
        Logger.error("""
        Channel error in #{socket.topic}:
        Event: #{event}
        Error: #{inspect(e)}
        Stacktrace: #{inspect(__STACKTRACE__)}
        """)

        {:reply, {:error, %{reason: "internal_error"}}, socket}
    end
  end

  defp do_join("robust:" <> id, _params, socket) do
    {:ok, assign(socket, :resource_id, id)}
  end

  defp do_handle_in("action", payload, socket) do
    # Process action
    {:reply, :ok, socket}
  end
end
```

### Telemetry Integration

Phoenix Channels emit telemetry events that you can use for monitoring.

```elixir
# lib/my_app/telemetry.ex
defmodule MyApp.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      # Channel metrics
      counter("phoenix.channel_joined.total",
        tags: [:channel],
        event_name: [:phoenix, :channel_joined]
      ),
      counter("phoenix.channel_handled_in.total",
        tags: [:channel, :event],
        event_name: [:phoenix, :channel_handled_in]
      ),
      distribution("phoenix.channel_handled_in.duration",
        tags: [:channel, :event],
        event_name: [:phoenix, :channel_handled_in],
        measurement: :duration,
        unit: {:native, :millisecond}
      ),

      # Socket metrics
      summary("phoenix.socket_connected.duration",
        unit: {:native, :millisecond}
      ),

      # Presence metrics
      last_value("my_app.presence.users_online",
        description: "Number of users currently online"
      )
    ]
  end

  defp periodic_measurements do
    [
      {__MODULE__, :measure_presence, []}
    ]
  end

  def measure_presence do
    # Count online users across all presence topics
    count = MyAppWeb.Presence.list("presence:lobby") |> map_size()
    :telemetry.execute([:my_app, :presence], %{users_online: count}, %{})
  end
end

# Attach handlers for logging
:telemetry.attach_many(
  "channel-logger",
  [
    [:phoenix, :channel_joined],
    [:phoenix, :channel_handled_in]
  ],
  &MyApp.TelemetryLogger.handle_event/4,
  nil
)

defmodule MyApp.TelemetryLogger do
  require Logger

  def handle_event([:phoenix, :channel_joined], measurements, metadata, _config) do
    Logger.info("Channel joined: #{metadata.channel} in #{measurements.duration}ms")
  end

  def handle_event([:phoenix, :channel_handled_in], measurements, metadata, _config) do
    if measurements.duration > 100_000_000 do  # > 100ms in native time
      Logger.warning("Slow channel event: #{metadata.event} took #{measurements.duration / 1_000_000}ms")
    end
  end
end
```

## Testing Phoenix Channels

### Unit Testing Channels

```elixir
# test/my_app_web/channels/room_channel_test.exs
defmodule MyAppWeb.RoomChannelTest do
  use MyAppWeb.ChannelCase

  alias MyAppWeb.RoomChannel
  alias MyAppWeb.UserSocket

  setup do
    # Create test user
    user = insert(:user)

    # Create test room
    room = insert(:room)
    insert(:room_member, user: user, room: room)

    # Connect socket with user
    {:ok, socket} = connect(UserSocket, %{"token" => generate_token(user)})

    %{socket: socket, user: user, room: room}
  end

  describe "join/3" do
    test "joins room successfully when authorized", %{socket: socket, room: room} do
      {:ok, reply, _socket} = subscribe_and_join(socket, RoomChannel, "room:#{room.id}")

      assert reply == %{room_id: room.id}
    end

    test "fails to join unauthorized room", %{socket: socket} do
      other_room = insert(:room)

      assert {:error, %{reason: "not_authorized"}} =
               subscribe_and_join(socket, RoomChannel, "room:#{other_room.id}")
    end
  end

  describe "handle_in/3 new_message" do
    test "broadcasts message to room", %{socket: socket, room: room} do
      {:ok, _, socket} = subscribe_and_join(socket, RoomChannel, "room:#{room.id}")

      ref = push(socket, "new_message", %{"body" => "Hello, world!"})

      # Assert reply
      assert_reply ref, :ok, %{message_id: _}

      # Assert broadcast
      assert_broadcast "new_message", %{body: "Hello, world!"}
    end

    test "rejects empty message", %{socket: socket, room: room} do
      {:ok, _, socket} = subscribe_and_join(socket, RoomChannel, "room:#{room.id}")

      ref = push(socket, "new_message", %{"body" => ""})

      assert_reply ref, :error, %{reason: "message_empty"}
      refute_broadcast "new_message", _
    end
  end

  describe "handle_in/3 typing" do
    test "broadcasts typing indicator to others", %{socket: socket, room: room, user: user} do
      {:ok, _, socket} = subscribe_and_join(socket, RoomChannel, "room:#{room.id}")

      push(socket, "typing", %{"typing" => true})

      # broadcast_from does not send to self
      refute_push "user_typing", _

      # But other subscribers would receive it
      assert_broadcast "user_typing", %{user_id: ^user_id, typing: true}
        when user_id = user.id
    end
  end

  defp generate_token(user) do
    Phoenix.Token.sign(MyAppWeb.Endpoint, "user auth", user.id)
  end
end
```

### Integration Testing with Multiple Clients

```elixir
# test/my_app_web/channels/integration_test.exs
defmodule MyAppWeb.ChannelIntegrationTest do
  use MyAppWeb.ChannelCase

  alias MyAppWeb.{UserSocket, RoomChannel}

  setup do
    user1 = insert(:user)
    user2 = insert(:user)
    room = insert(:room)

    insert(:room_member, user: user1, room: room)
    insert(:room_member, user: user2, room: room)

    {:ok, socket1} = connect(UserSocket, %{"token" => token(user1)})
    {:ok, socket2} = connect(UserSocket, %{"token" => token(user2)})

    %{socket1: socket1, socket2: socket2, user1: user1, user2: user2, room: room}
  end

  test "message from one user reaches another", ctx do
    # Both users join the room
    {:ok, _, socket1} = subscribe_and_join(ctx.socket1, RoomChannel, "room:#{ctx.room.id}")
    {:ok, _, socket2} = subscribe_and_join(ctx.socket2, RoomChannel, "room:#{ctx.room.id}")

    # User 1 sends a message
    push(socket1, "new_message", %{"body" => "Hello from user 1!"})

    # User 2 receives the broadcast
    assert_push "new_message", %{body: "Hello from user 1!", user_id: user1_id}
    assert user1_id == ctx.user1.id
  end

  test "typing indicator shows to other users", ctx do
    {:ok, _, socket1} = subscribe_and_join(ctx.socket1, RoomChannel, "room:#{ctx.room.id}")
    {:ok, _, socket2} = subscribe_and_join(ctx.socket2, RoomChannel, "room:#{ctx.room.id}")

    push(socket1, "typing", %{"typing" => true})

    # Only socket2 receives the typing indicator (broadcast_from)
    assert_push "user_typing", %{typing: true}, socket2
  end

  defp token(user) do
    Phoenix.Token.sign(MyAppWeb.Endpoint, "user auth", user.id)
  end
end
```

## Summary

| Feature | Implementation |
|---------|----------------|
| **Socket setup** | UserSocket module with connect/2 callback |
| **Channel routing** | Topic patterns mapped to channel modules |
| **Authentication** | Token verification in socket connect |
| **Authorization** | Access checks in channel join/3 |
| **Broadcasting** | broadcast!/3 and broadcast_from!/3 |
| **Presence** | Phoenix.Presence with CRDT sync |
| **External broadcasts** | Endpoint.broadcast/3 |
| **Scaling** | PG2 or Redis PubSub adapter |
| **Rate limiting** | Token bucket per user/topic |
| **Monitoring** | Telemetry events and metrics |

Phoenix Channels provide a robust, battle-tested foundation for building real-time features. The combination of Elixir's concurrency model, Phoenix PubSub's distribution capabilities, and the elegant channel abstraction makes it possible to build real-time applications that scale effortlessly across multiple nodes while maintaining clean, testable code.

## Monitor Your Real-Time Applications with OneUptime

Building real-time features with Phoenix Channels is just the first step. Keeping them running reliably in production requires comprehensive monitoring and observability.

[OneUptime](https://oneuptime.com) provides everything you need to monitor your Phoenix applications:

- **Real-time monitoring**: Track WebSocket connections, channel join rates, and message throughput with live dashboards
- **Distributed tracing**: Follow requests across your Phoenix cluster with OpenTelemetry integration
- **Custom metrics**: Monitor channel-specific metrics like active rooms, presence counts, and broadcast latency
- **Intelligent alerting**: Get notified when connection rates drop, error rates spike, or latency exceeds thresholds
- **Status pages**: Keep your users informed about the health of your real-time services

OneUptime is open source and can be self-hosted, giving you full control over your monitoring infrastructure. Start monitoring your Phoenix Channels deployment today and ensure your real-time features deliver the experience your users expect.

[Get started with OneUptime](https://oneuptime.com) - Open source monitoring for modern applications.
