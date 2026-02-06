# How to Troubleshoot Missing Entity Framework Core Spans When the DiagnosticSource Listener Is Not Registered

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Entity Framework Core, DiagnosticSource

Description: Fix missing Entity Framework Core database spans in OpenTelemetry by correctly registering the DiagnosticSource listener.

You have added OpenTelemetry tracing to your ASP.NET Core application. HTTP request spans appear in your tracing backend. But database queries made through Entity Framework Core are invisible. No database spans, no query timing, nothing. Your traces show a gap where the database call should be.

## Why EF Core Spans Are Different

Entity Framework Core emits diagnostics through `System.Diagnostics.DiagnosticSource`, not through `System.Diagnostics.ActivitySource`. This is a historical difference. EF Core's diagnostic events predate the `ActivitySource` API.

The OpenTelemetry .NET SDK needs a specific instrumentation library to bridge EF Core's `DiagnosticSource` events into OpenTelemetry activities. Without this bridge, EF Core's events are emitted but nobody is listening.

## The Missing Piece

You need the `OpenTelemetry.Instrumentation.EntityFrameworkCore` NuGet package and it must be registered in your pipeline:

```bash
dotnet add package OpenTelemetry.Instrumentation.EntityFrameworkCore
```

Then add it to your tracing configuration:

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource("MyApp")
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            // This line is what creates EF Core spans
            .AddEntityFrameworkCoreInstrumentation()
            .AddOtlpExporter();
    });
```

## Common Mistakes

### Mistake 1: Adding the Package but Not Calling AddEntityFrameworkCoreInstrumentation

Just installing the NuGet package does nothing. You must call the extension method:

```csharp
// WRONG: package installed but not configured
tracing
    .AddAspNetCoreInstrumentation()
    .AddOtlpExporter();

// RIGHT: explicitly add EF Core instrumentation
tracing
    .AddAspNetCoreInstrumentation()
    .AddEntityFrameworkCoreInstrumentation() // required
    .AddOtlpExporter();
```

### Mistake 2: Using the Wrong Package for Your Database

`AddEntityFrameworkCoreInstrumentation` covers EF Core. If you are using raw `SqlClient` without EF Core, you need a different package:

```csharp
// For raw SqlClient/SqlConnection
tracing.AddSqlClientInstrumentation();

// For Entity Framework Core
tracing.AddEntityFrameworkCoreInstrumentation();

// You might need both if you use both approaches
tracing
    .AddEntityFrameworkCoreInstrumentation()
    .AddSqlClientInstrumentation();
```

### Mistake 3: Version Incompatibility

If your EF Core version is significantly newer than the instrumentation library, the DiagnosticSource event names might not match. Check that the instrumentation package version is compatible with your EF Core version:

```xml
<ItemGroup>
    <!-- These versions should be compatible -->
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer"
                      Version="8.0.11" />
    <PackageReference Include="OpenTelemetry.Instrumentation.EntityFrameworkCore"
                      Version="1.9.0" />
</ItemGroup>
```

## Configuring What Gets Captured

By default, the EF Core instrumentation captures basic query information. You can configure it to include more detail:

```csharp
tracing.AddEntityFrameworkCoreInstrumentation(options =>
{
    // Include the SQL command text in the span
    // WARNING: this may include sensitive data (parameters)
    options.SetDbStatementForText = true;

    // Include stored procedure names
    options.SetDbStatementForStoredProcedure = true;

    // Enrich spans with additional data
    options.EnrichWithIDbCommand = (activity, command) =>
    {
        // Add the database name as a tag
        activity.SetTag("db.name", command.Connection?.Database);

        // Add parameter count (not values, to avoid sensitive data)
        activity.SetTag("db.parameter_count", command.Parameters.Count);
    };
});
```

## Verifying Spans Are Being Created

Write a quick integration test to confirm EF Core spans appear:

```csharp
[Fact]
public async Task EFCore_CreatesSpans()
{
    var exportedActivities = new List<Activity>();

    var services = new ServiceCollection();
    services.AddDbContext<AppDbContext>(options =>
        options.UseInMemoryDatabase("test"));

    services.AddOpenTelemetry()
        .WithTracing(tracing =>
        {
            tracing
                .AddEntityFrameworkCoreInstrumentation()
                .AddInMemoryExporter(exportedActivities);
        });

    using var sp = services.BuildServiceProvider();
    var db = sp.GetRequiredService<AppDbContext>();

    // Execute a query
    await db.Users.ToListAsync();

    // Flush the provider
    sp.GetRequiredService<TracerProvider>().ForceFlush();

    // Check that EF Core spans were created
    var efSpans = exportedActivities
        .Where(a => a.Source.Name.Contains("EntityFrameworkCore"))
        .ToList();

    Assert.NotEmpty(efSpans);
}
```

## Filtering Noisy Queries

EF Core generates a lot of queries, including migrations, health checks, and internal bookkeeping. You can filter these out:

```csharp
tracing.AddEntityFrameworkCoreInstrumentation(options =>
{
    options.Filter = (activityName, command) =>
    {
        // Skip health check queries
        if (command.CommandText?.Contains("SELECT 1") == true)
            return false;

        // Skip migration queries
        if (command.CommandText?.Contains("__EFMigrationsHistory") == true)
            return false;

        return true;
    };
});
```

## Summary

Missing EF Core spans are caused by not registering the DiagnosticSource listener. Install `OpenTelemetry.Instrumentation.EntityFrameworkCore`, call `AddEntityFrameworkCoreInstrumentation()`, and verify the package version is compatible with your EF Core version. The instrumentation bridges EF Core's DiagnosticSource events into the OpenTelemetry pipeline so they appear as proper spans in your traces.
