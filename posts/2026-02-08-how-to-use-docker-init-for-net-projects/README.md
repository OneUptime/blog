# How to Use docker init for .NET Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Init, .NET, C#, ASP.NET Core, Containerization, DevOps, Microsoft

Description: Learn how to use docker init with .NET projects to generate optimized Dockerfiles for ASP.NET Core web applications and background services.

---

.NET applications have excellent container support, and Microsoft provides well-maintained base images. But setting up the right multi-stage Dockerfile with proper SDK and runtime image separation still requires careful configuration. The `docker init` command detects .NET projects by finding .csproj or .sln files and generates an optimized Dockerfile that follows Microsoft's recommended patterns.

## Setting Up a Sample .NET Project

Create a basic ASP.NET Core Web API:

```bash
# Create a new Web API project
dotnet new webapi -n DotnetDockerDemo
cd DotnetDockerDemo
```

The default template generates a WeatherForecast API. Let's add a health endpoint:

```csharp
// Program.cs - ASP.NET Core Web API with health check
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Map the health check endpoint
app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
```

## Running docker init

With the project in place, run docker init:

```bash
docker init
```

Docker init detects the .csproj file and identifies the project as .NET:

```
? What application platform does your project use? ASP.NET Core
? What version of .NET do you want to use? 8.0
? What port does your server listen on? 8080
? What is your project name? DotnetDockerDemo
```

## Understanding the Generated Dockerfile

The generated Dockerfile uses three stages: restore, build, and runtime:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage - restore and compile
FROM mcr.microsoft.com/dotnet/sdk:8.0 as build
WORKDIR /src

# Copy project file and restore dependencies (cached layer)
COPY ["DotnetDockerDemo.csproj", "./"]
RUN dotnet restore

# Copy remaining source and publish
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage - only the .NET runtime, no SDK
FROM mcr.microsoft.com/dotnet/aspnet:8.0 as final
WORKDIR /app

# Create non-root user
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    appuser
USER appuser

# Copy published application from build stage
COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "DotnetDockerDemo.dll"]
```

Key decisions in this Dockerfile:

- **SDK image for building, runtime image for running** - The SDK is about 700 MB, while the runtime is about 200 MB
- **Separate restore and build** - NuGet restore is cached unless .csproj changes
- **/p:UseAppHost=false** - Skips generating a native executable since we use `dotnet` as the entrypoint
- **Non-root user** for security

## Solution-Level Projects

For solutions with multiple projects, adjust the Dockerfile to handle the solution file:

```dockerfile
# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 as build
WORKDIR /src

# Copy solution and all project files for restore
COPY ["MyApp.sln", "./"]
COPY ["src/WebApi/WebApi.csproj", "src/WebApi/"]
COPY ["src/Domain/Domain.csproj", "src/Domain/"]
COPY ["src/Infrastructure/Infrastructure.csproj", "src/Infrastructure/"]

# Restore all projects in one step
RUN dotnet restore "MyApp.sln"

# Copy everything and publish the web API project
COPY . .
RUN dotnet publish "src/WebApi/WebApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 as final
WORKDIR /app

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    appuser
USER appuser

COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "WebApi.dll"]
```

Copying project files separately before the full source copy lets Docker cache the NuGet restore layer.

## Using Native AOT Compilation

.NET 8 supports Ahead-of-Time (AOT) compilation, which produces a native binary without needing the .NET runtime. This creates much smaller images.

```dockerfile
# syntax=docker/dockerfile:1

# Build stage with AOT compilation
FROM mcr.microsoft.com/dotnet/sdk:8.0 as build
RUN apt-get update && apt-get install -y clang zlib1g-dev
WORKDIR /src

COPY ["DotnetDockerDemo.csproj", "./"]
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish -r linux-x64 /p:PublishAot=true

# Runtime stage - no .NET runtime needed with AOT
FROM mcr.microsoft.com/dotnet/runtime-deps:8.0 as final
WORKDIR /app

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    appuser
USER appuser

COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["./DotnetDockerDemo"]
```

Note the base image changes to `runtime-deps` instead of `aspnet`. The AOT binary only needs the OS-level dependencies, not the .NET runtime.

Enable AOT in your project file:

```xml
<!-- DotnetDockerDemo.csproj -->
<PropertyGroup>
    <PublishAot>true</PublishAot>
</PropertyGroup>
```

## Chiseled Images for Minimal Attack Surface

Microsoft provides "chiseled" variants of .NET images. These are Ubuntu-based images stripped of everything except what .NET needs - no shell, no package manager, no root user.

```dockerfile
# Use chiseled images for minimal production containers
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled as final
WORKDIR /app

# No need to create a user - chiseled images run as non-root by default
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "DotnetDockerDemo.dll"]
```

Chiseled images are about 50% smaller than the standard runtime images and have a significantly reduced attack surface.

## Development compose.yaml

The generated compose.yaml serves as a starting point. Extend it for development:

```yaml
# compose.yaml - .NET app with SQL Server and development overrides
services:
  api:
    build:
      context: .
      target: build  # Use build stage for development
    ports:
      - "8080:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ASPNETCORE_URLS=http://+:8080
      - ConnectionStrings__DefaultConnection=Server=db;Database=MyApp;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/src
    command: dotnet watch run --project /src/DotnetDockerDemo.csproj

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong!Passw0rd
    ports:
      - "1433:1433"
    volumes:
      - sqldata:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -Q "SELECT 1"
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  sqldata:
```

The `dotnet watch run` command enables hot reload during development.

## Using PostgreSQL Instead of SQL Server

Many .NET applications use PostgreSQL. Swap the database service:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

And update the connection string:

```yaml
environment:
  - ConnectionStrings__DefaultConnection=Host=db;Database=myapp;Username=app;Password=secret
```

## .NET-Specific .dockerignore

```
# Build outputs
bin
obj
out
publish

# NuGet
*.nupkg

# IDE files
.vs
.vscode
*.user
*.suo

# Version control
.git
.gitignore

# Docker files
Dockerfile
compose.yaml
.dockerignore

# Documentation
*.md
```

## Building and Testing

```bash
# Build the production image
docker build -t my-dotnet-app:latest .

# Check the image size
docker images my-dotnet-app

# Run the container
docker run -p 8080:8080 my-dotnet-app:latest

# Test the endpoints
curl http://localhost:8080/health
curl http://localhost:8080/weatherforecast

# Run the full development stack
docker compose up --build
```

## Health Checks in the Dockerfile

Add a health check for container orchestrators:

```dockerfile
# Add a health check for production
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

For chiseled images (which lack curl), use a .NET-based health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["dotnet", "DotnetDockerDemo.dll", "--health-check"]
```

Docker init gives .NET developers a well-structured starting point with proper SDK and runtime separation. From there, consider chiseled images for production, AOT compilation for smaller binaries, and layered NuGet restore for faster builds. The .NET container ecosystem is mature and well-documented, and docker init captures the best practices in its generated files.
