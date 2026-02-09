# How to Run .NET Framework Applications in Windows Containers on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, DotNet

Description: Complete guide to containerizing and deploying .NET Framework applications on Kubernetes with best practices for legacy Windows workloads.

---

.NET Framework applications represent a significant portion of enterprise Windows workloads. While .NET Core and .NET 5+ support Linux containers, .NET Framework requires Windows containers due to its dependency on Windows-specific APIs and the full .NET Framework runtime. This guide covers containerizing .NET Framework applications for Kubernetes, from basic console applications to complex multi-tier systems.

## Understanding .NET Framework Containerization

.NET Framework applications require Windows Server Core or Windows images with the appropriate .NET Framework version installed. Microsoft provides base images with .NET Framework 3.5, 4.6, 4.7, and 4.8 pre-installed.

Unlike .NET Core which is self-contained, .NET Framework depends on the Global Assembly Cache (GAC), Windows Registry, and system-level components. This makes containerization more complex but still achievable with proper configuration.

The key is choosing the right base image, understanding assembly dependencies, and properly configuring application settings for container environments.

## Choosing the Right Base Image

Microsoft provides several .NET Framework base images:

```dockerfile
# .NET Framework 4.8 runtime only
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022

# .NET Framework 4.8 with ASP.NET
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# .NET Framework 4.8 SDK for builds
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022
```

Choose based on your application type and minimize image size by using runtime-only images for production.

## Containerizing a Console Application

Start with a simple .NET Framework console application:

```dockerfile
# Dockerfile for .NET Framework console app
# Build stage
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build
WORKDIR /app

# Copy csproj and restore dependencies
COPY *.csproj ./
RUN nuget restore

# Copy source code and build
COPY . ./
RUN msbuild /p:Configuration=Release /p:OutputPath=/app/out

# Runtime stage
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022
WORKDIR /app
COPY --from=build /app/out ./

# Run the application
ENTRYPOINT ["MyConsoleApp.exe"]
```

Deploy to Kubernetes:

```yaml
# dotnet-console-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: dotnet-batch-job
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: app
        image: myregistry.azurecr.io/console-app:v1
        env:
        - name: APP_CONFIG
          value: "production"
        - name: CONNECTION_STRING
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: connectionString
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      restartPolicy: OnFailure
  backoffLimit: 3
```

## Containerizing Windows Services

Many .NET Framework applications run as Windows Services. Convert them to run in containers:

```csharp
// Program.cs modifications for container support
using System;
using System.ServiceProcess;
using System.Threading;

namespace MyWindowsService
{
    class Program
    {
        static void Main(string[] args)
        {
            // Check if running in container (no service manager available)
            if (Environment.UserInteractive || args.Length > 0 && args[0] == "--console")
            {
                // Run in console mode for containers
                var service = new MyService();
                service.StartService(args);

                Console.WriteLine("Service running in console mode. Press Ctrl+C to exit.");

                // Handle graceful shutdown
                var exitEvent = new ManualResetEvent(false);
                Console.CancelKeyPress += (sender, eventArgs) =>
                {
                    eventArgs.Cancel = true;
                    service.StopService();
                    exitEvent.Set();
                };

                exitEvent.WaitOne();
            }
            else
            {
                // Run as Windows Service (for non-container environments)
                ServiceBase.Run(new MyService());
            }
        }
    }

    public partial class MyService : ServiceBase
    {
        private Timer _timer;

        protected override void OnStart(string[] args)
        {
            StartService(args);
        }

        public void StartService(string[] args)
        {
            Console.WriteLine("Starting service...");
            _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromSeconds(30));
        }

        protected override void OnStop()
        {
            StopService();
        }

        public void StopService()
        {
            Console.WriteLine("Stopping service...");
            _timer?.Dispose();
        }

        private void DoWork(object state)
        {
            Console.WriteLine($"[{DateTime.Now}] Processing work...");
            // Your service logic here
        }
    }
}
```

Dockerfile for the service:

```dockerfile
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8 AS build
WORKDIR /app
COPY *.csproj ./
RUN nuget restore
COPY . ./
RUN msbuild /p:Configuration=Release /p:OutputPath=/app/out

FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022
WORKDIR /app
COPY --from=build /app/out ./

# Run in console mode
ENTRYPOINT ["MyWindowsService.exe", "--console"]
```

Deploy as a Deployment:

```yaml
# dotnet-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dotnet-service
  template:
    metadata:
      labels:
        app: dotnet-service
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: service
        image: myregistry.azurecr.io/windows-service:v1
        env:
        - name: SERVICE_NAME
          value: "MyService"
        - name: LOG_LEVEL
          value: "Info"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
```

## Handling Application Configuration

Use ConfigMaps and environment variables instead of App.config:

```csharp
// ConfigurationHelper.cs
using System;
using System.Configuration;

public class ConfigurationHelper
{
    public static string GetSetting(string key, string defaultValue = null)
    {
        // First check environment variables (Kubernetes ConfigMap/Secret)
        var envValue = Environment.GetEnvironmentVariable(key);
        if (!string.IsNullOrEmpty(envValue))
            return envValue;

        // Fall back to App.config
        var configValue = ConfigurationManager.AppSettings[key];
        if (!string.IsNullOrEmpty(configValue))
            return configValue;

        // Return default value
        return defaultValue;
    }

    public static string GetConnectionString(string name)
    {
        // Check environment variable first
        var envVarName = $"ConnectionStrings__{name}";
        var envValue = Environment.GetEnvironmentVariable(envVarName);
        if (!string.IsNullOrEmpty(envValue))
            return envValue;

        // Fall back to configuration file
        var connString = ConfigurationManager.ConnectionStrings[name];
        return connString?.ConnectionString;
    }
}

// Usage in application
var dbConnection = ConfigurationHelper.GetConnectionString("DefaultConnection");
var apiKey = ConfigurationHelper.GetSetting("API_KEY", "default-key");
```

Kubernetes ConfigMap:

```yaml
# app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dotnet-app-config
data:
  API_KEY: "production-api-key"
  LOG_LEVEL: "Information"
  MAX_WORKERS: "10"
  FEATURE_FLAGS: "EnableNewUI=true,EnableBeta=false"
---
apiVersion: v1
kind: Secret
metadata:
  name: dotnet-app-secrets
type: Opaque
stringData:
  ConnectionStrings__DefaultConnection: "Server=sql-server;Database=AppDb;User Id=sa;Password=MyPassword123"
  ConnectionStrings__Redis: "redis-service:6379,password=SecretPass"
```

Use in deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-app
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: app
        image: myregistry.azurecr.io/dotnet-app:v1
        envFrom:
        - configMapRef:
            name: dotnet-app-config
        - secretRef:
            name: dotnet-app-secrets
```

## Working with Entity Framework

Configure Entity Framework for containerized environments:

```csharp
// DbContextFactory.cs
using System;
using System.Data.Entity;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext() : base(GetConnectionString())
    {
        // Disable initializer for production containers
        Database.SetInitializer<ApplicationDbContext>(null);
    }

    private static string GetConnectionString()
    {
        // Get from environment variable (Kubernetes secret)
        var connString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

        if (string.IsNullOrEmpty(connString))
        {
            throw new InvalidOperationException("Database connection string not configured");
        }

        return connString;
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Order> Orders { get; set; }

    protected override void OnModelCreating(DbModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Configure your model here
    }
}

// Startup initialization
public class DatabaseInitializer
{
    public static void Initialize()
    {
        using (var context = new ApplicationDbContext())
        {
            // Test connection
            if (context.Database.Exists())
            {
                Console.WriteLine("Database connection successful");

                // Run migrations if needed
                // var migrator = new DbMigrator(new Configuration());
                // migrator.Update();
            }
            else
            {
                throw new Exception("Cannot connect to database");
            }
        }
    }
}
```

Run database migrations as an init job:

```yaml
# db-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: migrator
        image: myregistry.azurecr.io/dotnet-app:v1
        command:
        - cmd
        - /c
        - migrate.exe
        env:
        - name: ConnectionStrings__DefaultConnection
          valueFrom:
            secretKeyRef:
              name: dotnet-app-secrets
              key: ConnectionStrings__DefaultConnection
      restartPolicy: OnFailure
```

## Multi-Tier .NET Framework Application

Deploy a complete multi-tier application:

```yaml
# full-dotnet-app.yaml
# SQL Server StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mssql
spec:
  serviceName: mssql-service
  replicas: 1
  selector:
    matchLabels:
      app: mssql
  template:
    metadata:
      labels:
        app: mssql
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: mssql
        image: mcr.microsoft.com/mssql/server:2022-latest
        env:
        - name: ACCEPT_EULA
          value: "Y"
        - name: SA_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mssql-secret
              key: sa-password
        ports:
        - containerPort: 1433
        volumeMounts:
        - name: data
          mountPath: C:\data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mssql-service
spec:
  selector:
    app: mssql
  ports:
  - port: 1433
    targetPort: 1433
---
# Business Logic Tier
apiVersion: apps/v1
kind: Deployment
metadata:
  name: business-tier
spec:
  replicas: 3
  selector:
    matchLabels:
      app: business-tier
  template:
    metadata:
      labels:
        app: business-tier
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: api
        image: myregistry.azurecr.io/business-api:v1
        ports:
        - containerPort: 8080
        env:
        - name: ConnectionStrings__DefaultConnection
          value: "Server=mssql-service;Database=AppDb;User Id=sa;Password=$(SA_PASSWORD)"
        - name: SA_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mssql-secret
              key: sa-password
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
---
# Presentation Tier (IIS)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-tier
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-tier
  template:
    metadata:
      labels:
        app: web-tier
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: web
        image: myregistry.azurecr.io/web-frontend:v1
        ports:
        - containerPort: 80
        env:
        - name: API_URL
          value: "http://business-service:8080"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
```

## Logging and Monitoring

Implement structured logging for containers:

```csharp
// Logger.cs
using System;
using Newtonsoft.Json;

public static class Logger
{
    public static void LogInfo(string message, object data = null)
    {
        Log("INFO", message, data);
    }

    public static void LogError(string message, Exception ex = null, object data = null)
    {
        var errorData = new
        {
            Message = message,
            Exception = ex?.ToString(),
            Data = data
        };
        Log("ERROR", message, errorData);
    }

    private static void Log(string level, string message, object data)
    {
        var logEntry = new
        {
            Timestamp = DateTime.UtcNow.ToString("o"),
            Level = level,
            Message = message,
            Data = data,
            Application = Environment.GetEnvironmentVariable("APP_NAME") ?? "DotNetApp",
            Host = Environment.MachineName
        };

        // Output JSON to stdout (captured by Kubernetes)
        Console.WriteLine(JsonConvert.SerializeObject(logEntry));
    }
}

// Usage
Logger.LogInfo("Application started", new { Version = "1.0.0" });
Logger.LogError("Database connection failed", ex, new { ConnectionString = "***" });
```

## Health Checks

Implement health check endpoints:

```csharp
// HealthCheckHandler.cs
using System;
using System.Net;
using System.Text;
using System.Threading;

public class HealthCheckServer
{
    private HttpListener _listener;
    private Thread _thread;

    public void Start()
    {
        _listener = new HttpListener();
        _listener.Prefixes.Add("http://+:8080/health/");
        _listener.Prefixes.Add("http://+:8080/ready/");
        _listener.Start();

        _thread = new Thread(HandleRequests);
        _thread.Start();
    }

    private void HandleRequests()
    {
        while (_listener.IsListening)
        {
            try
            {
                var context = _listener.GetContext();
                var request = context.Request;
                var response = context.Response;

                if (request.Url.AbsolutePath == "/health")
                {
                    // Liveness check - is the app running?
                    response.StatusCode = 200;
                    var buffer = Encoding.UTF8.GetBytes("Healthy");
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                }
                else if (request.Url.AbsolutePath == "/ready")
                {
                    // Readiness check - can the app serve traffic?
                    bool isReady = CheckDatabaseConnection() && CheckDependencies();
                    response.StatusCode = isReady ? 200 : 503;
                    var buffer = Encoding.UTF8.GetBytes(isReady ? "Ready" : "Not Ready");
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                }

                response.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Health check error: {ex.Message}");
            }
        }
    }

    private bool CheckDatabaseConnection()
    {
        // Implement your database check
        return true;
    }

    private bool CheckDependencies()
    {
        // Check external dependencies
        return true;
    }

    public void Stop()
    {
        _listener?.Stop();
        _thread?.Join();
    }
}
```

## Conclusion

Running .NET Framework applications in Kubernetes requires understanding Windows container specifics and adapting traditional deployment patterns. By containerizing legacy .NET Framework workloads, you gain the benefits of Kubernetes orchestration including automated deployment, scaling, and self-healing while maintaining compatibility with existing code.

Start with simple applications to learn the patterns, then progressively containerize more complex systems. Focus on externalizing configuration, implementing proper health checks, and designing for stateless operation where possible. This modernization approach extends the life of .NET Framework applications while preparing for eventual migration to .NET 6+ and cross-platform deployment.
