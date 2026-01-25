# How to Batch API Requests into Single Queries in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, API, Batching, Performance, FastAPI, GraphQL, Optimization

Description: Learn how to batch multiple API requests into single queries in Python. This guide covers request batching patterns, DataLoader implementation, bulk endpoints, and performance optimization techniques.

---

> Making individual API calls for each item is inefficient. Network latency, connection overhead, and server processing time add up quickly. Batching combines multiple requests into one, dramatically improving performance. This guide shows you practical batching patterns for Python APIs.

Whether you are building a backend that consumes external APIs or designing your own API, understanding batching will help you build faster, more efficient systems.

---

## The Problem with Individual Requests

Consider fetching user profiles for a list of user IDs. The naive approach makes one request per user.

```python
# slow_approach.py
# Making individual requests is slow and inefficient
import asyncio
import httpx
import time

async def fetch_user(client: httpx.AsyncClient, user_id: str) -> dict:
    """Fetch a single user - one HTTP request per user"""
    response = await client.get(f"https://api.example.com/users/{user_id}")
    return response.json()

async def fetch_users_individually(user_ids: list[str]) -> list[dict]:
    """Fetch multiple users one at a time"""
    async with httpx.AsyncClient() as client:
        # This makes N HTTP requests for N users
        # With 100ms latency per request, 100 users = 10 seconds
        users = []
        for user_id in user_ids:
            user = await fetch_user(client, user_id)
            users.append(user)
        return users

# Even with concurrency, you still have N connections
async def fetch_users_concurrent(user_ids: list[str]) -> list[dict]:
    """Fetch users concurrently - still N requests"""
    async with httpx.AsyncClient() as client:
        tasks = [fetch_user(client, uid) for uid in user_ids]
        return await asyncio.gather(*tasks)
        # Faster due to parallelism, but still creates N connections
        # May hit rate limits or overwhelm the server
```

The batched approach sends one request for all users:

```python
# batched_approach.py
# Batching reduces N requests to 1 request
async def fetch_users_batched(user_ids: list[str]) -> list[dict]:
    """Fetch multiple users in a single request"""
    async with httpx.AsyncClient() as client:
        # Send all IDs in one request
        response = await client.post(
            "https://api.example.com/users/batch",
            json={"ids": user_ids}
        )
        return response.json()["users"]
    # One HTTP request regardless of how many users
    # 100ms latency for 1 user or 100 users
```

---

## Building a Batch Endpoint

If you are building an API, provide batch endpoints for resources that clients commonly fetch in bulk.

```python
# batch_endpoint.py
# FastAPI batch endpoint implementation
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio

app = FastAPI()

class BatchRequest(BaseModel):
    """Request model for batch operations"""
    ids: List[str]  # List of resource IDs to fetch

class BatchResponse(BaseModel):
    """Response model for batch operations"""
    results: Dict[str, dict]  # id -> resource mapping
    errors: Dict[str, str]    # id -> error message for failed fetches

@app.post("/users/batch", response_model=BatchResponse)
async def batch_get_users(request: BatchRequest):
    """
    Fetch multiple users in a single request.
    Returns a dict mapping user IDs to user objects.
    """
    # Limit batch size to prevent abuse
    MAX_BATCH_SIZE = 100
    if len(request.ids) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size exceeds maximum of {MAX_BATCH_SIZE}"
        )

    # Deduplicate IDs
    unique_ids = list(set(request.ids))

    # Fetch all users in parallel from database
    results = {}
    errors = {}

    async def fetch_user(user_id: str):
        try:
            user = await db.users.find_one({"_id": user_id})
            if user:
                results[user_id] = user
            else:
                errors[user_id] = "User not found"
        except Exception as e:
            errors[user_id] = str(e)

    # Execute all fetches concurrently
    await asyncio.gather(*[fetch_user(uid) for uid in unique_ids])

    return BatchResponse(results=results, errors=errors)

# Alternative: Use query parameters for simple GET batching
@app.get("/users")
async def get_users(ids: str = None):
    """
    Fetch users by comma-separated IDs.
    Example: GET /users?ids=1,2,3,4,5
    """
    if not ids:
        raise HTTPException(status_code=400, detail="ids parameter required")

    id_list = [id.strip() for id in ids.split(",")]

    if len(id_list) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 IDs allowed")

    users = await db.users.find({"_id": {"$in": id_list}}).to_list(100)

    return {"users": users}
```

---

## Client-Side Request Batching

When consuming external APIs that do not support batching, you can implement client-side batching to group requests together.

```python
# client_batcher.py
# Client-side request batching implementation
import asyncio
from typing import Dict, List, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from collections import defaultdict

T = TypeVar('T')

@dataclass
class PendingRequest:
    """Represents a request waiting in the batch queue"""
    key: str
    future: asyncio.Future

class RequestBatcher(Generic[T]):
    """
    Batches multiple requests into single batch calls.
    Collects requests over a short window, then executes them together.
    """

    def __init__(
        self,
        batch_fn: Callable[[List[str]], Dict[str, T]],
        max_batch_size: int = 100,
        batch_window_ms: int = 10
    ):
        self.batch_fn = batch_fn  # Function that fetches batch of items
        self.max_batch_size = max_batch_size
        self.batch_window_ms = batch_window_ms

        self._pending: List[PendingRequest] = []
        self._batch_scheduled = False
        self._lock = asyncio.Lock()

    async def load(self, key: str) -> T:
        """
        Request a single item. The request will be batched with others.
        Returns the result when the batch completes.
        """
        async with self._lock:
            # Create a future that will hold the result
            future = asyncio.get_event_loop().create_future()
            self._pending.append(PendingRequest(key=key, future=future))

            # Schedule batch execution if not already scheduled
            if not self._batch_scheduled:
                self._batch_scheduled = True
                asyncio.create_task(self._execute_batch())

        # Wait for batch to complete and return our result
        return await future

    async def load_many(self, keys: List[str]) -> List[T]:
        """Request multiple items, returns results in same order"""
        tasks = [self.load(key) for key in keys]
        return await asyncio.gather(*tasks)

    async def _execute_batch(self):
        """Execute the batch after a short delay to collect more requests"""
        # Wait for batch window to collect requests
        await asyncio.sleep(self.batch_window_ms / 1000)

        async with self._lock:
            # Take all pending requests
            pending = self._pending
            self._pending = []
            self._batch_scheduled = False

        if not pending:
            return

        # Get unique keys
        keys = list(set(req.key for req in pending))

        # Split into chunks if exceeds max batch size
        for i in range(0, len(keys), self.max_batch_size):
            chunk_keys = keys[i:i + self.max_batch_size]

            try:
                # Execute batch fetch
                results = await self.batch_fn(chunk_keys)

                # Resolve futures for this chunk
                for req in pending:
                    if req.key in results:
                        req.future.set_result(results[req.key])
                    else:
                        req.future.set_exception(
                            KeyError(f"Key not found: {req.key}")
                        )
            except Exception as e:
                # Reject all futures on error
                for req in pending:
                    if not req.future.done():
                        req.future.set_exception(e)

# Usage example
async def batch_fetch_users(user_ids: List[str]) -> Dict[str, dict]:
    """Batch function that fetches multiple users"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.example.com/users/batch",
            json={"ids": user_ids}
        )
        return response.json()["results"]

# Create batcher instance
user_batcher = RequestBatcher(batch_fetch_users, max_batch_size=100)

# These calls will be batched together automatically
async def process_order(order: dict):
    """Process order - user fetch will be batched with other orders"""
    user = await user_batcher.load(order["user_id"])
    # Process order with user data...
```

---

## DataLoader Pattern

The DataLoader pattern, popularized by GraphQL, provides automatic batching with caching. Here is a Python implementation.

```python
# dataloader.py
# DataLoader implementation with batching and caching
import asyncio
from typing import Dict, List, Callable, TypeVar, Generic, Optional, Any
from functools import wraps

T = TypeVar('T')

class DataLoader(Generic[T]):
    """
    DataLoader batches and caches data loading.
    - Batching: Multiple load() calls in the same tick are batched
    - Caching: Results are cached for the lifetime of the loader
    """

    def __init__(
        self,
        batch_load_fn: Callable[[List[str]], List[Optional[T]]],
        max_batch_size: int = 100,
        cache: bool = True
    ):
        self.batch_load_fn = batch_load_fn
        self.max_batch_size = max_batch_size
        self.cache_enabled = cache

        self._cache: Dict[str, T] = {}
        self._queue: List[tuple] = []  # (key, future)
        self._batch_scheduled = False

    async def load(self, key: str) -> Optional[T]:
        """Load a single item by key"""
        # Check cache first
        if self.cache_enabled and key in self._cache:
            return self._cache[key]

        # Add to batch queue
        future = asyncio.get_event_loop().create_future()
        self._queue.append((key, future))

        # Schedule batch execution
        if not self._batch_scheduled:
            self._batch_scheduled = True
            # Execute on next tick
            asyncio.get_event_loop().call_soon(
                lambda: asyncio.create_task(self._dispatch())
            )

        return await future

    async def load_many(self, keys: List[str]) -> List[Optional[T]]:
        """Load multiple items"""
        return await asyncio.gather(*[self.load(k) for k in keys])

    def prime(self, key: str, value: T):
        """Prime the cache with a value"""
        if self.cache_enabled:
            self._cache[key] = value

    def clear(self, key: str = None):
        """Clear cache for a key or all keys"""
        if key:
            self._cache.pop(key, None)
        else:
            self._cache.clear()

    async def _dispatch(self):
        """Execute the batched load"""
        self._batch_scheduled = False

        # Take the queue
        queue = self._queue
        self._queue = []

        if not queue:
            return

        # Extract unique keys while preserving order
        seen = set()
        keys = []
        for key, _ in queue:
            if key not in seen:
                seen.add(key)
                keys.append(key)

        try:
            # Call batch function
            values = await self.batch_load_fn(keys)

            # Batch function must return same number of results
            if len(values) != len(keys):
                raise ValueError(
                    f"Batch function returned {len(values)} results "
                    f"for {len(keys)} keys"
                )

            # Build key -> value mapping
            value_map = dict(zip(keys, values))

            # Cache and resolve futures
            for key, future in queue:
                value = value_map.get(key)

                if self.cache_enabled and value is not None:
                    self._cache[key] = value

                future.set_result(value)

        except Exception as e:
            # Reject all futures on error
            for _, future in queue:
                future.set_exception(e)

# Example usage with database
async def batch_load_users(keys: List[str]) -> List[Optional[dict]]:
    """Batch load function for users"""
    # Fetch all users in one query
    users = await db.users.find({"_id": {"$in": keys}}).to_list(len(keys))

    # Build lookup dict
    user_map = {u["_id"]: u for u in users}

    # Return in same order as keys, None for missing
    return [user_map.get(key) for key in keys]

# Create loader (typically per-request in web apps)
user_loader = DataLoader(batch_load_users)

# These will be batched into one database query
async def resolve_order(order):
    user = await user_loader.load(order["user_id"])
    return {"order": order, "user": user}

orders = [{"id": 1, "user_id": "u1"}, {"id": 2, "user_id": "u2"}]
results = await asyncio.gather(*[resolve_order(o) for o in orders])
# Only one DB query for both users
```

---

## Bulk Write Operations

Batching is not just for reads. Write operations benefit even more from batching.

```python
# bulk_writes.py
# Batch write operations for better performance
from typing import List, Dict, Any
from pydantic import BaseModel
import asyncio

class BulkCreateRequest(BaseModel):
    items: List[dict]

class BulkUpdateRequest(BaseModel):
    updates: List[dict]  # Each with 'id' and fields to update

class BulkDeleteRequest(BaseModel):
    ids: List[str]

class BulkWriteResult(BaseModel):
    created: int = 0
    updated: int = 0
    deleted: int = 0
    errors: List[dict] = []

@app.post("/items/bulk", response_model=BulkWriteResult)
async def bulk_write_items(request: BulkCreateRequest):
    """Create multiple items in a single request"""
    MAX_ITEMS = 1000

    if len(request.items) > MAX_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_ITEMS} items per request"
        )

    result = BulkWriteResult()

    # Validate all items first
    valid_items = []
    for i, item in enumerate(request.items):
        try:
            validated = ItemModel(**item)
            valid_items.append(validated.dict())
        except ValidationError as e:
            result.errors.append({
                "index": i,
                "error": str(e)
            })

    # Bulk insert valid items
    if valid_items:
        await db.items.insert_many(valid_items, ordered=False)
        result.created = len(valid_items)

    return result

@app.patch("/items/bulk", response_model=BulkWriteResult)
async def bulk_update_items(request: BulkUpdateRequest):
    """Update multiple items in a single request"""
    result = BulkWriteResult()

    # Build bulk operations
    operations = []
    for update in request.updates:
        item_id = update.pop("id", None)
        if not item_id:
            result.errors.append({"error": "Missing id field"})
            continue

        operations.append(
            UpdateOne(
                {"_id": item_id},
                {"$set": update}
            )
        )

    # Execute bulk write
    if operations:
        write_result = await db.items.bulk_write(operations, ordered=False)
        result.updated = write_result.modified_count

    return result

# Client-side write batching
class WriteBuffer:
    """Buffer writes and flush in batches"""

    def __init__(self, flush_fn, max_size: int = 100, flush_interval: float = 1.0):
        self.flush_fn = flush_fn
        self.max_size = max_size
        self.flush_interval = flush_interval

        self._buffer: List[dict] = []
        self._lock = asyncio.Lock()
        self._flush_task = None

    async def add(self, item: dict):
        """Add item to buffer"""
        async with self._lock:
            self._buffer.append(item)

            # Flush if buffer is full
            if len(self._buffer) >= self.max_size:
                await self._flush()
            elif self._flush_task is None:
                # Schedule delayed flush
                self._flush_task = asyncio.create_task(
                    self._delayed_flush()
                )

    async def _delayed_flush(self):
        """Flush after interval"""
        await asyncio.sleep(self.flush_interval)
        async with self._lock:
            await self._flush()
            self._flush_task = None

    async def _flush(self):
        """Execute flush"""
        if not self._buffer:
            return

        items = self._buffer
        self._buffer = []

        await self.flush_fn(items)

    async def close(self):
        """Flush remaining items and clean up"""
        if self._flush_task:
            self._flush_task.cancel()
        async with self._lock:
            await self._flush()
```

---

## GraphQL Batching

GraphQL naturally supports request batching. Here is how to implement it with Strawberry.

```python
# graphql_batching.py
# GraphQL with DataLoader for automatic batching
import strawberry
from strawberry.dataloader import DataLoader
from typing import List, Optional

# Batch load functions
async def load_users(keys: List[str]) -> List[Optional[User]]:
    users = await db.users.find({"_id": {"$in": keys}}).to_list(len(keys))
    user_map = {u["_id"]: User(**u) for u in users}
    return [user_map.get(k) for k in keys]

async def load_orders_for_users(keys: List[str]) -> List[List[Order]]:
    """Load orders grouped by user_id"""
    orders = await db.orders.find({"user_id": {"$in": keys}}).to_list(1000)

    # Group by user_id
    orders_by_user = defaultdict(list)
    for order in orders:
        orders_by_user[order["user_id"]].append(Order(**order))

    return [orders_by_user.get(k, []) for k in keys]

@strawberry.type
class Order:
    id: str
    total: float
    status: str

@strawberry.type
class User:
    id: str
    name: str
    email: str

    @strawberry.field
    async def orders(self, info) -> List[Order]:
        # This uses the DataLoader - multiple User.orders calls
        # will be batched into one database query
        loader = info.context["order_loader"]
        return await loader.load(self.id)

@strawberry.type
class Query:
    @strawberry.field
    async def users(self, ids: List[str], info) -> List[User]:
        loader = info.context["user_loader"]
        return await loader.load_many(ids)

# Context factory creates loaders per request
async def get_context():
    return {
        "user_loader": DataLoader(load_fn=load_users),
        "order_loader": DataLoader(load_fn=load_orders_for_users)
    }

schema = strawberry.Schema(query=Query)
```

---

## Performance Comparison

Here is a benchmark comparing individual requests versus batching.

```python
# benchmark.py
# Performance comparison of batching strategies
import asyncio
import time
import httpx

async def benchmark_individual(client: httpx.AsyncClient, ids: List[str]):
    """Fetch items one at a time"""
    start = time.time()

    for id in ids:
        await client.get(f"/items/{id}")

    return time.time() - start

async def benchmark_concurrent(client: httpx.AsyncClient, ids: List[str]):
    """Fetch items concurrently but individually"""
    start = time.time()

    tasks = [client.get(f"/items/{id}") for id in ids]
    await asyncio.gather(*tasks)

    return time.time() - start

async def benchmark_batched(client: httpx.AsyncClient, ids: List[str]):
    """Fetch items in a single batch request"""
    start = time.time()

    await client.post("/items/batch", json={"ids": ids})

    return time.time() - start

async def run_benchmark():
    ids = [str(i) for i in range(100)]

    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Run each approach
        individual_time = await benchmark_individual(client, ids)
        concurrent_time = await benchmark_concurrent(client, ids)
        batched_time = await benchmark_batched(client, ids)

        print(f"Individual requests: {individual_time:.2f}s")
        print(f"Concurrent requests: {concurrent_time:.2f}s")
        print(f"Batched request:     {batched_time:.2f}s")

# Typical results for 100 items with 50ms latency:
# Individual requests: 5.2s (100 * 50ms + processing)
# Concurrent requests: 0.8s (limited by connection pool)
# Batched request:     0.1s (single round trip)
```

---

## Best Practices

### Set Batch Size Limits

```python
MAX_BATCH_SIZE = 100  # Prevent memory issues and timeouts

if len(request.ids) > MAX_BATCH_SIZE:
    raise HTTPException(
        status_code=400,
        detail=f"Batch size cannot exceed {MAX_BATCH_SIZE}"
    )
```

### Handle Partial Failures

```python
# Return both results and errors
return {
    "results": {id: data for id, data in successful.items()},
    "errors": {id: error for id, error in failed.items()}
}
```

### Deduplicate Requests

```python
# Remove duplicates before processing
unique_ids = list(dict.fromkeys(request.ids))  # Preserves order
```

### Document Batch Endpoints

```python
@app.post("/users/batch")
async def batch_get_users(request: BatchRequest):
    """
    Fetch multiple users in a single request.

    - Maximum batch size: 100
    - Duplicate IDs are deduplicated
    - Returns partial results if some IDs not found
    """
```

---

## Conclusion

Batching API requests is one of the most effective optimizations you can make:

- **Server-side**: Provide batch endpoints for commonly fetched resources
- **Client-side**: Use request batchers to group individual calls
- **DataLoader pattern**: Automatic batching with caching for nested data
- **Bulk writes**: Batch inserts and updates for better throughput

The key is to batch where it matters most. Profile your application to identify the hotspots where individual requests are creating bottlenecks.

---

*Need to monitor your API performance? [OneUptime](https://oneuptime.com) provides request tracing and performance monitoring to help you identify batching opportunities.*

**Related Reading:**
- [How to Implement Retry Logic with Exponential Backoff in Python](https://oneuptime.com/blog/post/2025-01-06-python-retry-exponential-backoff/view)
- [How to Mock External APIs in Python Tests](https://oneuptime.com/blog/post/2025-01-06-python-mock-external-apis/view)
