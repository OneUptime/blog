# How to Use Elixir Processes for Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elixir, Processes, Concurrency, OTP, BEAM

Description: Learn how to leverage Elixir processes for concurrent programming. This guide covers spawning processes, message passing, and building concurrent systems.

---

Elixir runs on the BEAM virtual machine, the same runtime that powers Erlang and has been battle-tested for over 30 years in telecommunication systems requiring extreme reliability. At the heart of Elixir's power lies its lightweight process model - a fundamentally different approach to concurrency than what you find in most programming languages.

Unlike operating system threads that consume megabytes of memory and require careful synchronization, Elixir processes are incredibly lightweight (starting at around 2KB of memory) and completely isolated from each other. You can spawn millions of them on a single machine. They communicate exclusively through message passing, eliminating entire categories of bugs related to shared mutable state.

This guide walks through everything you need to know about Elixir processes - from basic spawning to building fault-tolerant concurrent systems.

---

## Understanding the BEAM Process Model

Before diving into code, it helps to understand what makes BEAM processes special:

**Isolation**: Each process has its own heap and garbage collector. One process crashing or running slowly does not affect others. This isolation is not just about memory - processes cannot directly access each other's data.

**Preemptive Scheduling**: The BEAM scheduler ensures fair execution. No single process can hog the CPU indefinitely. The scheduler uses reduction counting (roughly one reduction per function call) to preempt processes.

**Lightweight Creation**: Creating a process takes microseconds and minimal memory. You should think of processes as cheap resources to use liberally, not expensive resources to pool.

**Location Transparency**: Sending a message to a process on the same node uses the same syntax as sending to a process on a remote node. This enables distributed systems without code changes.

```elixir
# Check how lightweight processes are
# This creates 100,000 processes and measures memory
defmodule ProcessDemo do
  def count_processes do
    # Get initial memory
    initial_memory = :erlang.memory(:total)

    # Spawn 100,000 processes that just wait
    pids = for _ <- 1..100_000 do
      spawn(fn ->
        receive do
          :stop -> :ok
        end
      end)
    end

    # Get memory after spawning
    final_memory = :erlang.memory(:total)
    memory_per_process = (final_memory - initial_memory) / 100_000

    IO.puts("Memory per process: #{memory_per_process} bytes")
    IO.puts("Total processes: #{length(pids)}")

    # Clean up
    Enum.each(pids, fn pid -> send(pid, :stop) end)
  end
end

# Run it
ProcessDemo.count_processes()
# Output: Memory per process: ~2500 bytes
# Output: Total processes: 100000
```

---

## Spawning Processes

The most basic way to create a process is with the `spawn` function. It takes a function and executes it in a new process.

### Basic Spawn

```elixir
# spawn/1 - Takes an anonymous function
pid = spawn(fn ->
  IO.puts("Hello from process #{inspect(self())}")
end)

# The spawn returns immediately with the new process ID
IO.puts("Spawned process: #{inspect(pid)}")

# Output:
# Spawned process: #PID<0.123.0>
# Hello from process #PID<0.123.0>
```

### Spawn with Module, Function, and Arguments

```elixir
# spawn/3 - Takes module, function atom, and argument list
defmodule Greeter do
  def greet(name) do
    IO.puts("Hello, #{name}! From process #{inspect(self())}")
  end

  def greet(greeting, name) do
    IO.puts("#{greeting}, #{name}! From process #{inspect(self())}")
  end
end

# Spawn with one argument
spawn(Greeter, :greet, ["Alice"])

# Spawn with two arguments
spawn(Greeter, :greet, ["Howdy", "Bob"])

# Output:
# Hello, Alice! From process #PID<0.124.0>
# Howdy, Bob! From process #PID<0.125.0>
```

### Spawning Multiple Concurrent Processes

```elixir
# Spawn multiple processes that run concurrently
defmodule ConcurrentWorker do
  def do_work(id, duration_ms) do
    IO.puts("[#{id}] Starting work...")

    # Simulate work with sleep
    Process.sleep(duration_ms)

    IO.puts("[#{id}] Finished after #{duration_ms}ms")
  end
end

# Spawn 5 workers with different durations
# They all start simultaneously
for i <- 1..5 do
  duration = :rand.uniform(1000)
  spawn(ConcurrentWorker, :do_work, [i, duration])
end

# Output (order varies due to concurrency):
# [1] Starting work...
# [2] Starting work...
# [3] Starting work...
# [4] Starting work...
# [5] Starting work...
# [3] Finished after 234ms
# [1] Finished after 456ms
# [5] Finished after 678ms
# [2] Finished after 789ms
# [4] Finished after 912ms
```

---

## Message Passing Fundamentals

Processes communicate exclusively through asynchronous message passing. The `send/2` function sends a message to a process, and the `receive` block handles incoming messages.

### Basic Send and Receive

```elixir
defmodule MessageDemo do
  def listen do
    # receive blocks until a matching message arrives
    receive do
      message ->
        IO.puts("Received: #{inspect(message)}")
    end
  end
end

# Spawn a listener process
listener = spawn(MessageDemo, :listen, [])

# Send it a message
send(listener, "Hello, process!")

# Output: Received: "Hello, process!"
```

### Pattern Matching in Receive Blocks

```elixir
defmodule Calculator do
  def start do
    loop()
  end

  defp loop do
    receive do
      # Pattern match on tuple structure
      {:add, a, b} ->
        IO.puts("#{a} + #{b} = #{a + b}")
        loop()

      {:subtract, a, b} ->
        IO.puts("#{a} - #{b} = #{a - b}")
        loop()

      {:multiply, a, b} ->
        IO.puts("#{a} * #{b} = #{a * b}")
        loop()

      {:divide, a, b} when b != 0 ->
        IO.puts("#{a} / #{b} = #{a / b}")
        loop()

      {:divide, _, 0} ->
        IO.puts("Error: Division by zero")
        loop()

      :stop ->
        IO.puts("Calculator stopping...")
        :ok

      # Catch-all for unknown messages
      unknown ->
        IO.puts("Unknown message: #{inspect(unknown)}")
        loop()
    end
  end
end

# Start the calculator process
calc = spawn(Calculator, :start, [])

# Send various operations
send(calc, {:add, 10, 5})
send(calc, {:subtract, 10, 5})
send(calc, {:multiply, 10, 5})
send(calc, {:divide, 10, 5})
send(calc, {:divide, 10, 0})
send(calc, {:unknown_op, 1, 2})
send(calc, :stop)

# Output:
# 10 + 5 = 15
# 10 - 5 = 5
# 10 * 5 = 50
# 10 / 5 = 2.0
# Error: Division by zero
# Unknown message: {:unknown_op, 1, 2}
# Calculator stopping...
```

### Receiving with Timeouts

```elixir
defmodule TimeoutDemo do
  def wait_for_message(timeout_ms) do
    receive do
      message ->
        IO.puts("Got message: #{inspect(message)}")
        :ok
    after
      # Timeout clause - executes if no message arrives
      timeout_ms ->
        IO.puts("Timed out after #{timeout_ms}ms")
        :timeout
    end
  end
end

# Spawn and let it timeout
pid = spawn(TimeoutDemo, :wait_for_message, [2000])

# Wait 3 seconds - the process will timeout first
Process.sleep(3000)

# Output: Timed out after 2000ms
```

---

## Bidirectional Communication

Often you need to send a request and get a response back. This requires including the sender's PID in the message.

```elixir
defmodule KeyValueStore do
  def start do
    loop(%{})
  end

  defp loop(state) do
    receive do
      # Put operation - no response needed
      {:put, key, value} ->
        new_state = Map.put(state, key, value)
        IO.puts("Stored #{key} => #{inspect(value)}")
        loop(new_state)

      # Get operation - sends response back to caller
      {:get, key, caller} ->
        value = Map.get(state, key, :not_found)
        send(caller, {:response, value})
        loop(state)

      # Delete operation
      {:delete, key} ->
        new_state = Map.delete(state, key)
        IO.puts("Deleted #{key}")
        loop(new_state)

      # Get all keys - sends response
      {:keys, caller} ->
        keys = Map.keys(state)
        send(caller, {:response, keys})
        loop(state)

      :stop ->
        IO.puts("Store shutting down")
        :ok
    end
  end
end

# Client module with helper functions
defmodule KVClient do
  def put(store, key, value) do
    send(store, {:put, key, value})
    :ok
  end

  def get(store, key) do
    # Include our PID so the store can respond
    send(store, {:get, key, self()})

    # Wait for the response
    receive do
      {:response, value} -> value
    after
      5000 -> {:error, :timeout}
    end
  end

  def delete(store, key) do
    send(store, {:delete, key})
    :ok
  end

  def keys(store) do
    send(store, {:keys, self()})

    receive do
      {:response, keys} -> keys
    after
      5000 -> {:error, :timeout}
    end
  end
end

# Usage
store = spawn(KeyValueStore, :start, [])

KVClient.put(store, :name, "Alice")
KVClient.put(store, :age, 30)
KVClient.put(store, :city, "Portland")

IO.puts("Name: #{KVClient.get(store, :name)}")
IO.puts("Age: #{KVClient.get(store, :age)}")
IO.puts("Keys: #{inspect(KVClient.keys(store))}")

KVClient.delete(store, :age)
IO.puts("Age after delete: #{inspect(KVClient.get(store, :age))}")

send(store, :stop)

# Output:
# Stored name => "Alice"
# Stored age => 30
# Stored city => "Portland"
# Name: Alice
# Age: 30
# Keys: [:name, :age, :city]
# Deleted age
# Age after delete: :not_found
# Store shutting down
```

---

## Process Linking

Links create a bidirectional connection between processes. When one linked process dies, all processes linked to it also die (unless they trap exits). This is fundamental to the "let it crash" philosophy.

### Basic Linking

```elixir
defmodule LinkDemo do
  def start_child do
    # spawn_link creates a new process AND links it to the caller
    child = spawn_link(fn ->
      IO.puts("Child started: #{inspect(self())}")
      Process.sleep(2000)
      IO.puts("Child finished normally")
    end)

    IO.puts("Parent spawned child: #{inspect(child)}")
    child
  end

  def start_crashing_child do
    child = spawn_link(fn ->
      IO.puts("Child started: #{inspect(self())}")
      Process.sleep(1000)
      # This will crash the child
      raise "Child crashed!"
    end)

    IO.puts("Parent spawned crashing child: #{inspect(child)}")
    child
  end
end

# Normal case - both complete
LinkDemo.start_child()
Process.sleep(3000)

# Crash case - the linked parent will also crash
# (Run this in IEx to see the effect)
# LinkDemo.start_crashing_child()
# Process.sleep(3000)
```

### Trapping Exits

```elixir
defmodule Supervisor do
  def start do
    # Enable exit trapping - converts exit signals to messages
    Process.flag(:trap_exit, true)

    IO.puts("Supervisor started: #{inspect(self())}")

    # Start a worker
    worker = spawn_link(fn ->
      IO.puts("Worker started")
      Process.sleep(1000)
      raise "Worker crashed!"
    end)

    IO.puts("Spawned worker: #{inspect(worker)}")

    loop()
  end

  defp loop do
    receive do
      # Exit message received when linked process dies
      {:EXIT, pid, :normal} ->
        IO.puts("Process #{inspect(pid)} exited normally")
        loop()

      {:EXIT, pid, reason} ->
        IO.puts("Process #{inspect(pid)} crashed: #{inspect(reason)}")
        IO.puts("Supervisor could restart it here...")
        loop()

      :stop ->
        IO.puts("Supervisor stopping")
        :ok
    end
  end
end

# Run the supervisor
sup = spawn(Supervisor, :start, [])
Process.sleep(3000)
send(sup, :stop)

# Output:
# Supervisor started: #PID<0.130.0>
# Worker started
# Spawned worker: #PID<0.131.0>
# Process #PID<0.131.0> crashed: {%RuntimeError{message: "Worker crashed!"}, [...]}
# Supervisor could restart it here...
# Supervisor stopping
```

### Linking Existing Processes

```elixir
defmodule ManualLink do
  def demo do
    # Spawn without linking first
    pid = spawn(fn ->
      receive do
        :crash -> raise "Intentional crash"
        :done -> :ok
      end
    end)

    IO.puts("Spawned: #{inspect(pid)}")
    IO.puts("Linked: #{inspect(Process.link(pid))}")

    # Now they are linked
    # If we send :crash, both processes would die (unless trapping exits)
    send(pid, :done)
  end
end
```

---

## Process Monitoring

Unlike links, monitors are unidirectional and do not cause the monitoring process to crash. They simply receive a message when the monitored process dies.

### Basic Monitoring

```elixir
defmodule MonitorDemo do
  def start do
    # Spawn a worker
    worker = spawn(fn ->
      IO.puts("Worker running...")
      Process.sleep(1000)
      IO.puts("Worker crashing!")
      exit(:boom)
    end)

    # Monitor it - returns a reference
    ref = Process.monitor(worker)
    IO.puts("Monitoring #{inspect(worker)} with ref #{inspect(ref)}")

    # Wait for the DOWN message
    receive do
      {:DOWN, ^ref, :process, ^worker, reason} ->
        IO.puts("Worker died with reason: #{inspect(reason)}")
        IO.puts("Monitor process still alive: #{Process.alive?(self())}")
    end
  end
end

spawn(MonitorDemo, :start, [])
Process.sleep(2000)

# Output:
# Worker running...
# Monitoring #PID<0.140.0> with ref #Reference<0.123.456.789>
# Worker crashing!
# Worker died with reason: :boom
# Monitor process still alive: true
```

### Spawn and Monitor Together

```elixir
defmodule SpawnMonitor do
  def demo do
    # spawn_monitor combines spawn and monitor in one call
    {pid, ref} = spawn_monitor(fn ->
      IO.puts("Short-lived process running")
      Process.sleep(500)
      # Return value becomes exit reason for normal exit
      :completed
    end)

    IO.puts("Spawned #{inspect(pid)} with monitor #{inspect(ref)}")

    receive do
      {:DOWN, ^ref, :process, ^pid, reason} ->
        IO.puts("Process exited with: #{inspect(reason)}")
    end
  end
end

SpawnMonitor.demo()

# Output:
# Spawned #PID<0.145.0> with monitor #Reference<0.456.789.123>
# Short-lived process running
# Process exited with: :completed
```

### Demonitor

```elixir
defmodule DemonitorDemo do
  def demo do
    {pid, ref} = spawn_monitor(fn ->
      receive do
        :work -> IO.puts("Working...")
        :stop -> :ok
      end
    end)

    # Maybe we decide we do not care about this process anymore
    Process.demonitor(ref)
    IO.puts("Demonitored - we will not receive DOWN messages")

    # Kill the process
    Process.exit(pid, :kill)

    # Try to receive - will timeout because we demonitored
    receive do
      {:DOWN, ^ref, :process, ^pid, reason} ->
        IO.puts("Got DOWN: #{inspect(reason)}")
    after
      1000 ->
        IO.puts("No DOWN message received (as expected)")
    end
  end
end

DemonitorDemo.demo()

# Output:
# Demonitored - we will not receive DOWN messages
# No DOWN message received (as expected)
```

---

## The Task Module

The `Task` module provides a higher-level abstraction over processes for running concurrent operations. It handles process creation, linking, and result retrieval.

### Basic Task Usage

```elixir
defmodule TaskDemo do
  def basic_async do
    # Task.async creates a linked process and returns a task struct
    task = Task.async(fn ->
      IO.puts("Task running in #{inspect(self())}")
      Process.sleep(1000)
      # Return value
      42
    end)

    IO.puts("Task created: #{inspect(task)}")
    IO.puts("Doing other work while task runs...")
    Process.sleep(500)
    IO.puts("Still doing other work...")

    # Task.await blocks until the task completes and returns its result
    result = Task.await(task)
    IO.puts("Task result: #{result}")
  end
end

TaskDemo.basic_async()

# Output:
# Task created: %Task{pid: #PID<0.150.0>, ref: #Reference<...>, owner: #PID<0.100.0>}
# Doing other work while task runs...
# Task running in #PID<0.150.0>
# Still doing other work...
# Task result: 42
```

### Running Multiple Tasks Concurrently

```elixir
defmodule ParallelFetch do
  # Simulates fetching data from different sources
  def fetch(source) do
    # Simulate variable latency
    delay = :rand.uniform(1000)
    Process.sleep(delay)
    {:ok, source, "Data from #{source}", delay}
  end

  def demo do
    sources = [:database, :cache, :api, :file, :queue]

    IO.puts("Starting parallel fetch...")
    start_time = System.monotonic_time(:millisecond)

    # Start all tasks concurrently
    tasks = Enum.map(sources, fn source ->
      Task.async(fn -> fetch(source) end)
    end)

    # Wait for all tasks to complete
    results = Task.await_many(tasks)

    end_time = System.monotonic_time(:millisecond)
    total_time = end_time - start_time

    IO.puts("\nResults:")
    Enum.each(results, fn {:ok, source, data, delay} ->
      IO.puts("  #{source}: #{data} (took #{delay}ms)")
    end)

    IO.puts("\nTotal time: #{total_time}ms")
    IO.puts("(Would have taken #{Enum.sum(Enum.map(results, fn {:ok, _, _, d} -> d end))}ms sequentially)")
  end
end

ParallelFetch.demo()

# Output:
# Starting parallel fetch...
#
# Results:
#   database: Data from database (took 234ms)
#   cache: Data from cache (took 567ms)
#   api: Data from api (took 123ms)
#   file: Data from file (took 890ms)
#   queue: Data from queue (took 456ms)
#
# Total time: 892ms
# (Would have taken 2270ms sequentially)
```

### Task.async_stream for Processing Collections

```elixir
defmodule BatchProcessor do
  def process_item(item) do
    # Simulate processing with variable time
    Process.sleep(:rand.uniform(500))
    item * 2
  end

  def demo do
    items = 1..10 |> Enum.to_list()

    IO.puts("Processing #{length(items)} items concurrently...")
    start_time = System.monotonic_time(:millisecond)

    # async_stream processes items concurrently with backpressure
    # max_concurrency limits how many run at once
    results = items
    |> Task.async_stream(&process_item/1, max_concurrency: 4, timeout: 10_000)
    |> Enum.map(fn {:ok, result} -> result end)

    end_time = System.monotonic_time(:millisecond)

    IO.puts("Results: #{inspect(results)}")
    IO.puts("Total time: #{end_time - start_time}ms")
  end
end

BatchProcessor.demo()

# Output:
# Processing 10 items concurrently...
# Results: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
# Total time: ~1300ms (vs ~2500ms if max_concurrency: 1)
```

### Non-Blocking Task Operations

```elixir
defmodule NonBlockingTasks do
  def demo do
    # Start a task
    task = Task.async(fn ->
      Process.sleep(2000)
      :completed
    end)

    # yield checks if task is done without blocking indefinitely
    IO.puts("Checking task (non-blocking)...")

    case Task.yield(task, 500) do
      nil ->
        IO.puts("Task still running after 500ms")
      {:ok, result} ->
        IO.puts("Task completed: #{result}")
    end

    # Check again
    case Task.yield(task, 500) do
      nil ->
        IO.puts("Task still running after 1000ms total")
      {:ok, result} ->
        IO.puts("Task completed: #{result}")
    end

    # Final await
    result = Task.await(task)
    IO.puts("Final result: #{result}")
  end
end

NonBlockingTasks.demo()

# Output:
# Checking task (non-blocking)...
# Task still running after 500ms
# Task still running after 1000ms total
# Final result: :completed
```

### Fire and Forget with Task.start

```elixir
defmodule FireAndForget do
  def demo do
    # Task.start creates an unlinked task - we do not care about results
    {:ok, _pid} = Task.start(fn ->
      IO.puts("Background job starting...")
      Process.sleep(1000)
      IO.puts("Background job finished!")
    end)

    IO.puts("Main process continues immediately")
    Process.sleep(1500)
    IO.puts("Main process done")
  end
end

FireAndForget.demo()

# Output:
# Background job starting...
# Main process continues immediately
# Background job finished!
# Main process done
```

---

## Building a Worker Pool

Let us combine what we have learned to build a simple worker pool that processes jobs concurrently.

```elixir
defmodule WorkerPool do
  @moduledoc """
  A simple worker pool that distributes jobs across multiple worker processes.
  Workers process jobs concurrently and send results back to the pool.
  """

  # Pool process - manages workers and job distribution
  def start_pool(num_workers) do
    IO.puts("Starting pool with #{num_workers} workers...")

    # Spawn worker processes
    workers = for i <- 1..num_workers do
      spawn_link(fn -> worker_loop(i) end)
    end

    IO.puts("Workers started: #{inspect(workers)}")

    # Start the pool manager loop
    pool_loop(workers, :queue.new(), %{})
  end

  # Pool manager loop
  defp pool_loop(available_workers, job_queue, pending_jobs) do
    receive do
      # New job submission
      {:submit, job, caller, ref} ->
        IO.puts("Pool received job: #{inspect(job)}")

        case available_workers do
          [worker | rest] ->
            # Worker available - dispatch immediately
            send(worker, {:job, job, self(), ref})
            new_pending = Map.put(pending_jobs, ref, caller)
            pool_loop(rest, job_queue, new_pending)

          [] ->
            # No workers available - queue the job
            new_queue = :queue.in({job, caller, ref}, job_queue)
            pool_loop([], new_queue, pending_jobs)
        end

      # Worker completed a job
      {:done, worker, ref, result} ->
        # Send result back to original caller
        case Map.pop(pending_jobs, ref) do
          {nil, _} ->
            IO.puts("Warning: Unknown job ref #{inspect(ref)}")
            pool_loop([worker | available_workers], job_queue, pending_jobs)

          {caller, new_pending} ->
            send(caller, {:result, ref, result})

            # Check if there are queued jobs
            case :queue.out(job_queue) do
              {{:value, {job, caller2, ref2}}, new_queue} ->
                # Dispatch queued job to the now-free worker
                send(worker, {:job, job, self(), ref2})
                updated_pending = Map.put(new_pending, ref2, caller2)
                pool_loop(available_workers, new_queue, updated_pending)

              {:empty, _} ->
                # No queued jobs - worker becomes available
                pool_loop([worker | available_workers], job_queue, new_pending)
            end
        end

      :status ->
        IO.puts("""
        Pool Status:
          Available workers: #{length(available_workers)}
          Queued jobs: #{:queue.len(job_queue)}
          Pending jobs: #{map_size(pending_jobs)}
        """)
        pool_loop(available_workers, job_queue, pending_jobs)

      :stop ->
        IO.puts("Pool shutting down...")
        Enum.each(available_workers, fn w -> send(w, :stop) end)
        :ok
    end
  end

  # Worker process loop
  defp worker_loop(id) do
    receive do
      {:job, job, pool, ref} ->
        IO.puts("Worker #{id} processing: #{inspect(job)}")

        # Process the job (simulate work)
        result = process_job(job)

        IO.puts("Worker #{id} completed: #{inspect(result)}")
        send(pool, {:done, self(), ref, result})

        worker_loop(id)

      :stop ->
        IO.puts("Worker #{id} stopping")
        :ok
    end
  end

  # Job processing logic
  defp process_job({:double, n}) do
    Process.sleep(:rand.uniform(500))
    {:ok, n * 2}
  end

  defp process_job({:square, n}) do
    Process.sleep(:rand.uniform(500))
    {:ok, n * n}
  end

  defp process_job({:slow_add, a, b}) do
    Process.sleep(1000)
    {:ok, a + b}
  end

  defp process_job(unknown) do
    {:error, {:unknown_job, unknown}}
  end
end

# Client helper module
defmodule PoolClient do
  def submit(pool, job) do
    ref = make_ref()
    send(pool, {:submit, job, self(), ref})
    ref
  end

  def await(ref, timeout \\ 5000) do
    receive do
      {:result, ^ref, result} -> result
    after
      timeout -> {:error, :timeout}
    end
  end

  def submit_await(pool, job, timeout \\ 5000) do
    ref = submit(pool, job)
    await(ref, timeout)
  end
end

# Demo
defmodule PoolDemo do
  def run do
    # Start pool with 3 workers
    pool = spawn(WorkerPool, :start_pool, [3])
    Process.sleep(100)  # Let workers start

    # Submit more jobs than workers
    jobs = [
      {:double, 5},
      {:square, 4},
      {:double, 10},
      {:slow_add, 1, 2},
      {:square, 7},
      {:double, 3}
    ]

    IO.puts("\n--- Submitting #{length(jobs)} jobs ---\n")

    # Submit all jobs
    refs = Enum.map(jobs, fn job ->
      {job, PoolClient.submit(pool, job)}
    end)

    # Check status
    Process.sleep(100)
    send(pool, :status)
    Process.sleep(100)

    # Collect results
    IO.puts("\n--- Collecting results ---\n")

    results = Enum.map(refs, fn {job, ref} ->
      result = PoolClient.await(ref, 10_000)
      IO.puts("Job #{inspect(job)} => #{inspect(result)}")
      {job, result}
    end)

    IO.puts("\n--- All jobs completed ---")

    # Shutdown
    send(pool, :stop)
    Process.sleep(100)

    results
  end
end

PoolDemo.run()

# Output:
# Starting pool with 3 workers...
# Workers started: [#PID<0.160.0>, #PID<0.161.0>, #PID<0.162.0>]
#
# --- Submitting 6 jobs ---
#
# Pool received job: {:double, 5}
# Worker 1 processing: {:double, 5}
# Pool received job: {:square, 4}
# Worker 2 processing: {:square, 4}
# Pool received job: {:double, 10}
# Worker 3 processing: {:double, 10}
# Pool received job: {:slow_add, 1, 2}
# Pool received job: {:square, 7}
# Pool received job: {:double, 3}
#
# Pool Status:
#   Available workers: 0
#   Queued jobs: 3
#   Pending jobs: 3
#
# Worker 2 completed: {:ok, 16}
# Worker 1 completed: {:ok, 10}
# ... (continues as workers finish)
```

---

## Process Registration

You can register processes with names to make them globally accessible without passing PIDs around.

```elixir
defmodule Registry do
  def start_counter do
    # Register this process with a name
    pid = spawn(fn -> counter_loop(0) end)
    Process.register(pid, :counter)
    IO.puts("Counter registered as :counter (pid: #{inspect(pid)})")
    pid
  end

  defp counter_loop(count) do
    receive do
      :increment ->
        counter_loop(count + 1)

      :decrement ->
        counter_loop(count - 1)

      {:get, caller} ->
        send(caller, {:count, count})
        counter_loop(count)

      :stop ->
        :ok
    end
  end
end

# Client functions that use the registered name
defmodule CounterClient do
  def increment do
    send(:counter, :increment)
  end

  def decrement do
    send(:counter, :decrement)
  end

  def get do
    send(:counter, {:get, self()})
    receive do
      {:count, n} -> n
    after
      1000 -> {:error, :timeout}
    end
  end
end

# Demo
Registry.start_counter()

CounterClient.increment()
CounterClient.increment()
CounterClient.increment()
IO.puts("Count: #{CounterClient.get()}")

CounterClient.decrement()
IO.puts("Count: #{CounterClient.get()}")

send(:counter, :stop)

# Output:
# Counter registered as :counter (pid: #PID<0.170.0>)
# Count: 3
# Count: 2
```

---

## Process Info and Debugging

Elixir provides tools to inspect running processes.

```elixir
defmodule ProcessInspection do
  def demo do
    # Start a process with some state
    pid = spawn(fn ->
      data = Enum.to_list(1..1000)
      loop(data)
    end)

    # Give it a moment to initialize
    Process.sleep(100)

    # Get process info
    info = Process.info(pid)

    IO.puts("Process: #{inspect(pid)}")
    IO.puts("Status: #{info[:status]}")
    IO.puts("Memory: #{info[:memory]} bytes")
    IO.puts("Message queue length: #{info[:message_queue_len]}")
    IO.puts("Reductions: #{info[:reductions]}")
    IO.puts("Current function: #{inspect(info[:current_function])}")

    # Send some messages
    send(pid, :msg1)
    send(pid, :msg2)
    send(pid, :msg3)

    # Check queue again
    updated_info = Process.info(pid)
    IO.puts("\nAfter sending messages:")
    IO.puts("Message queue length: #{updated_info[:message_queue_len]}")

    # List all processes
    IO.puts("\nTotal processes in system: #{length(Process.list())}")

    send(pid, :stop)
  end

  defp loop(data) do
    receive do
      :stop -> :ok
      _ -> loop(data)
    end
  end
end

ProcessInspection.demo()

# Output:
# Process: #PID<0.180.0>
# Status: waiting
# Memory: 12345 bytes
# Message queue length: 0
# Reductions: 1234
# Current function: {:erl_prim_loader, :loop, 3}
#
# After sending messages:
# Message queue length: 3
#
# Total processes in system: 67
```

---

## Error Handling Strategies

Different strategies for handling process failures.

### Supervisor Trees (Conceptual Example)

```elixir
defmodule SimpleSupervisor do
  @moduledoc """
  A simplified supervisor that restarts crashed workers.
  In production, use OTP Supervisor behaviors.
  """

  def start(worker_fn, opts \\ []) do
    max_restarts = Keyword.get(opts, :max_restarts, 3)
    restart_window = Keyword.get(opts, :restart_window, 5000)

    spawn(fn ->
      Process.flag(:trap_exit, true)
      supervisor_loop(worker_fn, nil, [], max_restarts, restart_window)
    end)
  end

  defp supervisor_loop(worker_fn, worker, restart_times, max_restarts, restart_window) do
    # Start worker if not running
    worker = if worker == nil or not Process.alive?(worker) do
      IO.puts("[Supervisor] Starting worker...")
      spawn_link(worker_fn)
    else
      worker
    end

    receive do
      {:EXIT, ^worker, :normal} ->
        IO.puts("[Supervisor] Worker exited normally")
        supervisor_loop(worker_fn, nil, restart_times, max_restarts, restart_window)

      {:EXIT, ^worker, reason} ->
        IO.puts("[Supervisor] Worker crashed: #{inspect(reason)}")

        now = System.monotonic_time(:millisecond)
        recent_restarts = Enum.filter(restart_times, fn t ->
          now - t < restart_window
        end)

        if length(recent_restarts) >= max_restarts do
          IO.puts("[Supervisor] Too many restarts - giving up")
          :shutdown
        else
          IO.puts("[Supervisor] Restarting worker...")
          Process.sleep(100)  # Brief delay before restart
          supervisor_loop(worker_fn, nil, [now | recent_restarts], max_restarts, restart_window)
        end

      :stop ->
        IO.puts("[Supervisor] Stopping...")
        if worker, do: Process.exit(worker, :shutdown)
        :ok
    end
  end
end

# Demo with a flaky worker
defmodule FlakyWorker do
  def run do
    IO.puts("[Worker #{inspect(self())}] Starting...")

    # Randomly crash
    if :rand.uniform(3) == 1 do
      IO.puts("[Worker #{inspect(self())}] Crashing!")
      raise "Random failure"
    end

    # Normal work
    Enum.each(1..5, fn i ->
      IO.puts("[Worker #{inspect(self())}] Working... #{i}")
      Process.sleep(500)
    end)

    IO.puts("[Worker #{inspect(self())}] Done!")
  end
end

# Start supervised worker
sup = SimpleSupervisor.start(&FlakyWorker.run/0, max_restarts: 5)
Process.sleep(10_000)
send(sup, :stop)

# Output varies based on random crashes:
# [Supervisor] Starting worker...
# [Worker #PID<0.190.0>] Starting...
# [Worker #PID<0.190.0>] Crashing!
# [Supervisor] Worker crashed: {%RuntimeError{...}, [...]}
# [Supervisor] Restarting worker...
# [Supervisor] Starting worker...
# [Worker #PID<0.191.0>] Starting...
# [Worker #PID<0.191.0>] Working... 1
# ... (continues)
```

---

## Real-World Pattern: Rate Limiter

Here is a practical example combining processes, messages, and state management.

```elixir
defmodule RateLimiter do
  @moduledoc """
  A token bucket rate limiter implemented as a process.
  Allows configurable requests per time window.
  """

  def start_link(opts \\ []) do
    max_tokens = Keyword.get(opts, :max_tokens, 10)
    refill_rate = Keyword.get(opts, :refill_rate, 1)  # tokens per second
    refill_interval = Keyword.get(opts, :refill_interval, 1000)  # ms

    pid = spawn_link(fn ->
      # Schedule first refill
      schedule_refill(refill_interval)

      loop(%{
        tokens: max_tokens,
        max_tokens: max_tokens,
        refill_rate: refill_rate,
        refill_interval: refill_interval
      })
    end)

    {:ok, pid}
  end

  defp loop(state) do
    receive do
      {:check, caller, ref} ->
        if state.tokens > 0 do
          send(caller, {:ok, ref})
          loop(%{state | tokens: state.tokens - 1})
        else
          send(caller, {:error, :rate_limited, ref})
          loop(state)
        end

      :refill ->
        new_tokens = min(state.tokens + state.refill_rate, state.max_tokens)
        schedule_refill(state.refill_interval)
        loop(%{state | tokens: new_tokens})

      {:status, caller} ->
        send(caller, {:status, state.tokens, state.max_tokens})
        loop(state)

      :stop ->
        :ok
    end
  end

  defp schedule_refill(interval) do
    Process.send_after(self(), :refill, interval)
  end

  # Client API

  def check(limiter) do
    ref = make_ref()
    send(limiter, {:check, self(), ref})

    receive do
      {:ok, ^ref} -> :ok
      {:error, :rate_limited, ^ref} -> {:error, :rate_limited}
    after
      1000 -> {:error, :timeout}
    end
  end

  def status(limiter) do
    send(limiter, {:status, self()})

    receive do
      {:status, current, max} -> {current, max}
    after
      1000 -> {:error, :timeout}
    end
  end
end

# Demo
defmodule RateLimiterDemo do
  def run do
    # Create a rate limiter: 5 tokens max, refill 2 per second
    {:ok, limiter} = RateLimiter.start_link(
      max_tokens: 5,
      refill_rate: 2,
      refill_interval: 1000
    )

    IO.puts("Initial status: #{inspect(RateLimiter.status(limiter))}")

    # Make rapid requests
    IO.puts("\nMaking 10 rapid requests:")
    results = for i <- 1..10 do
      result = RateLimiter.check(limiter)
      IO.puts("  Request #{i}: #{inspect(result)}")
      result
    end

    allowed = Enum.count(results, &(&1 == :ok))
    blocked = Enum.count(results, &(&1 == {:error, :rate_limited}))
    IO.puts("\nAllowed: #{allowed}, Blocked: #{blocked}")

    # Wait for refill
    IO.puts("\nWaiting 2 seconds for refill...")
    Process.sleep(2000)

    IO.puts("Status after refill: #{inspect(RateLimiter.status(limiter))}")

    # More requests
    IO.puts("\nMaking 3 more requests:")
    for i <- 1..3 do
      result = RateLimiter.check(limiter)
      IO.puts("  Request #{i}: #{inspect(result)}")
    end

    send(limiter, :stop)
  end
end

RateLimiterDemo.run()

# Output:
# Initial status: {5, 5}
#
# Making 10 rapid requests:
#   Request 1: :ok
#   Request 2: :ok
#   Request 3: :ok
#   Request 4: :ok
#   Request 5: :ok
#   Request 6: {:error, :rate_limited}
#   Request 7: {:error, :rate_limited}
#   Request 8: {:error, :rate_limited}
#   Request 9: {:error, :rate_limited}
#   Request 10: {:error, :rate_limited}
#
# Allowed: 5, Blocked: 5
#
# Waiting 2 seconds for refill...
# Status after refill: {4, 5}
#
# Making 3 more requests:
#   Request 1: :ok
#   Request 2: :ok
#   Request 3: :ok
```

---

## Performance Considerations

### Message Queue Buildup

```elixir
defmodule QueueDemo do
  @moduledoc """
  Demonstrates message queue monitoring - critical for production systems.
  """

  def slow_consumer do
    spawn(fn -> slow_loop() end)
  end

  defp slow_loop do
    receive do
      :check_queue ->
        {:message_queue_len, len} = Process.info(self(), :message_queue_len)
        IO.puts("Queue length: #{len}")
        slow_loop()

      _msg ->
        # Slow processing
        Process.sleep(100)
        slow_loop()
    end
  end
end

# Start slow consumer
consumer = QueueDemo.slow_consumer()

# Flood it with messages
for i <- 1..100 do
  send(consumer, {:work, i})
end

# Check queue periodically
for _ <- 1..5 do
  Process.sleep(500)
  send(consumer, :check_queue)
  Process.sleep(100)
end

# Output shows queue length decreasing as messages are processed:
# Queue length: 95
# Queue length: 90
# Queue length: 85
# ...
```

### Selective Receive Optimization

```elixir
defmodule SelectiveReceive do
  @moduledoc """
  Demonstrates how selective receive affects performance.
  """

  def demo do
    # Bad: Selective receive scans entire mailbox each time
    bad_process = spawn(fn ->
      # Fill mailbox with messages we will not match
      for i <- 1..10000 do
        send(self(), {:ignored, i})
      end

      # Now try to receive a specific message
      start = System.monotonic_time(:microsecond)

      receive do
        {:target, value} -> value
      after
        0 -> :not_found
      end

      elapsed = System.monotonic_time(:microsecond) - start
      IO.puts("Bad selective receive took: #{elapsed} microseconds")
    end)

    Process.sleep(100)

    # Good: Process messages in order or use tagged messages
    good_process = spawn(fn ->
      # Fill mailbox
      for i <- 1..10000 do
        send(self(), {:data, i})
      end

      start = System.monotonic_time(:microsecond)

      # Process in order - no scanning
      receive do
        {:data, value} -> value
      after
        0 -> :not_found
      end

      elapsed = System.monotonic_time(:microsecond) - start
      IO.puts("Good in-order receive took: #{elapsed} microseconds")
    end)

    Process.sleep(200)
  end
end

SelectiveReceive.demo()

# Output:
# Bad selective receive took: 1234 microseconds
# Good in-order receive took: 5 microseconds
```

---

## Common Patterns and Anti-Patterns

### Anti-Pattern: Synchronous Everything

```elixir
# BAD: Making every call synchronous defeats the purpose of concurrency
defmodule BadExample do
  def fetch_user(id) do
    task = Task.async(fn -> db_query("users", id) end)
    Task.await(task)  # Blocks immediately - no concurrency benefit
  end

  defp db_query(table, id) do
    Process.sleep(100)
    %{id: id, table: table}
  end
end

# GOOD: Batch async operations
defmodule GoodExample do
  def fetch_users(ids) do
    ids
    |> Enum.map(fn id -> Task.async(fn -> db_query("users", id) end) end)
    |> Task.await_many()  # All queries run concurrently
  end

  defp db_query(table, id) do
    Process.sleep(100)
    %{id: id, table: table}
  end
end
```

### Pattern: Bounded Concurrency

```elixir
defmodule BoundedConcurrency do
  @doc """
  Process a large list with bounded concurrency to avoid overwhelming resources.
  """
  def process_large_list(items, processor_fn, max_concurrency \\ 10) do
    items
    |> Task.async_stream(processor_fn,
        max_concurrency: max_concurrency,
        timeout: 30_000,
        on_timeout: :kill_task
      )
    |> Enum.reduce({[], []}, fn
      {:ok, result}, {successes, failures} ->
        {[result | successes], failures}
      {:exit, reason}, {successes, failures} ->
        {successes, [reason | failures]}
    end)
  end
end
```

### Pattern: Circuit Breaker with Processes

```elixir
defmodule CircuitBreaker do
  @moduledoc """
  A simple circuit breaker pattern using processes.
  """

  defstruct [:name, :state, :failure_count, :last_failure, :threshold, :timeout]

  def start_link(name, opts \\ []) do
    threshold = Keyword.get(opts, :threshold, 5)
    timeout = Keyword.get(opts, :timeout, 30_000)

    pid = spawn_link(fn ->
      loop(%__MODULE__{
        name: name,
        state: :closed,
        failure_count: 0,
        last_failure: nil,
        threshold: threshold,
        timeout: timeout
      })
    end)

    Process.register(pid, name)
    {:ok, pid}
  end

  defp loop(breaker) do
    receive do
      {:call, caller, ref, fun} ->
        case breaker.state do
          :open ->
            if should_attempt_reset?(breaker) do
              # Half-open: try one request
              try_call(caller, ref, fun, %{breaker | state: :half_open})
            else
              send(caller, {:error, ref, :circuit_open})
              loop(breaker)
            end

          _ ->
            try_call(caller, ref, fun, breaker)
        end

      {:status, caller} ->
        send(caller, {:status, breaker.state, breaker.failure_count})
        loop(breaker)

      :reset ->
        loop(%{breaker | state: :closed, failure_count: 0})

      :stop ->
        :ok
    end
  end

  defp try_call(caller, ref, fun, breaker) do
    try do
      result = fun.()
      send(caller, {:ok, ref, result})
      # Success - reset to closed
      loop(%{breaker | state: :closed, failure_count: 0})
    rescue
      e ->
        send(caller, {:error, ref, e})
        handle_failure(breaker)
    end
  end

  defp handle_failure(breaker) do
    new_count = breaker.failure_count + 1
    now = System.monotonic_time(:millisecond)

    if new_count >= breaker.threshold do
      IO.puts("[CircuitBreaker] #{breaker.name} opened after #{new_count} failures")
      loop(%{breaker | state: :open, failure_count: new_count, last_failure: now})
    else
      loop(%{breaker | failure_count: new_count, last_failure: now})
    end
  end

  defp should_attempt_reset?(breaker) do
    now = System.monotonic_time(:millisecond)
    breaker.last_failure == nil or (now - breaker.last_failure) > breaker.timeout
  end

  # Client API

  def call(name, fun) do
    ref = make_ref()
    send(name, {:call, self(), ref, fun})

    receive do
      {:ok, ^ref, result} -> {:ok, result}
      {:error, ^ref, reason} -> {:error, reason}
    after
      5000 -> {:error, :timeout}
    end
  end

  def status(name) do
    send(name, {:status, self()})

    receive do
      {:status, state, count} -> {state, count}
    after
      1000 -> {:error, :timeout}
    end
  end
end

# Usage
{:ok, _} = CircuitBreaker.start_link(:external_api, threshold: 3, timeout: 5000)

# Simulate failures
for i <- 1..5 do
  result = CircuitBreaker.call(:external_api, fn ->
    if :rand.uniform(2) == 1, do: raise("API Error"), else: "success"
  end)
  IO.puts("Call #{i}: #{inspect(result)}, Status: #{inspect(CircuitBreaker.status(:external_api))}")
  Process.sleep(100)
end
```

---

## Summary

Elixir processes are the foundation of concurrent and fault-tolerant systems on the BEAM. Here are the key takeaways:

1. **Processes are cheap** - Do not hesitate to spawn thousands of them. They are not OS threads.

2. **Message passing is the only way to communicate** - No shared memory means no race conditions, no locks, no deadlocks.

3. **Links propagate failures** - Use them when processes should live and die together.

4. **Monitors observe failures** - Use them when you need to know about failures without being affected.

5. **The Task module simplifies common patterns** - Use it for async/await style concurrency.

6. **Let it crash** - Design for failure recovery rather than trying to prevent all failures.

7. **Watch your mailboxes** - Unbounded queues can cause memory issues.

8. **Use OTP for production** - GenServer, Supervisor, and Application provide battle-tested abstractions.

The process model takes some getting used to if you come from languages with shared-memory concurrency. But once it clicks, you will find it enables building systems that are both highly concurrent and remarkably reliable.

---

## Start Monitoring Your Elixir Applications with OneUptime

Building concurrent Elixir applications is powerful, but you need visibility into how those processes behave in production. Are your GenServers keeping up with message queues? Are supervisors restarting workers too frequently? Is your system handling the load you expect?

**OneUptime** provides comprehensive observability for your Elixir and Phoenix applications:

- **Real-time monitoring** of your application endpoints and health checks
- **OpenTelemetry integration** to trace requests across distributed processes
- **Custom metrics** for tracking process counts, message queue depths, and more
- **Alerting** when your concurrent systems show signs of stress
- **Status pages** to keep your users informed during incidents

Your Elixir processes are doing incredible work. Make sure you can see what they are up to.

**Get started with OneUptime today at [oneuptime.com](https://oneuptime.com)** - open source, self-hostable, and built for teams who care about reliability.
