# How to Use Dapr Jobs for Cron-Like Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Scheduling, Cron, Microservice

Description: Learn how to use Dapr Jobs API for cron-like scheduling, defining recurring tasks with cron expressions and interval-based schedules in microservices.

---

Dapr Jobs provides a built-in scheduling mechanism that supports cron expressions and interval-based schedules. This lets you replace external cron systems with a distributed, persistent scheduling solution that survives pod restarts and scales with your application.

## Understanding Dapr Schedule Formats

Dapr Jobs supports two scheduling formats: standard cron expressions and interval shorthand.

**Cron expressions** (6-field format including seconds):

```text
* * * * * *
| | | | | |
| | | | | day of week (0-6)
| | | | month (1-12)
| | | day of month (1-31)
| | hour (0-23)
| minute (0-59)
second (0-59)
```

**Interval shorthand:**

```text
@every <duration>  # e.g., @every 5m, @every 1h30m
@daily             # once per day at midnight
@weekly            # once per week
@monthly           # once per month
```

## Creating a Cron-Scheduled Job

Schedule a task to run every day at 2:00 AM:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 2 * * *",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "cleanup"
    }
  }'
```

Schedule a job to run every 15 minutes:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/metrics-collector \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 15m",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "collect-metrics"
    }
  }'
```

## Handling Job Triggers

Your service must expose an endpoint that Dapr calls when a job fires. The endpoint path follows the pattern `/job/{job-name}`:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/job/daily-cleanup', (req, res) => {
  const jobData = req.body;
  console.log('Job triggered:', jobData);

  // Execute cleanup logic
  performDatabaseCleanup()
    .then(() => {
      console.log('Cleanup completed successfully');
      res.status(200).send('OK');
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      res.status(500).send('Error');
    });
});

app.post('/job/metrics-collector', (req, res) => {
  collectAndStoreMetrics();
  res.status(200).send('OK');
});

app.listen(6001);
```

## Using the Go SDK for Scheduling

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/grpc"
    "google.golang.org/protobuf/types/known/anypb"
)

func main() {
    // Create scheduled job
    c, _ := dapr.NewClient()
    defer c.Close()

    jobData, _ := json.Marshal(map[string]string{"type": "weekly-report"})

    job := &dapr.Job{
        Name:     "weekly-report",
        Schedule: "@weekly",
        Data:     &anypb.Any{Value: jobData},
    }

    if err := c.ScheduleJobAlpha1(context.Background(), job); err != nil {
        log.Fatal(err)
    }

    // Start service to handle triggers
    s, _ := daprd.NewService(":50001")
    s.AddJobEventHandler("weekly-report", handleWeeklyReport)
    s.Start()
}

func handleWeeklyReport(ctx context.Context, job *common.JobEvent) error {
    log.Printf("Generating weekly report, triggered by job: %s", job.Name)
    return generateReport()
}
```

## Setting Job Expiry with Due Time

Run a job once after a delay, then on a schedule:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/onboarding-followup \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "72h",
    "schedule": "@weekly",
    "repeats": 4,
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "send-followup-email"
    }
  }'
```

## Summary

Dapr Jobs simplifies cron-like scheduling in distributed systems by providing persistent, resilient job scheduling without external cron infrastructure. Using cron expressions or interval shorthand, you can schedule recurring tasks that survive restarts and scale across multiple instances.
