# How to Build Asyncio Event Loops in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Asyncio, Concurrency, Event Loop

Description: Learn how asyncio event loops work in Python and how to customize them for advanced concurrency patterns.

---

The asyncio event loop is the central execution mechanism for asynchronous programming in Python. Understanding how it works under the hood empowers you to build more efficient concurrent applications and customize behavior for specialized use cases.

## Event Loop Internals

At its core, an event loop is a programming construct that waits for and dispatches events. In asyncio, the event loop manages the execution of coroutines, handles I/O operations, and schedules callbacks. It continuously cycles through registered tasks, checking for completion and executing ready callbacks.

```python
import asyncio

async def task_one():
    print("Task one starting")
    await asyncio.sleep(1)
    print("Task one complete")

async def task_two():
    print("Task two starting")
    await asyncio.sleep(0.5)
    print("Task two complete")

async def main():
    await asyncio.gather(task_one(), task_two())

asyncio.run(main())
```

The event loop schedules both tasks concurrently. While `task_one` waits for its sleep to complete, `task_two` continues execution.

## get_event_loop vs new_event_loop

Python provides two primary ways to obtain an event loop. Understanding the difference is crucial for proper resource management.

```python
import asyncio

# Get the running loop (preferred in async context)
async def get_current():
    loop = asyncio.get_running_loop()
    print(f"Running loop: {loop}")

# Create a new loop explicitly
def create_new_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(some_coroutine())
    finally:
        loop.close()

# Deprecated pattern (avoid in Python 3.10+)
# loop = asyncio.get_event_loop()
```

Use `asyncio.get_running_loop()` inside async functions and `asyncio.new_event_loop()` when you need explicit control over loop lifecycle, such as in multi-threaded applications.

## Custom Event Loop Policies

Event loop policies control how loops are created and managed. You can implement custom policies for specialized behavior.

```python
import asyncio

class CustomEventLoopPolicy(asyncio.DefaultEventLoopPolicy):
    def new_event_loop(self):
        loop = super().new_event_loop()
        loop.set_debug(True)  # Enable debug mode by default
        print("Created new custom event loop")
        return loop

# Set the custom policy globally
asyncio.set_event_loop_policy(CustomEventLoopPolicy())

# Now all new loops use your custom policy
async def main():
    loop = asyncio.get_running_loop()
    print(f"Debug mode: {loop.get_debug()}")

asyncio.run(main())
```

Custom policies are useful for instrumenting loops with logging, metrics collection, or integrating with third-party frameworks like uvloop for improved performance.

## Running Synchronous Code in Async Context

Blocking operations can stall your entire event loop. Use `run_in_executor` to offload synchronous work to a thread pool.

```python
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

def blocking_operation(duration):
    """Simulates a blocking I/O operation"""
    time.sleep(duration)
    return f"Completed after {duration}s"

async def main():
    loop = asyncio.get_running_loop()

    # Use default executor (ThreadPoolExecutor)
    result = await loop.run_in_executor(None, blocking_operation, 2)
    print(result)

    # Use custom executor for more control
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            loop.run_in_executor(executor, blocking_operation, i)
            for i in range(1, 4)
        ]
        results = await asyncio.gather(*futures)
        print(results)

asyncio.run(main())
```

This pattern keeps your event loop responsive while handling CPU-bound or legacy synchronous code.

## Integrating with Threading

When combining asyncio with threads, each thread typically needs its own event loop. Here is a pattern for running async code from synchronous threads.

```python
import asyncio
import threading

async def async_worker(name):
    await asyncio.sleep(1)
    return f"Worker {name} finished"

def thread_with_loop(name):
    """Run async code in a dedicated thread with its own loop"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(async_worker(name))
        print(f"Thread result: {result}")
    finally:
        loop.close()

def run_async_from_sync(coro):
    """Safely run a coroutine from synchronous code"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    # If loop is running, use thread-safe method
    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result(timeout=30)

# Start multiple threads with their own loops
threads = [
    threading.Thread(target=thread_with_loop, args=(f"T{i}",))
    for i in range(3)
]

for t in threads:
    t.start()
for t in threads:
    t.join()
```

The `run_coroutine_threadsafe` function allows scheduling coroutines on a running loop from another thread, returning a `concurrent.futures.Future` for synchronization.

## Best Practices

When working with event loops, keep these guidelines in mind. Always use `asyncio.run()` as your entry point for async programs. Avoid mixing `get_event_loop()` patterns in modern code. Close loops explicitly when using `new_event_loop()`. Use `run_in_executor` for blocking operations rather than blocking the loop directly.

Understanding event loop mechanics enables you to build robust async applications, integrate with legacy code, and optimize performance for your specific use case.
