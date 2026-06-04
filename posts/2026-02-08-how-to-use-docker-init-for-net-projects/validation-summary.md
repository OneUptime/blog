# Validation Summary: How to Use docker init for .NET Projects

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Init
- Dockerfile multi-stage builds
- Docker Compose
- .NET 8
- ASP.NET Core Web API
- ASP.NET Core health checks
- Native AOT
- Microsoft .NET container images
- SQL Server containers
- PostgreSQL containers

## Sources Consulted
- Docker CLI reference for `docker init`: https://docs.docker.com/reference/cli/docker/init/
- Docker .NET containerization guide: https://docs.docker.com/guides/dotnet/containerize/
- Microsoft Learn, .NET SDK templates: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new-sdk-templates
- Microsoft Learn, .NET container images: https://learn.microsoft.com/en-us/dotnet/core/docker/container-images
- Microsoft Learn, what's new in .NET 8 containers: https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/containers
- Microsoft Learn, Native AOT deployment: https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/
- Microsoft Learn, ASP.NET Core Native AOT support: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot
- Microsoft Learn, ASP.NET Core health checks: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn, SQL Server Linux container security: https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-security
- Microsoft Learn, SQL Server Linux container deployment: https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment
- Official Microsoft SQL Server Docker image documentation: https://hub.docker.com/_/microsoft-mssql-server
- Microsoft Learn, `sqlcmd` utility: https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility

## Issues Found
- The sample used `dotnet new webapi` while the code and endpoint tests assume a controller-based WeatherForecast API. In .NET 8 and later, the Web API template defaults to minimal APIs unless `--use-controllers` is specified. Changed the command to `dotnet new webapi -n DotnetDockerDemo --use-controllers` and adjusted the description.
- The Docker Init ASP.NET Core prompt example did not match Docker's documented prompt wording. Updated it to use the solution main project prompt and local port prompt shown in Docker's CLI reference.
- The Dockerfile explanation said the generated file used three stages, but the shown Dockerfile has two `FROM` stages with restore as a cached layer, not a separate Docker stage. Updated the explanation.
- The Native AOT section implied the controller-based sample could be published with AOT as-is. Microsoft documents MVC/controllers as not compatible with Native AOT and recommends the `webapiaot` minimal API template for AOT web APIs. Added the compatibility caveat.
- The SQL Server Compose example used deprecated `SA_PASSWORD`. Replaced it with `MSSQL_SA_PASSWORD`.
- The SQL Server health check used the older `/opt/mssql-tools/bin/sqlcmd` path. Current SQL Server 2022 container images use `/opt/mssql-tools18/bin/sqlcmd`, so the path was updated and `-C` was added to trust the container's development certificate during the health check.
- The chiseled-image health-check example ran `dotnet DotnetDockerDemo.dll --health-check`, but the app does not implement that command and the probe would start the web app rather than check health. Replaced it with guidance to use orchestrator HTTP probes or a dedicated health-check binary for chiseled images.

## Review Notes
The post is technically relevant and useful after the fixes. Future improvements could mention Docker BuildKit cache mounts for NuGet packages and .NET 8's built-in `app` user, but those are enhancements rather than correctness issues.
