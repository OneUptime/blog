# How to Use Supervisors in Elixir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elixir, Supervisors, OTP, Fault Tolerance, Concurrency

Description: Learn how to use Supervisors in Elixir for building fault-tolerant applications. This guide covers supervision trees, strategies, and recovery patterns.

---

One of the things that makes Elixir stand out from other languages is its approach to failure. Instead of trying to prevent crashes at all costs, Elixir embraces the philosophy of "let it crash" - and then recover gracefully. At the heart of this philosophy are Supervisors.

If you have ever wondered how telecom systems achieve 99.9999999% uptime (nine nines), the answer lies in the supervision patterns that Elixir inherited from Erlang. This guide will walk you through everything you need to know about Supervisors in Elixir, from basic concepts to advanced patterns.

---

## Table of Contents

1. What is a Supervisor?
2. The "Let It Crash" Philosophy
3. Your First Supervisor
4. Supervision Strategies
5. Child Specifications
6. Restart Strategies and Options
7. DynamicSupervisor for Runtime Children
8. Building Supervision Trees
9. Application Supervision
10. Task.Supervisor for One-Off Work
11. Registry and Named Processes
12. Testing Supervised Processes
13. Common Patterns and Best Practices
14. Debugging Supervision Trees
15. Real-World Example: A Worker Pool

---

## 1. What is a Supervisor?

A Supervisor is a process whose sole job is to monitor other processes (called children) and restart them when they fail. Think of it as a watchdog that ensures your system stays healthy.

| Concept | Description |
|---------|-------------|
| Supervisor | A process that monitors and restarts child processes |
| Child | A process managed by a Supervisor |
| Supervision Tree | A hierarchy of Supervisors and their children |
| Restart Strategy | The rules for how children should be restarted |
| Child Spec | A specification describing how to start and manage a child |

The key insight is that Supervisors turn crashes from catastrophic failures into routine events. When a child crashes, the Supervisor catches it, logs what happened, and starts a fresh process to take its place.

```
Application
    |
    +-- Supervisor
            |
            +-- Worker 1 (GenServer)
            |
            +-- Worker 2 (GenServer)
            |
            +-- Sub-Supervisor
                    |
                    +-- Worker 3 (GenServer)
                    +-- Worker 4 (GenServer)
```

---

## 2. The "Let It Crash" Philosophy

Before diving into code, it helps to understand why Elixir takes this approach. In most languages, you write defensive code everywhere:

```python
# Python - defensive programming everywhere
def process_order(order_id):
    try:
        order = fetch_order(order_id)
        if order is None:
            return {"error": "Order not found"}

        try:
            result = validate_order(order)
            if not result.valid:
                return {"error": result.message}

            try:
                process_payment(order)
            except PaymentError as e:
                log_error(e)
                return {"error": "Payment failed"}

        except ValidationError as e:
            log_error(e)
            return {"error": "Validation failed"}

    except DatabaseError as e:
        log_error(e)
        return {"error": "Database error"}
```

In Elixir, you let unexpected errors crash the process and focus on the happy path:

```elixir
# Elixir - let it crash
defmodule OrderProcessor do
  use GenServer

  def handle_call({:process, order_id}, _from, state) do
    # If any of these fail, the process crashes
    # The Supervisor will restart it with clean state
    order = Orders.fetch!(order_id)
    :ok = Orders.validate!(order)
    :ok = Payments.process!(order)

    {:reply, :ok, state}
  end
end
```

The benefits:
- Cleaner, more focused code
- Automatic recovery from transient failures
- Isolation - one crash does not bring down the whole system
- Fresh state after restart can fix corrupted state issues

---

## 3. Your First Supervisor

Let us start with a simple example. First, we will create a GenServer that we want to supervise:

```elixir
# lib/my_app/counter.ex
defmodule MyApp.Counter do
  @moduledoc """
  A simple counter GenServer that we will supervise.
  This counter increments a value and can optionally crash
  to demonstrate supervisor recovery.
  """
  use GenServer

  # Client API
  # These functions are called from outside the process

  def start_link(opts) do
    # start_link is required for supervised processes
    # The name option lets us reference this process by atom
    name = Keyword.get(opts, :name, __MODULE__)
    initial = Keyword.get(opts, :initial, 0)
    GenServer.start_link(__MODULE__, initial, name: name)
  end

  def increment(name \\ __MODULE__) do
    # Synchronous call - blocks until reply received
    GenServer.call(name, :increment)
  end

  def get(name \\ __MODULE__) do
    GenServer.call(name, :get)
  end

  def crash(name \\ __MODULE__) do
    # This will cause the process to crash
    # demonstrating supervisor recovery
    GenServer.cast(name, :crash)
  end

  # Server Callbacks
  # These run inside the GenServer process

  @impl true
  def init(initial) do
    # init/1 is called when the process starts
    # Returns {:ok, state} to indicate successful startup
    IO.puts("[Counter] Starting with initial value: #{initial}")
    {:ok, initial}
  end

  @impl true
  def handle_call(:increment, _from, count) do
    # handle_call is for synchronous requests
    # Returns {:reply, response, new_state}
    new_count = count + 1
    {:reply, new_count, new_count}
  end

  @impl true
  def handle_call(:get, _from, count) do
    {:reply, count, count}
  end

  @impl true
  def handle_cast(:crash, _count) do
    # Intentionally cause a crash to demonstrate recovery
    raise "Intentional crash for demonstration"
  end
end
```

Now let us create a Supervisor for this counter:

```elixir
# lib/my_app/supervisor.ex
defmodule MyApp.Supervisor do
  @moduledoc """
  Main application supervisor.
  Supervises the Counter process and restarts it if it crashes.
  """
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # Define the children this supervisor will manage
    children = [
      # Each child is specified as a module or a child spec map
      # Simple form - just the module name
      MyApp.Counter
    ]

    # Supervisor.init/2 takes children and options
    # :one_for_one means if one child crashes, only restart that child
    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

Add the supervisor to your application:

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start our supervisor, which starts its children
      MyApp.Supervisor
    ]

    opts = [strategy: :one_for_one, name: MyApp.ApplicationSupervisor]
    Supervisor.start_link(children, opts)
  end
end
```

Now test it in IEx:

```elixir
iex> MyApp.Counter.get()
0
iex> MyApp.Counter.increment()
1
iex> MyApp.Counter.increment()
2
iex> MyApp.Counter.crash()
:ok
# You will see error output, then:
# [Counter] Starting with initial value: 0
iex> MyApp.Counter.get()
0  # Counter was restarted with fresh state
```

---

## 4. Supervision Strategies

Supervisors support four different restart strategies. The right choice depends on how your child processes relate to each other.

### :one_for_one

When a child crashes, only that child is restarted. Other children are unaffected.

```elixir
Supervisor.init(children, strategy: :one_for_one)
```

```
Before crash:              After Worker2 crashes:
+-- Supervisor             +-- Supervisor
    |-- Worker1 (running)      |-- Worker1 (running, unchanged)
    |-- Worker2 (running)      |-- Worker2 (restarted)
    |-- Worker3 (running)      |-- Worker3 (running, unchanged)
```

Use when: Children are independent and do not share state.

### :one_for_all

When any child crashes, all children are terminated and restarted.

```elixir
Supervisor.init(children, strategy: :one_for_all)
```

```
Before crash:              After Worker2 crashes:
+-- Supervisor             +-- Supervisor
    |-- Worker1 (running)      |-- Worker1 (restarted)
    |-- Worker2 (running)      |-- Worker2 (restarted)
    |-- Worker3 (running)      |-- Worker3 (restarted)
```

Use when: Children are tightly coupled and depend on each other's state.

### :rest_for_one

When a child crashes, that child and all children started after it are restarted.

```elixir
Supervisor.init(children, strategy: :rest_for_one)
```

```
Before crash:              After Worker2 crashes:
+-- Supervisor             +-- Supervisor
    |-- Worker1 (running)      |-- Worker1 (running, unchanged)
    |-- Worker2 (running)      |-- Worker2 (restarted)
    |-- Worker3 (running)      |-- Worker3 (restarted)
```

Use when: Later children depend on earlier ones (e.g., database connection then cache).

### Choosing the Right Strategy

| Strategy | When to Use | Example |
|----------|-------------|---------|
| :one_for_one | Independent workers | Web request handlers |
| :one_for_all | Tightly coupled processes | Producer-consumer pair |
| :rest_for_one | Sequential dependencies | DB connection, then query cache |

---

## 5. Child Specifications

A child specification tells the Supervisor how to start, stop, and restart a child. You can define it in several ways.

### Using the Module Name (Simplest)

If your module implements `child_spec/1`, just use the module name:

```elixir
children = [
  MyApp.Counter
]
```

The module defines its own child_spec:

```elixir
defmodule MyApp.Counter do
  use GenServer

  # use GenServer automatically defines child_spec/1
  # but you can override it
  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]},
      restart: :permanent,
      shutdown: 5000,
      type: :worker
    }
  end

  # ... rest of module
end
```

### Using a Tuple (With Options)

Pass options to the child:

```elixir
children = [
  # Passes [initial: 100] to Counter.start_link/1
  {MyApp.Counter, initial: 100}
]
```

### Using a Map (Full Control)

Define the full child specification:

```elixir
children = [
  %{
    # Unique identifier for this child
    id: MyApp.Counter,

    # How to start the child - {Module, function, args}
    start: {MyApp.Counter, :start_link, [[initial: 100]]},

    # Restart strategy for this child
    # :permanent - always restart
    # :temporary - never restart
    # :transient - restart only if abnormal exit
    restart: :permanent,

    # Shutdown strategy
    # :brutal_kill - immediately kill
    # :infinity - wait forever
    # integer - timeout in milliseconds
    shutdown: 5000,

    # Type of child
    # :worker - a worker process
    # :supervisor - a supervisor process
    type: :worker
  }
]
```

### Multiple Children with Same Module

Use different IDs for multiple instances:

```elixir
children = [
  %{
    id: :counter_1,
    start: {MyApp.Counter, :start_link, [[name: :counter_1, initial: 0]]}
  },
  %{
    id: :counter_2,
    start: {MyApp.Counter, :start_link, [[name: :counter_2, initial: 100]]}
  }
]
```

Or use `Supervisor.child_spec/2`:

```elixir
children = [
  Supervisor.child_spec({MyApp.Counter, name: :counter_1}, id: :counter_1),
  Supervisor.child_spec({MyApp.Counter, name: :counter_2}, id: :counter_2)
]
```

---

## 6. Restart Strategies and Options

### Restart Values

| Value | Behavior | Use Case |
|-------|----------|----------|
| :permanent | Always restart | Long-running services |
| :temporary | Never restart | One-off tasks |
| :transient | Restart only on abnormal exit | Tasks that complete normally |

```elixir
# A worker that should always be running
%{
  id: MyApp.DatabaseConnection,
  start: {MyApp.DatabaseConnection, :start_link, []},
  restart: :permanent  # Restart on any exit
}

# A task that runs once and exits
%{
  id: MyApp.InitializationTask,
  start: {MyApp.InitializationTask, :start_link, []},
  restart: :temporary  # Never restart
}

# A worker that completes its job and exits normally
%{
  id: MyApp.EmailSender,
  start: {MyApp.EmailSender, :start_link, []},
  restart: :transient  # Only restart on crash, not normal exit
}
```

### Max Restarts

Supervisors track restart frequency. If a child restarts too many times too quickly, the supervisor itself crashes (escalating the problem up the tree).

```elixir
@impl true
def init(_opts) do
  children = [MyApp.Counter]

  Supervisor.init(children,
    strategy: :one_for_one,
    # Allow 3 restarts in 5 seconds
    # If exceeded, supervisor crashes
    max_restarts: 3,
    max_seconds: 5
  )
end
```

Why this matters:
- Prevents infinite restart loops
- Escalates persistent problems to parent supervisors
- Forces you to fix the root cause rather than hiding it

### Shutdown Options

Control how children are stopped:

```elixir
%{
  id: MyApp.QuickWorker,
  start: {MyApp.QuickWorker, :start_link, []},
  # Kill immediately - for workers that do not need cleanup
  shutdown: :brutal_kill
}

%{
  id: MyApp.DatabaseConnection,
  start: {MyApp.DatabaseConnection, :start_link, []},
  # Wait up to 10 seconds for graceful shutdown
  shutdown: 10_000
}

%{
  id: MyApp.SubSupervisor,
  start: {MyApp.SubSupervisor, :start_link, []},
  type: :supervisor,
  # Wait forever for child supervisor and its children
  shutdown: :infinity
}
```

---

## 7. DynamicSupervisor for Runtime Children

Regular Supervisors have a fixed list of children defined at compile time. DynamicSupervisor lets you add and remove children at runtime.

### Basic DynamicSupervisor

```elixir
# lib/my_app/session_supervisor.ex
defmodule MyApp.SessionSupervisor do
  @moduledoc """
  Supervises user session processes.
  Sessions are created dynamically when users log in.
  """
  use DynamicSupervisor

  def start_link(opts) do
    DynamicSupervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # DynamicSupervisor only supports :one_for_one strategy
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  # Public API to start a new session

  def start_session(user_id) do
    # Define child spec for the session
    child_spec = %{
      id: MyApp.Session,
      start: {MyApp.Session, :start_link, [user_id]},
      restart: :temporary  # Do not restart if user logs out
    }

    # Start the child under this supervisor
    DynamicSupervisor.start_child(__MODULE__, child_spec)
  end

  def stop_session(pid) do
    DynamicSupervisor.terminate_child(__MODULE__, pid)
  end

  def list_sessions do
    DynamicSupervisor.which_children(__MODULE__)
  end
end
```

The Session module:

```elixir
# lib/my_app/session.ex
defmodule MyApp.Session do
  @moduledoc """
  Represents a user session.
  Started dynamically when user logs in.
  """
  use GenServer

  def start_link(user_id) do
    GenServer.start_link(__MODULE__, user_id)
  end

  @impl true
  def init(user_id) do
    IO.puts("[Session] Starting session for user: #{user_id}")

    # Schedule session timeout check
    Process.send_after(self(), :check_timeout, 60_000)

    {:ok, %{user_id: user_id, last_activity: System.monotonic_time()}}
  end

  @impl true
  def handle_info(:check_timeout, state) do
    # Check if session has been inactive
    elapsed = System.monotonic_time() - state.last_activity
    elapsed_minutes = System.convert_time_unit(elapsed, :native, :minute)

    if elapsed_minutes > 30 do
      {:stop, :normal, state}  # Session expired, stop normally
    else
      Process.send_after(self(), :check_timeout, 60_000)
      {:noreply, state}
    end
  end

  # Activity tracking

  def touch(pid) do
    GenServer.cast(pid, :touch)
  end

  @impl true
  def handle_cast(:touch, state) do
    {:noreply, %{state | last_activity: System.monotonic_time()}}
  end
end
```

### DynamicSupervisor with Registry

For named dynamic children, combine DynamicSupervisor with Registry:

```elixir
# lib/my_app/game_supervisor.ex
defmodule MyApp.GameSupervisor do
  @moduledoc """
  Supervises game room processes.
  Each game has a unique ID and can be looked up by name.
  """
  use DynamicSupervisor

  def start_link(opts) do
    DynamicSupervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_game(game_id) do
    child_spec = %{
      id: MyApp.GameRoom,
      start: {MyApp.GameRoom, :start_link, [game_id]},
      restart: :transient
    }

    DynamicSupervisor.start_child(__MODULE__, child_spec)
  end

  def find_game(game_id) do
    # Use Registry to find the game by ID
    case Registry.lookup(MyApp.GameRegistry, game_id) do
      [{pid, _}] -> {:ok, pid}
      [] -> {:error, :not_found}
    end
  end

  def stop_game(game_id) do
    case find_game(game_id) do
      {:ok, pid} -> DynamicSupervisor.terminate_child(__MODULE__, pid)
      error -> error
    end
  end
end

# lib/my_app/game_room.ex
defmodule MyApp.GameRoom do
  use GenServer

  def start_link(game_id) do
    # Register with the Registry using the game_id as key
    GenServer.start_link(__MODULE__, game_id, name: via_tuple(game_id))
  end

  defp via_tuple(game_id) do
    {:via, Registry, {MyApp.GameRegistry, game_id}}
  end

  @impl true
  def init(game_id) do
    IO.puts("[GameRoom] Starting game: #{game_id}")
    {:ok, %{game_id: game_id, players: [], state: :waiting}}
  end

  # Public API using game_id

  def join(game_id, player_id) do
    GenServer.call(via_tuple(game_id), {:join, player_id})
  end

  def state(game_id) do
    GenServer.call(via_tuple(game_id), :state)
  end

  # Callbacks

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    players = [player_id | state.players]
    {:reply, :ok, %{state | players: players}}
  end

  @impl true
  def handle_call(:state, _from, state) do
    {:reply, state, state}
  end
end
```

Add the Registry to your supervision tree:

```elixir
# In your application.ex or main supervisor
children = [
  # Registry must start before GameSupervisor
  {Registry, keys: :unique, name: MyApp.GameRegistry},
  MyApp.GameSupervisor
]
```

---

## 8. Building Supervision Trees

Real applications have multiple layers of supervisors forming a tree structure. Here is a complete example:

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  @moduledoc """
  Main application module.
  Defines the top-level supervision tree.
  """
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Database connection pool - must start first
      MyApp.Repo,

      # PubSub system for real-time features
      {Phoenix.PubSub, name: MyApp.PubSub},

      # Registry for named processes
      {Registry, keys: :unique, name: MyApp.Registry},

      # Core services supervisor
      MyApp.CoreSupervisor,

      # Dynamic worker supervisor
      MyApp.WorkerSupervisor,

      # Web endpoint - starts last, after all services
      MyAppWeb.Endpoint
    ]

    # Using rest_for_one because later children depend on earlier ones
    opts = [strategy: :rest_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

Core services supervisor:

```elixir
# lib/my_app/core_supervisor.ex
defmodule MyApp.CoreSupervisor do
  @moduledoc """
  Supervises core business logic services.
  These services are started once and should always be running.
  """
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    children = [
      # Cache service
      {MyApp.Cache, []},

      # Background job processor
      {MyApp.JobProcessor, []},

      # Metrics collector
      {MyApp.Metrics, []},

      # Notification service depends on others
      {MyApp.Notifier, []}
    ]

    # one_for_one - these services are independent
    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

Worker supervisor for dynamic tasks:

```elixir
# lib/my_app/worker_supervisor.ex
defmodule MyApp.WorkerSupervisor do
  @moduledoc """
  Supervises worker processes that are created dynamically.
  Workers process individual jobs and exit when done.
  """
  use DynamicSupervisor

  def start_link(opts) do
    DynamicSupervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    DynamicSupervisor.init(
      strategy: :one_for_one,
      max_restarts: 100,
      max_seconds: 60
    )
  end

  def start_worker(job) do
    child_spec = %{
      id: MyApp.Worker,
      start: {MyApp.Worker, :start_link, [job]},
      restart: :temporary  # Workers complete and exit
    }

    DynamicSupervisor.start_child(__MODULE__, child_spec)
  end

  def active_workers do
    DynamicSupervisor.count_children(__MODULE__)
  end
end
```

Visualizing the tree:

```
MyApp.Supervisor (rest_for_one)
    |
    +-- MyApp.Repo (worker)
    |
    +-- Phoenix.PubSub (supervisor)
    |
    +-- Registry (worker)
    |
    +-- MyApp.CoreSupervisor (one_for_one)
    |       |
    |       +-- MyApp.Cache (worker)
    |       +-- MyApp.JobProcessor (worker)
    |       +-- MyApp.Metrics (worker)
    |       +-- MyApp.Notifier (worker)
    |
    +-- MyApp.WorkerSupervisor (dynamic)
    |       |
    |       +-- Worker (dynamic, temporary)
    |       +-- Worker (dynamic, temporary)
    |       +-- ...
    |
    +-- MyAppWeb.Endpoint (supervisor)
```

---

## 9. Application Supervision

Every Mix application can define a supervision tree that starts automatically.

In `mix.exs`:

```elixir
def application do
  [
    mod: {MyApp.Application, []},
    extra_applications: [:logger, :runtime_tools]
  ]
end
```

You can also configure child applications:

```elixir
# config/config.exs
config :my_app,
  workers: 5,
  cache_ttl: 300

# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    # Read config at startup
    worker_count = Application.get_env(:my_app, :workers, 3)

    children = [
      {MyApp.WorkerPool, worker_count: worker_count}
    ]

    Supervisor.start_link(children, strategy: :one_for_one)
  end
end
```

---

## 10. Task.Supervisor for One-Off Work

For fire-and-forget tasks or parallel work, use Task.Supervisor:

```elixir
# Add to supervision tree
children = [
  {Task.Supervisor, name: MyApp.TaskSupervisor}
]
```

Using Task.Supervisor:

```elixir
defmodule MyApp.NotificationService do
  @moduledoc """
  Sends notifications using supervised tasks.
  """

  # Fire and forget - we do not wait for result
  def notify_async(user_id, message) do
    Task.Supervisor.start_child(MyApp.TaskSupervisor, fn ->
      send_notification(user_id, message)
    end)
  end

  # Await result - blocks until task completes
  def notify_sync(user_id, message) do
    task = Task.Supervisor.async(MyApp.TaskSupervisor, fn ->
      send_notification(user_id, message)
    end)

    Task.await(task, 5000)  # 5 second timeout
  end

  # Parallel notifications
  def notify_many(user_ids, message) do
    user_ids
    |> Enum.map(fn user_id ->
      Task.Supervisor.async(MyApp.TaskSupervisor, fn ->
        send_notification(user_id, message)
      end)
    end)
    |> Task.await_many(10_000)  # Wait up to 10 seconds for all
  end

  # Parallel with error handling
  def notify_many_safe(user_ids, message) do
    user_ids
    |> Enum.map(fn user_id ->
      Task.Supervisor.async_nolink(MyApp.TaskSupervisor, fn ->
        send_notification(user_id, message)
      end)
    end)
    |> Enum.map(fn task ->
      case Task.yield(task, 5000) || Task.shutdown(task) do
        {:ok, result} -> {:ok, result}
        {:exit, reason} -> {:error, reason}
        nil -> {:error, :timeout}
      end
    end)
  end

  defp send_notification(user_id, message) do
    # Actual notification logic
    IO.puts("[Notification] Sending to #{user_id}: #{message}")
    Process.sleep(100)  # Simulate work
    :ok
  end
end
```

Task.Supervisor options:

```elixir
{Task.Supervisor,
  name: MyApp.TaskSupervisor,
  max_restarts: 10,
  max_seconds: 60,
  # Tasks should not restart by default
  restart: :temporary
}
```

---

## 11. Registry and Named Processes

Registry provides local process registration for dynamic processes:

```elixir
# Start Registry in supervision tree
{Registry, keys: :unique, name: MyApp.Registry}

# Or with duplicate keys (pub/sub pattern)
{Registry, keys: :duplicate, name: MyApp.PubSubRegistry}
```

Using Registry with GenServers:

```elixir
defmodule MyApp.Room do
  use GenServer

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via(room_id))
  end

  def via(room_id) do
    {:via, Registry, {MyApp.Registry, {:room, room_id}}}
  end

  def join(room_id, user) do
    GenServer.call(via(room_id), {:join, user})
  end

  def exists?(room_id) do
    case Registry.lookup(MyApp.Registry, {:room, room_id}) do
      [] -> false
      [_] -> true
    end
  end

  @impl true
  def init(room_id) do
    {:ok, %{room_id: room_id, users: []}}
  end

  @impl true
  def handle_call({:join, user}, _from, state) do
    {:reply, :ok, %{state | users: [user | state.users]}}
  end
end
```

PubSub pattern with Registry:

```elixir
defmodule MyApp.EventBus do
  @registry MyApp.EventRegistry

  def subscribe(topic) do
    # Register current process for this topic
    Registry.register(@registry, topic, [])
  end

  def broadcast(topic, message) do
    # Send to all subscribers
    Registry.dispatch(@registry, topic, fn entries ->
      for {pid, _} <- entries, do: send(pid, {:event, topic, message})
    end)
  end
end
```

---

## 12. Testing Supervised Processes

Testing supervised processes requires careful setup:

```elixir
# test/support/test_helpers.ex
defmodule MyApp.TestHelpers do
  @moduledoc """
  Helpers for testing supervised processes.
  """

  def start_supervised_counter(opts \\ []) do
    # start_supervised!/1 ensures cleanup after test
    start_supervised!({MyApp.Counter, opts})
  end
end

# test/my_app/counter_test.exs
defmodule MyApp.CounterTest do
  use ExUnit.Case, async: true

  import MyApp.TestHelpers

  describe "Counter" do
    test "starts with initial value" do
      # Start a supervised counter for this test
      # It will be automatically stopped after the test
      _pid = start_supervised!({MyApp.Counter, name: :test_counter, initial: 10})

      assert MyApp.Counter.get(:test_counter) == 10
    end

    test "increments value" do
      _pid = start_supervised!({MyApp.Counter, name: :test_counter})

      assert MyApp.Counter.increment(:test_counter) == 1
      assert MyApp.Counter.increment(:test_counter) == 2
    end

    test "restarts on crash" do
      pid = start_supervised!({MyApp.Counter, name: :test_counter})

      # Increment a few times
      MyApp.Counter.increment(:test_counter)
      MyApp.Counter.increment(:test_counter)
      assert MyApp.Counter.get(:test_counter) == 2

      # Crash the process
      MyApp.Counter.crash(:test_counter)

      # Wait for restart
      Process.sleep(100)

      # Should have new PID and reset state
      new_pid = GenServer.whereis(:test_counter)
      assert new_pid != pid
      assert MyApp.Counter.get(:test_counter) == 0
    end
  end
end

# test/my_app/supervisor_test.exs
defmodule MyApp.SupervisorTest do
  use ExUnit.Case

  describe "supervision tree" do
    test "children are started in order" do
      # Check that children are running
      assert Process.whereis(MyApp.Counter) != nil
    end

    test "supervisor restarts crashed children" do
      # Get original PID
      original_pid = Process.whereis(MyApp.Counter)

      # Kill the process
      Process.exit(original_pid, :kill)

      # Wait for restart
      Process.sleep(100)

      # Should have new PID
      new_pid = Process.whereis(MyApp.Counter)
      assert new_pid != original_pid
      assert Process.alive?(new_pid)
    end
  end
end
```

Testing DynamicSupervisor:

```elixir
defmodule MyApp.SessionSupervisorTest do
  use ExUnit.Case, async: true

  setup do
    # Start a fresh DynamicSupervisor for each test
    supervisor = start_supervised!(MyApp.SessionSupervisor)
    %{supervisor: supervisor}
  end

  test "can start sessions dynamically" do
    {:ok, pid1} = MyApp.SessionSupervisor.start_session("user_1")
    {:ok, pid2} = MyApp.SessionSupervisor.start_session("user_2")

    assert Process.alive?(pid1)
    assert Process.alive?(pid2)

    sessions = MyApp.SessionSupervisor.list_sessions()
    assert length(sessions) == 2
  end

  test "can stop sessions" do
    {:ok, pid} = MyApp.SessionSupervisor.start_session("user_1")
    assert Process.alive?(pid)

    :ok = MyApp.SessionSupervisor.stop_session(pid)
    refute Process.alive?(pid)
  end
end
```

---

## 13. Common Patterns and Best Practices

### Pattern: Initialization with Retries

Sometimes a process needs to connect to external services on startup:

```elixir
defmodule MyApp.DatabaseConnection do
  use GenServer
  require Logger

  @retry_interval 5_000
  @max_retries 10

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(opts) do
    # Do not block init - connect asynchronously
    send(self(), {:connect, 0})
    {:ok, %{opts: opts, conn: nil}}
  end

  @impl true
  def handle_info({:connect, attempts}, state) when attempts < @max_retries do
    case do_connect(state.opts) do
      {:ok, conn} ->
        Logger.info("[DB] Connected successfully")
        {:noreply, %{state | conn: conn}}

      {:error, reason} ->
        Logger.warning("[DB] Connection failed (attempt #{attempts + 1}): #{reason}")
        Process.send_after(self(), {:connect, attempts + 1}, @retry_interval)
        {:noreply, state}
    end
  end

  @impl true
  def handle_info({:connect, attempts}, state) do
    Logger.error("[DB] Max retries exceeded (#{attempts})")
    # Let supervisor handle restart
    {:stop, :max_retries_exceeded, state}
  end

  defp do_connect(opts) do
    # Actual connection logic
    {:ok, :mock_connection}
  end
end
```

### Pattern: Circuit Breaker

Prevent cascading failures by stopping requests to failing services:

```elixir
defmodule MyApp.CircuitBreaker do
  use GenServer

  # Circuit states: :closed (normal), :open (failing), :half_open (testing)
  @failure_threshold 5
  @reset_timeout 30_000

  def start_link(opts) do
    name = Keyword.fetch!(opts, :name)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def call(name, func) do
    GenServer.call(name, {:call, func})
  end

  @impl true
  def init(opts) do
    {:ok, %{
      state: :closed,
      failure_count: 0,
      last_failure: nil,
      name: opts[:name]
    }}
  end

  @impl true
  def handle_call({:call, func}, _from, %{state: :open} = state) do
    # Check if we should try half-open
    if should_retry?(state) do
      execute_with_circuit(%{state | state: :half_open}, func)
    else
      {:reply, {:error, :circuit_open}, state}
    end
  end

  @impl true
  def handle_call({:call, func}, _from, state) do
    execute_with_circuit(state, func)
  end

  defp execute_with_circuit(state, func) do
    try do
      result = func.()
      # Success - reset circuit
      new_state = %{state | state: :closed, failure_count: 0}
      {:reply, {:ok, result}, new_state}
    rescue
      error ->
        new_count = state.failure_count + 1
        new_state = %{state |
          failure_count: new_count,
          last_failure: System.monotonic_time(:millisecond)
        }

        if new_count >= @failure_threshold do
          {:reply, {:error, error}, %{new_state | state: :open}}
        else
          {:reply, {:error, error}, new_state}
        end
    end
  end

  defp should_retry?(state) do
    now = System.monotonic_time(:millisecond)
    now - state.last_failure > @reset_timeout
  end
end
```

### Pattern: Graceful Shutdown

Handle termination properly to avoid data loss:

```elixir
defmodule MyApp.DataProcessor do
  use GenServer
  require Logger

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(opts) do
    # Trap exits to get terminate callback
    Process.flag(:trap_exit, true)
    {:ok, %{buffer: [], opts: opts}}
  end

  @impl true
  def handle_cast({:process, data}, state) do
    {:noreply, %{state | buffer: [data | state.buffer]}}
  end

  @impl true
  def terminate(reason, state) do
    Logger.info("[DataProcessor] Shutting down: #{inspect(reason)}")

    # Flush remaining data before shutdown
    if length(state.buffer) > 0 do
      Logger.info("[DataProcessor] Flushing #{length(state.buffer)} items")
      flush_buffer(state.buffer)
    end

    :ok
  end

  defp flush_buffer(buffer) do
    # Persist buffered data
    Enum.each(buffer, &persist_item/1)
  end

  defp persist_item(item) do
    # Actual persistence logic
    IO.puts("[DataProcessor] Persisted: #{inspect(item)}")
  end
end
```

### Best Practices Summary

| Practice | Description |
|----------|-------------|
| Keep supervisors simple | Supervisors should only supervise, not contain business logic |
| Use appropriate restart strategies | Match strategy to child dependencies |
| Set reasonable max_restarts | Prevent infinite restart loops |
| Use DynamicSupervisor for dynamic children | Do not abuse regular supervisors |
| Test supervision behavior | Verify restart and recovery |
| Trap exits for cleanup | Use terminate/2 for graceful shutdown |
| Avoid blocking init/1 | Use send(self(), :init) pattern |
| Name processes thoughtfully | Use Registry for dynamic naming |

---

## 14. Debugging Supervision Trees

### Observer

The built-in Observer GUI is invaluable:

```elixir
# In IEx
:observer.start()
```

Navigate to the Applications tab to visualize supervision trees.

### Programmatic Inspection

```elixir
# List all children of a supervisor
Supervisor.which_children(MyApp.Supervisor)
# Returns: [{id, pid, type, modules}, ...]

# Count children (useful for DynamicSupervisor)
Supervisor.count_children(MyApp.WorkerSupervisor)
# Returns: %{active: 5, specs: 5, supervisors: 0, workers: 5}

# Get child specification
Supervisor.get_all_specs(MyApp.Supervisor)

# Check if a child exists
case Supervisor.get_callback_module(MyApp.Supervisor) do
  {:ok, module} -> IO.puts("Callback module: #{module}")
  :error -> IO.puts("Not found")
end
```

### Tracing Process Restarts

```elixir
defmodule MyApp.RestartTracer do
  @moduledoc """
  Traces supervisor restart events for debugging.
  """
  require Logger

  def trace(supervisor) do
    :sys.trace(supervisor, true)
  end

  def untrace(supervisor) do
    :sys.trace(supervisor, false)
  end

  # Add to supervisor for detailed logging
  def log_restart(child_id, reason) do
    Logger.warning("""
    [Supervisor] Child restarted
      Child: #{inspect(child_id)}
      Reason: #{inspect(reason)}
      Time: #{DateTime.utc_now()}
    """)
  end
end
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Child keeps restarting | Bug in child init/1 | Fix init, check logs |
| Supervisor crashes | max_restarts exceeded | Increase limit or fix root cause |
| Deadlock on startup | Circular dependencies | Restructure supervision tree |
| Memory leak | Children not terminated | Use temporary restart for short-lived |
| Slow shutdown | Long shutdown timeouts | Reduce timeout or use brutal_kill |

---

## 15. Real-World Example: A Worker Pool

Let us put it all together with a complete worker pool implementation:

```elixir
# lib/my_app/pool/supervisor.ex
defmodule MyApp.Pool.Supervisor do
  @moduledoc """
  Supervises a pool of workers and a task dispatcher.

  Structure:
  - Pool.Supervisor (one_for_all)
    - Pool.WorkerSupervisor (one_for_one)
      - Pool.Worker (multiple instances)
    - Pool.Dispatcher
  """
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(opts) do
    pool_size = Keyword.get(opts, :pool_size, 5)

    children = [
      # Worker supervisor starts first
      {MyApp.Pool.WorkerSupervisor, pool_size: pool_size},

      # Dispatcher depends on workers being available
      {MyApp.Pool.Dispatcher, []}
    ]

    # one_for_all because dispatcher depends on workers
    Supervisor.init(children, strategy: :one_for_all)
  end
end

# lib/my_app/pool/worker_supervisor.ex
defmodule MyApp.Pool.WorkerSupervisor do
  @moduledoc """
  Supervises the pool of worker processes.
  """
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(opts) do
    pool_size = Keyword.get(opts, :pool_size, 5)

    # Create N worker children
    children = for i <- 1..pool_size do
      Supervisor.child_spec(
        {MyApp.Pool.Worker, worker_id: i},
        id: {MyApp.Pool.Worker, i}
      )
    end

    Supervisor.init(children, strategy: :one_for_one)
  end
end

# lib/my_app/pool/worker.ex
defmodule MyApp.Pool.Worker do
  @moduledoc """
  A worker process that executes tasks.
  Checks out from dispatcher, executes, and checks back in.
  """
  use GenServer
  require Logger

  def start_link(opts) do
    worker_id = Keyword.fetch!(opts, :worker_id)
    GenServer.start_link(__MODULE__, worker_id, name: via(worker_id))
  end

  def via(worker_id) do
    {:via, Registry, {MyApp.Pool.Registry, {:worker, worker_id}}}
  end

  # Called by dispatcher to assign work
  def execute(worker_id, task) do
    GenServer.call(via(worker_id), {:execute, task}, 30_000)
  end

  @impl true
  def init(worker_id) do
    Logger.info("[Worker #{worker_id}] Starting")

    # Register as available with dispatcher
    send(self(), :register)

    {:ok, %{worker_id: worker_id, current_task: nil}}
  end

  @impl true
  def handle_info(:register, state) do
    MyApp.Pool.Dispatcher.register_worker(state.worker_id)
    {:noreply, state}
  end

  @impl true
  def handle_call({:execute, task}, _from, state) do
    Logger.debug("[Worker #{state.worker_id}] Executing task")

    # Execute the task
    result = try do
      task.()
    rescue
      error -> {:error, error}
    end

    # Re-register as available
    MyApp.Pool.Dispatcher.register_worker(state.worker_id)

    {:reply, result, state}
  end

  @impl true
  def terminate(reason, state) do
    Logger.info("[Worker #{state.worker_id}] Terminating: #{inspect(reason)}")
    :ok
  end
end

# lib/my_app/pool/dispatcher.ex
defmodule MyApp.Pool.Dispatcher do
  @moduledoc """
  Dispatches tasks to available workers.
  Maintains a queue of available workers and pending tasks.
  """
  use GenServer
  require Logger

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  # Public API

  def submit(task) when is_function(task, 0) do
    GenServer.call(__MODULE__, {:submit, task}, 60_000)
  end

  def async_submit(task) when is_function(task, 0) do
    GenServer.cast(__MODULE__, {:async_submit, task, self()})
  end

  def register_worker(worker_id) do
    GenServer.cast(__MODULE__, {:register_worker, worker_id})
  end

  def status do
    GenServer.call(__MODULE__, :status)
  end

  # Server implementation

  @impl true
  def init(_opts) do
    {:ok, %{
      available_workers: :queue.new(),
      pending_tasks: :queue.new()
    }}
  end

  @impl true
  def handle_call({:submit, task}, from, state) do
    # Wrap task to send reply when done
    wrapped_task = fn ->
      result = task.()
      GenServer.reply(from, result)
      result
    end

    state = dispatch_or_queue(wrapped_task, nil, state)
    {:noreply, state}
  end

  @impl true
  def handle_call(:status, _from, state) do
    status = %{
      available_workers: :queue.len(state.available_workers),
      pending_tasks: :queue.len(state.pending_tasks)
    }
    {:reply, status, state}
  end

  @impl true
  def handle_cast({:async_submit, task, caller}, state) do
    # Wrap task to send result to caller
    wrapped_task = fn ->
      result = task.()
      send(caller, {:task_result, result})
      result
    end

    state = dispatch_or_queue(wrapped_task, caller, state)
    {:noreply, state}
  end

  @impl true
  def handle_cast({:register_worker, worker_id}, state) do
    Logger.debug("[Dispatcher] Worker #{worker_id} available")

    case :queue.out(state.pending_tasks) do
      {{:value, {task, _caller}}, pending} ->
        # Dispatch immediately to this worker
        dispatch_to_worker(worker_id, task)
        {:noreply, %{state | pending_tasks: pending}}

      {:empty, _} ->
        # No pending tasks - add to available queue
        available = :queue.in(worker_id, state.available_workers)
        {:noreply, %{state | available_workers: available}}
    end
  end

  defp dispatch_or_queue(task, caller, state) do
    case :queue.out(state.available_workers) do
      {{:value, worker_id}, available} ->
        dispatch_to_worker(worker_id, task)
        %{state | available_workers: available}

      {:empty, _} ->
        pending = :queue.in({task, caller}, state.pending_tasks)
        %{state | pending_tasks: pending}
    end
  end

  defp dispatch_to_worker(worker_id, task) do
    # Spawn to avoid blocking dispatcher
    spawn(fn ->
      MyApp.Pool.Worker.execute(worker_id, task)
    end)
  end
end

# lib/my_app/pool.ex
defmodule MyApp.Pool do
  @moduledoc """
  Public API for the worker pool.

  ## Example

      # Synchronous execution
      result = MyApp.Pool.run(fn -> expensive_work() end)

      # Async execution
      MyApp.Pool.async(fn -> background_work() end)
      receive do
        {:task_result, result} -> result
      after
        5000 -> :timeout
      end
  """

  def run(task) do
    MyApp.Pool.Dispatcher.submit(task)
  end

  def async(task) do
    MyApp.Pool.Dispatcher.async_submit(task)
  end

  def status do
    MyApp.Pool.Dispatcher.status()
  end
end
```

Add the pool to your application:

```elixir
# In application.ex
children = [
  # Registry for worker naming
  {Registry, keys: :unique, name: MyApp.Pool.Registry},

  # The pool supervisor
  {MyApp.Pool.Supervisor, pool_size: 10}
]
```

Usage:

```elixir
# Synchronous - blocks until result
result = MyApp.Pool.run(fn ->
  # Heavy computation
  Process.sleep(1000)
  {:ok, "done"}
end)

# Async - returns immediately
MyApp.Pool.async(fn ->
  send_emails(user_list)
end)

# Check status
MyApp.Pool.status()
# => %{available_workers: 8, pending_tasks: 0}
```

---

## Summary

| Concept | Purpose |
|---------|---------|
| Supervisor | Monitor and restart children |
| :one_for_one | Restart only crashed child |
| :one_for_all | Restart all if any crash |
| :rest_for_one | Restart crashed and later children |
| Child Spec | Define how to start/stop a child |
| DynamicSupervisor | Add/remove children at runtime |
| Task.Supervisor | Supervise one-off tasks |
| Registry | Name processes dynamically |

Supervisors are the foundation of fault-tolerant Elixir applications. They let you:

- Isolate failures to prevent cascade effects
- Recover automatically from transient errors
- Structure applications as maintainable supervision trees
- Build systems that heal themselves

The "let it crash" philosophy may feel strange at first, but once you embrace it, you will write cleaner code and build more reliable systems.

---

## Monitor Your Elixir Applications with OneUptime

Building fault-tolerant systems is only half the battle. You also need visibility into what is happening in production. When supervisors restart processes, when errors occur, when performance degrades - you need to know.

**OneUptime** provides comprehensive monitoring for your Elixir applications:

- **Uptime Monitoring**: Get alerted when your services go down
- **Application Performance Monitoring**: Track response times and throughput
- **Error Tracking**: Capture and analyze exceptions across your supervision trees
- **Log Management**: Centralize logs from all your BEAM processes
- **Status Pages**: Keep your users informed during incidents
- **On-Call Scheduling**: Route alerts to the right team members

Your supervisors handle recovery. Let OneUptime handle observability.

[Get started with OneUptime](https://oneuptime.com) - Open source monitoring that scales with your Elixir applications.

---

## Related Reading

- [Elixir Getting Started - Supervisors](https://elixir-lang.org/getting-started/mix-otp/supervisor-and-application.html)
- [GenServer and Supervisor Documentation](https://hexdocs.pm/elixir/Supervisor.html)
- [DynamicSupervisor Documentation](https://hexdocs.pm/elixir/DynamicSupervisor.html)
