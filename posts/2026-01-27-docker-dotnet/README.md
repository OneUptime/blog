# How to Use Docker with .NET Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, .NET, C#, Containers, DevOps, ASP.NET Core, Microservices

Description: A comprehensive guide to containerizing .NET applications with Docker, covering Dockerfiles, multi-stage builds, optimization techniques, and production best practices.

---

> Containerizing .NET applications is not just about wrapping your code in Docker - it is about building images that are small, secure, and production-ready from day one.

## Creating a Dockerfile for .NET Applications

The foundation of containerizing any .NET application starts with a well-structured Dockerfile. Here is a basic example for an ASP.NET Core web application.

```dockerfile
# Dockerfile for a basic ASP.NET Core application
# This single-stage build is simple but produces larger images

# Use the official .NET 8 SDK image as the base
# This image includes everything needed to build .NET applications
FROM mcr.microsoft.com/dotnet/aspnet:8.0

# Set the working directory inside the container
# All subsequent commands will run from this directory
WORKDIR /app

# Copy the published application files to the container
# Assumes you have already run 'dotnet publish' locally
COPY ./publish .

# Expose port 8080 for the application
# This documents which port the container listens on
EXPOSE 8080

# Set the entry point for the container
# This command runs when the container starts
ENTRYPOINT ["dotnet", "MyWebApp.dll"]
```

For development, you might want to include the SDK for building within the container:

```dockerfile
# Development Dockerfile with build capabilities
# Useful for CI/CD pipelines that build inside containers

FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

# Copy project files first for better layer caching
# Package restore only reruns when these files change
COPY *.csproj ./
RUN dotnet restore

# Copy the rest of the source code
COPY . ./

# Build the application in Release configuration
RUN dotnet build -c Release -o /app/build

# Set the working directory to the build output
WORKDIR /app/build

ENTRYPOINT ["dotnet", "MyWebApp.dll"]
```

## Multi-Stage Builds for Production

Multi-stage builds are essential for production .NET containers. They separate the build environment from the runtime environment, resulting in smaller and more secure images.

```dockerfile
# Multi-stage Dockerfile for production .NET applications
# Stage 1: Build - uses SDK image with all build tools
# Stage 2: Runtime - uses minimal ASP.NET runtime image

# ====================
# Stage 1: Build Stage
# ====================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set the working directory for the build
WORKDIR /src

# Copy only the project file first
# This layer is cached and only rebuilds when dependencies change
COPY ["MyWebApp/MyWebApp.csproj", "MyWebApp/"]

# Restore NuGet packages as a separate layer
# This improves build cache efficiency significantly
RUN dotnet restore "MyWebApp/MyWebApp.csproj"

# Copy the entire source code
COPY . .

# Change to the project directory
WORKDIR "/src/MyWebApp"

# Build the application in Release mode
# Output goes to /app/build directory
RUN dotnet build "MyWebApp.csproj" -c Release -o /app/build

# ====================
# Stage 2: Publish Stage
# ====================
FROM build AS publish

# Publish the application with optimizations
# /p:UseAppHost=false - Skip generating native executable
# This reduces image size and improves startup time
RUN dotnet publish "MyWebApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ====================
# Stage 3: Runtime Stage
# ====================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

# Create a non-root user for security
# Running as root in containers is a security risk
RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

# Copy only the published output from the publish stage
# This excludes SDK, source code, and intermediate build files
COPY --from=publish /app/publish .

# Change ownership to the non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Set the entry point
ENTRYPOINT ["dotnet", "MyWebApp.dll"]
```

## Optimizing Image Size

Image size directly impacts deployment speed, storage costs, and security surface area. Here are techniques to minimize your .NET container images.

### Use Alpine-Based Images

```dockerfile
# Alpine-based images are significantly smaller
# Regular aspnet:8.0 is ~220MB, Alpine version is ~110MB

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY ["MyWebApp.csproj", "./"]
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish \
    # Trim unused assemblies to reduce size
    /p:PublishTrimmed=true \
    # Enable single-file deployment
    /p:PublishSingleFile=true \
    # Target the specific runtime
    /p:RuntimeIdentifier=linux-musl-x64

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["./MyWebApp"]
```

### Use Chiseled Ubuntu Images (Distroless)

```dockerfile
# Chiseled images are ultra-minimal Ubuntu-based images
# They contain no shell, no package manager - just the runtime
# This significantly reduces attack surface

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .
RUN dotnet publish -c Release -o /app/publish

# Use the chiseled (distroless) variant for production
# These images are about 50% smaller than standard images
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled AS final

WORKDIR /app
COPY --from=build /app/publish .

# Chiseled images run as non-root by default
# No need to create users or change permissions

ENTRYPOINT ["dotnet", "MyWebApp.dll"]
```

### Assembly Trimming Configuration

Add these settings to your project file for aggressive size optimization:

```xml
<!-- MyWebApp.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>

    <!-- Enable assembly trimming to remove unused code -->
    <PublishTrimmed>true</PublishTrimmed>

    <!-- Trim aggressively - test thoroughly! -->
    <TrimMode>link</TrimMode>

    <!-- Enable ReadyToRun compilation for faster startup -->
    <PublishReadyToRun>true</PublishReadyToRun>

    <!-- Generate single executable file -->
    <PublishSingleFile>true</PublishSingleFile>

    <!-- Include native dependencies in single file -->
    <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
  </PropertyGroup>
</Project>
```

## Docker Compose for .NET Applications

Docker Compose simplifies running multi-container applications. Here is a complete example for a .NET application with dependencies.

```yaml
# docker-compose.yml
# Defines a complete development environment for a .NET application
# Includes the web app, database, cache, and message broker

version: '3.8'

services:
  # Main .NET web application
  webapi:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:8080"      # Map host port 5000 to container port 8080
    environment:
      # Connection strings and configuration
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__DefaultConnection=Server=db;Database=MyApp;User=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
      - Redis__ConnectionString=redis:6379
      - RabbitMQ__Host=rabbitmq
    depends_on:
      db:
        condition: service_healthy    # Wait for database to be ready
      redis:
        condition: service_started
    networks:
      - app-network
    restart: unless-stopped

  # SQL Server database
  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=YourStrong!Passw0rd
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql    # Persist database files
    healthcheck:
      # Check if SQL Server is ready to accept connections
      test: /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - app-network

  # Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network

  # RabbitMQ message broker
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"      # AMQP protocol
      - "15672:15672"    # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - app-network

# Named volumes for data persistence
volumes:
  sqlserver-data:
  redis-data:
  rabbitmq-data:

# Custom network for service communication
networks:
  app-network:
    driver: bridge
```

Run with development overrides:

```yaml
# docker-compose.override.yml
# Development-specific overrides
# Automatically merged with docker-compose.yml

version: '3.8'

services:
  webapi:
    build:
      context: .
      dockerfile: Dockerfile.dev    # Use development Dockerfile
    volumes:
      # Mount source code for hot reload
      - ./src:/app/src:cached
      # Mount NuGet packages cache for faster restores
      - ~/.nuget/packages:/root/.nuget/packages:cached
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - DOTNET_USE_POLLING_FILE_WATCHER=1    # Enable file watching in containers
    # Override the default command for development
    command: dotnet watch run --project /app/src/MyWebApp.csproj
```

## Implementing Health Checks

Health checks are critical for container orchestration. They allow Docker and Kubernetes to know when your application is ready to receive traffic.

### Dockerfile Health Check

```dockerfile
# Add health check instruction to Dockerfile
# Docker will periodically call this endpoint

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=publish /app/publish .

# Configure the health check
# --interval: Time between checks
# --timeout: Maximum time to wait for response
# --start-period: Grace period for container startup
# --retries: Number of failures before marking unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl --fail http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "MyWebApp.dll"]
```

### ASP.NET Core Health Check Implementation

```csharp
// Program.cs
// Configure health checks for your .NET application

using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add health check services with custom checks
builder.Services.AddHealthChecks()
    // Check SQL Server connectivity
    .AddSqlServer(
        connectionString: builder.Configuration.GetConnectionString("DefaultConnection")!,
        name: "sqlserver",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "sql", "ready" })
    // Check Redis connectivity
    .AddRedis(
        redisConnectionString: builder.Configuration["Redis:ConnectionString"]!,
        name: "redis",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "cache", "ready" })
    // Check RabbitMQ connectivity
    .AddRabbitMQ(
        rabbitConnectionString: builder.Configuration["RabbitMQ:ConnectionString"]!,
        name: "rabbitmq",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "messaging", "ready" })
    // Add custom health check
    .AddCheck<CustomStartupHealthCheck>(
        "startup",
        tags: new[] { "startup" });

var app = builder.Build();

// Liveness probe - is the application running?
// Used by Kubernetes to determine if container should be restarted
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    // Only include checks without tags (basic liveness)
    Predicate = _ => false,
    ResponseWriter = WriteHealthCheckResponse
});

// Readiness probe - is the application ready to serve traffic?
// Used by Kubernetes to determine if pod should receive traffic
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    // Include only checks tagged with "ready"
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteHealthCheckResponse
});

// Full health check - detailed status of all dependencies
// Used for monitoring dashboards and detailed diagnostics
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = WriteHealthCheckResponse
});

app.Run();

// Custom response writer for detailed health check output
static Task WriteHealthCheckResponse(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";

    var response = new
    {
        status = report.Status.ToString(),
        totalDuration = report.TotalDuration.TotalMilliseconds,
        checks = report.Entries.Select(e => new
        {
            name = e.Key,
            status = e.Value.Status.ToString(),
            duration = e.Value.Duration.TotalMilliseconds,
            description = e.Value.Description,
            exception = e.Value.Exception?.Message
        })
    };

    return context.Response.WriteAsync(
        JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
}
```

### Custom Health Check Class

```csharp
// CustomStartupHealthCheck.cs
// Implements a startup health check that waits for initialization

using Microsoft.Extensions.Diagnostics.HealthChecks;

public class CustomStartupHealthCheck : IHealthCheck
{
    private volatile bool _isReady = false;
    private readonly ILogger<CustomStartupHealthCheck> _logger;

    public CustomStartupHealthCheck(ILogger<CustomStartupHealthCheck> logger)
    {
        _logger = logger;
    }

    // Call this method when your application has finished initializing
    public void SetReady()
    {
        _isReady = true;
        _logger.LogInformation("Application startup completed, health check is now ready");
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (_isReady)
        {
            return Task.FromResult(HealthCheckResult.Healthy("Application has started"));
        }

        return Task.FromResult(HealthCheckResult.Unhealthy("Application is still starting"));
    }
}
```

## Managing Environment Variables

Proper configuration management is crucial for containerized applications. .NET provides excellent support for environment-based configuration.

### Configuration in appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "Redis": {
    "ConnectionString": "localhost:6379",
    "InstanceName": "MyApp_"
  },
  "Features": {
    "EnableNewDashboard": false,
    "MaxUploadSizeMB": 10
  }
}
```

### Reading Configuration in Code

```csharp
// Program.cs
// Configure environment variable handling

var builder = WebApplication.CreateBuilder(args);

// Configuration is automatically loaded from:
// 1. appsettings.json
// 2. appsettings.{Environment}.json
// 3. Environment variables
// 4. Command line arguments
// Later sources override earlier ones

// Bind configuration sections to strongly-typed objects
builder.Services.Configure<RedisOptions>(
    builder.Configuration.GetSection("Redis"));

builder.Services.Configure<FeatureFlags>(
    builder.Configuration.GetSection("Features"));

var app = builder.Build();

// Access configuration directly when needed
var connectionString = app.Configuration.GetConnectionString("DefaultConnection");
var maxUploadSize = app.Configuration.GetValue<int>("Features:MaxUploadSizeMB");

app.Run();

// Configuration classes
public class RedisOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public string InstanceName { get; set; } = string.Empty;
}

public class FeatureFlags
{
    public bool EnableNewDashboard { get; set; }
    public int MaxUploadSizeMB { get; set; }
}
```

### Environment Variable Mapping

```csharp
// Environment variables override appsettings.json values
// Use double underscore (__) to represent nested configuration

// appsettings.json: { "Redis": { "ConnectionString": "..." } }
// Environment variable: Redis__ConnectionString=redis:6379

// appsettings.json: { "Features": { "EnableNewDashboard": false } }
// Environment variable: Features__EnableNewDashboard=true
```

### Docker Environment Configuration

```dockerfile
# Set environment variables in Dockerfile
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

# Or use ARG for build-time variables
ARG BUILD_VERSION=1.0.0
ENV APP_VERSION=$BUILD_VERSION
```

### Docker Compose with Environment Files

```yaml
# docker-compose.yml
services:
  webapi:
    build: .
    env_file:
      - .env                    # Load variables from .env file
      - .env.${ENVIRONMENT}     # Environment-specific overrides
    environment:
      # Inline environment variables
      - ASPNETCORE_ENVIRONMENT=${ENVIRONMENT:-Development}
      - ConnectionStrings__DefaultConnection=${DB_CONNECTION_STRING}
```

```bash
# .env file
ENVIRONMENT=Production
DB_CONNECTION_STRING=Server=db;Database=MyApp;User=sa;Password=Secret123!
REDIS_CONNECTION=redis:6379
```

## Debugging .NET Applications in Containers

Debugging containerized applications requires specific configuration. Here is how to set up remote debugging for .NET applications.

### Development Dockerfile with Debugging Support

```dockerfile
# Dockerfile.debug
# Includes debugging tools and VS Code debugger support

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS debug

# Install the VS Code debugger
# vsdbg is the cross-platform .NET debugger used by VS Code
RUN curl -sSL https://aka.ms/getvsdbgsh | /bin/sh /dev/stdin -v latest -l /vsdbg

WORKDIR /app

# Copy project files and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy source code
COPY . ./

# Build in Debug configuration
RUN dotnet build -c Debug

# Expose application port and debugger port
EXPOSE 8080
EXPOSE 4024

# Set environment for debugging
ENV ASPNETCORE_ENVIRONMENT=Development
ENV DOTNET_USE_POLLING_FILE_WATCHER=1

# Start with dotnet watch for hot reload
ENTRYPOINT ["dotnet", "watch", "run", "--no-launch-profile"]
```

### VS Code Launch Configuration

```json
{
    // .vscode/launch.json
    // Configure VS Code to attach to containerized .NET application
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Docker .NET Attach",
            "type": "docker",
            "request": "attach",
            "platform": "netCore",
            "sourceFileMap": {
                "/app": "${workspaceFolder}"
            }
        },
        {
            "name": "Docker .NET Launch",
            "type": "docker",
            "request": "launch",
            "preLaunchTask": "docker-run: debug",
            "netCore": {
                "appProject": "${workspaceFolder}/MyWebApp.csproj"
            }
        }
    ]
}
```

### VS Code Tasks Configuration

```json
{
    // .vscode/tasks.json
    // Define tasks for building and running Docker containers
    "version": "2.0.0",
    "tasks": [
        {
            "type": "docker-build",
            "label": "docker-build: debug",
            "dependsOn": ["build"],
            "dockerBuild": {
                "tag": "mywebapp:debug",
                "dockerfile": "${workspaceFolder}/Dockerfile.debug",
                "context": "${workspaceFolder}",
                "pull": true
            }
        },
        {
            "type": "docker-run",
            "label": "docker-run: debug",
            "dependsOn": ["docker-build: debug"],
            "dockerRun": {
                "containerName": "mywebapp-debug",
                "image": "mywebapp:debug",
                "ports": [
                    { "containerPort": 8080, "hostPort": 5000 }
                ],
                "volumes": [
                    {
                        "localPath": "${workspaceFolder}",
                        "containerPath": "/app",
                        "permissions": "rw"
                    }
                ]
            },
            "netCore": {
                "enableDebugging": true
            }
        }
    ]
}
```

### Debugging with Docker Compose

```yaml
# docker-compose.debug.yml
# Debug-specific compose configuration

version: '3.8'

services:
  webapi:
    build:
      context: .
      dockerfile: Dockerfile.debug
    ports:
      - "5000:8080"     # Application port
      - "4024:4024"     # Debugger port
    volumes:
      # Mount source code for live editing
      - ./:/app
      # Mount debugger
      - ~/.vsdbg:/vsdbg:ro
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
    # Keep container running for debugger attachment
    stdin_open: true
    tty: true
    # Use host network for easier debugger connection
    # network_mode: host  # Uncomment if needed
```

### Attaching Debugger Manually

```csharp
// Add this to your code for debugging startup issues
// The application will pause and wait for debugger attachment

using System.Diagnostics;

// Wait for debugger in development environment only
if (Environment.GetEnvironmentVariable("WAIT_FOR_DEBUGGER") == "true")
{
    Console.WriteLine("Waiting for debugger to attach...");
    Console.WriteLine($"Process ID: {Environment.ProcessId}");

    while (!Debugger.IsAttached)
    {
        Thread.Sleep(100);
    }

    Console.WriteLine("Debugger attached!");
    Debugger.Break();  // Break immediately when debugger connects
}
```

## Best Practices Summary

Following these best practices will help you build production-ready .NET containers:

### Image Optimization
- Always use multi-stage builds to separate build and runtime environments
- Choose the smallest base image that meets your needs (chiseled > alpine > standard)
- Enable assembly trimming for production builds to reduce image size
- Use specific version tags instead of `latest` for reproducible builds

### Security
- Run containers as non-root users whenever possible
- Use chiseled/distroless images to minimize attack surface
- Never include secrets in images - use environment variables or secret management
- Scan images for vulnerabilities using tools like Trivy or Snyk

### Health Checks
- Implement separate liveness and readiness probes
- Include startup probes for applications with long initialization times
- Set appropriate timeouts and intervals for your application characteristics
- Return detailed health information for debugging but secure sensitive data

### Configuration
- Use environment variables for runtime configuration
- Keep secrets out of docker-compose files - use .env files or secret managers
- Use configuration binding to strongly-typed classes
- Validate configuration at startup to fail fast on misconfiguration

### Development Experience
- Use Docker Compose for local development environments
- Enable hot reload with volume mounts during development
- Configure remote debugging for troubleshooting container issues
- Keep development and production Dockerfiles separate but similar

### Performance
- Order Dockerfile instructions from least to most frequently changing
- Copy project files before source code to maximize layer caching
- Use .dockerignore to exclude unnecessary files from build context
- Consider ReadyToRun compilation for faster cold starts

---

Containerizing .NET applications with Docker opens up powerful deployment options from local development to cloud-native orchestration. By following these patterns for multi-stage builds, health checks, and configuration management, you will build images that are small, secure, and ready for production.

Monitor your containerized .NET applications with [OneUptime](https://oneuptime.com) for comprehensive observability across your entire stack.
