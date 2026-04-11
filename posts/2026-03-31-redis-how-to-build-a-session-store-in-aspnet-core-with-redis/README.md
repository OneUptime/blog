# How to Build a Session Store in ASP.NET Core with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ASP.NET Core, C#, Session, Authentication

Description: Learn how to configure Redis as a session store in ASP.NET Core using IDistributedCache, with secure cookie configuration and custom session management patterns.

---

## Why Redis for ASP.NET Core Sessions?

Default in-memory sessions don't work across multiple server instances. Redis session storage enables:
- Session persistence across app restarts
- Horizontal scaling with multiple server instances
- Automatic session expiry via TTL
- Centralized session management and revocation

## Installation

```bash
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
dotnet add package Microsoft.AspNetCore.Session
```

## Basic Setup

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add Redis distributed cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "MyApp:Sessions:";
});

// Add session support
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.Name = ".MyApp.Session";
});

var app = builder.Build();
app.UseSession(); // Must be before MapControllers/endpoint mapping
app.MapControllers();
app.Run();
```

In `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,password=yourpassword"
  }
}
```

## Using Sessions in Controllers

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // Validate credentials (simplified)
        if (request.Username != "admin" || request.Password != "secret")
        {
            return Unauthorized(new { error = "Invalid credentials" });
        }

        // Store user info in session
        HttpContext.Session.SetString("userId", "1001");
        HttpContext.Session.SetString("username", request.Username);
        HttpContext.Session.SetString("role", "admin");
        HttpContext.Session.SetInt32("loginTime", (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds());

        return Ok(new { message = "Logged in successfully" });
    }

    [HttpGet("profile")]
    public IActionResult Profile()
    {
        string? userId = HttpContext.Session.GetString("userId");
        if (userId == null)
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        return Ok(new
        {
            userId,
            username = HttpContext.Session.GetString("username"),
            role = HttpContext.Session.GetString("role")
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return Ok(new { message = "Logged out" });
    }
}

public record LoginRequest(string Username, string Password);
```

## Storing Complex Objects in Session

```csharp
using Microsoft.AspNetCore.Http;
using System.Text.Json;

public static class SessionExtensions
{
    public static void SetObject<T>(this ISession session, string key, T value)
    {
        session.SetString(key, JsonSerializer.Serialize(value));
    }

    public static T? GetObject<T>(this ISession session, string key)
    {
        string? json = session.GetString(key);
        return json == null ? default : JsonSerializer.Deserialize<T>(json);
    }
}

// Usage in controller
public class CartController : ControllerBase
{
    [HttpPost("add")]
    public IActionResult AddToCart([FromBody] CartItem item)
    {
        var cart = HttpContext.Session.GetObject<List<CartItem>>("cart") ?? new List<CartItem>();
        cart.Add(item);
        HttpContext.Session.SetObject("cart", cart);

        return Ok(new { message = "Item added", count = cart.Count });
    }

    [HttpGet]
    public IActionResult GetCart()
    {
        var cart = HttpContext.Session.GetObject<List<CartItem>>("cart") ?? new List<CartItem>();
        return Ok(cart);
    }

    [HttpDelete]
    public IActionResult ClearCart()
    {
        HttpContext.Session.Remove("cart");
        return Ok(new { message = "Cart cleared" });
    }
}

public record CartItem(string ProductId, string Name, decimal Price, int Quantity);
```

## Session Authentication Middleware

```csharp
using Microsoft.AspNetCore.Http;

public class SessionAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string[] _publicPaths = { "/api/auth/login", "/api/health" };

    public SessionAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        string path = context.Request.Path.Value?.ToLower() ?? "";

        // Skip auth for public endpoints
        if (Array.Exists(_publicPaths, p => path.StartsWith(p)))
        {
            await _next(context);
            return;
        }

        string? userId = context.Session.GetString("userId");
        if (string.IsNullOrEmpty(userId))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
            return;
        }

        await _next(context);
    }
}

// Register in Program.cs
app.UseSession();
app.UseMiddleware<SessionAuthMiddleware>();
```

## Custom Redis Session Store

For more control, implement a custom session handler:

```csharp
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

public class RedisSessionService
{
    private readonly IDistributedCache _cache;
    private readonly IHttpContextAccessor _httpContext;
    private const string SessionPrefix = "session:";

    public RedisSessionService(IDistributedCache cache, IHttpContextAccessor httpContext)
    {
        _cache = cache;
        _httpContext = httpContext;
    }

    public async Task<UserSession?> GetCurrentSessionAsync()
    {
        string? sessionId = _httpContext.HttpContext?.Session.Id;
        if (sessionId == null) return null;

        string? json = await _cache.GetStringAsync($"{SessionPrefix}{sessionId}");
        return json == null ? null : JsonSerializer.Deserialize<UserSession>(json);
    }

    public async Task SaveSessionAsync(UserSession session)
    {
        string? sessionId = _httpContext.HttpContext?.Session.Id;
        if (sessionId == null) return;

        string json = JsonSerializer.Serialize(session);
        await _cache.SetStringAsync(
            $"{SessionPrefix}{sessionId}",
            json,
            new DistributedCacheEntryOptions
            {
                SlidingExpiration = TimeSpan.FromMinutes(30)
            }
        );
    }
}

public class UserSession
{
    public string UserId { get; set; } = "";
    public string Username { get; set; } = "";
    public string Role { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public Dictionary<string, string> Claims { get; set; } = new();
}
```

## Summary

Redis-backed session storage in ASP.NET Core uses `AddStackExchangeRedisCache()` combined with `AddSession()` to store session data in Redis automatically. Configure `IdleTimeout` for sliding expiry, use `HttpOnly` and `Secure` cookie flags for security, and extend `ISession` with generic `SetObject`/`GetObject` methods for complex types. For custom session scenarios, inject `IDistributedCache` directly alongside `IHttpContextAccessor` to manage session data outside of the built-in session middleware.
