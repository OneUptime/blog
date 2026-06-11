# Validation Summary: How to Create Custom gRPC Interceptors in .NET

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- .NET / ASP.NET Core
- C#
- gRPC for .NET
- gRPC server and client interceptors
- System.Diagnostics.Metrics / IMeterFactory
- JWT validation with Microsoft.IdentityModel.Tokens
- FluentValidation
- xUnit and Grpc.Core.Testing

## Sources Consulted
- Microsoft Learn: gRPC interceptors on .NET: https://learn.microsoft.com/en-us/aspnet/core/grpc/interceptors
- Microsoft Learn: gRPC client factory integration in .NET: https://learn.microsoft.com/en-us/aspnet/core/grpc/clientfactory
- Microsoft Learn: gRPC services with ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/grpc/aspnetcore
- Microsoft Learn: ASP.NET Core metrics and IMeterFactory: https://learn.microsoft.com/en-us/aspnet/core/log-mon/metrics/metrics
- Microsoft Learn: Creating metrics with System.Diagnostics.Metrics: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- gRPC C# API reference: Grpc.Core.Testing.TestServerCallContext: https://grpc.github.io/grpc/csharp/api/Grpc.Core.Testing.TestServerCallContext.html
- FluentValidation documentation: Dependency Injection: https://docs.fluentvalidation.net/en/latest/di.html
- Microsoft Learn: TokenValidationParameters: https://learn.microsoft.com/en-us/dotnet/api/microsoft.identitymodel.tokens.tokenvalidationparameters

## Issues Found
- The simplified `Interceptor` base class snippet declared virtual methods without bodies, which is not valid C#. Updated the text to identify the snippet as simplified and added forwarding method bodies that call the continuations.
- The client-side authentication interceptor description claimed token refresh handling, but the code only attaches a bearer token. Updated the description to match the implementation.
- The registration section stated interceptor ordering too broadly. Server interceptors run in registration order, but chained client-side `Intercept` calls are invoked in reverse order. Updated the explanation and channel example accordingly.
- The server registration example used `AddSingleton<IMeterFactory, MeterFactory>()`. Current .NET guidance is to use host-provided metrics services or `AddMetrics()`. Updated the snippet to call `builder.Services.AddMetrics()`.
- The registration example referred to "panics", which is not .NET terminology. Updated it to "exceptions".
- The manual client interceptor example reused one ambiguous `logger` variable for two interceptors with different `ILogger<T>` constructor requirements. Updated the snippet to create correctly typed loggers with `ILoggerFactory`.
- The metrics interceptor recorded non-`RpcException` failures for unary calls but not for server-streaming calls. Added a generic catch block to record `INTERNAL` status for server-streaming failures.
- The authentication interceptor test returned a placeholder string for a "valid" JWT, so the success test would not pass. Replaced it with a real JWT generated with the same issuer, audience, signing key, and a `NameIdentifier` claim.

## Review Notes
The post is technically relevant and implementation-focused. The examples are still illustrative rather than a complete runnable project; a future improvement would be to mention package references for optional pieces such as FluentValidation, Grpc.Net.ClientFactory, Grpc.Reflection, and JWT token packages.
