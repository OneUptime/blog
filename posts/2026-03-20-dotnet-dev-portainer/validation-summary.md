# Validation Summary: How to Set Up a .NET Development Environment with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- .NET 8
- ASP.NET Core minimal APIs
- Docker and Docker Compose
- Portainer
- Entity Framework Core
- SQL Server 2022 containers
- Redis
- VS Code remote debugging with `vsdbg`

## Sources Consulted
- Microsoft Learn: `dotnet watch` command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch
- Microsoft Learn: `dotnet` command overview - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet
- Microsoft Learn: EF Core CLI tools reference - https://learn.microsoft.com/en-us/ef/core/cli/dotnet
- Microsoft Learn: Distributed caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed?view=aspnetcore-10.0
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0
- Microsoft Learn: Hosting ASP.NET Core images with Docker over HTTPS - https://learn.microsoft.com/en-us/aspnet/core/security/docker-https?view=aspnetcore-9.0
- Microsoft Learn: Default ASP.NET Core port changed from 80 to 8080 - https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port
- Microsoft Learn: Use code coverage for unit testing - https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-code-coverage
- Microsoft Learn: SQL Server Linux container quickstart - https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-ver16
- Microsoft Learn: SQL Server editions on Linux - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-editions-and-components-2019?view=sql-server-ver17
- Docker Docs: Control startup order - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Compose files with `build` steps on remote environments - https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- VS Code Docs: Variables reference - https://code.visualstudio.com/docs/reference/variables-reference

## Issues Found
- The Dockerfile installed `dotnet-watch` as a global tool even though `dotnet watch` is included in the .NET SDK and the legacy `dotnet-watch` package is deprecated. I removed that install.
- The Dockerfile installed `dotnet-ef` without a version pin. For a .NET 8 / EF Core 8 post, that can pull a mismatched newer major version in 2026. I pinned it to `8.0.0`.
- The Dockerfile restored `*.csproj`, while the rest of the post consistently targets `MyApi.csproj`. That pattern is ambiguous when multiple project files exist. I aligned the restore step to `MyApi.csproj`.
- The Dockerfile and Compose file exposed HTTPS and debugger ports without configuring an HTTPS certificate or a TCP debugger endpoint. I removed the broken `8081`/`5001` and `5678` exposure so the sample matches the actual configuration.
- The Compose sample used plain `depends_on`, which only controls start order, not readiness. Because the app runs EF migrations on startup, that can race SQL Server initialization. I added SQL Server and Redis health checks and changed `depends_on` to `condition: service_healthy`.
- The post did not mention Portainer's current limitation for Compose `build:` directives on remote Docker environments. I added a note to prebuild the image and switch to `image:` in that case.
- The application snippet used `AddSqlServer` and `AddRedis` health-check extensions without declaring the required packages, and Microsoft documents that the `AspNetCore.Diagnostics.HealthChecks` library isn't maintained or supported by Microsoft. I switched the example to the Microsoft-supported `AddDbContextCheck<AppDbContext>()`.
- The post was missing the package-install commands required for the EF Core provider, EF Core design-time tooling, Redis caching, and EF Core health checks. I added version-pinned `dotnet add package` commands for those dependencies.
- The VS Code debugger configuration used the deprecated `${workspaceRoot}` variable. I updated it to `${workspaceFolder}`.
- The coverage command implicitly depended on `coverlet.collector`. I annotated that requirement so the command's prerequisite is explicit.

## Review Notes
- The top-level `version: "3.8"` field in the Compose file is obsolete in current Docker Compose, but still accepted for backward compatibility. It doesn't break the example.
- SQL Server Linux containers are supported on Linux hosts running x86-64 CPUs. ARM emulation scenarios are not supported by Microsoft, which is relevant for Apple Silicon and other ARM-based development machines.
- The Swagger setup assumes the project already includes the usual Web API template packages. If the project wasn't created from the standard ASP.NET Core Web API template, `Swashbuckle.AspNetCore` may need to be added explicitly.
