# How to Use Dapr .NET SDK Roslyn Analyzers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Roslyn, Analyzer, Code Quality, SDK

Description: Use Dapr's built-in Roslyn analyzers to catch common misconfigurations and API misuse in your .NET projects at compile time before they reach production.

---

## Overview

The Dapr .NET SDK provides a separate Roslyn analyzer package that runs during compilation and flags common mistakes such as missing actor registrations, unmapped actor endpoints, invalid timer callbacks, and serialization configuration issues. These analyzers provide immediate feedback in your IDE and CI pipeline without any runtime overhead.

## Enabling the Analyzers

The analyzers are provided as a separate NuGet package. Install it alongside the Dapr Actors package:

```bash
dotnet add package Dapr.Actors
dotnet add package Dapr.Actors.Analyzers
```

The analyzers activate as soon as the `Dapr.Actors.Analyzers` package is referenced.

## Actor Registration Check

Dapr actor types must be registered with dependency injection. The analyzer catches missing registrations at compile time:

```csharp
// DAPR1402: Actor type not registered with dependency injection
// Triggers when an actor class exists but is not registered via
// builder.Services.AddActors(options => { options.Actors.RegisterActor<MyActor>(); });
public class MyActor : Actor, IMyActor
{
    public MyActor(ActorHost host) : base(host) { }
    public Task DoWorkAsync() => Task.CompletedTask;
}
```

Register your actor to resolve this warning:

```csharp
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<MyActor>();
});
```

## Actor Endpoint Mapping

The analyzer verifies that actor endpoints are mapped in your application startup:

```csharp
// DAPR1404: Call app.MapActorsHandlers to map actor endpoints
// Triggers when actor services are configured but endpoints are not mapped
var app = builder.Build();
app.MapActorsHandlers(); // Required to map actor HTTP endpoints
```

## Timer Callback Validation

The analyzer checks that actor timer callback methods actually exist on the actor type:

```csharp
// DAPR1401: Actor timer callback method must exist on type
// Triggers when RegisterTimerAsync references a method name that
// does not exist on the actor class
public class ReminderActor : Actor, IReminderActor
{
    public async Task SetupTimer()
    {
        // "DoWork" must be a method on this class
        await RegisterTimerAsync("myTimer", nameof(DoWork),
            null, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(5));
    }

    public Task DoWork(byte[] state) => Task.CompletedTask;
}
```

## JSON Serialization Recommendation

For actors that need to interoperate with non-.NET Dapr services, the analyzer suggests enabling JSON serialization:

```csharp
// DAPR1403 (Info): Use options.UseJsonSerialization for non-.NET interop
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<MyActor>();
    options.UseJsonSerialization = true; // Recommended for cross-platform interop
});
```

## Viewing Analyzer Diagnostics

In Visual Studio or Rider, diagnostics appear as warnings or info messages inline. To promote specific Dapr analyzer warnings to errors via the command line:

```bash
dotnet build -p:WarningsAsErrors=DAPR1401,DAPR1402,DAPR1404
```

## Suppressing False Positives

If a rule does not apply to a specific case, suppress it with the standard `#pragma` directive:

```csharp
#pragma warning disable DAPR1402
public class LegacyActor : Actor, ILegacyActor
{
    public LegacyActor(ActorHost host) : base(host) { }
    public Task OldMethodAsync() => Task.CompletedTask;
}
#pragma warning restore DAPR1402
```

Or add a project-level suppression in your `.csproj`:

```xml
<PropertyGroup>
  <NoWarn>DAPR1402</NoWarn>
</PropertyGroup>
```

## Integrating with CI

Treat Dapr analyzer warnings as errors in your CI pipeline to prevent regressions:

```bash
dotnet build -p:TreatWarningsAsErrors=true
```

## Summary

Dapr's Roslyn analyzers give .NET teams compile-time safety for actor registration, endpoint mapping, timer callbacks, and serialization configuration. By installing `Dapr.Actors.Analyzers` and configuring `TreatWarningsAsErrors` in CI, teams can prevent common Dapr misconfigurations from reaching production with zero runtime cost.
