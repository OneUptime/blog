# How to Configure Kestrel for IPv6 in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kestrel, .NET, ASP.NET Core, IPv6, C#, Dual-Stack, Deployment

Description: Configure Kestrel web server in .NET to listen on IPv6 addresses, handle HTTPS on IPv6, and deploy behind a reverse proxy with proper forwarded header configuration.

## Introduction

Kestrel is the high-performance, cross-platform web server built into .NET. It handles IPv6 binding through `ListenAnyIP()`, `ListenLocalhost()`, or explicit `IPAddress` bindings. This post covers all configuration methods for production IPv6 deployments.

## Step 1: Kestrel IPv6 Endpoints

```csharp
// Program.cs
using System.Net;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    // Method 1: Listen on all interfaces including IPv6
    // (equivalent to 0.0.0.0:5000 AND [::]:5000)
    options.ListenAnyIP(5000);

    // Method 2: Listen on IPv6 specifically
    options.Listen(IPAddress.IPv6Any, 5001);

    // Method 3: Listen on specific IPv6 address
    options.Listen(IPAddress.Parse("2001:db8::1"), 5000);

    // Method 4: HTTPS on IPv6
    options.ListenAnyIP(5443, listenOptions =>
    {
        listenOptions.UseHttps("/etc/ssl/myapp.pfx", "password");
    });

    // Method 5: Configure via options
    options.Listen(IPAddress.IPv6Any, 5000, o =>
    {
        o.Protocols = HttpProtocols.Http1AndHttp2;
    });
});
```

## Step 2: Configuration via appsettings.json

```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://[::]:5000"
      },
      "HttpsInlineCertFile": {
        "Url": "https://[::]:5443",
        "Certificate": {
          "Path": "/etc/ssl/myapp.pfx",
          "Password": "password"
        }
      },
      "IPv4Only": {
        "Url": "http://0.0.0.0:5001"
      }
    },
    "Limits": {
      "MaxConcurrentConnections": 10000,
      "KeepAliveTimeout": "00:02:00"
    }
  }
}
```

```bash
# Environment variable override

ASPNETCORE_URLS="http://[::]:5000;https://[::]:5443" dotnet run
```

## Step 3: Forwarded Headers for IPv6 Proxy

```csharp
// Program.cs
using Microsoft.AspNetCore.HttpOverrides;
using System.Net;

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;

    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();

    // Trust IPv6 NGINX proxy
    options.KnownProxies.Add(IPAddress.Parse("::1"));
    options.KnownProxies.Add(IPAddress.Parse("2001:db8::1b"));

    // Trust an IPv6 subnet
    options.KnownNetworks.Add(
        new IPNetwork(IPAddress.Parse("2001:db8::"), 32)
    );
});

var app = builder.Build();

// IMPORTANT: UseForwardedHeaders must come before other middleware
app.UseForwardedHeaders();
app.UseAuthentication();
app.UseAuthorization();
```

## Step 4: Client IP in Minimal API

```csharp
// Program.cs

app.MapGet("/info", (HttpContext ctx) =>
{
    var connection = ctx.Connection;
    var ip = connection.RemoteIpAddress;

    // Normalize IPv4-mapped IPv6
    if (ip is not null && ip.IsIPv4MappedToIPv6)
        ip = ip.MapToIPv4();

    return Results.Ok(new
    {
        IP = ip?.ToString(),
        Port = connection.RemotePort,
        IsIPv6 = ip?.AddressFamily ==
            System.Net.Sockets.AddressFamily.InterNetworkV6,
    });
});
```

## Step 5: Docker + Kestrel IPv6

```yaml
# docker-compose.yml
services:
  api:
    image: myapp:latest
    ports:
      # Map IPv6 port
      - "[::]:5000:5000"
    environment:
      - ASPNETCORE_URLS=http://[::]:5000
    networks:
      - app_net

networks:
  app_net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "2001:db8:1::/64"
```

## Step 6: NGINX + Kestrel IPv6

```nginx
upstream kestrel {
    server [::1]:5000;
}

server {
    listen [::]:443 ssl http2;

    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    location / {
        proxy_pass http://kestrel;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Conclusion

Kestrel binds to IPv6 via `ListenAnyIP()` (dual-stack) or `IPAddress.IPv6Any` (IPv6-only). Configure `appsettings.json` with `[::]:port` URLs for deployment flexibility. Use `ForwardedHeadersOptions` with specific IPv6 proxy addresses for correct client IP extraction. Monitor Kestrel with OneUptime's HTTPS checks targeting IPv6 endpoints.
