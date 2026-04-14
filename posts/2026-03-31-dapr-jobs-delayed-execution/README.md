# How to Use Dapr Jobs for Delayed Task Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Scheduling, Delay, Microservice

Description: Learn how to use Dapr Jobs API to schedule tasks for delayed one-time execution, triggering work after a specified time period without polling or sleep loops.

---

Delayed task execution is a common need in distributed systems - sending a welcome email 24 hours after signup, expiring a trial after 14 days, or triggering a reminder after inactivity. Dapr Jobs provides a clean `dueTime` field that handles this without polling loops or complex timer services.

## How dueTime Works

The `dueTime` field specifies when a job should first trigger. It accepts:
- **Duration strings**: `"30s"`, `"5m"`, `"24h"`, `"72h"`
- **RFC3339 timestamps**: `"2026-04-01T09:00:00Z"`

When combined without a `schedule`, the job runs exactly once at the specified time.

## One-Time Delayed Job Example

Schedule a welcome email 24 hours after user registration:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/welcome-email-user123 \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "24h",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"userId\": \"user123\", \"action\": \"send-welcome\"}"
    }
  }'
```

## Using Absolute Timestamps

For precise scheduling at a known future date:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/trial-expiry-user456 \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "2026-04-14T00:00:00Z",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"userId\": \"user456\", \"action\": \"expire-trial\"}"
    }
  }'
```

## Creating Delayed Jobs Programmatically

In Python, dynamically schedule a job when a user signs up:

```python
import json
from datetime import datetime, timedelta, timezone
from dapr.clients import DaprClient
from dapr.clients.grpc._jobs import Job
from google.protobuf.any_pb2 import Any as GrpcAny

def schedule_onboarding_sequence(user_id: str):
    with DaprClient() as client:
        # Schedule welcome email in 1 hour
        welcome_data = GrpcAny(value=json.dumps(
            {"userId": user_id, "action": "welcome"}
        ).encode())
        client.schedule_job_alpha1(
            job=Job(
                name=f"welcome-email-{user_id}",
                due_time="1h",
                data=welcome_data,
            )
        )

        # Schedule follow-up check in 3 days
        followup_time = datetime.now(timezone.utc) + timedelta(days=3)
        followup_data = GrpcAny(value=json.dumps(
            {"userId": user_id, "action": "followup"}
        ).encode())
        client.schedule_job_alpha1(
            job=Job(
                name=f"followup-{user_id}",
                due_time=followup_time.isoformat(),
                data=followup_data,
            )
        )

        print(f"Scheduled onboarding sequence for user {user_id}")
```

## Handling the Triggered Job

Your service handles the job trigger at the `/job/{job-name}` endpoint:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Handle welcome email jobs (dynamic job names use prefix matching)
app.post('/job/:jobName', (req, res) => {
  const { jobName } = req.params;
  const payload = JSON.parse(req.body?.value || '{}');

  if (jobName.startsWith('welcome-email-')) {
    sendWelcomeEmail(payload.userId)
      .then(() => res.status(200).send('OK'))
      .catch(() => res.status(500).send('Error'));
  } else if (jobName.startsWith('trial-expiry-')) {
    expireUserTrial(payload.userId)
      .then(() => res.status(200).send('OK'))
      .catch(() => res.status(500).send('Error'));
  } else {
    res.status(200).send('Unhandled job');
  }
});

app.listen(6001);
```

## Cancelling a Delayed Job

If a user unsubscribes before the delayed job fires, cancel it:

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/welcome-email-user123
```

In Go:

```go
func cancelOnboarding(ctx context.Context, client dapr.Client, userID string) error {
    jobName := fmt.Sprintf("welcome-email-%s", userID)
    return client.DeleteJobAlpha1(ctx, jobName)
}
```

## Summary

Dapr Jobs `dueTime` field provides a reliable, distributed mechanism for delayed task execution without polling or external timer services. Jobs persist through restarts, making them ideal for user lifecycle events, trial expirations, and scheduled notifications in microservice architectures.
