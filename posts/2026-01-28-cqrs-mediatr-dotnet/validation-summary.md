# Validation Summary: How to Implement CQRS with MediatR in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET / ASP.NET Core
- C# (records, init-only properties, nullable reference types)
- MediatR 12+ (`IRequest`, `IRequestHandler`, `IPipelineBehavior`, `RequestHandlerDelegate`)
- Entity Framework Core (`AsNoTracking`, `Include`/`ThenInclude`, `FirstOrDefaultAsync`, `FindAsync`)
- FluentValidation (`AbstractValidator`, `RuleFor`, `RuleForEach`, `ChildRules`, `AddValidatorsFromAssembly`)
- CQRS pattern

## Sources Consulted
- MediatR GitHub repository and README: https://github.com/jbogard/MediatR
- MediatR 12.0 release notes: https://github.com/jbogard/MediatR/releases/tag/v12.0.0
- MediatR wiki on pipeline behaviors: https://github.com/jbogard/MediatR/wiki/Behaviors
- FluentValidation documentation: https://docs.fluentvalidation.net/
- FluentValidation DI integration: https://docs.fluentvalidation.net/en/latest/di.html
- EF Core query documentation: https://learn.microsoft.com/en-us/ef/core/querying/
- ASP.NET Core controller / attribute routing docs: https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/routing

## Issues Found
1. **Deprecated package recommendation in setup step.** The original post instructed readers to install both `MediatR` and `MediatR.Extensions.Microsoft.DependencyInjection`. As of MediatR 12.0 (released February 2023), the DI extensions were merged into the main `MediatR` package and the separate extensions package was marked as obsolete. Because the rest of the post already uses MediatR 12+ APIs (`config.RegisterServicesFromAssembly(...)`, `config.AddBehavior(...)`), installing the deprecated package alongside MediatR 12 is incorrect. **Fix:** removed the `MediatR.Extensions.Microsoft.DependencyInjection` install line and added a one-sentence note explaining that DI support is now built into `MediatR`.

## Review Notes
- The MediatR 12 interface declares `IPipelineBehavior<TRequest, TResponse>` with the constraint `where TRequest : notnull`. The post uses the stricter `where TRequest : IRequest<TResponse>` constraint on its behavior implementations, which is still valid (adding a stricter constraint when implementing a generic interface is permitted in C#) but slightly more restrictive than the interface requires. Left as-is because it is a common and harmless idiom.
- MediatR's licensing model was announced to change starting with v13 (commercial licensing); v12 remains free/OSS. The post does not mention a specific version, but its API usage matches v12. Readers planning long-term use should be aware of the licensing direction, though no change to the post is needed for technical correctness.
- The code is illustrative — `AppDbContext`, `Order`, `OrderItem`, `Product`, and `OrderStatus` are not defined in the post. This is reasonable for a focused tutorial.
- `Items = order.Items.Select(...)` in `GetOrderByIdQueryHandler` does not populate price information on the `OrderItemDto`, but the DTO does not define a price field, so this is internally consistent.
- The Mermaid diagram and summary table are accurate.
