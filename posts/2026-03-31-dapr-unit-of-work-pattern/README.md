# How to Use Dapr with Unit of Work Pattern

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Unit Of Work, Pattern, Transaction, State Management

Description: Implement the Unit of Work pattern with Dapr state management using bulk state operations and ETags for optimistic concurrency to coordinate multi-entity transactions.

---

## Unit of Work with Dapr State

The Unit of Work pattern tracks changes to domain objects and commits them as a single operation. Dapr state management supports multi-item bulk operations and ETags for optimistic concurrency, making it possible to implement a Unit of Work that coordinates writes across multiple entities.

## Define the Unit of Work Interface

```csharp
// Application/Interfaces/IUnitOfWork.cs
public interface IUnitOfWork : IDisposable
{
    IOrderRepository Orders { get; }
    IInventoryRepository Inventory { get; }
    Task<int> CommitAsync(CancellationToken ct = default);
    void Rollback();
}
```

## Implement Dapr Unit of Work

```csharp
// Infrastructure/Dapr/DaprUnitOfWork.cs
using Dapr.Client;

public class DaprUnitOfWork : IUnitOfWork
{
    private readonly DaprClient _dapr;
    private readonly List<StateTransactionRequest> _pendingOperations = new();
    private const string StoreName = "statestore";

    public DaprUnitOfWork(DaprClient dapr)
    {
        _dapr = dapr;
        Orders = new DaprOrderRepository(dapr, _pendingOperations);
        Inventory = new DaprInventoryRepository(dapr, _pendingOperations);
    }

    public IOrderRepository Orders { get; }
    public IInventoryRepository Inventory { get; }

    public async Task<int> CommitAsync(CancellationToken ct = default)
    {
        if (_pendingOperations.Count == 0) return 0;

        // Execute all operations as a single Dapr transaction
        await _dapr.ExecuteStateTransactionAsync(
            StoreName,
            _pendingOperations,
            cancellationToken: ct);

        int count = _pendingOperations.Count;
        _pendingOperations.Clear();
        return count;
    }

    public void Rollback()
    {
        _pendingOperations.Clear();
    }

    public void Dispose() => _pendingOperations.Clear();
}
```

## Transaction-Aware Repository

```csharp
// Infrastructure/Dapr/DaprOrderRepository.cs
public class DaprOrderRepository : IOrderRepository
{
    private readonly DaprClient _dapr;
    private readonly List<StateTransactionRequest> _pendingOps;
    private const string StoreName = "statestore";

    public DaprOrderRepository(DaprClient dapr, List<StateTransactionRequest> pendingOps)
    {
        _dapr = dapr;
        _pendingOps = pendingOps;
    }

    public async Task<Order?> GetByIdAsync(string id)
    {
        var result = await _dapr.GetStateEntryAsync<Order>(StoreName, id);
        return result.Value;
    }

    public void Add(Order order)
    {
        // Queue operation - not yet committed
        _pendingOps.Add(new StateTransactionRequest(
            key: order.Id,
            value: JsonSerializer.SerializeToUtf8Bytes(order),
            operationType: StateOperationType.Upsert,
            etag: null
        ));
    }

    public void Remove(string orderId)
    {
        _pendingOps.Add(new StateTransactionRequest(
            key: orderId,
            value: null,
            operationType: StateOperationType.Delete,
            etag: null
        ));
    }
}
```

## Application Service Using Unit of Work

```csharp
// Application/Services/OrderService.cs
public class OrderService
{
    private readonly IUnitOfWork _uow;

    public OrderService(IUnitOfWork uow) => _uow = uow;

    public async Task PlaceOrderAsync(string customerId, List<string> items)
    {
        var order = new Order(customerId, items);
        var reservation = new InventoryReservation(order.Id, items);

        // Queue both operations
        _uow.Orders.Add(order);
        _uow.Inventory.Reserve(reservation);

        // Commit atomically via Dapr transaction
        await _uow.CommitAsync();
    }
}
```

## Register in DI

```csharp
// Program.cs
builder.Services.AddDaprClient();
builder.Services.AddScoped<IUnitOfWork, DaprUnitOfWork>();
builder.Services.AddScoped<OrderService>();
```

## Test with Mock Unit of Work

```csharp
[Fact]
public async Task PlaceOrder_CommitsOrderAndReservation()
{
    var mockUow = new Mock<IUnitOfWork>();
    var mockOrders = new Mock<IOrderRepository>();
    var mockInventory = new Mock<IInventoryRepository>();

    mockUow.Setup(u => u.Orders).Returns(mockOrders.Object);
    mockUow.Setup(u => u.Inventory).Returns(mockInventory.Object);

    var service = new OrderService(mockUow.Object);
    await service.PlaceOrderAsync("cust-1", new List<string> { "item-a" });

    mockOrders.Verify(r => r.Add(It.IsAny<Order>()), Times.Once);
    mockInventory.Verify(r => r.Reserve(It.IsAny<InventoryReservation>()), Times.Once);
    mockUow.Verify(u => u.CommitAsync(default), Times.Once);
}
```

## Summary

The Unit of Work pattern with Dapr state management uses Dapr's `ExecuteStateTransactionAsync` to commit multiple entity changes atomically. Queuing operations in repositories and flushing them in a single transaction request ensures consistency across related entities and makes business logic testable through mock UoW implementations without a running Dapr sidecar.
