# How to Use Dapr with SOLID Principles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SOLID, Design Principle, Architecture, Microservice

Description: Apply SOLID principles to Dapr microservice development: SRP for handlers, OCP for component plugins, LSP for state adapters, ISP for port interfaces, and DIP for infrastructure.

---

## SOLID Applied to Dapr Microservices

SOLID principles guide object-oriented design toward maintainable, extensible code. Applied to Dapr microservices, each principle shapes how you structure components, handlers, and infrastructure adapters.

## S - Single Responsibility Principle

Each class has one reason to change. An order handler should only handle order creation logic - not Dapr serialization or HTTP status code mapping:

```csharp
// BAD - too many responsibilities
public class OrderHandler
{
    public async Task<IActionResult> Handle(HttpRequest req)
    {
        var json = await new StreamReader(req.Body).ReadToEndAsync();
        var order = JsonSerializer.Deserialize<Order>(json);
        await daprClient.SaveStateAsync("statestore", order.Id, order);
        await daprClient.PublishEventAsync("pubsub", "order-created", order);
        return new OkObjectResult(new { id = order.Id });
    }
}

// GOOD - single responsibility
public class CreateOrderUseCase
{
    public async Task<Order> ExecuteAsync(CreateOrderRequest request)
    {
        var order = new Order(request.CustomerId, request.Items);
        await _repository.SaveAsync(order);
        await _publisher.PublishAsync("order-created", order);
        return order;
    }
}
```

## O - Open/Closed Principle

Open for extension, closed for modification. Add new Dapr state backends without changing repository code:

```csharp
// Closed for modification
public abstract class DaprRepositoryBase<T>
{
    protected readonly DaprClient Dapr;
    protected abstract string StoreName { get; }

    protected async Task SaveAsync(string key, T value)
        => await Dapr.SaveStateAsync(StoreName, key, value);
}

// Open for extension
public class OrderRepository : DaprRepositoryBase<Order>
{
    protected override string StoreName => "orders-statestore";
}

public class CustomerRepository : DaprRepositoryBase<Customer>
{
    protected override string StoreName => "customers-statestore";
}
```

## L - Liskov Substitution Principle

Any implementation of `IOrderRepository` must be substitutable:

```csharp
// Both must be substitutable
public class DaprOrderRepository : IOrderRepository
{
    public Task<Order?> GetByIdAsync(string id) => /* Dapr implementation */;
}

public class InMemoryOrderRepository : IOrderRepository
{
    private readonly Dictionary<string, Order> _store = new();
    public Task<Order?> GetByIdAsync(string id)
        => Task.FromResult(_store.GetValueOrDefault(id));
}

// Service works with either implementation
OrderService service = new(new DaprOrderRepository(daprClient));
OrderService testService = new(new InMemoryOrderRepository()); // Substitutable
```

## I - Interface Segregation Principle

Split large repository interfaces into focused ports:

```csharp
// BAD - forces all consumers to depend on write operations
public interface IOrderRepository
{
    Task<Order> GetByIdAsync(string id);
    Task SaveAsync(Order order);
    Task DeleteAsync(string id);
    Task<List<Order>> SearchAsync(string customerId);
    Task BulkDeleteAsync(List<string> ids);
}

// GOOD - segregated interfaces
public interface IOrderReader
{
    Task<Order?> GetByIdAsync(string id);
    Task<List<Order>> SearchAsync(string customerId);
}

public interface IOrderWriter
{
    Task SaveAsync(Order order);
    Task DeleteAsync(string id);
}

// Query handlers only need IOrderReader
public class GetOrderHandler(IOrderReader reader) { }
// Command handlers only need IOrderWriter
public class DeleteOrderHandler(IOrderWriter writer) { }
```

## D - Dependency Inversion Principle

High-level modules depend on abstractions, not on DaprClient directly:

```csharp
// BAD - depends on DaprClient directly
public class OrderService
{
    private readonly DaprClient _dapr; // infrastructure dependency

    public async Task CreateOrder(Order order)
    {
        await _dapr.SaveStateAsync("statestore", order.Id, order); // coupled to Dapr
    }
}

// GOOD - depends on abstraction
public class OrderService
{
    private readonly IOrderRepository _repo; // abstraction

    public async Task CreateOrder(Order order)
    {
        await _repo.SaveAsync(order); // Dapr detail is hidden
    }
}
```

## Register DI Following DIP

```csharp
// Program.cs
builder.Services.AddDaprClient();
// Abstractions mapped to Dapr implementations
builder.Services.AddScoped<IOrderRepository, DaprOrderRepository>();
builder.Services.AddScoped<IOrderReader, DaprOrderRepository>();
builder.Services.AddScoped<IOrderWriter, DaprOrderRepository>();
builder.Services.AddScoped<IEventPublisher, DaprEventPublisher>();
```

## Summary

Applying SOLID principles to Dapr microservices results in single-purpose handlers, extensible state adapters, interchangeable repository implementations for testing, segregated read/write interfaces, and high-level services that depend on abstractions rather than DaprClient directly. These principles collectively make Dapr microservices easier to test, extend, and maintain over time.
