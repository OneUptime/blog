# How to Use Dapr State Transactions with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Redis, Transaction, ACID, Microservice

Description: Learn how to use Dapr's transactional state API with Redis to perform atomic multi-key operations, ensuring consistency across related state updates in microservices.

---

Dapr's transactional state API allows multiple state operations (upsert and delete) to execute atomically: either all operations succeed or none of them take effect. With the Redis state store, Dapr uses Redis MULTI/EXEC to implement transactions. Understanding what Redis transactions guarantee and how to use Dapr's transaction API correctly prevents subtle consistency bugs in your microservices.

## What Dapr State Transactions Guarantee

Dapr state transactions with Redis provide:

- **Atomicity**: All operations in the transaction execute or none do
- **Isolation**: Redis MULTI/EXEC blocks other commands from interleaving
- **No rollback on logic errors**: If an individual operation fails, others may still succeed (Redis does not roll back on EXEC errors, only on queue errors)

What they do NOT provide:

- Cross-shard atomicity in Redis Cluster mode (all keys must be on the same shard)
- Long-running isolation (no SELECT...FOR UPDATE equivalent)
- Cross-store transactions (Redis and Postgres in the same transaction)

## Basic Transaction API

```python
# basic_transaction.py
import os
import requests

DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
DAPR_URL = f"http://localhost:{DAPR_PORT}/v1.0"

def transfer_balance(from_account: str, to_account: str, amount: float):
    """Atomically debit one account and credit another."""
    
    # Read current balances first
    from_resp = requests.get(f"{DAPR_URL}/state/statestore/{from_account}")
    to_resp = requests.get(f"{DAPR_URL}/state/statestore/{to_account}")
    
    from_balance = from_resp.json() if from_resp.status_code == 200 else {"balance": 0}
    to_balance = to_resp.json() if to_resp.status_code == 200 else {"balance": 0}
    
    if from_balance["balance"] < amount:
        raise ValueError(f"Insufficient funds: {from_balance['balance']} < {amount}")
    
    new_from = from_balance["balance"] - amount
    new_to = to_balance["balance"] + amount
    
    # Execute as a transaction
    transaction = {
        "operations": [
            {
                "operation": "upsert",
                "request": {
                    "key": from_account,
                    "value": {"balance": new_from, "lastUpdated": "now"},
                    "etag": from_resp.headers.get("ETag")  # optimistic concurrency
                }
            },
            {
                "operation": "upsert",
                "request": {
                    "key": to_account,
                    "value": {"balance": new_to, "lastUpdated": "now"},
                    "etag": to_resp.headers.get("ETag")
                }
            }
        ]
    }
    
    resp = requests.post(
        f"{DAPR_URL}/state/statestore/transaction",
        json=transaction
    )
    
    if resp.status_code == 204:
        print(f"Transfer successful: {from_account} -> {to_account}: ${amount}")
    else:
        raise Exception(f"Transaction failed: {resp.status_code} {resp.text}")

transfer_balance("account-alice", "account-bob", 50.0)
```

## Using Transactions with the .NET SDK

```csharp
// TransactionService.cs
using Dapr.Client;

public class OrderStateService
{
    private readonly DaprClient _daprClient;
    private const string StoreName = "statestore";

    public OrderStateService(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task CreateOrderWithInventoryAsync(
        Order order,
        InventoryItem inventoryItem)
    {
        // Read current inventory with ETag for optimistic concurrency
        var (inventory, inventoryEtag) = await _daprClient
            .GetStateAndETagAsync<InventoryItem>(StoreName, inventoryItem.ItemId);

        if (inventory == null || inventory.Quantity < order.Quantity)
        {
            throw new InvalidOperationException(
                $"Insufficient inventory for {inventoryItem.ItemId}");
        }

        // Build the transaction
        var stateTransactionRequests = new List<StateTransactionRequest>
        {
            // Create the order
            new StateTransactionRequest(
                key: $"order-{order.OrderId}",
                value: System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(order),
                operationType: StateOperationType.Upsert
            ),
            // Decrement inventory
            new StateTransactionRequest(
                key: inventory.ItemId,
                value: System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(
                    inventory with { Quantity = inventory.Quantity - order.Quantity }),
                operationType: StateOperationType.Upsert,
                etag: inventoryEtag,
                options: new StateOptions
                {
                    Concurrency = ConcurrencyMode.FirstWrite,
                    Consistency = ConsistencyMode.Strong
                }
            )
        };

        await _daprClient.ExecuteStateTransactionAsync(StoreName, stateTransactionRequests);
        
        Console.WriteLine($"Order {order.OrderId} created and inventory updated atomically");
    }

    public async Task CancelOrderAsync(string orderId)
    {
        // Read the order
        var (order, _) = await _daprClient
            .GetStateAndETagAsync<Order>(StoreName, $"order-{orderId}");
        
        if (order == null)
            throw new KeyNotFoundException($"Order {orderId} not found");

        var requests = new List<StateTransactionRequest>
        {
            // Delete the order
            new StateTransactionRequest(
                key: $"order-{orderId}",
                value: Array.Empty<byte>(),
                operationType: StateOperationType.Delete
            ),
            // Create a cancellation audit record
            new StateTransactionRequest(
                key: $"cancelled-order-{orderId}",
                value: System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(new
                {
                    OrderId = orderId,
                    CancelledAt = DateTime.UtcNow,
                    OriginalOrder = order
                }),
                operationType: StateOperationType.Upsert
            )
        };

        await _daprClient.ExecuteStateTransactionAsync(StoreName, requests);
    }
}

public record Order(string OrderId, string CustomerId, int Quantity, decimal Amount);
public record InventoryItem(string ItemId, int Quantity);
```

## Handling Optimistic Concurrency Conflicts

When two services try to update the same key simultaneously, the first write wins (or last, depending on configuration). Use ETags to detect conflicts:

```python
# optimistic_concurrency.py
import requests
import time

def update_with_retry(key: str, update_fn, max_retries: int = 3):
    """Apply an update function with optimistic concurrency retry."""
    for attempt in range(max_retries):
        # Read current value and ETag
        resp = requests.get(f"{DAPR_URL}/state/statestore/{key}")
        
        if resp.status_code == 204:
            current = None
            etag = None
        elif resp.status_code == 200:
            current = resp.json()
            etag = resp.headers.get("ETag")
        else:
            raise Exception(f"Read failed: {resp.status_code}")
        
        # Apply the update function
        new_value = update_fn(current)
        
        # Attempt to write with ETag
        headers = {"Content-Type": "application/json"}
        if etag:
            headers["If-Match"] = etag
        
        write_resp = requests.post(
            f"{DAPR_URL}/state/statestore",
            json=[{
                "key": key,
                "value": new_value,
                "options": {
                    "concurrency": "first-write",
                    "consistency": "strong"
                }
            }],
            headers=headers
        )
        
        if write_resp.status_code == 204:
            return new_value  # Success
        elif write_resp.status_code == 409:
            # Conflict - retry with backoff
            if attempt < max_retries - 1:
                time.sleep(0.1 * (2 ** attempt))
                continue
            raise Exception(f"Optimistic concurrency conflict after {max_retries} retries")
        else:
            raise Exception(f"Write failed: {write_resp.status_code}")

# Example: increment a counter safely
result = update_with_retry(
    "page-view-counter",
    lambda current: {"count": (current or {"count": 0})["count"] + 1}
)
print(f"Counter updated: {result}")
```

## Bulk Transactional Operations

For high-throughput scenarios, batch multiple unrelated transactions using Dapr's bulk state API:

```python
# bulk_operations.py
def bulk_upsert_orders(orders: list[dict]):
    """Upsert multiple orders in a single bulk request (not transactional)."""
    operations = [
        {"key": f"order-{o['orderId']}", "value": o}
        for o in orders
    ]
    
    resp = requests.post(
        f"{DAPR_URL}/state/statestore",
        json=operations
    )
    return resp.status_code == 204

def transactional_order_batch(order_id: str, items: list[dict]):
    """Atomically create order and all its line items."""
    operations = [
        {
            "operation": "upsert",
            "request": {
                "key": f"order-{order_id}",
                "value": {"orderId": order_id, "status": "processing"}
            }
        }
    ]
    
    # Add all line items to the transaction
    for i, item in enumerate(items):
        operations.append({
            "operation": "upsert",
            "request": {
                "key": f"order-{order_id}-item-{i}",
                "value": item
            }
        })
    
    resp = requests.post(
        f"{DAPR_URL}/state/statestore/transaction",
        json={"operations": operations}
    )
    
    return resp.status_code == 204
```

## Summary

Dapr state transactions with Redis provide atomic multi-key operations through the Redis MULTI/EXEC mechanism. Use `POST /v1.0/state/{storeName}/transaction` with a list of upsert/delete operations to execute them atomically. For optimistic concurrency, read the ETag with the state value and pass it back on writes - a 409 conflict means another writer changed the value first and you should retry. Transactions are scoped to a single Redis node or shard; if you need transactions across keys that span different shards in Redis Cluster mode, use hash tags to colocate them on the same shard.
