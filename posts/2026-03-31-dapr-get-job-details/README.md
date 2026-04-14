# How to Get Job Details Using Dapr Jobs API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Scheduling, API, Microservice

Description: Learn how to retrieve job details using the Dapr Jobs API, including job metadata, schedule, and execution status from your microservices.

---

The Dapr Jobs API lets you create, manage, and inspect scheduled jobs within your distributed applications. Retrieving job details is essential for monitoring scheduled tasks, debugging execution problems, and building operational dashboards.

## Prerequisites

Before using the Jobs API, ensure Dapr is initialized and the Scheduler service is running:

```bash
dapr init
dapr status
```

The Scheduler service must be healthy. You can check:

```bash
dapr status -k  # for Kubernetes
```

## Creating a Sample Job

First, create a job to inspect later:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/my-report-job \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 1h",
    "repeats": 10,
    "data": "generate-report"
  }'
```

## Getting Job Details via HTTP API

To retrieve the details of a specific job, send a GET request to the Jobs API endpoint:

```bash
curl http://localhost:3500/v1.0-alpha1/jobs/my-report-job
```

The response contains the full job definition:

```json
{
  "name": "my-report-job",
  "schedule": "@every 1h",
  "repeats": 10,
  "data": "generate-report"
}
```

## Getting Job Details via Dapr SDK

Using the Go SDK, you can programmatically fetch job details:

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    job, err := client.GetJobAlpha1(context.Background(), "my-report-job")
    if err != nil {
        log.Fatalf("Failed to get job: %v", err)
    }

    fmt.Printf("Job Name: %s\n", job.Name)
    fmt.Printf("Schedule: %s\n", *job.Schedule)
    fmt.Printf("Repeats: %d\n", *job.Repeats)
}
```

Using the Python SDK:

```python
from dapr.clients import DaprClient

def get_job():
    with DaprClient() as client:
        job = client.get_job_alpha1("my-report-job")
        print(f"Job Name: {job.name}")
        print(f"Schedule: {job.schedule}")
        print(f"Remaining Repeats: {job.repeats}")

get_job()
```

## Handling Job Not Found

When a job does not exist, the API returns a 500 error. Handle this gracefully:

```bash
curl -v http://localhost:3500/v1.0-alpha1/jobs/nonexistent-job
# HTTP/1.1 500 Internal Server Error
```

In Go:

```go
job, err := client.GetJobAlpha1(ctx, "nonexistent-job")
if err != nil {
    if strings.Contains(err.Error(), "not found") {
        fmt.Println("Job does not exist")
        return
    }
    log.Fatalf("Unexpected error: %v", err)
}
```

## Listing All Jobs

The Jobs API currently supports individual job retrieval. To track all jobs, maintain a registry in your application state or use the Dapr state API to store job names during creation:

```bash
# Store job name in state after creation
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "job-registry", "value": ["my-report-job", "cleanup-job"]}]'
```

## Summary

The Dapr Jobs API provides a straightforward HTTP and SDK interface to retrieve job definitions, schedules, and repeat counts. Pairing job retrieval with state management helps build operational dashboards for monitoring all scheduled tasks in your application.
