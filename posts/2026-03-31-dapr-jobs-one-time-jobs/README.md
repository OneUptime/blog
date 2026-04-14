# How to Create One-Time Jobs with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, One-Time, Scheduling, Delayed Execution, Background Task

Description: Learn how to create one-time delayed jobs with Dapr, scheduling tasks to run once at a specific future time or after a delay without cron or polling.

---

## One-Time Jobs in Dapr

One-time jobs run exactly once at a specified time or after a delay. Unlike recurring jobs, they fire once and do not repeat. Common use cases include:

- Send a follow-up email 24 hours after signup
- Expire a trial account after 30 days
- Schedule a reminder 1 hour before a meeting
- Run a data migration at a specific maintenance window

## Scheduling a One-Time Job via HTTP API

Use `dueTime` for a one-time job:

```bash
# Run once in 24 hours
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/welcome-followup-user123 \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "24h",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "eyJ1c2VySWQiOiAidXNlcjEyMyIsICJ0ZW1wbGF0ZSI6ICJ3ZWxjb21lLWZvbGxvd3VwIn0="
    }
  }'
```

## Due Time Formats

```python
# Relative durations
"30s"      # 30 seconds from now
"5m"       # 5 minutes from now
"2h"       # 2 hours from now
# "7d" is NOT valid — Go durations do not support "d"; use "168h" for 7 days

# RFC3339 timestamps (absolute time)
"2026-04-15T09:00:00Z"    # Specific UTC time
"2026-04-15T09:00:00-05:00"  # With timezone offset
```

## Scheduling One-Time Jobs via Python SDK

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._jobs import Job
from google.protobuf.any_pb2 import Any as ProtobufAny
from google.protobuf.wrappers_pb2 import StringValue
from datetime import datetime, timedelta, timezone
import json, base64

def schedule_one_time_job(name: str, due_time: str, data: dict):
    """Schedule a one-time job to run at due_time."""
    with DaprClient() as d:
        encoded = base64.b64encode(json.dumps(data).encode()).decode()

        string_val = StringValue(value=encoded)
        any_data = ProtobufAny()
        any_data.Pack(string_val)

        job = Job(name=name, due_time=due_time, data=any_data)
        d.schedule_job_alpha1(job)
        print(f"One-time job scheduled: '{name}' | due: {due_time}")

# Follow-up email 24 hours after signup
def on_user_signup(user_id: str, email: str):
    schedule_one_time_job(
        name=f"welcome-followup-{user_id}",
        due_time="24h",
        data={"userId": user_id, "email": email, "template": "welcome-followup"}
    )

# Trial expiry 30 days from now
def start_trial(user_id: str):
    schedule_one_time_job(
        name=f"expire-trial-{user_id}",
        due_time="720h",  # 30 days
        data={"userId": user_id, "action": "expire_trial"}
    )

# Scheduled maintenance window
def schedule_maintenance(maintenance_time: datetime):
    iso_time = maintenance_time.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    schedule_one_time_job(
        name="db-maintenance-migration",
        due_time=iso_time,
        data={"migration": "add-index-on-users", "dbTarget": "production"}
    )

# Example: Schedule for tomorrow at 2am UTC
tomorrow_2am = datetime.now(timezone.utc).replace(
    hour=2, minute=0, second=0, microsecond=0
) + timedelta(days=1)
schedule_maintenance(tomorrow_2am)
```

## Scheduling via Go SDK

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    dapr "github.com/dapr/go-sdk/client"
    "google.golang.org/protobuf/types/known/anypb"
)

func scheduleOneTimeJob(name, dueTime string, data map[string]any) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    jobData, _ := json.Marshal(data)

    return client.ScheduleJobAlpha1(context.Background(), &dapr.Job{
        Name:    name,
        DueTime: &dueTime,
        Data:    &anypb.Any{Value: jobData},
    })
}

func main() {
    // Schedule password reset link expiry
    userID := "usr-456"
    err := scheduleOneTimeJob(
        "expire-reset-token-"+userID,
        "1h",
        map[string]any{"userId": userID, "action": "expire_reset_token"},
    )
    if err != nil {
        log.Fatalf("Failed to schedule job: %v", err)
    }

    log.Printf("Reset token expiry scheduled for user %s in 1 hour", userID)
}
```

## Job Handler for One-Time Jobs

```python
from flask import Flask, request
import json, base64

app = Flask(__name__)

@app.route("/job/welcome-followup-<user_id>", methods=["POST"])
def handle_welcome_followup(user_id: str):
    body = request.get_json() or {}
    data = decode_payload(body)

    send_followup_email(
        user_id=user_id,
        email=data["email"],
        template=data["template"]
    )
    return "", 200

# Or use a generic dispatcher for dynamically named jobs
@app.route("/job/<path:job_name>", methods=["POST"])
def dispatch_job(job_name: str):
    body = request.get_json() or {}
    data = decode_payload(body)

    action = data.get("action")

    if action == "expire_trial":
        expire_user_trial(data["userId"])
    elif action == "expire_reset_token":
        expire_reset_token(data["userId"])
    elif job_name.startswith("welcome-followup-"):
        send_followup_email(data["userId"], data["email"], data["template"])
    else:
        print(f"Unknown job: {job_name}")

    return "", 200

def decode_payload(body: dict) -> dict:
    try:
        value = body.get("data", {}).get("value", "e30=")
        return json.loads(base64.b64decode(value))
    except Exception:
        return {}
```

## Canceling a One-Time Job Before It Fires

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/welcome-followup-user123
```

```python
def cancel_followup(user_id: str):
    """Cancel the followup email if user opts out."""
    with DaprClient() as d:
        d.delete_job_alpha1(name=f"welcome-followup-{user_id}")
    print(f"Cancelled followup for user {user_id}")
```

## Summary

Dapr one-time jobs replace polling loops, cron workarounds, and in-memory timers for delayed task execution. Use `dueTime` with a relative duration or RFC3339 timestamp to schedule tasks to run once in the future. Jobs persist across application restarts, can be canceled before execution, and are delivered reliably via HTTP to your application.
