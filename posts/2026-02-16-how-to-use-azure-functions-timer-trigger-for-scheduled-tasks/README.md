# How to Use Azure Functions Timer Trigger for Scheduled Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Timer Trigger, CRON, Scheduled Tasks, Serverless, Azure, Automation

Description: Learn how to use Azure Functions timer triggers to run scheduled tasks with CRON expressions, timezone handling, and reliable execution patterns.

---

Every application needs scheduled tasks. Cleaning up expired sessions, sending daily reports, syncing data from external APIs, rotating logs - these are all jobs that need to run on a regular schedule. Azure Functions timer triggers let you run code on a schedule without managing a scheduler service, a VM with cron, or a Windows Task Scheduler.

In this post, I will cover everything you need to know about timer triggers: CRON expression syntax, timezone configuration, handling overlapping executions, and building production-ready scheduled tasks.

## Basic Timer Trigger Setup

A timer trigger fires your function on a schedule defined by a CRON expression. Here is the simplest possible example.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class ScheduledCleanup
{
    private readonly ILogger<ScheduledCleanup> _logger;

    public ScheduledCleanup(ILogger<ScheduledCleanup> logger)
    {
        _logger = logger;
    }

    // Runs every hour at the top of the hour
    [Function("HourlyCleanup")]
    public void Run([TimerTrigger("0 0 * * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation("Hourly cleanup started at {Time}", DateTime.UtcNow);

        // Check if we missed the previous run (happens during deployments or outages)
        if (timerInfo.IsPastDue)
        {
            _logger.LogWarning("Timer is past due - previous execution was missed");
        }

        // Do cleanup work here
        _logger.LogInformation("Hourly cleanup completed");
    }
}
```

## CRON Expression Syntax

Azure Functions uses six-field CRON expressions (not the standard five-field Linux cron format). The fields are:

```
{second} {minute} {hour} {day} {month} {day-of-week}
```

Here are the most common schedules you will use.

```csharp
// Every 5 minutes
[TimerTrigger("0 */5 * * * *")]

// Every hour at minute 0
[TimerTrigger("0 0 * * * *")]

// Every day at midnight UTC
[TimerTrigger("0 0 0 * * *")]

// Every day at 8:00 AM UTC
[TimerTrigger("0 0 8 * * *")]

// Every Monday at 9:00 AM UTC
[TimerTrigger("0 0 9 * * 1")]

// First day of every month at midnight
[TimerTrigger("0 0 0 1 * *")]

// Every weekday (Mon-Fri) at 6:00 AM UTC
[TimerTrigger("0 0 6 * * 1-5")]

// Every 30 seconds
[TimerTrigger("*/30 * * * * *")]

// Every 15 minutes during business hours (8 AM - 6 PM UTC, weekdays)
[TimerTrigger("0 */15 8-17 * * 1-5")]
```

## Timezone Configuration

By default, CRON expressions are evaluated in UTC. If you need your schedule to respect a specific timezone (for example, "run at 9 AM Eastern time"), you can configure it in `host.json`.

```json
{
  "version": "2.0",
  "extensions": {
    "timers": {
      "schedule": {
        "adjustForDST": true
      }
    }
  }
}
```

You can also specify the timezone directly in the CRON expression by using the `%` syntax with an app setting, or by using the `scheduleStatus` approach. The cleanest way is to set the `WEBSITE_TIME_ZONE` app setting.

```bash
# Set the timezone for the entire function app
# Use Windows timezone names on Windows, IANA names on Linux
az functionapp config appsettings set \
  --name my-function-app \
  --resource-group my-resource-group \
  --settings "WEBSITE_TIME_ZONE=Eastern Standard Time"

# For Linux function apps, use IANA timezone names
az functionapp config appsettings set \
  --name my-function-app \
  --resource-group my-resource-group \
  --settings "WEBSITE_TIME_ZONE=America/New_York"
```

With this setting, `0 0 9 * * *` means 9:00 AM Eastern time, and it will automatically adjust for daylight saving time.

## Using the TimerInfo Object

The `TimerInfo` parameter gives you useful information about the current execution and the schedule.

```csharp
[Function("DetailedTimerExample")]
public void Run([TimerTrigger("0 */5 * * * *")] TimerInfo timerInfo)
{
    // Check if this execution is late (past due)
    // This happens when the function app was down during a scheduled execution
    if (timerInfo.IsPastDue)
    {
        _logger.LogWarning("Timer execution is past due");
    }

    // Get schedule status information
    if (timerInfo.ScheduleStatus != null)
    {
        _logger.LogInformation("Last execution: {Last}",
            timerInfo.ScheduleStatus.Last);
        _logger.LogInformation("Next execution: {Next}",
            timerInfo.ScheduleStatus.Next);
        _logger.LogInformation("Last updated: {LastUpdated}",
            timerInfo.ScheduleStatus.LastUpdated);
    }
}
```

## Preventing Overlapping Executions

If your scheduled task takes longer than the interval between triggers, you might get overlapping executions. For example, if your task runs every 5 minutes but sometimes takes 7 minutes to complete, the next execution will start before the previous one finishes.

The timer trigger has built-in protection against this on a single instance - it will not trigger again until the previous execution completes. However, if your function app scales to multiple instances, each instance maintains its own timer, so you could still get concurrent executions.

To prevent this across instances, use a distributed lock.

```csharp
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;

public class SafeScheduledTask
{
    private readonly ILogger<SafeScheduledTask> _logger;
    private readonly BlobServiceClient _blobClient;

    public SafeScheduledTask(ILogger<SafeScheduledTask> logger, BlobServiceClient blobClient)
    {
        _logger = logger;
        _blobClient = blobClient;
    }

    [Function("DailyReport")]
    public async Task Run([TimerTrigger("0 0 8 * * *")] TimerInfo timerInfo)
    {
        // Use a blob lease as a distributed lock
        var container = _blobClient.GetBlobContainerClient("locks");
        await container.CreateIfNotExistsAsync();

        var lockBlob = container.GetBlobClient("daily-report-lock");

        // Create the blob if it does not exist
        if (!await lockBlob.ExistsAsync())
        {
            await lockBlob.UploadAsync(new BinaryData("lock"));
        }

        // Try to acquire a lease (distributed lock)
        var leaseClient = lockBlob.GetBlobLeaseClient();
        try
        {
            var lease = await leaseClient.AcquireAsync(TimeSpan.FromMinutes(5));
            _logger.LogInformation("Acquired lock, generating daily report");

            try
            {
                await GenerateDailyReport();
            }
            finally
            {
                // Always release the lock when done
                await leaseClient.ReleaseAsync();
            }
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 409)
        {
            // Another instance already has the lock
            _logger.LogInformation("Another instance is already generating the report");
        }
    }

    private async Task GenerateDailyReport()
    {
        // Report generation logic here
        _logger.LogInformation("Daily report generated successfully");
    }
}
```

## Practical Example: Daily Data Sync

Here is a complete, production-ready timer function that syncs data from an external API every day.

```csharp
public class DailyDataSync
{
    private readonly ILogger<DailyDataSync> _logger;
    private readonly HttpClient _httpClient;
    private readonly IDataRepository _repository;

    public DailyDataSync(
        ILogger<DailyDataSync> logger,
        IHttpClientFactory httpClientFactory,
        IDataRepository repository)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("ExternalApi");
        _repository = repository;
    }

    // Run daily at 2:00 AM UTC - chosen to avoid peak hours
    [Function("DailyDataSync")]
    [ExponentialBackoffRetry(3, "00:00:30", "00:10:00")]
    public async Task Run([TimerTrigger("0 0 2 * * *")] TimerInfo timerInfo)
    {
        var syncId = Guid.NewGuid().ToString()[..8];
        _logger.LogInformation("Starting daily sync [{SyncId}]", syncId);

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            // Fetch data from the external API with pagination
            int page = 1;
            int totalRecords = 0;

            while (true)
            {
                var response = await _httpClient.GetAsync($"/api/data?page={page}&size=1000");
                response.EnsureSuccessStatusCode();

                var data = await response.Content.ReadFromJsonAsync<DataPage>();

                if (data.Records.Count == 0)
                    break;

                // Upsert the records into our database
                await _repository.BulkUpsertAsync(data.Records);
                totalRecords += data.Records.Count;
                page++;

                _logger.LogInformation(
                    "[{SyncId}] Synced page {Page} ({Count} records so far)",
                    syncId, page - 1, totalRecords);
            }

            stopwatch.Stop();
            _logger.LogInformation(
                "[{SyncId}] Daily sync completed: {Count} records in {Duration}s",
                syncId, totalRecords, stopwatch.Elapsed.TotalSeconds);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex,
                "[{SyncId}] Daily sync failed after {Duration}s",
                syncId, stopwatch.Elapsed.TotalSeconds);
            throw; // Re-throw to trigger the retry policy
        }
    }
}
```

## Making Schedules Configurable

Hard-coding CRON expressions is fine for development, but in production you often want to adjust schedules without redeploying. Use an app setting reference.

```csharp
// Reference an app setting for the schedule
// The % symbols tell the runtime to look up the value from configuration
[Function("ConfigurableSchedule")]
public void Run([TimerTrigger("%SyncSchedule%")] TimerInfo timerInfo)
{
    _logger.LogInformation("Configurable timer fired");
}
```

Then set the app setting.

```bash
# Set the schedule via app settings - can be changed without redeployment
az functionapp config appsettings set \
  --name my-function-app \
  --resource-group my-resource-group \
  --settings "SyncSchedule=0 */5 * * * *"
```

## Monitoring and Alerting

Set up alerts for your timer functions to catch failures early. A timer function that silently fails can go unnoticed for days.

```bash
# Create an alert rule that fires when the function fails
az monitor metrics alert create \
  --name "DailySync-Failures" \
  --resource-group my-resource-group \
  --scopes /subscriptions/<SUB>/resourceGroups/<RG>/providers/Microsoft.Web/sites/<APP> \
  --condition "count requests/failed > 0" \
  --window-size 1h \
  --evaluation-frequency 15m \
  --action-group my-alert-group
```

## Summary

Timer triggers are the serverless equivalent of cron jobs. They are simpler to set up, automatically managed by the platform, and integrate well with Azure monitoring. Use six-field CRON expressions to define your schedule, configure timezone settings if you need local time scheduling, use distributed locks if your task must not run concurrently across instances, and always monitor for failures. For most scheduled task scenarios, timer triggers are the simplest and most cost-effective option in the Azure ecosystem.
