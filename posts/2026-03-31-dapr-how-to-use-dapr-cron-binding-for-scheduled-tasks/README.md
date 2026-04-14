# How to Use Dapr Cron Binding for Scheduled Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cron, Binding, Scheduled Task, Microservice

Description: Learn how to use the Dapr Cron input binding to schedule recurring tasks in your microservices without managing cron infrastructure yourself.

---

## What Is the Dapr Cron Binding

The Dapr Cron binding is an input binding that triggers your application on a schedule you define using cron expressions. Instead of bundling a cron scheduler into your service or deploying a separate job runner, Dapr handles the scheduling and invokes your application's endpoint at the right time.

This is useful for periodic data cleanup, report generation, health checks, and any other recurring background work.

## Prerequisites

- Dapr CLI installed and initialized
- A running application (Node.js, Python, Go, .NET, or any HTTP-capable service)
- Basic familiarity with Dapr components

## Define the Cron Binding Component

Create a component YAML file that configures the schedule:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: scheduled-task
  namespace: default
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 30s"
```

The `schedule` field accepts standard cron expressions as well as shorthand like `@every 30s`, `@daily`, or `@hourly`.

Common schedule formats:

```text
@every 10s         - every 10 seconds
@every 5m          - every 5 minutes
@hourly            - once per hour
@daily             - once per day (midnight)
0 30 * * * *       - at minute 30 of every hour
0 0 9 * * MON-FRI  - 9am on weekdays
```

## Handle the Cron Trigger in Your Application

Dapr calls your app via HTTP POST to an endpoint named after the binding. If your component is named `scheduled-task`, Dapr sends a POST request to `/scheduled-task`.

Here is a Node.js Express example:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/scheduled-task', async (req, res) => {
  console.log('Cron triggered at:', new Date().toISOString());

  try {
    await runScheduledJob();
    res.status(200).send('OK');
  } catch (err) {
    console.error('Job failed:', err);
    res.status(500).send('Error');
  }
});

async function runScheduledJob() {
  // Your periodic work here
  console.log('Running scheduled cleanup...');
  // e.g., delete old records, send summary emails, etc.
}

app.listen(3000, () => console.log('Listening on port 3000'));
```

And a Python FastAPI equivalent:

```python
from fastapi import FastAPI, Response
from datetime import datetime, timezone

app = FastAPI()

@app.post("/scheduled-task")
async def handle_cron():
    print(f"Cron triggered at: {datetime.now(timezone.utc).isoformat()}")
    try:
        await run_scheduled_job()
        return Response(status_code=200)
    except Exception as e:
        print(f"Job failed: {e}")
        return Response(status_code=500)

async def run_scheduled_job():
    print("Running scheduled job...")
    # periodic logic here
```

## Run the Application with Dapr

Use the Dapr CLI to run your app with the component loaded:

```bash
dapr run \
  --app-id my-scheduler \
  --app-port 3000 \
  --resources-path ./components \
  node app.js
```

Make sure your component YAML is in the `./components` directory. Dapr will discover it automatically and start calling your endpoint on schedule.

## Deploy on Kubernetes

On Kubernetes, store the component in your cluster:

```bash
kubectl apply -f cron-binding.yaml
```

Annotate your deployment to enable Dapr sidecar injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-scheduler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-scheduler
  template:
    metadata:
      labels:
        app: my-scheduler
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-scheduler"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: app
        image: my-scheduler:latest
        ports:
        - containerPort: 3000
```

## Handle Idempotency

Since Dapr may deliver triggers more than once in edge cases (e.g., sidecar restarts), make your handlers idempotent:

```javascript
const processedJobs = new Set();

app.post('/scheduled-task', async (req, res) => {
  const jobKey = `job-${Math.floor(Date.now() / 30000)}`; // bucket by 30s window
  if (processedJobs.has(jobKey)) {
    console.log('Duplicate trigger ignored:', jobKey);
    return res.status(200).send('Already processed');
  }
  processedJobs.add(jobKey);
  await runScheduledJob();
  res.status(200).send('OK');
});
```

## Summary

The Dapr Cron binding provides a simple, infrastructure-agnostic way to run scheduled tasks in microservices by triggering your HTTP endpoint on a configurable schedule. You define a component YAML with a cron expression, implement an HTTP handler in your service, and Dapr handles the rest - no need to embed cron libraries or manage job schedulers separately. This approach works identically in self-hosted and Kubernetes environments.
