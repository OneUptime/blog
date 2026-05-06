# How to Configure ASP.NET Core for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ASP.NET Core, C#, IPv6, Kestrel, Web Framework, Dual-Stack, .NET

Description: Configure ASP.NET Core Kestrel to listen on IPv6 addresses, handle IPv6 client IPs with forwarded headers middleware, and deploy in dual-stack environments.

## Introduction

ASP.NET Core uses Kestrel as its built-in web server. Kestrel supports IPv6 through URL bindings such as `[::]`, `ListenAnyIP`, `ListenLocalhost` for loopback, and explicit `IPAddress.IPv6Any` or specific IPv6 address bindings. Forwarded headers middleware correctly extracts IPv6 client addresses when behind a proxy.

## Step 1: Kestrel IPv6 Configuration

```csharp
// Program.cs
using System.Net;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.WebHost.ConfigureKestrel(options =>
{
    // Listen on all interfaces. When IPv6 is supported, Kestrel binds to [::].
    options.ListenAnyIP(5000);

    // Listen on all IPv6 interfaces
    options.Listen(IPAddress.IPv6Any, 5001);

    // Listen on a specific IPv6 address
    options.Listen(IPAddress.Parse("2001:db8::1"), 5002);

    // HTTPS on IPv6
    options.Listen(IPAddress.IPv6Any, 5443, listenOptions =>
    {
        listenOptions.UseHttps("/etc/ssl/certs/server.pfx", "password");
    });
});

var app = builder.Build();
app.MapControllers();
app.MapGet("/", () => "Hello IPv6!");
app.Run();
```

## Step 2: appsettings.json URLs

```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://[::]:5000"
      },
      "Https": {
        "Url": "https://[::]:5443",
        "Certificate": {
          "Path": "/etc/ssl/certs/server.pfx",
          "Password": "password"
        }
      }
    }
  }
}
```

```bash
# Or via environment variable

ASPNETCORE_URLS="http://[::]:5000" dotnet run
```

## Step 3: Forwarded Headers Middleware

```csharp
// Program.cs
using Microsoft.AspNetCore.HttpOverrides;
using System.Net;

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    // Clear the default known IP networks/proxies
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();

    // Add trusted IPv6 proxy
    options.KnownProxies.Add(IPAddress.Parse("::1"));
    options.KnownProxies.Add(IPAddress.Parse("2001:db8::1"));

    // Or trust entire IPv6 subnet
    options.KnownIPNetworks.Add(new IPNetwork(
        IPAddress.Parse("2001:db8::"),
        32
    ));
});

var app = builder.Build();
app.UseForwardedHeaders();
```

## Step 4: Get Client IPv6 in Controller

```csharp
// Controllers/InfoController.cs
using System.Net;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("[controller]")]
public class InfoController : ControllerBase
{
    [HttpGet("client-ip")]
    public IActionResult GetClientIP()
    {
        var ip = HttpContext.Connection.RemoteIpAddress;
        var normalizedIp = ip is not null && ip.IsIPv4MappedToIPv6
            ? ip.MapToIPv4()
            : ip;
        string ipString = normalizedIp?.ToString() ?? "unknown";

        return Ok(new
        {
            ClientIP = ipString,
            IsIPv6 = normalizedIp?.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6,
            IsLoopback = normalizedIp is not null && IPAddress.IsLoopback(normalizedIp),
        });
    }
}
```

## Step 5: CORS with IPv6 Origins

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowIPv6", policy =>
    {
        policy.WithOrigins(
            "https://example.com",
            "https://[2001:db8::1]",  // IPv6 origin
            "http://[::1]:3000"       // Local dev IPv6
        )
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});

app.UseCors("AllowIPv6");
```

## Step 6: Test

```bash
# Run with IPv6
dotnet run --urls "http://[::]:5000"

# Test
curl -6 "http://[::1]:5000/info/client-ip"
curl -6 "http://[your-server-ipv6]:5000/info/client-ip"

# Check listening
netstat -an | grep :5000
```

## Conclusion

ASP.NET Core Kestrel supports IPv6 via URL bindings such as `[::]`, `ListenAnyIP()`, or explicit `IPAddress.IPv6Any` bindings. Configure `ForwardedHeadersOptions` with trusted IPv6 proxies or `KnownIPNetworks` to extract real client addresses. Normalize `::ffff:` IPv4-mapped addresses in code. Monitor Kestrel with OneUptime's HTTPS checks from IPv6 vantage points.
