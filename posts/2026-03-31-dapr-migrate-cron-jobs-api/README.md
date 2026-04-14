# How to Migrate from Cron Jobs to Dapr Jobs API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Jobs API, Cron, Scheduler, Migration

Description: Learn how to replace Kubernetes CronJobs and system cron with the Dapr Jobs API to gain durable scheduling, observability, and retry support.

---

## Limitations of Traditional Cron

Kubernetes CronJobs and system cron share the same problem: fire-and-forget execution. If the job pod crashes at step 3, there is no automatic resume. There is no built-in observability, no retry policy, and no way to parameterize individual runs. The Dapr Jobs API addresses all of these.

## Before: Kubernetes CronJob

```yaml
# k8s/report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
spec:
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reporter
            image: myapp/reporter:latest
            command: ["node", "generate-report.js"]
            env:
            - name: DB_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
          restartPolicy: OnFailure
```

```javascript
// generate-report.js - standalone script
const db = require('./db');
const mailer = require('./mailer');

async function main() {
  const data = await db.query('SELECT ...');
  const report = buildReport(data);
  await mailer.send('team@company.com', report);
  console.log('Report sent');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

## After: Dapr Jobs API

Remove the CronJob manifest. Register the job via the Dapr HTTP API:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 6 * * *",
    "data": {
      "reportType": "daily",
      "recipients": ["team@company.com"]
    }
  }'
```

Note: Dapr uses six-field cron expressions where the first field is seconds. The expression `0 0 6 * * *` means every day at 06:00:00.

Handle the job trigger in your long-running service:

```javascript
// server.js - Express endpoint triggered by Dapr Jobs
const express = require('express');
const app = express();
app.use(express.json());

app.post('/job/daily-report', async (req, res) => {
  const payload = req.body;
  console.log('Job triggered:', payload);

  try {
    const db = require('./db');
    const mailer = require('./mailer');

    const data = await db.query('SELECT ...');
    const report = buildReport(data);
    await mailer.send(payload.recipients, report);

    res.sendStatus(200);
  } catch (err) {
    console.error('Job failed:', err);
    res.sendStatus(500); // Dapr will retry
  }
});

app.listen(3000);
```

## One-Time Scheduled Jobs

```bash
# Run once at a specific time
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/end-of-year-close \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "2026-12-31T23:59:00Z",
    "data": {
      "period": "FY2026"
    }
  }'
```

## Managing Jobs

```bash
# Get job details
curl -X GET http://localhost:3500/v1.0-alpha1/jobs/daily-report

# Delete a job
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/daily-report
```

## Combining with Dapr Workflow for Durability

For jobs that need checkpointing, start a Dapr Workflow from the job handler:

```javascript
const { DaprClient } = require('@dapr/dapr');
const daprClient = new DaprClient();

app.post('/job/daily-report', async (req, res) => {
  const instanceId = `report-${new Date().toISOString().slice(0,10)}`;

  await daprClient.workflow.start('DailyReportWorkflow', req.body, instanceId);

  res.sendStatus(202);
});
```

## Summary

Migrating from Kubernetes CronJobs to the Dapr Jobs API moves scheduling out of Kubernetes manifests and into Dapr's management plane. Your long-running service handles job triggers via HTTP endpoints, gaining retry-on-failure and observability without running ephemeral pods. Combine with Dapr Workflow for jobs that need durable multi-step execution.
