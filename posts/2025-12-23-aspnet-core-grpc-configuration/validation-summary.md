# Validation Summary: How to Configure gRPC in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core
- gRPC
- Protocol Buffers
- gRPC client factory
- gRPC streaming
- gRPC interceptors
- JWT bearer authentication
- gRPC health checks
- gRPC-Web
- gRPC reflection

## Sources Consulted
- Microsoft Learn: gRPC services with ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/aspnetcore?view=aspnetcore-10.0
- Microsoft Learn: gRPC for .NET configuration - https://learn.microsoft.com/en-us/aspnet/core/grpc/configuration?view=aspnetcore-10.0
- Microsoft Learn: Call gRPC services with the .NET client - https://learn.microsoft.com/en-us/aspnet/core/grpc/client?view=aspnetcore-10.0
- Microsoft Learn: gRPC client factory integration in .NET - https://learn.microsoft.com/en-us/aspnet/core/grpc/clientfactory?view=aspnetcore-10.0
- Microsoft Learn: gRPC Services with C# - https://learn.microsoft.com/en-us/aspnet/core/grpc/basics?view=aspnetcore-10.0
- Microsoft Learn: Error handling with gRPC on .NET - https://learn.microsoft.com/en-us/aspnet/core/grpc/error-handling?view=aspnetcore-10.0
- Microsoft Learn: gRPC interceptors on .NET - https://learn.microsoft.com/en-us/aspnet/core/grpc/interceptors?view=aspnetcore-10.0
- Microsoft Learn: Authentication and authorization in gRPC for ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/authn-and-authz?view=aspnetcore-10.0
- Microsoft Learn: gRPC health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/health-checks?view=aspnetcore-10.0
- Microsoft Learn: gRPC-Web in ASP.NET Core gRPC apps - https://learn.microsoft.com/en-us/aspnet/core/grpc/grpcweb?view=aspnetcore-10.0
- NuGet: Grpc.AspNetCore - https://www.nuget.org/packages/Grpc.AspNetCore
- NuGet: Grpc.Net.Client - https://www.nuget.org/packages/Grpc.Net.Client
- NuGet: Grpc.Net.ClientFactory - https://www.nuget.org/packages/Grpc.Net.ClientFactory
- NuGet: Grpc.Tools - https://www.nuget.org/packages/Grpc.Tools
- NuGet: Google.Protobuf - https://www.nuget.org/packages/Google.Protobuf
- NuGet: Grpc.AspNetCore.HealthChecks - https://www.nuget.org/packages/Grpc.AspNetCore.HealthChecks
- NuGet: Grpc.AspNetCore.Web - https://www.nuget.org/packages/Grpc.AspNetCore.Web
- NuGet: Grpc.AspNetCore.Server.Reflection - https://www.nuget.org/packages/Grpc.AspNetCore.Server.Reflection
- NuGet: Microsoft.AspNetCore.Authentication.JwtBearer - https://www.nuget.org/packages/Microsoft.AspNetCore.Authentication.JwtBearer

## Issues Found
- The server setup command used `Grpc.AspNetCore` without a version while other package examples were versioned. Updated it to the current stable `Grpc.AspNetCore` version.
- The client package references used outdated versions for `Google.Protobuf`, `Grpc.Net.Client`, and `Grpc.Tools`. Updated them to current stable versions from NuGet.
- The client factory section used `AddGrpcClient`, which requires the `Grpc.Net.ClientFactory` package. Added the missing package installation command.
- The authentication section used JWT bearer APIs without listing the `Microsoft.AspNetCore.Authentication.JwtBearer` package. Added the missing package installation command.
- The health checks section used `AddGrpcHealthChecks` and `MapGrpcHealthChecksService`, which require `Grpc.AspNetCore.HealthChecks`. Added the missing package installation command.
- The health checks snippet mapped a gRPC service without showing `builder.Services.AddGrpc()`. Added the missing gRPC service registration.
- The gRPC-Web section used `AddGrpcWeb`, `UseGrpcWeb`, and `EnableGrpcWeb`, which require `Grpc.AspNetCore.Web`. Added the missing package installation command.
- The complete server configuration used gRPC reflection APIs without listing the `Grpc.AspNetCore.Server.Reflection` package. Added the missing package installation command.

## Review Notes
The code examples use current ASP.NET Core gRPC APIs and match the official patterns for service registration, generated service implementations, client creation, client factory registration, interceptors, error handling, authentication metadata, health checks, gRPC-Web, and reflection. The local environment does not have the `dotnet` CLI installed, so commands and compilation were verified by static review against official documentation rather than by executing a build.
