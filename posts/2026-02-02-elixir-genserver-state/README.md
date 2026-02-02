# How to Implement GenServers for State Management in Elixir

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elixir, GenServer, OTP, Concurrency, State Management

Description: Learn how to use GenServer for stateful processes in Elixir, covering callbacks, synchronous and asynchronous messages, and supervision patterns.

---

If you have worked with Elixir for any amount of time, you have probably heard about GenServer. It is one of the most fundamental building blocks in the OTP (Open Telecom Platform) framework, and understanding it is essential for building robust Elixir applications.

In this guide, we will walk through what GenServer is, how to implement one from scratch, and cover the patterns you will use in real-world applications.

## What is GenServer?

GenServer stands for "Generic Server" and it is a behaviour module that abstracts the common client-server interaction pattern. Think of it as a process that maintains state, handles requests, and runs in the background. When you need to store data that persists across function calls or handle concurrent operations safely, GenServer is your go-to solution.

The beauty of GenServer is that it handles all the boilerplate of message passing, process management, and error handling. You just implement a few callbacks and focus on your business logic.

## Basic GenServer Structure

Let us start with a simple counter example:

```elixir
defmodule Counter do
  use GenServer

  # Client API - functions that other modules call

  def start_link(initial_value \\ 0) do
    # Starts the GenServer process and links it to the calling process
    GenServer.start_link(__MODULE__, initial_value, name: __MODULE__)
  end

  def increment do
    # Synchronous call - blocks until we get a response
    GenServer.call(__MODULE__, :increment)
  end

  def decrement do
    GenServer.call(__MODULE__, :decrement)
  end

  def get_value do
    GenServer.call(__MODULE__, :get_value)
  end

  def reset do
    # Asynchronous cast - does not wait for response
    GenServer.cast(__MODULE__, :reset)
  end

  # Server Callbacks - handle the actual work

  @impl true
  def init(initial_value) do
    # Called when the process starts
    # Returns {:ok, state} where state is your initial data
    {:ok, initial_value}
  end

  @impl true
  def handle_call(:increment, _from, state) do
    new_state = state + 1
    # Returns {:reply, response, new_state}
    {:reply, new_state, new_state}
  end

  @impl true
  def handle_call(:decrement, _from, state) do
    new_state = state - 1
    {:reply, new_state, new_state}
  end

  @impl true
  def handle_call(:get_value, _from, state) do
    # Return the value without modifying state
    {:reply, state, state}
  end

  @impl true
  def handle_cast(:reset, _state) do
    # Cast does not send a reply back
    {:noreply, 0}
  end
end
```

Now you can use it in IEx:

```elixir
iex> Counter.start_link(10)
{:ok, #PID<0.123.0>}

iex> Counter.get_value()
10

iex> Counter.increment()
11

iex> Counter.reset()
:ok

iex> Counter.get_value()
0
```

## Understanding the Callbacks

Here is a comparison of the main GenServer callbacks:

| Callback | Trigger | Return Value | Use Case |
|----------|---------|--------------|----------|
| `init/1` | `start_link/3` | `{:ok, state}` | Initialize state |
| `handle_call/3` | `GenServer.call/2` | `{:reply, response, state}` | Synchronous operations |
| `handle_cast/2` | `GenServer.cast/2` | `{:noreply, state}` | Async fire-and-forget |
| `handle_info/2` | Any other message | `{:noreply, state}` | Timer events, external messages |
| `terminate/2` | Process shutdown | Any | Cleanup resources |

## Working with handle_info

The `handle_info/2` callback handles messages that are not sent via `call` or `cast`. This is useful for scheduled tasks or handling messages from other processes:

```elixir
defmodule PeriodicTask do
  use GenServer

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # Schedule the first tick in 1 second
    schedule_tick()
    {:ok, %{count: 0}}
  end

  @impl true
  def handle_info(:tick, state) do
    # This runs every second
    IO.puts("Tick number: #{state.count}")

    # Schedule the next tick
    schedule_tick()

    {:noreply, %{state | count: state.count + 1}}
  end

  @impl true
  def handle_info(unknown_message, state) do
    # Always handle unknown messages to avoid crashing
    IO.warn("Received unexpected message: #{inspect(unknown_message)}")
    {:noreply, state}
  end

  defp schedule_tick do
    # Send :tick message to self after 1000ms
    Process.send_after(self(), :tick, 1000)
  end
end
```

## Adding Timeouts

GenServer supports timeouts that trigger after a period of inactivity:

```elixir
defmodule CacheWithTimeout do
  use GenServer

  @timeout 60_000  # 60 seconds

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def put(key, value) do
    GenServer.call(__MODULE__, {:put, key, value})
  end

  def get(key) do
    GenServer.call(__MODULE__, {:get, key})
  end

  @impl true
  def init(_opts) do
    # Return timeout as third element - triggers handle_info(:timeout, state)
    {:ok, %{}, @timeout}
  end

  @impl true
  def handle_call({:put, key, value}, _from, state) do
    new_state = Map.put(state, key, value)
    # Include timeout in reply to reset the timer
    {:reply, :ok, new_state, @timeout}
  end

  @impl true
  def handle_call({:get, key}, _from, state) do
    value = Map.get(state, key)
    {:reply, value, state, @timeout}
  end

  @impl true
  def handle_info(:timeout, _state) do
    # Cache expired due to inactivity - clear it
    IO.puts("Cache cleared due to inactivity")
    {:noreply, %{}, @timeout}
  end
end
```

## Supervision

GenServers should almost always run under a supervisor. This ensures they restart automatically if they crash:

```elixir
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start Counter with initial value of 0
      {Counter, 0},

      # Start with custom options
      {CacheWithTimeout, []},

      # Multiple instances with different names
      Supervisor.child_spec({Counter, 100}, id: :counter_a),
      Supervisor.child_spec({Counter, 200}, id: :counter_b)
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

For the child spec to work, add this to your GenServer module:

```elixir
defmodule Counter do
  use GenServer

  def child_spec(initial_value) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [initial_value]},
      restart: :permanent,
      type: :worker
    }
  end

  # ... rest of the module
end
```

## A Practical Example - Session Store

Here is a more complete example showing a session store that tracks user sessions with automatic expiration:

```elixir
defmodule SessionStore do
  use GenServer

  @session_ttl 3600_000  # 1 hour in milliseconds
  @cleanup_interval 60_000  # Check every minute

  # Client API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def create_session(user_id, data) do
    GenServer.call(__MODULE__, {:create, user_id, data})
  end

  def get_session(session_id) do
    GenServer.call(__MODULE__, {:get, session_id})
  end

  def delete_session(session_id) do
    GenServer.cast(__MODULE__, {:delete, session_id})
  end

  # Server Implementation

  @impl true
  def init(_opts) do
    # Start the cleanup timer
    schedule_cleanup()
    {:ok, %{sessions: %{}}}
  end

  @impl true
  def handle_call({:create, user_id, data}, _from, state) do
    session_id = generate_session_id()
    session = %{
      id: session_id,
      user_id: user_id,
      data: data,
      created_at: System.system_time(:millisecond)
    }

    new_sessions = Map.put(state.sessions, session_id, session)
    {:reply, {:ok, session_id}, %{state | sessions: new_sessions}}
  end

  @impl true
  def handle_call({:get, session_id}, _from, state) do
    case Map.get(state.sessions, session_id) do
      nil -> {:reply, {:error, :not_found}, state}
      session -> {:reply, {:ok, session}, state}
    end
  end

  @impl true
  def handle_cast({:delete, session_id}, state) do
    new_sessions = Map.delete(state.sessions, session_id)
    {:noreply, %{state | sessions: new_sessions}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    now = System.system_time(:millisecond)

    # Remove expired sessions
    active_sessions = state.sessions
    |> Enum.filter(fn {_id, session} ->
      now - session.created_at < @session_ttl
    end)
    |> Map.new()

    expired_count = map_size(state.sessions) - map_size(active_sessions)
    if expired_count > 0 do
      IO.puts("Cleaned up #{expired_count} expired sessions")
    end

    schedule_cleanup()
    {:noreply, %{state | sessions: active_sessions}}
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end

  defp generate_session_id do
    :crypto.strong_rand_bytes(16) |> Base.url_encode64(padding: false)
  end
end
```

## Key Takeaways

1. **Use `call` for synchronous operations** where you need the result before continuing.
2. **Use `cast` for fire-and-forget operations** where you do not care about the response.
3. **Always handle unknown messages** in `handle_info` to prevent crashes.
4. **Run GenServers under supervision** so they restart automatically on failure.
5. **Keep your state simple** - maps and structs work well, avoid complex nested structures.
6. **Name your GenServers** when you only need one instance, use a registry for multiple instances.

GenServer is the foundation for building stateful, concurrent applications in Elixir. Once you get comfortable with the callback pattern, you will find yourself reaching for it whenever you need to manage state or coordinate concurrent operations.
