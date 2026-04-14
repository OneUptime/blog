# How to Use Dapr Jobs with .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Job, Scheduler, C#

Description: Schedule and manage Dapr Jobs from .NET applications using the Jobs API for one-time and recurring tasks with persistence and callback handling.

---

## Overview

The Dapr Jobs API (v1.14+) provides a durable scheduler for one-time and recurring jobs. Unlike cron bindings, jobs survive Dapr restarts and can be managed programmatically. The .NET SDK exposes jobs via the `DaprJobsClient`.

## Prerequisites

```bash
dotnet add package Dapr.Jobs
```

Dapr v1.14+ with scheduler service enabled.

## Step 1: Schedule a One-Time Job

```csharp
using Dapr.Jobs;
using Dapr.Jobs.Models;
using System.Text.Json;

public class JobScheduler
{
    private readonly DaprJobsClient _dapr;

    public JobScheduler(DaprJobsClient dapr) => _dapr = dapr;

    public async Task ScheduleOneTimeJob(string jobName, DateTimeOffset runAt, object payload)
    {
        await _dapr.ScheduleJobAsync(
            jobName,
            DaprJobSchedule.FromDateTime(runAt),
            payload: JsonSerializer.SerializeToUtf8Bytes(payload)
        );
        Console.WriteLine($"Job '{jobName}' scheduled for {runAt}");
    }
}
```

## Step 2: Schedule a Recurring Job

```csharp
public async Task ScheduleRecurringJob(string jobName, string schedule)
{
    // Cron expression or @every notation
    await _dapr.ScheduleJobAsync(
        jobName,
        DaprJobSchedule.FromExpression(schedule),  // "@every 10m" or "0 9 * * MON-FRI"
        payload: JsonSerializer.SerializeToUtf8Bytes(new { type = "report-generation" }),
        repeats: 0                                  // 0 = unlimited
    );
}
```

## Step 3: Handle Job Callbacks

Register a handler that Dapr calls when a job triggers:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprJobsClient();

var app = builder.Build();
app.MapDaprScheduledJobHandler(async (string jobName, ReadOnlyMemory<byte> payload) =>
{
    var data = System.Text.Encoding.UTF8.GetString(payload.Span);
    Console.WriteLine($"Job triggered: {jobName}, data: {data}");

    switch (jobName)
    {
        case "daily-report":
            await GenerateDailyReport();
            break;
        case "cleanup":
            await RunCleanup();
            break;
    }
});
app.Run();
```

## Step 4: Get Job Status

```csharp
public async Task<DaprJobDetails> GetJob(string jobName)
{
    var job = await _dapr.GetJobAsync(jobName);
    Console.WriteLine($"Job: {jobName}, Schedule: {job.Schedule}, DueTime: {job.DueTime}");
    return job;
}
```

## Step 5: Delete a Job

```csharp
public async Task CancelJob(string jobName)
{
    await _dapr.DeleteJobAsync(jobName);
    Console.WriteLine($"Job '{jobName}' cancelled");
}
```

## Example: Order Reminder System

```csharp
public class OrderReminderService
{
    private readonly DaprJobsClient _dapr;

    public OrderReminderService(DaprJobsClient dapr) => _dapr = dapr;

    public async Task SchedulePaymentReminder(string orderId, DateTimeOffset dueAt)
    {
        await _dapr.ScheduleJobAsync(
            $"payment-reminder-{orderId}",
            DaprJobSchedule.FromDateTime(dueAt),
            payload: JsonSerializer.SerializeToUtf8Bytes(new { orderId })
        );
    }

    public async Task CancelReminder(string orderId)
    {
        await _dapr.DeleteJobAsync($"payment-reminder-{orderId}");
    }
}
```

## Summary

Dapr Jobs in .NET provide a simple API for scheduling durable, persistent tasks. Jobs are stored in the Dapr Scheduler service and survive restarts, unlike in-memory timers. The `ScheduleJobAsync` method handles both one-time (via `DaprJobSchedule.FromDateTime`) and recurring (via `DaprJobSchedule.FromExpression`) jobs, with callback delivery to your application via the `MapDaprScheduledJobHandler` endpoint when the trigger fires.
