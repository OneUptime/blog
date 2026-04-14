# How to Handle Nested Objects in Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, JSON, Nested Object, Data Modeling

Description: Manage complex nested objects in Dapr state stores with strategies for partial updates, deep merging, and avoiding stale data from concurrent reads and writes.

---

## Nested Objects in Dapr State

Dapr stores state as opaque values - it has no awareness of nested structure. A common mistake is reading a complex nested object, modifying one field, and saving it back without handling concurrency. Dapr's ETags and transactional operations are the key tools for managing nested state safely.

## Defining Complex Nested Models

```csharp
// Order with deeply nested structure
public class Order
{
    public string Id { get; set; } = "";
    public Customer Customer { get; set; } = new();
    public List<OrderLine> Lines { get; set; } = new();
    public ShippingAddress ShippingAddress { get; set; } = new();
    public PaymentDetails Payment { get; set; } = new();
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();
}

public class Customer
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public CustomerTier Tier { get; set; }
}

public class OrderLine
{
    public string ProductId { get; set; } = "";
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal => Quantity * UnitPrice;
}
```

## Safe Nested Object Updates with ETags

```csharp
public class OrderStateService
{
    private readonly DaprClient _dapr;

    public async Task UpdateOrderStatusAsync(string orderId, OrderStatus newStatus)
    {
        string stateKey = $"order-{orderId}";
        const int maxRetries = 3;

        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            // Get with ETag for optimistic concurrency
            var (state, etag) = await _dapr.GetStateAndETagAsync<Order>(
                "statestore", stateKey);

            if (state == null)
                throw new KeyNotFoundException($"Order {orderId} not found");

            // Modify the nested status
            state.Status = newStatus;
            state.Metadata["lastModified"] = DateTime.UtcNow.ToString("O");

            try
            {
                // Save with ETag - fails if another process modified it
                bool saved = await _dapr.TrySaveStateAsync(
                    "statestore", stateKey, state, etag);

                if (saved) return;

                // ETag conflict - retry
                await Task.Delay(TimeSpan.FromMilliseconds(100 * (attempt + 1)));
            }
            catch (Exception ex)
            {
                if (attempt == maxRetries - 1) throw;
            }
        }

        throw new InvalidOperationException($"Failed to update order {orderId} after {maxRetries} attempts");
    }
}
```

## Partial Nested Updates via Transactional Operations

```csharp
// Update multiple nested keys atomically
public async Task UpdateOrderPaymentAndStatusAsync(
    string orderId,
    PaymentDetails payment,
    OrderStatus status)
{
    var stateKey = $"order-{orderId}";
    var (order, etag) = await _dapr.GetStateAndETagAsync<Order>(
        "statestore", stateKey);

    if (order == null) return;

    order.Payment = payment;
    order.Status = status;

    // Transactional multi-key update
    var ops = new List<StateTransactionRequest>
    {
        new(stateKey, JsonSerializer.SerializeToUtf8Bytes(order),
            StateOperationType.Upsert) { ETag = etag }
    };

    await _dapr.ExecuteStateTransactionAsync("statestore", ops);
}
```

## Go: Working with Nested Maps

```go
// nested_state.go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    dapr "github.com/dapr/go-sdk/client"
)

type OrderState struct {
    ID       string                 `json:"id"`
    Status   string                 `json:"status"`
    Customer map[string]interface{} `json:"customer"`
    Lines    []map[string]interface{} `json:"lines"`
}

func updateNestedField(ctx context.Context, client dapr.Client,
    orderID string, updates map[string]interface{}) error {

    item, err := client.GetState(ctx, "statestore", "order-"+orderID, nil)
    if err != nil {
        return err
    }

    var order map[string]interface{}
    if err := json.Unmarshal(item.Value, &order); err != nil {
        return fmt.Errorf("unmarshal failed: %w", err)
    }

    // Deep merge updates into existing order
    deepMerge(order, updates)

    updated, err := json.Marshal(order)
    if err != nil {
        return err
    }

    return client.SaveStateWithETag(ctx, "statestore", "order-"+orderID,
        updated, item.Etag, nil)
}

func deepMerge(target, source map[string]interface{}) {
    for key, sourceVal := range source {
        if targetMap, ok := target[key].(map[string]interface{}); ok {
            if sourceMap, ok := sourceVal.(map[string]interface{}); ok {
                deepMerge(targetMap, sourceMap)
                continue
            }
        }
        target[key] = sourceVal
    }
}
```

## Summary

Nested objects in Dapr state are read, modified, and written back as complete values. Use ETags (`GetStateAndETagAsync`/`TrySaveStateAsync`) to implement optimistic concurrency and prevent lost updates when multiple services modify the same nested document. For complex partial updates across related keys, use transactional state operations to ensure atomicity. Always design your state keys to minimize the surface area of each write - narrow keys reduce contention.
