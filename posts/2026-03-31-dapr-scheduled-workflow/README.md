# How to Implement Scheduled Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Scheduler, Cron, Job

Description: Learn how to implement scheduled workflows with Dapr Jobs API to run recurring and time-based business processes without external cron infrastructure.

---

## Scheduled Workflows vs. Cron Jobs

A traditional cron job fires and forgets. If the process crashes mid-run, no retry happens and state is lost. Dapr's approach to scheduling combines the Dapr Jobs API (for triggering) with Dapr Workflow (for durable execution), giving you the best of both worlds.

## Defining the Workflow

```csharp
public class DailyReportWorkflow : Workflow<ReportInput, ReportResult>
{
    public override async Task<ReportResult> RunAsync(
        WorkflowContext context, ReportInput input)
    {
        // Gather data
        var salesData = await context.CallActivityAsync<SalesData>(
            nameof(FetchSalesDataActivity),
            new DateRange(input.Date.AddDays(-1), input.Date));

        var inventoryData = await context.CallActivityAsync<InventoryData>(
            nameof(FetchInventoryDataActivity), input.Date);

        // Generate report
        var report = await context.CallActivityAsync<Report>(
            nameof(GenerateReportActivity),
            new ReportInputData(salesData, inventoryData));

        // Distribute
        await context.CallActivityAsync(
            nameof(EmailReportActivity), report);

        await context.CallActivityAsync(
            nameof(ArchiveReportActivity), report);

        return new ReportResult
        {
            ReportId = report.Id,
            GeneratedAt = context.CurrentUtcDateTime
        };
    }
}
```

## Registering a Scheduled Job

Use the Dapr Jobs API (currently in alpha) to schedule workflow execution. The sidecar fires an HTTP callback to your service when the job triggers. Schedule a job by POSTing to the sidecar's Jobs endpoint:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-report-job \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 6 * * *",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"reportType\":\"daily\"}"
    }
  }'
```

Dapr's schedule uses a six-field cron format (`second minute hour day month weekday`), so `0 0 6 * * *` means every day at 06:00. You can also use shortcuts like `@daily`, `@hourly`, or `@every 1h30m`. Omit `repeats` to run forever, or set a positive integer to cap the number of triggers.

## Handling the Job Trigger Endpoint

```csharp
[HttpPost("/job/daily-report-job")]
public async Task<IActionResult> TriggerDailyReport([FromBody] JobPayload payload)
{
    var instanceId = $"daily-report-{DateTime.UtcNow:yyyyMMdd}";

    // Check if already running (idempotency guard)
    var existing = await _workflowClient.GetWorkflowStateAsync(instanceId);

    if (existing?.IsWorkflowRunning ?? false)
        return Conflict(new { message = "Report already in progress" });

    await _workflowClient.ScheduleNewWorkflowAsync(
        name: nameof(DailyReportWorkflow),
        instanceId: instanceId,
        input: new ReportInput { Date = DateTime.UtcNow.Date });

    return Accepted(new { instanceId });
}
```

Dapr delivers job triggers to your app at `POST /job/<jobName>`, so the route name must match the job you registered.

## Scheduling a One-Time Future Job

For one-time scheduled tasks, use `dueTime` (RFC3339 timestamp or Go duration) instead of `schedule`:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/end-of-quarter-close \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "2026-03-31T23:59:00Z",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"period\":\"Q1-2026\"}"
    }
  }'
```

## Inspecting and Deleting Jobs

The sidecar exposes GET and DELETE on the same path:

```bash
# Get a job's definition
curl http://localhost:3500/v1.0-alpha1/jobs/daily-report-job

# Delete a job
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/daily-report-job
```

To list jobs persisted in the scheduler service, use the Dapr CLI:

```bash
dapr scheduler list
```

## Summary

Dapr's scheduled workflow pattern combines the Jobs API for reliable triggering with Dapr Workflow for durable, retryable execution. Unlike plain cron jobs, this approach survives process crashes and provides observability through Dapr's workflow state API. Use idempotency guards in your trigger endpoint to prevent duplicate workflow instances when jobs fire more than once.
