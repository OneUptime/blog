# How to Configure Azure Cache for Redis as a Session Store for a Web Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Redis, Session Store, Web Application, ASP.NET, Node.js, Azure Cache for Redis

Description: Step-by-step guide to using Azure Cache for Redis as a session store for web applications with examples in ASP.NET and Node.js.

---

Storing sessions in memory on a single web server works fine until you need a second server. Once you scale horizontally or deploy behind a load balancer, sticky sessions become fragile and in-memory session storage falls apart. Azure Cache for Redis is a natural fit for centralized session storage - it is fast, supports expiration natively, and every server in your cluster can reach it.

This guide covers how to configure Azure Cache for Redis as a session store for both ASP.NET Core and Node.js applications.

## Why Redis for Sessions?

You might wonder why Redis instead of a database or a file system. There are a few solid reasons:

**Speed**: Session lookups happen on every request. Redis serves reads in sub-millisecond time, which means your session middleware adds almost no latency.

**Built-in expiration**: Redis TTL (time-to-live) handles session expiry automatically. You do not need a background job to clean up stale sessions.

**Atomic operations**: Redis commands are atomic, which eliminates race conditions when multiple requests hit the same session simultaneously.

**Scalability**: Redis handles thousands of concurrent connections without breaking a sweat. Your session store will not become a bottleneck before your application servers do.

**Horizontal scaling**: Every application server connects to the same Redis instance, so sessions are consistent regardless of which server handles the request.

## Prerequisites

- An Azure subscription
- An Azure Cache for Redis instance (Standard tier or higher recommended for production)
- A web application in ASP.NET Core or Node.js (we will cover both)
- Azure CLI or Azure Portal access

## Step 1: Create an Azure Cache for Redis Instance

If you do not already have one, create a Redis cache. For session storage, the Standard C1 tier is usually sufficient for small to medium applications.

```bash
# Create a resource group
az group create --name rg-session-store --location eastus

# Create a Standard C1 Redis cache
# Standard tier provides replication for high availability
az redis create \
  --name my-session-cache \
  --resource-group rg-session-store \
  --location eastus \
  --sku Standard \
  --vm-size C1 \
  --enable-non-ssl-port false
```

Wait for the cache to be provisioned (usually 15-20 minutes), then grab the connection information:

```bash
# Get the hostname
az redis show \
  --name my-session-cache \
  --resource-group rg-session-store \
  --query "hostName" -o tsv

# Get the primary access key
az redis list-keys \
  --name my-session-cache \
  --resource-group rg-session-store \
  --query "primaryKey" -o tsv
```

## Step 2: Configure for ASP.NET Core

ASP.NET Core has built-in support for distributed session storage with Redis through the `Microsoft.Extensions.Caching.StackExchangeRedis` package.

### Install the NuGet Package

```bash
# Add the Redis distributed cache package
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
```

### Configure Services

In your `Program.cs` (or `Startup.cs` if using the older pattern), add the Redis distributed cache and session middleware:

```csharp
// Program.cs - Configure Redis as the distributed cache backend for sessions
var builder = WebApplication.CreateBuilder(args);

// Add Redis distributed cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    // Connection string from configuration or environment variable
    options.Configuration = builder.Configuration.GetConnectionString("Redis");

    // Optional: prefix all session keys to avoid collisions
    // if you use this Redis instance for other purposes too
    options.InstanceName = "MyApp_Sessions_";
});

// Add session middleware with configuration
builder.Services.AddSession(options =>
{
    // Session idle timeout - Redis TTL will match this
    options.IdleTimeout = TimeSpan.FromMinutes(30);

    // Cookie settings for security
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.Name = ".MyApp.Session";
});

var app = builder.Build();

// Enable session middleware - must be before MapControllers/UseEndpoints
app.UseSession();

app.MapControllers();
app.Run();
```

### Add the Connection String

In your `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "Redis": "my-session-cache.redis.cache.windows.net:6380,password=<your-primary-key>,ssl=True,abortConnect=False"
  }
}
```

The `abortConnect=False` parameter is important. It tells the client to silently retry connections rather than throwing an exception if Redis is momentarily unavailable.

### Use Sessions in Your Controllers

```csharp
// Example controller using Redis-backed sessions
[ApiController]
[Route("[controller]")]
public class CartController : ControllerBase
{
    [HttpPost("add")]
    public IActionResult AddToCart([FromBody] CartItem item)
    {
        // Retrieve existing cart from session or create a new one
        var cart = HttpContext.Session.GetString("cart");
        var cartItems = cart != null
            ? JsonSerializer.Deserialize<List<CartItem>>(cart)
            : new List<CartItem>();

        cartItems.Add(item);

        // Store updated cart back to session (which goes to Redis)
        HttpContext.Session.SetString("cart",
            JsonSerializer.Serialize(cartItems));

        return Ok(new { itemCount = cartItems.Count });
    }

    [HttpGet]
    public IActionResult GetCart()
    {
        var cart = HttpContext.Session.GetString("cart");
        if (cart == null)
            return Ok(new { items = Array.Empty<CartItem>() });

        var cartItems = JsonSerializer.Deserialize<List<CartItem>>(cart);
        return Ok(new { items = cartItems });
    }
}
```

## Step 3: Configure for Node.js with Express

If you are running a Node.js application with Express, the `connect-redis` package integrates Redis-backed sessions seamlessly.

### Install the Dependencies

```bash
# Install Express session middleware and Redis session store
npm install express-session connect-redis redis
```

### Configure the Session Middleware

```javascript
// app.js - Configure Redis session store for Express
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const app = express();

// Create and connect the Redis client
const redisClient = createClient({
    url: 'rediss://my-session-cache.redis.cache.windows.net:6380',
    password: '<your-primary-key>',
    socket: {
        // Reconnect strategy with exponential backoff
        reconnectStrategy: (retries) => {
            if (retries > 10) return new Error('Max retries reached');
            return Math.min(retries * 100, 3000);
        },
        // TLS is required for Azure Cache for Redis
        tls: true
    }
});

// Handle Redis connection errors gracefully
redisClient.on('error', (err) => {
    console.error('Redis session store error:', err.message);
});

// Connect to Redis before starting the server
redisClient.connect().then(() => {
    console.log('Connected to Redis session store');
});

// Initialize the Redis session store
const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',    // Key prefix in Redis
    ttl: 1800           // Session TTL in seconds (30 minutes)
});

// Configure session middleware
app.use(session({
    store: redisStore,
    secret: process.env.SESSION_SECRET || 'change-this-in-production',
    resave: false,              // Do not save session if unmodified
    saveUninitialized: false,   // Do not create session until something is stored
    cookie: {
        secure: true,           // Require HTTPS
        httpOnly: true,         // Prevent client-side JS access
        maxAge: 30 * 60 * 1000, // 30 minutes in milliseconds
        sameSite: 'strict'
    }
}));

// Example route that uses sessions
app.post('/api/login', express.json(), (req, res) => {
    const { username } = req.body;

    // Store user info in the session
    req.session.user = {
        username: username,
        loginTime: new Date().toISOString()
    };

    res.json({ message: 'Logged in', username });
});

app.get('/api/profile', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
    // Destroy the session in Redis
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out' });
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## Security Considerations

When using Redis for session storage, pay attention to these security aspects:

**Always use TLS**: Azure Cache for Redis supports TLS on port 6380. Never use the non-SSL port (6379) for session data. The `--enable-non-ssl-port false` flag in our setup ensures this.

**Rotate access keys periodically**: Azure provides two access keys so you can rotate one while the other is still in use. Build this into your operations workflow.

**Use managed identity when possible**: Instead of storing access keys in configuration, use Azure Managed Identity with Azure Key Vault to retrieve the connection string at runtime.

**Set appropriate cookie flags**: Always use `HttpOnly`, `Secure`, and `SameSite` flags on session cookies, as shown in the examples above.

**Consider network isolation**: For sensitive applications, configure a Private Endpoint for your Redis cache so it is not accessible from the public internet.

## Handling Redis Failures Gracefully

Redis is reliable, but networks are not. Your application should handle Redis outages without crashing.

For ASP.NET Core, the StackExchange.Redis client handles retries internally. The `abortConnect=False` setting ensures the application does not crash if Redis is temporarily unavailable.

For Node.js, add a fallback mechanism:

```javascript
// Middleware to handle Redis unavailability gracefully
app.use((req, res, next) => {
    if (!redisClient.isOpen) {
        // Redis is down - you can either:
        // 1. Continue without session (degraded mode)
        console.warn('Redis unavailable, session data may be missing');
        // 2. Or return a 503 if sessions are critical
        // return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    next();
});
```

## Sizing Your Cache for Sessions

A common question is how big your Redis cache needs to be for session storage. Here is a rough formula:

**Session size**: Serialize a typical session object and measure its size. Most sessions are 1-5 KB.

**Concurrent sessions**: Estimate the maximum number of active sessions at any time.

**Memory needed**: `concurrent_sessions * average_session_size * 1.5` (the 1.5x buffer accounts for Redis overhead and fragmentation).

For example: 100,000 concurrent sessions with 3 KB average session size = 100,000 * 3 KB * 1.5 = ~450 MB. A Standard C1 cache (1 GB) would handle this comfortably.

## Wrapping Up

Azure Cache for Redis is a battle-tested choice for web application session storage. Whether you are running ASP.NET Core or Node.js, the integration is straightforward - a couple of packages, a few lines of configuration, and your sessions are centralized, fast, and persistent across server restarts. The key things to remember are to always use TLS, set sensible TTLs, handle Redis failures gracefully, and size your cache based on concurrent session count rather than total users.
