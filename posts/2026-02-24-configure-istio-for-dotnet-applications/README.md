# How to Configure Istio for .NET Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, .NET, ASP.NET Core, Kubernetes, Service Mesh

Description: Complete guide to running ASP.NET Core applications in an Istio service mesh with health checks, header propagation, and Kestrel configuration.

---

.NET applications, particularly ASP.NET Core, work well in Kubernetes and integrate smoothly with Istio. But there are some specific configurations around Kestrel server settings, health check middleware, and how .NET handles HTTP connections that you need to get right. This guide covers the practical setup for running .NET apps in an Istio mesh.

## Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: catalog-service
      version: v1
  template:
    metadata:
      labels:
        app: catalog-service
        version: v1
    spec:
      containers:
      - name: catalog-service
        image: myregistry/catalog-service:1.0.0
        ports:
        - name: http-web
          containerPort: 8080
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
        env:
        - name: ASPNETCORE_URLS
          value: "http://+:8080"
        - name: DOTNET_ENVIRONMENT
          value: "Production"
```

The `ASPNETCORE_URLS` environment variable sets Kestrel to listen on port 8080 on all interfaces. Do not use HTTPS here because Istio handles TLS through the sidecar.

## Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: catalog-service
  namespace: production
spec:
  selector:
    app: catalog-service
  ports:
  - name: http-web
    port: 8080
    targetPort: http-web
```

## Health Checks with ASP.NET Core

ASP.NET Core has built-in health check middleware that integrates perfectly with Kubernetes and Istio:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy())
    .AddNpgSql(builder.Configuration.GetConnectionString("Database"))
    .AddRedis(builder.Configuration.GetConnectionString("Redis"));

var app = builder.Build();

app.MapHealthChecks("/healthz", new HealthCheckOptions
{
    Predicate = _ => false, // Only checks if the app is alive
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { status = "alive" });
    }
});

app.MapHealthChecks("/ready", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var status = report.Status == HealthStatus.Healthy ? "ready" : "not ready";
        var statusCode = report.Status == HealthStatus.Healthy ? 200 : 503;
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new
        {
            status,
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString()
            })
        });
    }
});

app.MapControllers();
app.Run();
```

Configure the probes:

```yaml
containers:
- name: catalog-service
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 10
    periodSeconds: 10
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 10
    periodSeconds: 5
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /healthz
      port: 8080
    periodSeconds: 3
    failureThreshold: 20
```

## Trace Header Propagation

Create middleware to capture and propagate Istio trace headers:

```csharp
// Middleware/TraceHeaderMiddleware.cs
public class TraceHeaderMiddleware
{
    private readonly RequestDelegate _next;

    private static readonly string[] TraceHeaders = new[]
    {
        "x-request-id",
        "x-b3-traceid",
        "x-b3-spanid",
        "x-b3-parentspanid",
        "x-b3-sampled",
        "x-b3-flags",
        "b3",
        "traceparent",
        "tracestate"
    };

    public TraceHeaderMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var traceContext = new Dictionary<string, string>();
        foreach (var header in TraceHeaders)
        {
            if (context.Request.Headers.TryGetValue(header, out var value))
            {
                traceContext[header] = value.ToString();
            }
        }

        context.Items["TraceHeaders"] = traceContext;
        await _next(context);
    }
}
```

Register it in your pipeline:

```csharp
app.UseMiddleware<TraceHeaderMiddleware>();
```

Create a delegating handler for HttpClient to automatically add trace headers:

```csharp
// Handlers/TraceHeaderHandler.cs
public class TraceHeaderHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TraceHeaderHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var context = _httpContextAccessor.HttpContext;
        if (context?.Items["TraceHeaders"] is Dictionary<string, string> headers)
        {
            foreach (var header in headers)
            {
                request.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
```

Register the handler with your HTTP clients:

```csharp
// Program.cs
builder.Services.AddHttpContextAccessor();
builder.Services.AddTransient<TraceHeaderHandler>();

builder.Services.AddHttpClient("ProductService", client =>
{
    client.BaseAddress = new Uri("http://product-service:8080");
})
.AddHttpMessageHandler<TraceHeaderHandler>();
```

Now every request made through the named HttpClient automatically includes trace headers:

```csharp
// In your controller or service
public class CatalogController : ControllerBase
{
    private readonly IHttpClientFactory _clientFactory;

    public CatalogController(IHttpClientFactory clientFactory)
    {
        _clientFactory = clientFactory;
    }

    [HttpGet("api/catalog")]
    public async Task<IActionResult> GetCatalog()
    {
        var client = _clientFactory.CreateClient("ProductService");
        var products = await client.GetFromJsonAsync<List<Product>>("/api/products");
        return Ok(new { products });
    }
}
```

## Graceful Shutdown

ASP.NET Core handles graceful shutdown through the host lifetime:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Configure shutdown timeout
builder.Services.Configure<HostOptions>(options =>
{
    options.ShutdownTimeout = TimeSpan.FromSeconds(25);
});

var app = builder.Build();

var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();

lifetime.ApplicationStopping.Register(() =>
{
    Console.WriteLine("Application is stopping, draining connections...");
    // Add any cleanup logic here
});

lifetime.ApplicationStopped.Register(() =>
{
    Console.WriteLine("Application stopped");
});
```

Add a preStop hook for sidecar coordination:

```yaml
containers:
- name: catalog-service
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 5"]
spec:
  terminationGracePeriodSeconds: 35
```

## Kestrel Configuration for Istio

Since Istio handles TLS, configure Kestrel for plain HTTP only:

```csharp
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(8080, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
    });
});
```

Enabling both HTTP/1.1 and HTTP/2 (without TLS) is important. Istio can then use HTTP/2 for better performance when communicating between sidecars, while also supporting HTTP/1.1 clients.

## Traffic Management

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: catalog-service
  namespace: production
spec:
  hosts:
  - catalog-service
  http:
  - route:
    - destination:
        host: catalog-service
        port:
          number: 8080
    timeout: 15s
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: 5xx,reset,connect-failure
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: catalog-service
  namespace: production
spec:
  host: catalog-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http2MaxRequests: 500
        maxRequestsPerConnection: 20
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## gRPC Support

If your .NET service uses gRPC, configure it alongside HTTP:

```csharp
builder.WebHost.ConfigureKestrel(options =>
{
    // HTTP API port
    options.ListenAnyIP(8080, o => o.Protocols = HttpProtocols.Http1AndHttp2);
    // gRPC port
    options.ListenAnyIP(9090, o => o.Protocols = HttpProtocols.Http2);
});

builder.Services.AddGrpc();
```

Name the gRPC port properly:

```yaml
ports:
- name: http-web
  containerPort: 8080
- name: grpc-api
  containerPort: 9090
```

## Common .NET + Istio Issues

**HttpClient connection lifetime**: .NET's HttpClient pools connections by default. In a service mesh, this is fine, but be aware that if Envoy restarts, the pooled connections become stale. Use `IHttpClientFactory` which handles connection lifecycle properly.

**Startup time**: .NET apps with lots of dependency injection can take 5-15 seconds to start. Use startup probes with enough timeout to prevent premature pod kills.

**HTTP/2 without TLS**: Some .NET libraries expect HTTP/2 to always use TLS. Since Istio handles TLS at the sidecar level, you need to explicitly configure Kestrel and HttpClient to allow unencrypted HTTP/2. For HttpClient calling gRPC services within the mesh:

```csharp
AppContext.SetSwitch("System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport", true);
```

.NET applications integrate well with Istio once the basic configuration is in place. The key points are configuring Kestrel for plain HTTP (since Istio handles TLS), setting up health checks with the built-in middleware, and using IHttpClientFactory with a delegating handler for automatic trace header propagation.
