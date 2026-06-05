# How to Fix OpenTelemetry .NET Auto-Instrumentation Dependency Version Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, .NET, Auto-Instrumentation, Dependencies

Description: Resolve dependency version conflicts between OpenTelemetry .NET auto-instrumentation agent and your application libraries.

OpenTelemetry .NET auto-instrumentation lets you add observability without changing code. But when the agent's dependencies conflict with your application's dependencies, things break. You might see runtime exceptions, missing types, or method-not-found errors.

## How Auto-Instrumentation Works in .NET

The .NET auto-instrumentation agent uses CLR profiling APIs to inject bytecode into your application at runtime. It ships with its own set of assemblies that get loaded alongside your application's assemblies. When the agent's version of a library differs from your application's version, resolution depends on the deployment mode: standalone profiler deployments can redirect references to the instrumentation's versions, while NuGet package deployments rely on normal build-time NuGet resolution. If the resolved version is not compatible with either side, that decision can cause problems.

## Common Conflict Scenarios

### Scenario 1: System.Diagnostics.DiagnosticSource Version Mismatch

The auto-instrumentation agent depends on a specific version of `System.Diagnostics.DiagnosticSource`. If your application uses a different version:

```text
System.MissingMethodException: Method not found:
'Void System.Diagnostics.Activity.SetIdFormat(System.Diagnostics.ActivityIdFormat)'
```

This happens when the agent expects a newer version of the assembly than what your application provides.

### Scenario 2: gRPC Client Conflict

Your application uses a `Grpc.Net.Client` version that is outside the range supported by the auto-instrumentation package, or it resolves a different version than the one used by the auto-instrumentation assemblies:

```text
System.IO.FileLoadException: Could not load file or assembly
'Grpc.Net.Client, Version=2.60.0.0'. The located assembly's
manifest definition does not match the assembly reference.
```

## Diagnosing the Conflict

### Step 1: Check Which Assemblies Are Loaded

Add this diagnostic code to your application startup:

```csharp
// In Program.cs, add temporarily for debugging
var assemblies = AppDomain.CurrentDomain.GetAssemblies()
    .Where(a => a.FullName.Contains("OpenTelemetry") ||
                a.FullName.Contains("Diagnostics") ||
                a.FullName.Contains("Grpc"))
    .OrderBy(a => a.FullName);

foreach (var asm in assemblies)
{
    Console.WriteLine($"Loaded: {asm.FullName}");
    Console.WriteLine($"  Location: {asm.Location}");
}
```

### Step 2: Check the Agent's Bundled Libraries

The auto-instrumentation agent stores its libraries in a specific directory. Check it:

```bash
# The agent's library directory (Linux)

ls /opt/opentelemetry-dotnet-instrumentation/

# Or check the OTEL_DOTNET_AUTO_HOME environment variable
echo $OTEL_DOTNET_AUTO_HOME
find "$OTEL_DOTNET_AUTO_HOME" -maxdepth 3 -type f -name "*.dll"
```

### Step 3: Compare Versions

Look for version mismatches between the agent's libraries and your application's:

```bash
# Check your application's dependency versions
dotnet list package --include-transitive | grep -i "diagnosticsource\|grpc\|opentelemetry"
```

## Fix 1: Pin Compatible Versions

Update your application's NuGet packages to match the versions expected by the agent:

```xml
<!-- In your .csproj -->
<ItemGroup>
    <!-- Match the version the auto-instrumentation agent expects -->
    <PackageReference Include="System.Diagnostics.DiagnosticSource"
                      Version="10.0.0" />
    <PackageReference Include="Grpc.Net.Client"
                      Version="2.60.0" />
</ItemGroup>
```

Check the agent's release notes or `Directory.Packages.props` files for the exact dependency versions it uses. Another option is to add the `OpenTelemetry.AutoInstrumentation` NuGet package to the application so NuGet resolves the same versions at build time.

## Fix 2: Use Assembly Binding Redirects

For .NET Framework applications, add binding redirects in `app.config`:

```xml
<configuration>
  <runtime>
    <assemblyBinding xmlns="urn:schemas-microsoft-com:asm.v1">
      <dependentAssembly>
        <assemblyIdentity name="System.Diagnostics.DiagnosticSource"
                          publicKeyToken="cc7b13ffcd2ddd51" />
        <bindingRedirect oldVersion="0.0.0.0-10.0.0.0"
                         newVersion="10.0.0.0" />
      </dependentAssembly>
    </assemblyBinding>
  </runtime>
</configuration>
```

For standalone .NET 6+ profiler deployments, the auto-instrumentation package can redirect assembly references to versions not lower than the versions it uses. This is controlled with an environment variable:

```bash
export OTEL_DOTNET_AUTO_REDIRECT_ENABLED=true
```

## Fix 3: Exclude Conflicting Instrumentation

If a specific instrumentation library causes the conflict, you can disable it:

```bash
# Disable specific instrumentations via environment variables
export OTEL_DOTNET_AUTO_TRACES_GRPCNETCLIENT_INSTRUMENTATION_ENABLED=false
```

Then add manual instrumentation for that library instead:

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        // Manual gRPC instrumentation with your application's version
        tracing.AddGrpcClientInstrumentation();
    });
```

## Fix 4: Switch to Manual Instrumentation

If dependency conflicts keep recurring, consider switching from auto-instrumentation to manual instrumentation for the affected components:

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddSource("MyApp")
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddSqlClientInstrumentation()
            .AddOtlpExporter();
    })
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter();
    });
```

Manual instrumentation NuGet packages are versioned alongside your application, so conflicts are much less likely.

## Prevention

Before deploying auto-instrumentation, check for version compatibility:

```bash
# List the agent's dependencies
unzip -l opentelemetry-dotnet-instrumentation-linux-x64.zip | grep ".dll"

# Compare with your app's published output
ls bin/Release/net8.0/publish/*.dll
```

Look for any shared DLL names and compare their versions. If there are mismatches, either pin your application's versions to match or disable the conflicting instrumentation module.
