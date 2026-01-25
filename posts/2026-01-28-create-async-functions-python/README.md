# How to Create Async Functions in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Async, Asyncio, Concurrency, Performance, Coroutines

Description: Learn how to write asynchronous code in Python using async/await. This guide covers coroutines, tasks, event loops, and practical patterns for concurrent programming.

---

> Asynchronous programming in Python allows you to write concurrent code that can handle many operations simultaneously without threads. Using async/await, you can build efficient I/O-bound applications that scale well.

This guide covers the fundamentals of async programming in Python, from basic coroutines to advanced patterns for real-world applications.

---

## Understanding Async/Await

### Basic Coroutine

```python
# basic_async.py
# Introduction to async functions
import asyncio

# Define an async function (coroutine)
async def greet(name: str) -> str:
    """Async function that simulates a delay."""
    print(f"Starting greeting for {name}")
    await asyncio.sleep(1)  # Non-blocking sleep
    print(f"Finished greeting for {name}")
    return f"Hello, {name}!"

# Running a coroutine
async def main():
    # Await the coroutine to get its result
    result = await greet("Alice")
    print(result)

# Run the event loop
asyncio.run(main())

# Key concepts:
# - async def creates a coroutine function
# - await pauses execution until the awaited operation completes
# - asyncio.run() starts the event loop and runs the main coroutine
```

### Concurrent Execution

```python
# concurrent_tasks.py
# Running multiple coroutines concurrently
import asyncio

async def fetch_data(source: str, delay: float) -> dict:
    """Simulate fetching data from a source."""
    print(f"Fetching from {source}...")
    await asyncio.sleep(delay)
    return {"source": source, "data": f"Data from {source}"}

async def main():
    # Sequential execution - takes 3 seconds total
    result1 = await fetch_data("API 1", 1)
    result2 = await fetch_data("API 2", 1)
    result3 = await fetch_data("API 3", 1)

    # Concurrent execution - takes 1 second total
    results = await asyncio.gather(
        fetch_data("API 1", 1),
        fetch_data("API 2", 1),
        fetch_data("API 3", 1)
    )
    print(f"All results: {results}")

asyncio.run(main())
```

---

## Creating and Managing Tasks

### Using asyncio.create_task

```python
# task_management.py
# Creating and managing async tasks
import asyncio
from typing import List

async def download_file(filename: str) -> str:
    """Simulate downloading a file."""
    print(f"Starting download: {filename}")
    await asyncio.sleep(2)
    print(f"Completed: {filename}")
    return f"Contents of {filename}"

async def main():
    # Create tasks to run concurrently
    task1 = asyncio.create_task(download_file("file1.txt"))
    task2 = asyncio.create_task(download_file("file2.txt"))
    task3 = asyncio.create_task(download_file("file3.txt"))

    # Do other work while downloads run in background
    print("Downloads started, doing other work...")
    await asyncio.sleep(0.5)

    # Wait for all tasks to complete
    result1 = await task1
    result2 = await task2
    result3 = await task3

    print(f"All downloads complete!")

asyncio.run(main())
```

### Task Cancellation

```python
# task_cancellation.py
# Handling task cancellation
import asyncio

async def long_running_task():
    """Task that can be cancelled."""
    try:
        print("Task started")
        for i in range(10):
            print(f"Working... step {i}")
            await asyncio.sleep(1)
        return "Task completed"
    except asyncio.CancelledError:
        print("Task was cancelled!")
        # Cleanup code here
        raise  # Re-raise to properly handle cancellation

async def main():
    # Create and start the task
    task = asyncio.create_task(long_running_task())

    # Wait a bit, then cancel
    await asyncio.sleep(3)
    task.cancel()

    try:
        await task
    except asyncio.CancelledError:
        print("Main: confirmed task cancellation")

asyncio.run(main())
```

---

## Gathering and Waiting

### asyncio.gather

```python
# gather_examples.py
# Using asyncio.gather for concurrent execution
import asyncio

async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(1)
    return {"id": user_id, "name": f"User {user_id}"}

async def fetch_posts(user_id: int) -> list:
    await asyncio.sleep(1.5)
    return [{"id": i, "title": f"Post {i}"} for i in range(3)]

async def fetch_comments(post_id: int) -> list:
    await asyncio.sleep(0.5)
    return [{"id": i, "text": f"Comment {i}"} for i in range(2)]

async def main():
    # Gather with all successful results
    users = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
        fetch_user(3)
    )
    print(f"Users: {users}")

    # Gather with exception handling
    async def might_fail(n: int):
        if n == 2:
            raise ValueError("Error for 2")
        await asyncio.sleep(1)
        return n * 2

    # return_exceptions=True returns exceptions instead of raising
    results = await asyncio.gather(
        might_fail(1),
        might_fail(2),
        might_fail(3),
        return_exceptions=True
    )

    for result in results:
        if isinstance(result, Exception):
            print(f"Got exception: {result}")
        else:
            print(f"Got result: {result}")

asyncio.run(main())
```

### asyncio.wait and asyncio.as_completed

```python
# wait_examples.py
# Advanced waiting patterns
import asyncio

async def task(name: str, duration: float) -> str:
    await asyncio.sleep(duration)
    return f"{name} completed in {duration}s"

async def main():
    tasks = [
        asyncio.create_task(task("A", 2)),
        asyncio.create_task(task("B", 1)),
        asyncio.create_task(task("C", 3))
    ]

    # Wait for first completed
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )
    print(f"First completed: {done.pop().result()}")

    # Process results as they complete
    tasks = [
        asyncio.create_task(task("X", 2)),
        asyncio.create_task(task("Y", 1)),
        asyncio.create_task(task("Z", 3))
    ]

    for coro in asyncio.as_completed(tasks):
        result = await coro
        print(f"Completed: {result}")

asyncio.run(main())
```

---

## Timeouts

```python
# timeout_handling.py
# Setting timeouts for async operations
import asyncio

async def slow_operation():
    """Operation that takes too long."""
    await asyncio.sleep(10)
    return "Done"

async def main():
    # Using asyncio.wait_for with timeout
    try:
        result = await asyncio.wait_for(
            slow_operation(),
            timeout=2.0
        )
    except asyncio.TimeoutError:
        print("Operation timed out!")

    # Using asyncio.timeout context manager (Python 3.11+)
    async with asyncio.timeout(2.0):
        await slow_operation()  # Raises TimeoutError

    # Timeout with default value
    async def with_timeout(coro, timeout: float, default=None):
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except asyncio.TimeoutError:
            return default

    result = await with_timeout(slow_operation(), 2.0, default="Timeout")
    print(f"Result: {result}")

asyncio.run(main())
```

---

## Async Context Managers and Iterators

### Async Context Managers

```python
# async_context_managers.py
# Creating async context managers
import asyncio

class AsyncDatabaseConnection:
    """Async context manager for database connections."""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.connection = None

    async def __aenter__(self):
        """Async enter - establish connection."""
        print(f"Connecting to {self.connection_string}...")
        await asyncio.sleep(0.5)  # Simulate connection time
        self.connection = {"connected": True}
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async exit - close connection."""
        print("Closing connection...")
        await asyncio.sleep(0.1)
        self.connection = None
        return False  # Do not suppress exceptions

    async def query(self, sql: str):
        """Execute a query."""
        await asyncio.sleep(0.2)
        return [{"id": 1, "name": "Alice"}]

async def main():
    async with AsyncDatabaseConnection("postgresql://localhost/db") as db:
        results = await db.query("SELECT * FROM users")
        print(f"Query results: {results}")

asyncio.run(main())


# Using contextlib for simpler async context managers
from contextlib import asynccontextmanager

@asynccontextmanager
async def async_file_handler(filename: str, mode: str = "r"):
    """Async context manager using decorator."""
    print(f"Opening {filename}")
    await asyncio.sleep(0.1)  # Simulate async open

    handle = {"filename": filename, "mode": mode}
    try:
        yield handle
    finally:
        print(f"Closing {filename}")
        await asyncio.sleep(0.1)  # Simulate async close

async def main():
    async with async_file_handler("data.txt", "w") as f:
        print(f"Working with {f}")

asyncio.run(main())
```

### Async Iterators

```python
# async_iterators.py
# Creating async iterators and generators
import asyncio

class AsyncRange:
    """Async iterator that yields numbers with delays."""

    def __init__(self, start: int, stop: int, delay: float = 0.1):
        self.current = start
        self.stop = stop
        self.delay = delay

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.current >= self.stop:
            raise StopAsyncIteration

        await asyncio.sleep(self.delay)
        value = self.current
        self.current += 1
        return value

async def main():
    # Using async iterator
    async for num in AsyncRange(0, 5):
        print(f"Got: {num}")

asyncio.run(main())


# Async generator (simpler approach)
async def async_range(start: int, stop: int, delay: float = 0.1):
    """Async generator that yields numbers with delays."""
    for i in range(start, stop):
        await asyncio.sleep(delay)
        yield i

async def fetch_pages(urls: list):
    """Async generator for fetching pages."""
    for url in urls:
        await asyncio.sleep(0.5)  # Simulate fetch
        yield {"url": url, "content": f"Content from {url}"}

async def main():
    async for num in async_range(0, 5):
        print(num)

    urls = ["page1", "page2", "page3"]
    async for page in fetch_pages(urls):
        print(f"Fetched: {page['url']}")

asyncio.run(main())
```

---

## Semaphores and Rate Limiting

```python
# rate_limiting.py
# Controlling concurrency with semaphores
import asyncio

async def fetch_with_limit(url: str, semaphore: asyncio.Semaphore) -> dict:
    """Fetch URL with concurrency limit."""
    async with semaphore:
        print(f"Fetching {url}")
        await asyncio.sleep(1)  # Simulate network request
        return {"url": url, "status": 200}

async def main():
    # Limit to 3 concurrent requests
    semaphore = asyncio.Semaphore(3)

    urls = [f"https://api.example.com/item/{i}" for i in range(10)]

    tasks = [
        fetch_with_limit(url, semaphore)
        for url in urls
    ]

    results = await asyncio.gather(*tasks)
    print(f"Fetched {len(results)} items")

asyncio.run(main())


# Rate limiter class
class RateLimiter:
    """Rate limiter using token bucket algorithm."""

    def __init__(self, rate: float, capacity: int = 1):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = asyncio.get_event_loop().time()
        self.lock = asyncio.Lock()

    async def acquire(self):
        """Acquire a token, waiting if necessary."""
        async with self.lock:
            now = asyncio.get_event_loop().time()
            elapsed = now - self.last_update
            self.tokens = min(
                self.capacity,
                self.tokens + elapsed * self.rate
            )
            self.last_update = now

            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

async def main():
    limiter = RateLimiter(rate=2.0)  # 2 requests per second

    async def limited_request(n: int):
        await limiter.acquire()
        print(f"Request {n} at {asyncio.get_event_loop().time():.2f}")

    await asyncio.gather(*[limited_request(i) for i in range(10)])

asyncio.run(main())
```

---

## Error Handling Patterns

```python
# error_handling.py
# Proper error handling in async code
import asyncio
from typing import List, Any

async def might_fail(n: int) -> int:
    if n == 3:
        raise ValueError(f"Error with {n}")
    await asyncio.sleep(0.1)
    return n * 2

async def safe_gather(coros: List) -> List[Any]:
    """Gather that handles exceptions gracefully."""
    results = await asyncio.gather(*coros, return_exceptions=True)

    successes = []
    failures = []

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            failures.append((i, result))
        else:
            successes.append(result)

    if failures:
        print(f"Failed tasks: {failures}")

    return successes

async def main():
    tasks = [might_fail(i) for i in range(5)]
    results = await safe_gather(tasks)
    print(f"Successful results: {results}")

asyncio.run(main())
```

---

## Integration with Sync Code

```python
# sync_integration.py
# Running async code from synchronous context
import asyncio

async def async_function() -> str:
    await asyncio.sleep(1)
    return "Async result"

# Running from sync code
def sync_wrapper():
    """Run async code from synchronous function."""
    # Option 1: asyncio.run (creates new event loop)
    result = asyncio.run(async_function())
    return result

# Running sync code in async context
def blocking_io():
    import time
    time.sleep(2)
    return "Blocking result"

async def main():
    # Run blocking code in thread pool
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, blocking_io)
    print(f"Got: {result}")

asyncio.run(main())
```

---

## Conclusion

Async programming in Python enables efficient concurrent code:

- Use `async def` to define coroutines
- Use `await` to pause for async operations
- Use `asyncio.gather()` for concurrent execution
- Use `asyncio.create_task()` for background tasks
- Use semaphores for rate limiting
- Handle cancellation and timeouts properly

Async is ideal for I/O-bound operations like network requests, file operations, and database queries.

---

*Building async Python applications? [OneUptime](https://oneuptime.com) helps you monitor application performance, track async task completion, and alert on failures.*

