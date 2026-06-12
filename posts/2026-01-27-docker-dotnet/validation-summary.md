# Validation Summary: How to Use Docker with .NET Applications

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker and Dockerfiles
- Docker Compose
- .NET 8
- ASP.NET Core
- C#
- SQL Server Linux containers
- Redis
- RabbitMQ
- ASP.NET Core health checks
- VS Code Container Tools debugging

## Sources Consulted
- Microsoft Learn: Default ASP.NET Core port changed from 80 to 8080 - https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port
- Microsoft Learn: What's new in containers for .NET 8 - https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/containers
- Microsoft Learn: Introduction to Docker with .NET - https://learn.microsoft.com/en-us/dotnet/core/docker/introduction
- Microsoft Learn: .NET application publishing overview - https://learn.microsoft.com/en-us/dotnet/core/deploying/
- Microsoft Learn: Create a single file for application deployment - https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview
- Microsoft Learn: Runtime-specific apps no longer self-contained by default in .NET 8 - https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/runtimespecific-app-default
- Microsoft Learn: Trim self-contained applications - https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trim-self-contained
- Microsoft Learn: ReadyToRun deployment overview - https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Docker Docs: Dockerfile reference, HEALTHCHECK - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version top-level element is obsolete - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Control startup order in Compose - https://docs.docker.com/compose/how-tos/startup-order/
- Microsoft Learn: SQL Server Linux containers quickstart - https://learn.microsoft.com/en-us/sql/linux/install-upgrade/quickstart-install-docker
- Microsoft Learn: Deploy and connect to SQL Server Linux containers - https://learn.microsoft.com/en-us/sql/linux/containers/deploy
- Visual Studio Code Docs: Debug .NET within a container - https://code.visualstudio.com/docs/containers/debug-netcore
- Visual Studio Code Docs: Container Tools extension reference - https://code.visualstudio.com/docs/containers/reference
- Xabaril AspNetCore.Diagnostics.HealthChecks repository - https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks

## Issues Found
- The first Dockerfile described `mcr.microsoft.com/dotnet/aspnet:8.0` as an SDK image. Updated the comments to correctly identify it as the ASP.NET Core runtime image.
- The production Dockerfile created a custom non-root user even though .NET 8 Linux images include the `app` user. Updated the snippet to use `USER app`, matching Microsoft container guidance.
- The `UseAppHost=false` explanation claimed startup-time improvement. Corrected it to say that it reduces output size when running the app with `dotnet MyWebApp.dll`.
- The Alpine Dockerfile placed comments inside a continued `RUN` instruction, which would be interpreted by the shell rather than as Dockerfile comments. Moved the explanation outside the command and kept the command syntactically valid.
- The Alpine optimization example enabled trimming while publishing framework-dependent output. Updated it to publish a self-contained `linux-musl-x64` single-file executable and use `runtime-deps:8.0-alpine`, which aligns with .NET trimming guidance.
- The Alpine runtime-deps image does not provide the ASP.NET Core container port environment by default. Added `ASPNETCORE_HTTP_PORTS=8080`.
- The project-file trimming example lacked runtime and self-contained settings required for single-file, ReadyToRun, and trimming scenarios. Added `RuntimeIdentifier` and `SelfContained`.
- The Docker Compose examples used the obsolete top-level `version` field. Removed it from the Compose snippets.
- The SQL Server health check used the older `/opt/mssql-tools/bin/sqlcmd` path. Updated it to `/opt/mssql-tools18/bin/sqlcmd` and added `-C` for current SQL Server tooling behavior.
- The Compose example set `RabbitMQ__Host`, while the health check code reads `RabbitMQ:ConnectionString`. Updated the environment variable to `RabbitMQ__ConnectionString`.
- The Dockerfile health check used `curl` without installing it. Added an installation step for `curl` in the Debian-based ASP.NET runtime image.
- The Docker environment variable example used `ASPNETCORE_URLS` for port configuration. Updated it to `ASPNETCORE_HTTP_PORTS=8080`, the simpler .NET 8 container-era setting.
- The `.env` example used a Redis variable name that did not map to the shown .NET configuration section. Updated it to `Redis__ConnectionString`.

## Review Notes
The post is technically relevant and generally sound after the corrections. Future improvements could mention that aggressive trimming of ASP.NET Core apps requires careful warning review and runtime testing, especially when reflection-heavy libraries are used.
