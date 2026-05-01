# How to Set Up a .NET Development Environment with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, .NET, C#, Development Environment, Docker, Hot Reload, Debugging

Description: Learn how to set up a .NET development environment with hot-reload and VS Code debugging in a Docker container managed by Portainer.

---

Running .NET development in Docker via Portainer ensures consistent SDK versions and eliminates environment mismatches. .NET's `dotnet watch` provides hot-reload for a native development experience.

## Dev Environment Compose Stack

```yaml
services:
  dotnet-dev:
    image: mcr.microsoft.com/dotnet/sdk:8.0-alpine
    restart: unless-stopped
    ports:
      - "5000:5000"    # HTTP
    environment:
      DOTNET_ENVIRONMENT: Development
      DOTNET_USE_POLLING_FILE_WATCHER: "1"
      DOTNET_WATCH_SUPPRESS_BROWSER_REFRESH: "1"
      ASPNETCORE_URLS: http://+:5000
    volumes:
      # For Portainer stacks, use an absolute host path unless relative path volumes are enabled.
      - /path/on/docker-host/app:/app
      # Cache NuGet packages
      - nuget_cache:/root/.nuget
    working_dir: /app
    # Watch for changes and auto-reload
    command: dotnet watch run --project MyApp.csproj --non-interactive --no-launch-profile

volumes:
  nuget_cache:
```

## Minimal ASP.NET Core Application

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => new { Status = "ok", Environment = app.Environment.EnvironmentName });

// Edit and save - dotnet watch hot reloads supported changes automatically
app.MapGet("/", () => "Hello from .NET dev environment");

app.Run();
```

## VS Code Remote Debugging

Install vsdbg inside the container:

```bash
# Via Portainer Exec console:

curl -sSL https://aka.ms/getvsdbgsh | /bin/sh /dev/stdin -v latest -l /vsdbg
```

Replace `<container-name>` with the running container name shown in Portainer.

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Container",
      "type": "coreclr",
      "request": "attach",
      "processId": "${command:pickRemoteProcess}",
      "pipeTransport": {
        "pipeProgram": "docker",
        "pipeArgs": ["exec", "-i", "<container-name>"],
        "pipeCwd": "${workspaceFolder}",
        "debuggerPath": "/vsdbg/vsdbg"
      },
      "sourceFileMap": {
        "/app": "${workspaceFolder}/app"
      }
    }
  ]
}
```

## .csproj Configuration

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```
