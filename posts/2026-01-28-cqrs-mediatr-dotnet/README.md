# How to Implement CQRS with MediatR in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, CQRS, MediatR, Clean Architecture, Design Patterns, Domain-Driven Design

Description: A practical guide to implementing the Command Query Responsibility Segregation pattern using MediatR in .NET. Learn how to structure commands, queries, handlers, and pipelines for maintainable applications.

---

CQRS (Command Query Responsibility Segregation) separates read and write operations into distinct models. Combined with MediatR, you get a clean architecture where each operation has a single handler, cross-cutting concerns are handled in pipelines, and your code becomes easier to test and maintain.

## Why CQRS with MediatR?

Traditional architectures mix reads and writes in the same service classes. As applications grow, these classes become bloated and hard to modify. CQRS addresses this by separating commands (writes) from queries (reads), while MediatR provides the infrastructure to dispatch them.

Benefits include:

- **Single responsibility**: Each handler does one thing
- **Independent scaling**: Optimize read and write models separately
- **Testability**: Handlers are easy to unit test in isolation
- **Flexibility**: Add cross-cutting concerns without modifying handlers

## Setting Up MediatR

Install the required packages:

```bash
dotnet add package MediatR
dotnet add package MediatR.Extensions.Microsoft.DependencyInjection
```

Register MediatR in your application:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Register MediatR and scan for handlers in the current assembly
builder.Services.AddMediatR(config =>
{
    config.RegisterServicesFromAssembly(typeof(Program).Assembly);
});

var app = builder.Build();
```

## Commands: Write Operations

Commands represent intentions to change state. They should be named as imperative verbs.

### Defining a Command

```csharp
using MediatR;

// Command to create an order
// IRequest<T> means it returns a result of type T
public record CreateOrderCommand : IRequest<OrderResult>
{
    public string CustomerId { get; init; } = string.Empty;
    public List<OrderItemDto> Items { get; init; } = new();
    public string ShippingAddress { get; init; } = string.Empty;
}

public record OrderItemDto
{
    public int ProductId { get; init; }
    public int Quantity { get; init; }
}

// Result type for the command
public record OrderResult
{
    public bool Success { get; init; }
    public Guid? OrderId { get; init; }
    public string? ErrorMessage { get; init; }

    public static OrderResult Succeeded(Guid orderId) =>
        new() { Success = true, OrderId = orderId };

    public static OrderResult Failed(string message) =>
        new() { Success = false, ErrorMessage = message };
}
```

### Command Handler

```csharp
public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, OrderResult>
{
    private readonly AppDbContext _context;
    private readonly ILogger<CreateOrderCommandHandler> _logger;

    public CreateOrderCommandHandler(
        AppDbContext context,
        ILogger<CreateOrderCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<OrderResult> Handle(
        CreateOrderCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Creating order for customer {CustomerId}",
            request.CustomerId);

        // Validate inventory availability
        foreach (var item in request.Items)
        {
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == item.ProductId, cancellationToken);

            if (product is null)
            {
                return OrderResult.Failed($"Product {item.ProductId} not found");
            }

            if (product.StockQuantity < item.Quantity)
            {
                return OrderResult.Failed($"Insufficient stock for {product.Name}");
            }
        }

        // Create the order
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = request.CustomerId,
            ShippingAddress = request.ShippingAddress,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            Items = request.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity
            }).ToList()
        };

        // Update inventory
        foreach (var item in request.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            product!.StockQuantity -= item.Quantity;
        }

        _context.Orders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created order {OrderId}", order.Id);

        return OrderResult.Succeeded(order.Id);
    }
}
```

## Queries: Read Operations

Queries retrieve data without modifying state. They should be named to describe what data they return.

### Defining a Query

```csharp
// Query to get an order by ID
public record GetOrderByIdQuery : IRequest<OrderDto?>
{
    public Guid OrderId { get; init; }
}

// Query to get orders with filtering and pagination
public record GetOrdersQuery : IRequest<PagedResult<OrderSummaryDto>>
{
    public string? CustomerId { get; init; }
    public OrderStatus? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

// Response DTOs
public record OrderDto
{
    public Guid Id { get; init; }
    public string CustomerId { get; init; } = string.Empty;
    public string ShippingAddress { get; init; } = string.Empty;
    public OrderStatus Status { get; init; }
    public decimal TotalAmount { get; init; }
    public List<OrderItemDto> Items { get; init; } = new();
    public DateTime CreatedAt { get; init; }
}

public record OrderSummaryDto
{
    public Guid Id { get; init; }
    public string CustomerId { get; init; } = string.Empty;
    public OrderStatus Status { get; init; }
    public decimal TotalAmount { get; init; }
    public int ItemCount { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record PagedResult<T>
{
    public List<T> Items { get; init; } = new();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
```

### Query Handlers

```csharp
public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, OrderDto?>
{
    private readonly AppDbContext _context;

    public GetOrderByIdQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDto?> Handle(
        GetOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        // Use AsNoTracking for read-only queries
        var order = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);

        if (order is null)
        {
            return null;
        }

        // Map to DTO
        return new OrderDto
        {
            Id = order.Id,
            CustomerId = order.CustomerId,
            ShippingAddress = order.ShippingAddress,
            Status = order.Status,
            TotalAmount = order.Items.Sum(i => i.Product.Price * i.Quantity),
            Items = order.Items.Select(i => new OrderItemDto
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity
            }).ToList(),
            CreatedAt = order.CreatedAt
        };
    }
}

public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, PagedResult<OrderSummaryDto>>
{
    private readonly AppDbContext _context;

    public GetOrdersQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<OrderSummaryDto>> Handle(
        GetOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Orders.AsNoTracking();

        // Apply filters
        if (!string.IsNullOrEmpty(request.CustomerId))
        {
            query = query.Where(o => o.CustomerId == request.CustomerId);
        }

        if (request.Status.HasValue)
        {
            query = query.Where(o => o.Status == request.Status.Value);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination and projection
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(o => new OrderSummaryDto
            {
                Id = o.Id,
                CustomerId = o.CustomerId,
                Status = o.Status,
                TotalAmount = o.Items.Sum(i => i.Product.Price * i.Quantity),
                ItemCount = o.Items.Count,
                CreatedAt = o.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<OrderSummaryDto>
        {
            Items = orders,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
```

## Using in Controllers

```csharp
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<ActionResult<OrderResult>> CreateOrder(CreateOrderCommand command)
    {
        var result = await _mediator.Send(command);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(
            nameof(GetOrder),
            new { id = result.OrderId },
            result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetOrder(Guid id)
    {
        var query = new GetOrderByIdQuery { OrderId = id };
        var order = await _mediator.Send(query);

        if (order is null)
        {
            return NotFound();
        }

        return Ok(order);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<OrderSummaryDto>>> GetOrders(
        [FromQuery] string? customerId,
        [FromQuery] OrderStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = new GetOrdersQuery
        {
            CustomerId = customerId,
            Status = status,
            Page = page,
            PageSize = Math.Min(pageSize, 100) // Limit max page size
        };

        var result = await _mediator.Send(query);
        return Ok(result);
    }
}
```

## Pipeline Behaviors

MediatR pipelines let you add cross-cutting concerns like logging, validation, and caching without modifying handlers.

### Logging Behavior

```csharp
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;

        _logger.LogInformation("Handling {RequestName}", requestName);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await next();

            stopwatch.Stop();
            _logger.LogInformation(
                "Handled {RequestName} in {ElapsedMs}ms",
                requestName,
                stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(
                ex,
                "Error handling {RequestName} after {ElapsedMs}ms",
                requestName,
                stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}
```

### Validation Behavior

```csharp
using FluentValidation;

public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        return await next();
    }
}

// Validator for CreateOrderCommand
public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty()
            .WithMessage("Customer ID is required");

        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("Order must contain at least one item");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .GreaterThan(0)
                .WithMessage("Invalid product ID");

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0)
                .WithMessage("Quantity must be greater than zero");
        });

        RuleFor(x => x.ShippingAddress)
            .NotEmpty()
            .WithMessage("Shipping address is required");
    }
}
```

### Register Behaviors

```csharp
builder.Services.AddMediatR(config =>
{
    config.RegisterServicesFromAssembly(typeof(Program).Assembly);

    // Add pipeline behaviors in order
    config.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
    config.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});

// Register FluentValidation validators
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);
```

## Request Flow

```mermaid
flowchart LR
    A[Controller] --> B[MediatR]
    B --> C[Logging Behavior]
    C --> D[Validation Behavior]
    D --> E[Handler]
    E --> F[Database]
    F --> E
    E --> D
    D --> C
    C --> B
    B --> A
```

## Summary

CQRS with MediatR provides a structured approach to handling application logic:

| Concept | Purpose | Example |
|---------|---------|---------|
| **Command** | Modify state | `CreateOrderCommand`, `UpdateProductCommand` |
| **Query** | Read state | `GetOrderByIdQuery`, `GetProductsQuery` |
| **Handler** | Execute logic | One handler per command/query |
| **Pipeline** | Cross-cutting concerns | Logging, validation, caching |

This pattern scales well as your application grows. Each feature is isolated, easy to test, and follows the single responsibility principle. Start simple with commands and queries, then add pipeline behaviors as your needs evolve.
