# Validation Summary: How to Set Up Integration Testing in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET CLI
- ASP.NET Core
- C#
- xUnit
- WebApplicationFactory
- Entity Framework Core
- EF Core InMemory provider
- SQL Server provider for EF Core
- Testcontainers for .NET
- ASP.NET Core authentication and authorization testing
- Moq
- WireMock.Net

## Sources Consulted
- Microsoft Learn: Integration tests in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests
- Microsoft Learn: dotnet new command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new
- Microsoft Learn: dotnet package add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn: dotnet reference add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-reference-add
- Microsoft Learn: EF Core In-Memory Database Provider - https://learn.microsoft.com/en-us/ef/core/providers/in-memory/
- Microsoft Learn: AuthenticationHandler<TOptions> API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.authenticationhandler-1
- Testcontainers for .NET: Microsoft SQL Server module - https://dotnet.testcontainers.org/modules/mssql/
- Testcontainers guide: Testing an ASP.NET Core web app - https://testcontainers.com/guides/testing-an-aspnet-core-web-app/
- Docker Docs: Testing an ASP.NET Core web app with Testcontainers - https://docs.docker.com/guides/testcontainers-dotnet-aspnet-core/
- WireMock.Net documentation: Stubbing - https://wiremock.org/dotnet/stubbing/

## Issues Found
- The Testcontainers SQL Server example used `UseSqlServer` and `MsSqlBuilder` without first installing `Microsoft.EntityFrameworkCore.SqlServer` and `Testcontainers.MsSql`. Added the required `dotnet add package` commands before the example.
- The Moq example used `Mock<T>` without installing Moq. Added the required `dotnet add package Moq` command.
- The external service replacement example added a mock `IPaymentService` without explicitly removing the app's existing registration. Added `services.RemoveAll<IPaymentService>()` and the required `Microsoft.Extensions.DependencyInjection.Extensions` using so the example reliably replaces the service.
- The WireMock example used WireMock.Net APIs without installing `WireMock.Net`. Added the required package command.
- The WireMock example assigned the result of `WithWebHostBuilder` to `CustomWebApplicationFactory<Program>`, but `WithWebHostBuilder` returns `WebApplicationFactory<Program>`. Changed the field type and added the corresponding using.

## Review Notes
- The ASP.NET Core integration test, `WebApplicationFactory`, test authentication handler, EF Core InMemory provider, Testcontainers SQL Server, and WireMock.Net patterns are consistent with current official documentation.
- The EF Core InMemory provider remains valid for tests, but Microsoft notes that it is discouraged for some EF Core testing scenarios and is not designed for production use.
- The local environment did not have the `dotnet` CLI installed, so command behavior was verified against official CLI documentation instead of local `--help` output.
