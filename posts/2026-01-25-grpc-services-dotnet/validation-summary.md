# Validation Summary: How to Build gRPC Services in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- ASP.NET Core gRPC
- gRPC
- Protocol Buffers
- NuGet packages
- gRPC reflection
- gRPC interceptors

## Sources Consulted
- Microsoft Learn: gRPC services with ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/aspnetcore
- Microsoft Learn: Call gRPC services with the .NET client - https://learn.microsoft.com/en-us/aspnet/core/grpc/client
- Microsoft Learn: gRPC for .NET configuration - https://learn.microsoft.com/en-us/aspnet/core/grpc/configuration
- Microsoft Learn: Test gRPC services with gRPCurl and gRPCui in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/test-tools
- gRPC documentation: Introduction to gRPC - https://grpc.io/docs/what-is-grpc/introduction/
- gRPC documentation: Core concepts, architecture and lifecycle - https://grpc.io/docs/what-is-grpc/core-concepts/
- NuGet: Grpc.Net.Client - https://www.nuget.org/packages/Grpc.Net.Client
- NuGet: Google.Protobuf - https://www.nuget.org/packages/Google.Protobuf
- NuGet: Grpc.Tools - https://www.nuget.org/packages/Grpc.Tools
- NuGet: Grpc.AspNetCore.Server.Reflection - https://www.nuget.org/packages/Grpc.AspNetCore.Server.Reflection

## Issues Found
- The server reflection example called `MapGrpcReflectionService()` but did not add the required `Grpc.AspNetCore.Server.Reflection` package or register reflection with `AddGrpcReflection()`. Added the package command and service registration, and mapped reflection only in development to match Microsoft guidance.
- The client project used older package versions. Updated `Grpc.Net.Client`, `Google.Protobuf`, and `Grpc.Tools` to current NuGet versions checked during review.
- The `ProductServiceClient` snippet used `[EnumeratorCancellation]` without importing `System.Runtime.CompilerServices`. Added the required using directive.
- The interceptor snippet used `Interceptor`, `UnaryServerMethod`, and `Stopwatch` without the required imports. Added `System.Diagnostics`, `Grpc.Core`, and `Grpc.Core.Interceptors`.
- The performance claim said binary serialization is always faster and smaller than JSON. Softened the wording to "can result" and "often faster" because the exact outcome depends on payload shape and runtime conditions.

## Review Notes
The examples still assume surrounding application types such as `Product`, `IProductRepository`, and `InMemoryProductRepository` exist. That is acceptable for this tutorial style, but a future revision could include minimal definitions or link to a complete sample project.
