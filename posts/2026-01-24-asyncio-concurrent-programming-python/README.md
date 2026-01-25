# How to Use asyncio for Concurrent Programming in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, asyncio, Concurrency, Async/Await, Performance

Description: Master Python's asyncio library for writing concurrent code. Learn async/await syntax, running tasks concurrently, and handling real-world scenarios like API calls and file I/O.

---

> When your program spends time waiting for I/O operations like network requests or file reads, asyncio lets it do other work instead of sitting idle. This guide covers the fundamentals of asyncio and practical patterns for building efficient concurrent applications.

Asyncio is Python's built-in library for writing concurrent code using the async/await syntax. It is particularly effective for I/O-bound operations where your program waits for external resources like databases, APIs, or file systems.

---

## Understanding Async vs Sync

First, let us see why async matters:

```python
import time
import asyncio

# Synchronous version - total time: 3 seconds
def sync_fetch_data():
    time.sleep(1)  # Simulates network request
    return "data"

def sync_main():
    start = time.time()

    result1 = sync_fetch_data()
    result2 = sync_fetch_data()
    result3 = sync_fetch_data()

    print(f"Sync total time: {time.time() - start:.2f}s")

# Asynchronous version - total time: ~1 second
async def async_fetch_data():
    await asyncio.sleep(1)  # Non-blocking sleep
    return "data"

async def async_main():
    start = time.time()

    # Run all three concurrently
    results = await asyncio.gather(
        async_fetch_data(),
        async_fetch_data(),
        async_fetch_data()
    )

    print(f"Async total time: {time.time() - start:.2f}s")

# Run both
sync_main()           # Sync total time: 3.00s
asyncio.run(async_main())  # Async total time: 1.00s
```

The async version runs all three operations concurrently while waiting.

---

## Basic Async/Await Syntax

### Defining Async Functions

```python
import asyncio

# Define an async function with 'async def'
async def greet(name):
    print(f"Hello, {name}!")
    await asyncio.sleep(1)  # Non-blocking wait
    print(f"Goodbye, {name}!")
    return f"Greeted {name}"

# Run an async function
result = asyncio.run(greet("Alice"))
print(result)
```

### The await Keyword

`await` can only be used inside async functions and suspends execution until the awaited coroutine completes:

```python
async def fetch_user(user_id):
    await asyncio.sleep(0.5)  # Simulate API call
    return {"id": user_id, "name": f"User {user_id}"}

async def fetch_posts(user_id):
    await asyncio.sleep(0.5)  # Simulate API call
    return [{"id": 1, "title": "Post 1"}, {"id": 2, "title": "Post 2"}]

async def get_user_with_posts(user_id):
    # These run sequentially
    user = await fetch_user(user_id)
    posts = await fetch_posts(user_id)
    user["posts"] = posts
    return user

# Run it
result = asyncio.run(get_user_with_posts(123))
print(result)
```

---

## Running Tasks Concurrently

### Using asyncio.gather()

`gather()` runs multiple coroutines concurrently and returns results in order:

```python
import asyncio

async def fetch_url(url):
    print(f"Fetching {url}")
    await asyncio.sleep(1)  # Simulate network delay
    return f"Content from {url}"

async def main():
    urls = [
        "https://api.example.com/users",
        "https://api.example.com/posts",
        "https://api.example.com/comments"
    ]

    # Fetch all URLs concurrently
    results = await asyncio.gather(*[fetch_url(url) for url in urls])

    for url, result in zip(urls, results):
        print(f"{url}: {result}")

asyncio.run(main())
```

### Using asyncio.create_task()

Create tasks to run in the background:

```python
async def background_task():
    while True:
        print("Background task running...")
        await asyncio.sleep(2)

async def main():
    # Create a background task
    task = asyncio.create_task(background_task())

    # Do other work
    for i in range(5):
        print(f"Main work: {i}")
        await asyncio.sleep(1)

    # Cancel the background task when done
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("Background task cancelled")

asyncio.run(main())
```

### Waiting for Tasks with asyncio.wait()

More control over task completion:

```python
async def task(name, duration):
    await asyncio.sleep(duration)
    return f"{name} completed"

async def main():
    tasks = [
        asyncio.create_task(task("A", 1)),
        asyncio.create_task(task("B", 2)),
        asyncio.create_task(task("C", 3))
    ]

    # Wait for first task to complete
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )

    print(f"First completed: {done.pop().result()}")
    print(f"Still pending: {len(pending)}")

    # Cancel pending tasks
    for t in pending:
        t.cancel()

asyncio.run(main())
```

---

## Error Handling in Async Code

### Handling Exceptions with gather()

```python
async def might_fail(n):
    await asyncio.sleep(0.1)
    if n == 2:
        raise ValueError(f"Task {n} failed!")
    return f"Task {n} succeeded"

async def main():
    # By default, first exception cancels all tasks
    try:
        results = await asyncio.gather(
            might_fail(1),
            might_fail(2),  # This will fail
            might_fail(3)
        )
    except ValueError as e:
        print(f"Error: {e}")

    # Use return_exceptions=True to get all results
    results = await asyncio.gather(
        might_fail(1),
        might_fail(2),
        might_fail(3),
        return_exceptions=True
    )

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"Task {i+1} failed: {result}")
        else:
            print(f"Task {i+1}: {result}")

asyncio.run(main())
```

### Timeout Handling

```python
async def slow_operation():
    await asyncio.sleep(10)
    return "Done"

async def main():
    try:
        # Set a timeout of 2 seconds
        result = await asyncio.wait_for(slow_operation(), timeout=2.0)
        print(result)
    except asyncio.TimeoutError:
        print("Operation timed out!")

asyncio.run(main())
```

---

## Practical Example: Concurrent API Calls

```python
import asyncio
import aiohttp

async def fetch_json(session, url):
    """Fetch JSON from a URL using aiohttp."""
    async with session.get(url) as response:
        return await response.json()

async def fetch_multiple_apis():
    """Fetch data from multiple APIs concurrently."""

    urls = {
        'users': 'https://jsonplaceholder.typicode.com/users',
        'posts': 'https://jsonplaceholder.typicode.com/posts',
        'comments': 'https://jsonplaceholder.typicode.com/comments'
    }

    async with aiohttp.ClientSession() as session:
        # Create tasks for all URLs
        tasks = {
            name: asyncio.create_task(fetch_json(session, url))
            for name, url in urls.items()
        }

        # Wait for all to complete
        results = {}
        for name, task in tasks.items():
            try:
                results[name] = await task
            except Exception as e:
                results[name] = f"Error: {e}"

        return results

# Run and print results
data = asyncio.run(fetch_multiple_apis())
print(f"Users: {len(data['users'])}")
print(f"Posts: {len(data['posts'])}")
print(f"Comments: {len(data['comments'])}")
```

---

## Async Context Managers and Iterators

### Async Context Manager

```python
class AsyncDatabaseConnection:
    """Example async context manager for database connections."""

    async def __aenter__(self):
        print("Connecting to database...")
        await asyncio.sleep(0.5)  # Simulate connection time
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Closing database connection...")
        await asyncio.sleep(0.1)

    async def query(self, sql):
        await asyncio.sleep(0.2)
        return [{"id": 1}, {"id": 2}]

async def main():
    async with AsyncDatabaseConnection() as db:
        results = await db.query("SELECT * FROM users")
        print(f"Results: {results}")

asyncio.run(main())
```

### Async Iterator

```python
class AsyncRange:
    """Example async iterator."""

    def __init__(self, start, end):
        self.start = start
        self.end = end

    def __aiter__(self):
        self.current = self.start
        return self

    async def __anext__(self):
        if self.current >= self.end:
            raise StopAsyncIteration

        await asyncio.sleep(0.1)  # Simulate async operation
        value = self.current
        self.current += 1
        return value

async def main():
    async for num in AsyncRange(0, 5):
        print(num)

asyncio.run(main())
```

---

## Semaphores for Rate Limiting

Limit concurrent operations:

```python
import asyncio

async def fetch_with_limit(semaphore, url):
    """Fetch URL with concurrency limit."""
    async with semaphore:
        print(f"Fetching {url}")
        await asyncio.sleep(1)
        return f"Result from {url}"

async def main():
    # Limit to 3 concurrent requests
    semaphore = asyncio.Semaphore(3)

    urls = [f"http://example.com/{i}" for i in range(10)]

    tasks = [fetch_with_limit(semaphore, url) for url in urls]
    results = await asyncio.gather(*tasks)

    print(f"Completed {len(results)} requests")

asyncio.run(main())
```

---

## Producer-Consumer Pattern with Queues

```python
import asyncio
import random

async def producer(queue, name):
    """Produce items and put them in the queue."""
    for i in range(5):
        item = f"{name}-item-{i}"
        await queue.put(item)
        print(f"Produced: {item}")
        await asyncio.sleep(random.uniform(0.1, 0.5))

async def consumer(queue, name):
    """Consume items from the queue."""
    while True:
        item = await queue.get()
        print(f"{name} consuming: {item}")
        await asyncio.sleep(random.uniform(0.2, 0.6))
        queue.task_done()

async def main():
    queue = asyncio.Queue()

    # Start producers
    producers = [
        asyncio.create_task(producer(queue, f"Producer-{i}"))
        for i in range(2)
    ]

    # Start consumers
    consumers = [
        asyncio.create_task(consumer(queue, f"Consumer-{i}"))
        for i in range(3)
    ]

    # Wait for producers to finish
    await asyncio.gather(*producers)

    # Wait for queue to be processed
    await queue.join()

    # Cancel consumers
    for c in consumers:
        c.cancel()

asyncio.run(main())
```

---

## Running Blocking Code in Async Context

```python
import asyncio
import time

def blocking_operation():
    """A blocking I/O operation (simulate with sleep)."""
    time.sleep(2)
    return "Blocking result"

async def main():
    loop = asyncio.get_event_loop()

    # Run blocking code in thread pool
    result = await loop.run_in_executor(
        None,  # Use default executor
        blocking_operation
    )

    print(f"Result: {result}")

asyncio.run(main())
```

---

## Best Practices

### 1. Do Not Block the Event Loop

```python
# Bad: Blocks the entire event loop
async def bad_example():
    time.sleep(5)  # Blocks!

# Good: Use async sleep
async def good_example():
    await asyncio.sleep(5)  # Non-blocking
```

### 2. Create Tasks for Independent Operations

```python
# Sequential (slow)
async def sequential():
    result1 = await fetch_data(1)
    result2 = await fetch_data(2)

# Concurrent (fast)
async def concurrent():
    task1 = asyncio.create_task(fetch_data(1))
    task2 = asyncio.create_task(fetch_data(2))
    result1 = await task1
    result2 = await task2
```

### 3. Handle Cancellation Gracefully

```python
async def cancellable_task():
    try:
        while True:
            await asyncio.sleep(1)
            print("Working...")
    except asyncio.CancelledError:
        print("Task cancelled, cleaning up...")
        raise  # Re-raise to properly mark as cancelled
```

---

## Summary

Key asyncio concepts:

- Use `async def` to define coroutines
- Use `await` to wait for async operations
- Use `asyncio.gather()` to run multiple coroutines concurrently
- Use `asyncio.create_task()` for background tasks
- Use semaphores to limit concurrency
- Use `run_in_executor()` for blocking operations

Asyncio is ideal for I/O-bound tasks like network requests, database queries, and file operations. For CPU-bound work, consider multiprocessing instead.
