# How to Set Up a .NET Development Environment with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, .NET, C#, ASP.NET, Development, Microservice

Description: Build a complete .NET 8 development environment with hot-reload, remote debugging, SQL Server, and Redis using Docker and Portainer.

## Introduction

.NET 8 runs excellently in Docker containers with first-class support from Microsoft. This guide covers setting up a full .NET development environment with ASP.NET Core, Entity Framework, SQL Server, Redis, and hot-reload, all managed through Portainer.

## Step 1: Create the Development Dockerfile

```dockerfile
# Dockerfile.dev - .NET 8 development environment

FROM mcr.microsoft.com/dotnet/sdk:8.0

# Install tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install dotnet tools
RUN dotnet tool install -g dotnet-ef --version 8.0.0 && \
    dotnet tool install -g dotnet-outdated-tool

ENV PATH="$PATH:/root/.dotnet/tools"

WORKDIR /app

# Copy project files for dependency restoration
COPY MyApi.csproj ./
RUN dotnet restore /app/MyApi.csproj

# Copy all source files
COPY . .

# Expose ports
EXPOSE 8080    # HTTP
```

## Step 2: Deploy .NET Stack in Portainer

If Portainer is connected to a remote Docker environment, build the image outside Portainer and replace `build:` with `image:` because Portainer doesn't execute Compose `build` steps on remote environments.

```yaml
# docker-compose.yml - .NET Development Stack
version: "3.8"

networks:
  dotnet_dev:
    driver: bridge

volumes:
  nuget_packages:
  sqlserver_data:
  redis_data:

services:
  # ASP.NET Core application with hot-reload
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: dotnet_api
    restart: unless-stopped
    ports:
      - "5000:8080"    # HTTP
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ASPNETCORE_URLS=http://+:8080
      - ConnectionStrings__DefaultConnection=Server=sqlserver;Database=DevDb;User=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
      - ConnectionStrings__Redis=redis:6379
      - DOTNET_USE_POLLING_FILE_WATCHER=1
    volumes:
      - .:/app
      # Cache NuGet packages
      - nuget_packages:/root/.nuget/packages
    # Use dotnet watch for hot-reload
    command: dotnet watch run --no-launch-profile --project /app/MyApi.csproj
    networks:
      - dotnet_dev
    depends_on:
      sqlserver:
        condition: service_healthy
      redis:
        condition: service_healthy

  # SQL Server
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: dotnet_sqlserver
    restart: unless-stopped
    ports:
      - "1433:1433"
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=YourStrong!Passw0rd
      - MSSQL_PID=Developer
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$${MSSQL_SA_PASSWORD}\" -Q \"SELECT 1\" -No > /dev/null"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    volumes:
      - sqlserver_data:/var/opt/mssql
    networks:
      - dotnet_dev

  # Redis
  redis:
    image: redis:7-alpine
    container_name: dotnet_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    volumes:
      - redis_data:/data
    networks:
      - dotnet_dev

  # Seq for structured logging
  seq:
    image: datalust/seq:latest
    container_name: dotnet_seq
    restart: unless-stopped
    ports:
      - "5341:80"
    environment:
      - ACCEPT_EULA=Y
    networks:
      - dotnet_dev
```

## Step 3: ASP.NET Core Application Setup

```bash
# Add the extra packages used by this setup
docker exec dotnet_api dotnet add /app/MyApi.csproj package Microsoft.EntityFrameworkCore.SqlServer --version 8.0.0
docker exec dotnet_api dotnet add /app/MyApi.csproj package Microsoft.EntityFrameworkCore.Design --version 8.0.0
docker exec dotnet_api dotnet add /app/MyApi.csproj package Microsoft.Extensions.Caching.StackExchangeRedis --version 8.0.0
docker exec dotnet_api dotnet add /app/MyApi.csproj package Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore --version 8.0.0
```

```csharp
// Program.cs - ASP.NET Core 8 minimal API setup
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Entity Framework with SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Redis caching
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

var app = builder.Build();

// Development middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Auto-migrate in development
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.MapHealthChecks("/health");

app.MapGet("/", () => new { Status = "Running", Environment = app.Environment.EnvironmentName });

app.Run();
```

```csharp
// AppDbContext.cs
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
        });
    }
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

## Step 4: Entity Framework Migrations

```bash
# Add initial migration
docker exec dotnet_api dotnet ef migrations add InitialCreate \
  --project /app/MyApi.csproj

# Apply migrations to database
docker exec dotnet_api dotnet ef database update \
  --project /app/MyApi.csproj

# Add new migration
docker exec dotnet_api dotnet ef migrations add AddProductsTable \
  --project /app/MyApi.csproj

# Rollback
docker exec dotnet_api dotnet ef database update PreviousMigrationName \
  --project /app/MyApi.csproj

# Generate SQL script
docker exec dotnet_api dotnet ef migrations script \
  --project /app/MyApi.csproj \
  --output /app/migrations.sql
```

## Step 5: VS Code Remote Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET: Attach to Docker",
      "type": "coreclr",
      "request": "attach",
      "processId": "${command:pickRemoteProcess}",
      "pipeTransport": {
        "pipeProgram": "docker",
        "pipeArgs": ["exec", "-i", "dotnet_api"],
        "debuggerPath": "/vsdbg/vsdbg",
        "pipeCwd": "${workspaceFolder}"
      },
      "sourceFileMap": {
        "/app": "${workspaceFolder}"
      }
    }
  ]
}
```

```bash
# Install vsdbg debugger in container
docker exec dotnet_api bash -c \
  "curl -sSL https://aka.ms/getvsdbgsh | bash /dev/stdin -v latest -l /vsdbg"
```

## Step 6: Run Tests

```bash
# Run all tests
docker exec dotnet_api dotnet test /app/MyApi.Tests/

# Run with coverage (requires coverlet.collector in the test project)
docker exec dotnet_api dotnet test /app/MyApi.Tests/ \
  --collect:"XPlat Code Coverage" \
  --results-directory /app/TestResults/

# View test output
docker exec dotnet_api dotnet test /app/MyApi.Tests/ \
  --logger "console;verbosity=detailed"
```

## Conclusion

Your .NET 8 development environment is fully containerized and managed through Portainer. `dotnet watch` provides hot-reload so you see changes instantly, Entity Framework handles database migrations, and Seq captures structured logs for debugging. Portainer makes it easy to restart services, view logs, and monitor resource usage. SQL Server Developer Edition runs in Docker with no license required for development, and the setup mirrors your production configuration closely.
