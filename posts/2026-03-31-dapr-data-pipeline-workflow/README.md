# How to Implement Data Pipeline Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Data Pipeline, ETL, Orchestration

Description: Learn how to build reliable data pipeline workflows with Dapr that extract, transform, and load data with built-in retries, checkpointing, and fan-out.

---

## Why Use Dapr Workflow for Data Pipelines?

Traditional ETL scripts break silently. A network error at step 7 of 10 means restarting from scratch unless you hand-code checkpointing. Dapr Workflow provides durable execution - each step is checkpointed automatically, so retries resume from the last successful step rather than the beginning.

## Basic ETL Workflow

```csharp
[Workflow]
public class SalesEtlWorkflow : Workflow<EtlInput, EtlResult>
{
    public override async Task<EtlResult> RunAsync(
        WorkflowContext context, EtlInput input)
    {
        // Extract
        var rawData = await context.CallActivityAsync<RawSalesData>(
            nameof(ExtractFromSourceActivity),
            new ExtractParams
            {
                SourceTable = "raw_sales",
                StartDate   = input.StartDate,
                EndDate     = input.EndDate
            });

        // Transform
        var transformedData = await context.CallActivityAsync<TransformedData>(
            nameof(TransformSalesDataActivity), rawData);

        // Validate
        var validationResult = await context.CallActivityAsync<ValidationReport>(
            nameof(ValidateDataActivity), transformedData);

        if (!validationResult.Passed)
        {
            await context.CallActivityAsync(
                nameof(NotifyDataQualityTeamActivity), validationResult);
            return new EtlResult { Status = "Failed", Report = validationResult };
        }

        // Load
        var loadResult = await context.CallActivityAsync<LoadResult>(
            nameof(LoadToWarehouseActivity), transformedData);

        return new EtlResult
        {
            Status         = "Completed",
            RowsProcessed  = loadResult.RowCount,
            CompletedAt    = context.CurrentUtcDateTime
        };
    }
}
```

## Fan-Out for Parallel Processing

When processing large datasets, fan out across chunks using `Task.WhenAll`:

```csharp
[Workflow]
public class BatchProcessingWorkflow : Workflow<BatchInput, BatchResult>
{
    public override async Task<BatchResult> RunAsync(
        WorkflowContext context, BatchInput input)
    {
        // Split dataset into chunks
        var chunks = await context.CallActivityAsync<List<DataChunk>>(
            nameof(SplitIntoChunksActivity),
            new SplitParams { BatchId = input.BatchId, ChunkSize = 10000 });

        // Process all chunks in parallel
        var processTasks = chunks.Select(chunk =>
            context.CallActivityAsync<ChunkResult>(
                nameof(ProcessChunkActivity), chunk));

        var chunkResults = await Task.WhenAll(processTasks);

        // Merge results
        var merged = await context.CallActivityAsync<MergeResult>(
            nameof(MergeChunkResultsActivity),
            chunkResults.ToList());

        return new BatchResult
        {
            TotalRows      = merged.RowCount,
            ErrorRows      = merged.ErrorCount,
            CompletedAt    = context.CurrentUtcDateTime
        };
    }
}
```

## Activity Implementations

```csharp
[WorkflowActivity]
public class ExtractFromSourceActivity : WorkflowActivity<ExtractParams, RawSalesData>
{
    private readonly IDbConnection _db;

    public ExtractFromSourceActivity(IDbConnection db) => _db = db;

    public override async Task<RawSalesData> RunAsync(
        WorkflowActivityContext context, ExtractParams input)
    {
        var rows = await _db.QueryAsync<SaleRow>(
            "SELECT * FROM raw_sales WHERE sale_date BETWEEN @Start AND @End",
            new { Start = input.StartDate, End = input.EndDate });

        return new RawSalesData { Rows = rows.ToList() };
    }
}
```

## Connecting to Dapr Output Binding for the Load Step

```csharp
[WorkflowActivity]
public class LoadToWarehouseActivity : WorkflowActivity<TransformedData, LoadResult>
{
    private readonly DaprClient _daprClient;

    public LoadToWarehouseActivity(DaprClient daprClient) => _daprClient = daprClient;

    public override async Task<LoadResult> RunAsync(
        WorkflowActivityContext context, TransformedData data)
    {
        await _daprClient.InvokeBindingAsync(
            bindingName: "warehouse-db",
            operation: "exec",
            data: data.ToInsertPayload());

        return new LoadResult { RowCount = data.Rows.Count };
    }
}
```

## Summary

Dapr Workflow turns brittle ETL scripts into durable, observable pipelines. Each extraction, transformation, and load step is an activity that checkpoints progress automatically. Fan-out patterns using `Task.WhenAll` parallelize large dataset processing efficiently. Failures at any step result in targeted retries rather than full pipeline restarts.
