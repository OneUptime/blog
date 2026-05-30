# How to Use Azure Application Insights Snapshot Debugger in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Snapshot Debugger, Production Debugging, .NET, Exception Diagnostics, APM, Azure Monitor

Description: Learn how to enable and use Application Insights Snapshot Debugger to capture and analyze snapshots of your application state when exceptions occur in production.

---

Production exceptions are frustrating. You get a stack trace in Application Insights that tells you an exception happened on line 47 of OrderService.cs, but you have no idea what the variable values were, what state the request was in, or what data triggered the bug. Reproducing the issue locally with different data and different timing rarely works.

Application Insights Snapshot Debugger solves this by automatically capturing a minidump of your application state for qualifying exceptions reported to Application Insights. You can then open these snapshots in Visual Studio and inspect local variables, method parameters, and the full call stack - just like you would if you had a debugger attached at the moment the exception was thrown.

## How Snapshot Debugger Works

When you enable Snapshot Debugger, a lightweight collector runs alongside your application. It monitors exceptions reported to Application Insights. When a qualifying exception occurs (by default, the same exception must occur twice before a snapshot is created), the collector takes a minidump of the process.

The snapshot is uploaded to your Application Insights resource where you can download and inspect it. The entire process is designed to be low-overhead and safe for production use.

Important characteristics:

- Snapshots are captured after a threshold of repeated exceptions and are rate-limited (to avoid capturing snapshots for transient issues)
- Snapshot creation briefly pauses the thread that triggered the exception; Microsoft reports typical pauses around 0.3 seconds, with higher latency possible
- Snapshots are stored for 15 days by default
- Snapshot collection supports .NET Framework 4.6.2 and later, and .NET 6.0 or later on Windows, in supported server environments

## Step 1: Enable Snapshot Debugger on App Service

The easiest path is enabling it through the portal for an App Service application running on a Windows service plan.

1. Go to your App Service resource
2. Click Monitoring > Application Insights
3. Turn on Application Insights if it is not already enabled
4. Under Instrument your application, select .NET
5. Toggle the Snapshot Debugger options to "On"

For more control, add the NuGet package to your project:

```bash
# Install the Snapshot Collector NuGet package

dotnet add package Microsoft.ApplicationInsights.SnapshotCollector
```

Then register it in your application:

```csharp
// Program.cs - Register the Snapshot Collector
using Microsoft.ApplicationInsights.SnapshotCollector;

var builder = WebApplication.CreateBuilder(args);

// Add Application Insights with Snapshot Collector
builder.Services.AddControllers();
builder.Services.AddApplicationInsightsTelemetry();
builder.Services.AddSnapshotCollector(config =>
{
    // Add the exception to the collection plan after repeated occurrences
    config.ThresholdForSnapshotting = 3;

    // Maximum number of snapshots to collect for a single problem
    config.MaximumSnapshotsRequired = 5;

    // Time window for counting exception occurrences
    config.ProblemCounterResetInterval = TimeSpan.FromDays(1);

    // Keep snapshot collection disabled while debugging locally
    config.IsEnabledInDeveloperMode = false;
});

var app = builder.Build();
app.MapControllers();
app.Run();
```

## Step 2: Configure Snapshot Collection Rules

By default, ASP.NET and ASP.NET Core applications report unhandled exceptions that escape a controller method or endpoint route handler. You can customize the collector's thresholds and rate limits to control how aggressively snapshots are captured.

```csharp
// Configure how often snapshot collection is triggered
builder.Services.AddSnapshotCollector(config =>
{
    // Add the exception to the collection plan after repeated occurrences
    config.ThresholdForSnapshotting = 5;

    // Maximum snapshots to collect for a single problem
    config.MaximumSnapshotsRequired = 3;

    // Maximum number of problems to track at the same time
    config.MaximumCollectionPlanSize = 50;

    // Run snapshot collection with low-priority I/O
    config.SnapshotInLowPriorityThread = true;

    // Disable the processor after repeated failed snapshot requests
    config.FailedRequestLimit = 3;
});
```

You can also configure the collector in appsettings.json. Bind the section before calling `AddSnapshotCollector()`:

```csharp
builder.Services.Configure<SnapshotCollectorConfiguration>(
    builder.Configuration.GetSection("SnapshotCollector"));
builder.Services.AddSnapshotCollector();
```

```json
{
  "SnapshotCollector": {
    "IsEnabledInDeveloperMode": false,
    "ThresholdForSnapshotting": 3,
    "MaximumSnapshotsRequired": 5,
    "MaximumCollectionPlanSize": 50,
    "SnapshotsPerTenMinutesLimit": 1,
    "SnapshotsPerDayLimit": 30,
    "ProblemCounterResetInterval": "1.00:00:00",
    "SnapshotInLowPriorityThread": true,
    "ProvideAnonymousTelemetry": true,
    "FailedRequestLimit": 3
  }
}
```

## Step 3: View Snapshots in the Azure Portal

After snapshots are captured, you can find them in Application Insights:

1. Go to Application Insights > Failures
2. Click on an exception in the list
3. Look for the "Open debug snapshot" button on the exception detail view
4. Click it to open the snapshot viewer

The portal snapshot viewer shows:

- The full call stack at the time of the exception
- Local variables for each frame in the call stack
- The exception message and inner exceptions
- Thread information

This is often enough to identify the root cause without downloading the full snapshot.

## Step 4: Debug Snapshots in Visual Studio

For deeper analysis, download the snapshot and open it in Visual Studio.

1. In the portal snapshot viewer, click "Download Snapshot"
2. You will get a .diagsession file
3. Open it in Visual Studio (Enterprise edition required for full features)
4. Visual Studio loads the snapshot with your source code and PDB symbols

In Visual Studio, you can:

- Inspect all local variables and object properties
- Navigate the call stack and switch between threads
- Use debugger windows to inspect available state
- View the state of collections and complex objects

This is where Snapshot Debugger really shines. You are essentially doing a post-mortem debugging session with the exact state of your application at the moment the exception occurred.

## Step 5: Configure Symbol Servers

For the best debugging experience, Visual Studio needs your PDB symbol files to map the snapshot back to your source code.

Options for symbol resolution:

**Azure DevOps Symbol Server**: If you publish symbols during your CI/CD pipeline, Visual Studio can automatically download them.

```yaml
# Azure DevOps pipeline step to publish symbols
- task: PublishSymbols@2
  inputs:
    SearchPattern: '**/bin/**/*.pdb'
    SymbolServerType: 'TeamServices'
```

**Include PDBs in deployment**: The simplest approach - deploy your PDB files alongside your DLLs. Add this to your project file:

```xml
<!-- Include PDB files in the publish output -->
<PropertyGroup>
  <DebugType>portable</DebugType>
  <DebugSymbols>true</DebugSymbols>
</PropertyGroup>
```

**NuGet Symbol Packages**: If your application references internal NuGet packages, publish symbol packages (.snupkg) so that the debugger can resolve symbols for those dependencies too.

## Practical Example: Debugging a NullReferenceException

Let me walk through a real scenario. Your application throws NullReferenceException in the payment processing code. The stack trace shows:

```text
System.NullReferenceException: Object reference not set to an instance of an object.
   at PaymentService.ProcessPayment(Order order) in PaymentService.cs:line 42
   at OrderController.Checkout(CheckoutRequest request) in OrderController.cs:line 78
```

With just the stack trace, you know the exception is on line 42 of PaymentService.cs. But which object is null? The `order` parameter? A property of the order? Something returned by a method call on that line?

Open the debug snapshot and inspect the local variables at the `ProcessPayment` frame:

- `order` is not null
- `order.PaymentMethod` is not null
- `order.PaymentMethod.CardToken` is null

Now you know the exact cause. A payment method was saved without a card token, and the code did not handle that case.

## Step 6: Set Up Alerts for Snapshot Availability

You can create alerts that notify you when new snapshots are available, so you do not have to check manually.

```kql
// Query to find recent snapshot events
AppExceptions
| where TimeGenerated > ago(1h)
| where isnotempty(tostring(Properties["ai.snapshot.id"]))
| project TimeGenerated, ExceptionType, ExceptionMessage = Message,
          OperationName, SnapshotId = tostring(Properties["ai.snapshot.id"])
| order by TimeGenerated desc
```

Create a log alert on this query to get notified when production exceptions generate snapshots.

## Security Considerations

Snapshots contain a dump of your application's memory at the time of the exception. This may include sensitive data such as:

- User credentials or tokens in memory
- Personal data being processed by the request
- Connection strings and secrets loaded in memory

Take these precautions:

- **Restrict access**: Use RBAC to limit who can view and download snapshots. The "Application Insights Snapshot Debugger" role provides read access to snapshots.
- **Data retention**: Plan around the default 15-day snapshot retention period, and request a change only if you need longer retention
- **Review compliance**: If your application processes regulated data (healthcare, financial, PII), check whether capturing memory dumps complies with your data handling policies

## Performance Impact

Snapshot Debugger is designed for production use, but it is not completely free:

- **Memory and CPU**: Snapshot Debugger adds small overhead when exceptions are thrown, when a snapshot is created, and when `TrackException` is called
- **Pause time**: Snapshot creation briefly pauses the thread that triggered the exception while the process snapshot is created
- **Disk I/O**: Snapshots are written to local temp storage before upload, and disk usage is roughly proportional to the application's working set
- **Limited impact between snapshots**: Between snapshots, the default rate limits keep overhead low, but exception processing still has some overhead

The throttling settings (snapshots per ten minutes, per day) ensure the collector does not overwhelm your application even during an exception storm.

## Troubleshooting

**No snapshots appearing**: Check that the exception has occurred at least as many times as your `ThresholdForSnapshotting` setting. Also verify that the Snapshot Collector is actually running - check the Application Insights logs for snapshot collector status messages.

**"Snapshot collection not supported"**: This happens on unsupported platforms (Linux with .NET Framework, non-.NET languages, or client applications such as WPF, Windows Forms, or UWP). Ensure you are running .NET Framework 4.6.2+ or .NET 6.0+ on Windows in a supported server environment.

**Snapshots are too large to upload**: If your application uses a lot of memory, snapshots can be large because the minidump size is related to the process working set. Consider whether the large memory footprint itself is a problem worth investigating.

## Summary

Snapshot Debugger turns production exceptions from frustrating guessing games into straightforward debugging sessions. Enable it on your critical .NET services, configure sensible throttling limits, and make sure your symbols are available. The next time a mysterious NullReferenceException or ArgumentException shows up in production, you will have the full application state to work with instead of just a stack trace.
