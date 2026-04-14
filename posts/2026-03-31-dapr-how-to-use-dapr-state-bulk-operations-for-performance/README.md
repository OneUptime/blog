# How to Use Dapr State Bulk Operations for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Bulk Operation, Performance, Redis, Microservice

Description: Learn how to use Dapr's bulk state get and save APIs to dramatically reduce round-trips and improve throughput for state-intensive microservice workloads.

---

State-intensive microservices that read or write many keys individually incur significant overhead: each operation requires an HTTP round-trip to the Dapr sidecar, which in turn makes a backend call. For a service that needs to fetch 50 user profiles on every request, 50 individual `GET` calls is far less efficient than a single bulk `GET`. Dapr's bulk state operations collapse many reads or writes into a single API call, reducing network overhead and improving throughput.

## Understanding Bulk State APIs

Dapr provides two bulk state operations:

- `POST /v1.0/state/{storeName}/bulk` - get multiple keys in one call
- `POST /v1.0/state/{storeName}` with an array - save multiple keys in one call (has always supported arrays)

The bulk get is the most impactful: individual reads have O(n) sidecar round-trips; a bulk get has O(1):

```text
Individual Gets (50 keys):
  App -> Sidecar: GET key-1   (1 HTTP round-trip)
  App -> Sidecar: GET key-2   (1 HTTP round-trip)
  ...
  App -> Sidecar: GET key-50  (1 HTTP round-trip)
  Total: 50 round-trips, 50 backend reads

Bulk Get (50 keys):
  App -> Sidecar: POST /bulk with 50 keys  (1 HTTP round-trip)
  Sidecar -> Backend: GET key-1...key-50   (parallelized per "parallelism" setting)
  Total: 1 round-trip, parallelized backend reads
```

## Bulk State Read API

```python
# bulk_state_example.py
import os
import requests
import time
from typing import Any

DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
DAPR_URL = f"http://localhost:{DAPR_PORT}/v1.0"

def get_bulk(keys: list[str], store: str = "statestore") -> dict[str, Any]:
    """Fetch multiple state keys in a single request."""
    bulk_request = {
        "keys": keys,
        "parallelism": 10   # How many backend reads to parallelize (optional)
    }
    
    resp = requests.post(
        f"{DAPR_URL}/state/{store}/bulk",
        json=bulk_request
    )
    resp.raise_for_status()
    
    # Response is a list of {key, data, etag, error} objects
    results = {}
    for item in resp.json():
        key = item.get("key")
        data = item.get("data")
        error = item.get("error")
        
        if error:
            print(f"Warning: error fetching {key}: {error}")
            results[key] = None
        else:
            results[key] = data
    
    return results

def benchmark_individual_vs_bulk(num_keys: int = 50):
    """Compare individual vs. bulk state reads."""
    keys = [f"user-{i}" for i in range(num_keys)]
    
    # First, write test data
    save_bulk({k: {"userId": k, "name": f"User {i}", "score": i * 10} 
               for i, k in enumerate(keys)})
    
    # Individual reads
    start = time.perf_counter()
    individual_results = {}
    for key in keys:
        resp = requests.get(f"{DAPR_URL}/state/statestore/{key}")
        if resp.status_code == 200 and resp.text not in ("", "null"):
            individual_results[key] = resp.json()
    individual_time = time.perf_counter() - start
    
    # Bulk read
    start = time.perf_counter()
    bulk_results = get_bulk(keys)
    bulk_time = time.perf_counter() - start
    
    print(f"\nBenchmark Results ({num_keys} keys):")
    print(f"  Individual reads: {individual_time*1000:.1f}ms")
    print(f"  Bulk read:        {bulk_time*1000:.1f}ms")
    print(f"  Speedup:          {individual_time/bulk_time:.1f}x")

def save_bulk(entries: dict[str, Any], store: str = "statestore") -> bool:
    """Save multiple state entries in a single request."""
    state_items = [
        {"key": key, "value": value}
        for key, value in entries.items()
    ]
    
    resp = requests.post(
        f"{DAPR_URL}/state/{store}",
        json=state_items
    )
    return resp.status_code == 204

benchmark_individual_vs_bulk(50)
```

## Bulk Operations with the .NET SDK

```csharp
// BulkStateService.cs
using Dapr.Client;

public class ProductCatalogService
{
    private readonly DaprClient _daprClient;
    private const string StoreName = "statestore";

    public ProductCatalogService(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task<Dictionary<string, Product?>> GetProductsAsync(
        IEnumerable<string> productIds)
    {
        var keys = productIds.Select(id => $"product-{id}").ToList();
        
        // Bulk get all products in one call
        var results = await _daprClient.GetBulkStateAsync(
            storeName: StoreName,
            keys: keys,
            parallelism: 10,
            cancellationToken: default);

        return results
            .Where(r => r.Value != null)
            .ToDictionary(
                r => r.Key.Replace("product-", ""),
                r => r.Value != null 
                    ? System.Text.Json.JsonSerializer.Deserialize<Product>(r.Value) 
                    : null
            );
    }

    public async Task UpdateProductPricesAsync(
        Dictionary<string, decimal> priceUpdates)
    {
        // First, bulk read current products
        var keys = priceUpdates.Keys.Select(id => $"product-{id}").ToList();
        var currentProducts = await _daprClient.GetBulkStateAsync(
            StoreName, keys, parallelism: 10);

        // Prepare bulk write with updated prices
        var updates = new List<StateTransactionRequest>();
        foreach (var (id, newPrice) in priceUpdates)
        {
            var key = $"product-{id}";
            var current = currentProducts.FirstOrDefault(r => r.Key == key);
            
            if (current.Value == null) continue;
            
            var product = System.Text.Json.JsonSerializer.Deserialize<Product>(current.Value);
            if (product == null) continue;
            
            var updated = product with { Price = newPrice, UpdatedAt = DateTime.UtcNow };
            
            updates.Add(new StateTransactionRequest(
                key: key,
                value: System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(updated),
                operationType: StateOperationType.Upsert
            ));
        }
        
        // Bulk write in a transaction
        await _daprClient.ExecuteStateTransactionAsync(StoreName, updates);
        Console.WriteLine($"Updated {updates.Count} product prices");
    }

    public async Task DeleteExpiredCacheEntriesAsync(IEnumerable<string> expiredKeys)
    {
        var deleteOps = expiredKeys.Select(key => new StateTransactionRequest(
            key: key,
            value: Array.Empty<byte>(),
            operationType: StateOperationType.Delete
        )).ToList();

        if (deleteOps.Any())
        {
            await _daprClient.ExecuteStateTransactionAsync(StoreName, deleteOps);
            Console.WriteLine($"Deleted {deleteOps.Count} expired cache entries");
        }
    }
}

public record Product(
    string ProductId,
    string Name,
    decimal Price,
    int StockQty,
    DateTime UpdatedAt
);
```

## Batching Patterns for High-Throughput Writes

For event-driven services that write many state entries from pub/sub handlers, batch writes using a buffer and flush pattern:

```python
# batch_writer.py
import os
import threading
import time
import requests
from collections import defaultdict

class DaprStateBatcher:
    """Buffer writes and flush them in bulk to reduce Dapr round-trips."""
    
    def __init__(self, dapr_url: str, store: str = "statestore",
                 max_batch_size: int = 100, flush_interval_ms: float = 50):
        self._url = dapr_url
        self._store = store
        self._max_batch_size = max_batch_size
        self._flush_interval = flush_interval_ms / 1000
        self._buffer: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._flush_timer = None
        self._start_flush_timer()
    
    def write(self, key: str, value: dict):
        """Buffer a write for bulk flushing."""
        with self._lock:
            self._buffer[key] = value
            if len(self._buffer) >= self._max_batch_size:
                self._flush_locked()
    
    def _flush_locked(self):
        if not self._buffer:
            return
        
        batch = dict(self._buffer)
        self._buffer.clear()
        
        # Write outside the lock to avoid blocking
        threading.Thread(target=self._do_flush, args=(batch,), daemon=True).start()
    
    def _do_flush(self, batch: dict[str, dict]):
        items = [{"key": k, "value": v} for k, v in batch.items()]
        resp = requests.post(
            f"{self._url}/state/{self._store}",
            json=items,
            timeout=10
        )
        if resp.status_code != 204:
            print(f"Bulk write failed: {resp.status_code}")
    
    def _start_flush_timer(self):
        def _timer_callback():
            with self._lock:
                self._flush_locked()
            self._start_flush_timer()
        
        self._flush_timer = threading.Timer(self._flush_interval, _timer_callback)
        self._flush_timer.daemon = True
        self._flush_timer.start()
    
    def flush_and_stop(self):
        if self._flush_timer:
            self._flush_timer.cancel()
        with self._lock:
            self._flush_locked()

# Usage
DAPR_URL = f"http://localhost:{os.environ.get('DAPR_HTTP_PORT', 3500)}/v1.0"
batcher = DaprStateBatcher(DAPR_URL)

# Rapid-fire writes are batched automatically
for i in range(200):
    batcher.write(f"metric-{i}", {"value": i, "timestamp": time.time()})

time.sleep(1)
batcher.flush_and_stop()
print("All metrics flushed")
```

## Summary

Dapr's bulk state APIs dramatically reduce the performance overhead of state-intensive microservices. Use `POST /v1.0/state/{storeName}/bulk` for multi-key reads instead of issuing individual GET requests - the bulk get collapses all reads into a single app-to-sidecar round-trip, and the sidecar parallelizes backend reads according to the `parallelism` setting. For writes, always pass an array to the state save endpoint rather than writing one key at a time. For very high-throughput event processors, implement a client-side buffer that flushes writes in configurable batches. The combination of bulk APIs and batching can reduce Dapr state operation overhead by an order of magnitude for workloads with many keys per request.
