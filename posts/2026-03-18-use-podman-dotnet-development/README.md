# How to Use Podman for .NET Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, .NET, C#, Container, ASP.NET, Development

Description: A practical guide to using Podman for .NET development, covering SDK setup, ASP.NET Core workflows, Entity Framework migrations, debugging, testing, and multi-stage production builds.

---

> Podman lets you develop .NET applications in a consistent Linux environment without installing the .NET SDK on your host machine, and the rootless container model fits naturally into enterprise security requirements.

.NET has become a cross-platform framework, but subtle differences between Windows, macOS, and Linux can still cause surprises. A project that builds cleanly on a developer's Windows machine might behave differently on a Linux CI server. Running development inside containers eliminates these inconsistencies. Podman is a particularly good fit for .NET shops because many enterprises prefer tools that run without elevated privileges and without long-running daemons, both of which Podman delivers.

This guide covers setting up .NET development workflows inside Podman containers, from console applications to full ASP.NET Core APIs with databases.

---

## Choosing a .NET Base Image

Microsoft publishes official .NET images in three common categories:

```bash
# SDK image - includes the compiler, CLI tools, and runtime (for development)

podman pull mcr.microsoft.com/dotnet/sdk:8.0

# ASP.NET runtime image - runtime only, for production (no compiler)
podman pull mcr.microsoft.com/dotnet/aspnet:8.0

# Base runtime image - for console apps in production
podman pull mcr.microsoft.com/dotnet/runtime:8.0
```

For development, always use the SDK image. It includes `dotnet build`, `dotnet run`, `dotnet test`, and all the CLI tools you need. The runtime and ASP.NET images are for production containers where you do not want the compiler.

## Running a .NET Console Application

```bash
# Create a new console application
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet new console -n MyApp

# Run the application
podman run --rm \
  -v $(pwd)/MyApp:/app:Z \
  -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet run
```

## Setting Up an ASP.NET Core Project

Create a new ASP.NET Core Web API:

```bash
# Scaffold a new Web API project
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet new webapi -n MyApi --no-https

# Change into the project directory
cd MyApi
```

Create `Program.cs` for a minimal API:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Define endpoints
app.MapGet("/", () => new { Message = "Hello from ASP.NET inside Podman" });

app.MapGet("/health", () => new { Status = "Healthy", Timestamp = DateTime.UtcNow });

app.MapGet("/info", () => new
{
    Runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
    OS = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
    Host = Environment.MachineName
});

// Listen on all interfaces (required for container access)
app.Run("http://0.0.0.0:5000");
```

## Creating a Development Containerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

ENV DOTNET_USE_POLLING_FILE_WATCHER=1

# Copy project files first for NuGet restore caching
COPY *.csproj ./
RUN dotnet restore

# Copy the rest of the source code
COPY . .

EXPOSE 5000

# Use dotnet watch for live reloading
CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:5000"]
```

Build and run:

```bash
# Build the development image
podman build -t dotnet-dev .

# Run with source mounted for live reloading
podman run -it --rm \
  -v $(pwd):/app:Z \
  -p 5000:5000 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e DOTNET_USE_POLLING_FILE_WATCHER=1 \
  dotnet-dev
```

The `dotnet watch run` command watches for file changes and automatically rebuilds and restarts the application. The `DOTNET_USE_POLLING_FILE_WATCHER=1` setting is important when watching mounted source code from inside a container.

## Caching NuGet Packages

NuGet packages can be cached in a named volume to avoid re-downloading them:

```bash
# Create a volume for the NuGet cache
podman volume create nuget-cache

# Run with NuGet cache mounted
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v nuget-cache:/root/.nuget \
  -w /app \
  -p 5000:5000 \
  -e DOTNET_USE_POLLING_FILE_WATCHER=1 \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet watch run --urls http://0.0.0.0:5000
```

## Multi-Container Setup with SQL Server

ASP.NET Core applications commonly use SQL Server or PostgreSQL. Here is a `docker-compose.yml` with SQL Server:

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - .:/app:Z
      - nuget-cache:/root/.nuget
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      DOTNET_USE_POLLING_FILE_WATCHER: "1"
      ConnectionStrings__DefaultConnection: "Server=db;Database=MyAppDb;User=sa;Password=YourStr0ngP@ssword;TrustServerCertificate=True"
    depends_on:
      - db

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStr0ngP@ssword"
    ports:
      - "1433:1433"
    volumes:
      - sqldata:/var/opt/mssql

volumes:
  nuget-cache:
  sqldata:
```

For a lighter-weight alternative, use PostgreSQL:

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - .:/app:Z
      - nuget-cache:/root/.nuget
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      DOTNET_USE_POLLING_FILE_WATCHER: "1"
      ConnectionStrings__DefaultConnection: "Host=db;Database=myapp;Username=dotnet;Password=dotnet"
    depends_on:
      - db

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_USER: dotnet
      POSTGRES_PASSWORD: dotnet
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  nuget-cache:
  pgdata:
```

Start the stack:

```bash
podman compose up -d

# After the database container is accepting connections, run Entity Framework migrations
podman compose exec api dotnet ef database update

# Or create a migration
podman compose exec api dotnet ef migrations add InitialCreate

# View logs
podman compose logs -f api
```

## Entity Framework Core Workflows

Managing EF Core migrations inside containers:

```bash
# Install the EF Core CLI tool (inside the container)
podman compose exec api dotnet tool install --tool-path /usr/local/bin dotnet-ef

# Add a migration
podman compose exec api dotnet ef migrations add AddUserTable

# Apply migrations
podman compose exec api dotnet ef database update

# Generate a SQL script for review
podman compose exec api dotnet ef migrations script -o migration.sql

# Revert the last migration
podman compose exec api dotnet ef migrations remove
```

## Running Tests

```bash
# Run all tests
podman run --rm \
  -v $(pwd):/app:Z \
  -v nuget-cache:/root/.nuget \
  -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet test --verbosity normal

# Run tests with coverage
podman run --rm \
  -v $(pwd):/app:Z \
  -v nuget-cache:/root/.nuget \
  -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet test --collect:"XPlat Code Coverage"

# Run a specific test project
podman run --rm \
  -v $(pwd):/app:Z \
  -v nuget-cache:/root/.nuget \
  -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet test tests/MyApi.Tests/MyApi.Tests.csproj

# Watch tests (re-run on file changes)
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v nuget-cache:/root/.nuget \
  -w /app \
  -e DOTNET_USE_POLLING_FILE_WATCHER=1 \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet watch test
```

## Debugging .NET in a Container

Install `vsdbg` in the container and then attach from VS Code:

```bash
# Run the application container and give it a stable name for `podman exec`
podman run -it --rm \
  --name myapi-debug \
  -v $(pwd):/app:Z \
  -v nuget-cache:/root/.nuget \
  -w /app \
  -p 5000:5000 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet run --urls http://0.0.0.0:5000

# In another terminal, install the VS Code debugger inside the running container
podman exec -it myapi-debug sh -c "apt-get update && apt-get install -y curl && curl -sSL https://aka.ms/getvsdbgsh | /bin/sh /dev/stdin -v latest -l /vsdbg"
```

For VS Code, install the C# Dev Kit extension and use this `launch.json` for attaching to a container process:

```json
{
  "name": ".NET Attach (Container)",
  "type": "coreclr",
  "request": "attach",
  "processId": "${command:pickRemoteProcess}",
  "pipeTransport": {
    "pipeCwd": "${workspaceFolder}",
    "pipeProgram": "podman",
    "pipeArgs": ["exec", "-i", "myapi-debug", "sh", "-c"],
    "debuggerPath": "/vsdbg/vsdbg",
    "quoteArgs": true
  },
  "sourceFileMap": {
    "/app": "${workspaceFolder}"
  }
}
```

## Building a Production Image

Multi-stage builds are standard practice for .NET applications:

Save this as `Containerfile.prod`:

```dockerfile
# Stage 1: Build and publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies (for layer caching)
COPY *.csproj ./
RUN dotnet restore

# Copy source and build
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Create a non-root user
RUN useradd -m -s /bin/bash appuser
USER appuser

COPY --from=build /app/publish .

EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000

ENTRYPOINT ["dotnet", "MyApi.dll"]
```

Build and test the production image:

```bash
# Build the production image
podman build -t my-dotnet-app:prod -f Containerfile.prod .

# Check the image size
podman images my-dotnet-app:prod

# Run it
podman run --rm -p 5000:5000 my-dotnet-app:prod
```

## Testing Against Multiple .NET Versions

If your project multi-targets supported .NET versions, set `TargetFrameworks` in the project file and test each target with the matching SDK image:

```xml
<TargetFrameworks>net8.0;net9.0;net10.0</TargetFrameworks>
```

```bash
# Test the net8.0 target with .NET 8 SDK
podman run --rm -v $(pwd):/app:Z -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet test -f net8.0

# Test the net9.0 target with .NET 9 SDK
podman run --rm -v $(pwd):/app:Z -w /app \
  mcr.microsoft.com/dotnet/sdk:9.0 \
  dotnet test -f net9.0

# Test the net10.0 target with .NET 10 SDK
podman run --rm -v $(pwd):/app:Z -w /app \
  mcr.microsoft.com/dotnet/sdk:10.0 \
  dotnet test -f net10.0
```

## Conclusion

Podman works well for .NET development across all project types. The `dotnet watch` command provides live reloading when you mount your source code into the container and enable polling for mounted volumes. Cache NuGet packages in a named volume for fast dependency restoration. For database work, `podman compose` manages the full stack with SQL Server or PostgreSQL. Multi-stage builds with the SDK image for building and the ASP.NET runtime image for production keep your deployment images lean. The daemonless, rootless nature of Podman aligns well with the enterprise environments where .NET is commonly deployed.
