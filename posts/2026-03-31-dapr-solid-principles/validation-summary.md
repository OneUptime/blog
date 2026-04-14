# Validation Summary: How to Use Dapr with SOLID Principles

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (Dapr.AspNetCore)
- C# / .NET (ASP.NET Core)
- SOLID design principles
- Dependency Injection (ASP.NET Core DI)

## Sources Consulted
- Dapr .NET SDK GitHub repository (https://github.com/dapr/dotnet-sdk) — verified DaprClient is an abstract class, confirmed SaveStateAsync, PublishEventAsync, and AddDaprClient API signatures
- Dapr official documentation (https://docs.dapr.io/) — verified state management and pub/sub API patterns
- Microsoft .NET API documentation — verified ASP.NET Core DI registration patterns (AddScoped), System.Text.Json usage, IActionResult types, and Dictionary.GetValueOrDefault extension method

## Issues Found
- **DaprClient incorrectly labeled as "concrete"**: In the Dependency Inversion Principle section, the "BAD" example had the comment `// BAD - depends on concrete DaprClient` and `// concrete dependency`. `DaprClient` is actually an abstract class in the Dapr .NET SDK (instances are created via `DaprClientBuilder.Build()`). Changed "concrete" to "infrastructure" for accuracy, since the point of the example is about depending on a Dapr-specific type rather than a custom abstraction.

## Review Notes
- The LSP section uses `=> /* Dapr implementation */;` as a placeholder expression body, which is not valid C# syntax. However, this is a widely understood blog convention for indicating omitted implementation and does not mislead the reader.
- Some code snippets omit field declarations (e.g., `daprClient`, `_repository`, `_publisher` are used but not declared). This is acceptable for a conceptual post focused on illustrating design principles rather than providing copy-paste-ready code.
- The return type of `GetByIdAsync` differs between the ISP "BAD" example (`Task<Order>`) and the LSP example (`Task<Order?>`). These are independent conceptual snippets, so this inconsistency is minor and doesn't affect the teaching of the principles.
- All Dapr .NET SDK APIs used (SaveStateAsync, PublishEventAsync, AddDaprClient) are current and non-deprecated.
