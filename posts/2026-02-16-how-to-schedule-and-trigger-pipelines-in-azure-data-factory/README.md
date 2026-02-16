# How to Schedule and Trigger Pipelines in Azure Data Factory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Data Factory, Pipeline Triggers, Scheduling, Automation, Azure, ETL

Description: Learn the different ways to schedule and trigger pipelines in Azure Data Factory including schedule triggers, tumbling window triggers, and event-based triggers.

---

Building a data pipeline is only half the job. The other half is making sure it runs at the right time, with the right inputs, and in response to the right events. Azure Data Factory offers several trigger types that cover everything from simple cron-style schedules to event-driven execution patterns.

In this post, I will go through each trigger type, explain when to use it, and show you how to configure them both through the UI and JSON definitions.

## Trigger Types Overview

Azure Data Factory supports four types of triggers:

1. **Schedule trigger** - runs pipelines on a wall-clock schedule (every day at midnight, every hour, etc.)
2. **Tumbling window trigger** - runs pipelines for fixed, non-overlapping time intervals with dependency support
3. **Storage event trigger** - runs pipelines when files are created or deleted in blob storage
4. **Custom event trigger** - runs pipelines in response to Azure Event Grid custom events

Each trigger type serves different use cases. Let me break them down.

## Schedule Triggers

Schedule triggers are the most common type. They fire on a recurring schedule defined by a start time, frequency, and interval.

### Creating a Schedule Trigger in ADF Studio

1. Go to **Author** > open your pipeline
2. Click **Add trigger** > **New/Edit**
3. Select **New**
4. Choose type: **Schedule**
5. Configure the recurrence

Here is the JSON definition for a schedule trigger that runs every day at 6 AM UTC.

```json
// Schedule trigger - runs daily at 6 AM UTC
{
  "name": "trg_daily_6am",
  "properties": {
    "type": "ScheduleTrigger",
    "typeProperties": {
      "recurrence": {
        "frequency": "Day",
        "interval": 1,
        "startTime": "2026-02-16T06:00:00Z",
        "timeZone": "UTC",
        // Optional: specify end time
        "endTime": "2027-12-31T23:59:59Z"
      }
    },
    // Associate with one or more pipelines
    "pipelines": [
      {
        "pipelineReference": {
          "referenceName": "pl_daily_etl",
          "type": "PipelineReference"
        },
        // Pass parameters to the pipeline
        "parameters": {
          "runDate": "@trigger().scheduledTime"
        }
      }
    ]
  }
}
```

### Advanced Schedule Patterns

You can create more complex schedules using additional recurrence properties.

```json
// Run every Monday and Wednesday at 8:00 AM and 4:00 PM
{
  "recurrence": {
    "frequency": "Week",
    "interval": 1,
    "startTime": "2026-02-16T08:00:00Z",
    "timeZone": "Eastern Standard Time",
    "schedule": {
      // Specific days of the week
      "weekDays": ["Monday", "Wednesday"],
      // Specific hours
      "hours": [8, 16],
      // Specific minutes
      "minutes": [0]
    }
  }
}
```

```json
// Run on the 1st and 15th of every month at midnight
{
  "recurrence": {
    "frequency": "Month",
    "interval": 1,
    "startTime": "2026-02-01T00:00:00Z",
    "timeZone": "UTC",
    "schedule": {
      "monthDays": [1, 15],
      "hours": [0],
      "minutes": [0]
    }
  }
}
```

### Schedule Trigger Limitations

- A schedule trigger can be associated with multiple pipelines
- Each pipeline can have multiple triggers
- Schedule triggers fire regardless of whether the previous run has completed (no built-in backpressure)
- They do not pass the scheduled window information to the pipeline (for that, use tumbling window triggers)

## Tumbling Window Triggers

Tumbling window triggers are designed for time-series data processing. They divide time into fixed, non-overlapping windows and execute the pipeline once per window. This is useful when you need to process data for specific time ranges.

### Key Features of Tumbling Window Triggers

- Each window has a defined start and end time
- If a window is missed (e.g., ADF was paused), it is automatically backfilled
- You can set dependencies between tumbling window triggers
- Retry policies are built in
- Only one pipeline per trigger

```json
// Tumbling window trigger - process data in hourly windows
{
  "name": "trg_hourly_window",
  "properties": {
    "type": "TumblingWindowTrigger",
    "typeProperties": {
      "frequency": "Hour",
      "interval": 1,
      "startTime": "2026-02-16T00:00:00Z",
      "delay": "00:05:00",
      // Wait 5 minutes after window ends before starting
      // (gives source systems time to finish writing)
      "maxConcurrency": 3,
      // Allow up to 3 windows to process in parallel
      "retryPolicy": {
        "count": 3,
        "intervalInSeconds": 60
      }
    },
    "pipeline": {
      "pipelineReference": {
        "referenceName": "pl_hourly_ingestion",
        "type": "PipelineReference"
      },
      "parameters": {
        // Pass window boundaries to the pipeline
        "windowStart": "@trigger().outputs.windowStartTime",
        "windowEnd": "@trigger().outputs.windowEndTime"
      }
    }
  }
}
```

The ability to pass `windowStartTime` and `windowEndTime` to the pipeline is extremely useful. Your pipeline can use these to query only the data that falls within that specific window, enabling efficient incremental processing.

### Tumbling Window Dependencies

You can create dependencies between tumbling window triggers. This is powerful for building data processing chains where downstream processing should only start after upstream processing completes.

```json
// Dependency configuration - this trigger waits for another to complete
{
  "name": "trg_downstream_window",
  "properties": {
    "type": "TumblingWindowTrigger",
    "typeProperties": {
      "frequency": "Hour",
      "interval": 1,
      "startTime": "2026-02-16T00:00:00Z",
      // Dependency on another tumbling window trigger
      "dependsOn": [
        {
          "type": "TumblingWindowTriggerDependencyReference",
          "referenceTrigger": {
            "referenceName": "trg_hourly_window",
            "type": "TriggerReference"
          },
          // Match on the same window (offset 0, size matches frequency)
          "offset": "00:00:00",
          "size": "01:00:00"
        }
      ]
    }
  }
}
```

## Storage Event Triggers

Storage event triggers fire when a file is created or deleted in Azure Blob Storage or Azure Data Lake Storage Gen2. This is the go-to pattern for event-driven data processing.

```json
// Storage event trigger - fire when new files arrive
{
  "name": "trg_new_file_arrival",
  "properties": {
    "type": "BlobEventsTrigger",
    "typeProperties": {
      // The storage account to monitor
      "scope": "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>",
      "events": ["Microsoft.Storage.BlobCreated"],
      // Filter by container and file pattern
      "blobPathBeginsWith": "/raw-data/blobs/incoming/",
      "blobPathEndsWith": ".csv",
      // Ignore empty blobs
      "ignoreEmptyBlobs": true
    },
    "pipelines": [
      {
        "pipelineReference": {
          "referenceName": "pl_process_new_file",
          "type": "PipelineReference"
        },
        "parameters": {
          // Pass the file path and name to the pipeline
          "fileName": "@triggerBody().fileName",
          "folderPath": "@triggerBody().folderPath"
        }
      }
    ]
  }
}
```

Storage event triggers rely on Azure Event Grid. The first time you create one, ADF will register an Event Grid subscription on your storage account.

### Tips for Storage Event Triggers

- Use the `blobPathBeginsWith` and `blobPathEndsWith` filters to be specific about which files trigger the pipeline
- Set `ignoreEmptyBlobs` to true to avoid triggering on zero-byte marker files
- Be aware of latency: there can be a few seconds between the file arriving and the trigger firing
- If multiple files arrive at once, each file triggers a separate pipeline run (unless you batch them)

## Custom Event Triggers

Custom event triggers respond to Azure Event Grid custom topics. This is useful when the triggering event is not a blob creation but something custom - like a message from another application indicating that data is ready.

```json
// Custom event trigger
{
  "name": "trg_custom_event",
  "properties": {
    "type": "CustomEventsTrigger",
    "typeProperties": {
      // The Event Grid topic to listen to
      "scope": "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.EventGrid/topics/<topic>",
      "events": ["DataReady", "BatchComplete"],
      // Optional: filter on subject pattern
      "subjectBeginsWith": "sales/",
      "subjectEndsWith": ""
    },
    "pipelines": [
      {
        "pipelineReference": {
          "referenceName": "pl_process_event",
          "type": "PipelineReference"
        },
        "parameters": {
          "eventData": "@triggerBody().data"
        }
      }
    ]
  }
}
```

## Manual Execution

You can always run a pipeline manually, which is useful for testing and one-off runs.

```bash
# Trigger a pipeline run manually using Azure CLI
az datafactory pipeline create-run \
  --factory-name "my-data-factory" \
  --resource-group "my-resource-group" \
  --name "pl_daily_etl" \
  --parameters '{"runDate": "2026-02-16"}'
```

## Managing Trigger State

Triggers have two states: **Started** and **Stopped**. A stopped trigger does not fire, even if its schedule or event conditions are met.

```bash
# Start a trigger
az datafactory trigger start \
  --factory-name "my-data-factory" \
  --resource-group "my-resource-group" \
  --name "trg_daily_6am"

# Stop a trigger
az datafactory trigger stop \
  --factory-name "my-data-factory" \
  --resource-group "my-resource-group" \
  --name "trg_daily_6am"
```

Remember: after publishing changes to a trigger, you need to start it for the changes to take effect.

## Choosing the Right Trigger Type

Here is a quick decision guide.

| Scenario | Trigger Type |
|----------|-------------|
| Run at a fixed time every day | Schedule |
| Process data in hourly/daily windows with backfill | Tumbling Window |
| React to new files arriving in storage | Storage Event |
| React to custom application events | Custom Event |
| Dependent processing chains with time windows | Tumbling Window with dependencies |

## Wrapping Up

Azure Data Factory gives you flexible options for automating pipeline execution. Schedule triggers handle the straightforward cron-style patterns. Tumbling window triggers add time-window semantics, backfill support, and dependency chains. Storage event triggers enable event-driven architectures. And custom event triggers let you integrate with any event source through Event Grid. Pick the trigger type that matches your processing pattern, parameterize your pipelines to accept runtime values from the trigger, and you will have a robust, automated data processing system.
