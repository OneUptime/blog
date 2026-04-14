# How to Delete a Scheduled Job in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Delete, Cancel, Scheduling, Management, Lifecycle

Description: Learn how to delete scheduled jobs in Dapr using the HTTP API and SDK, including patterns for job lifecycle management and canceling pending one-time jobs.

---

## Why Delete Scheduled Jobs?

You may need to delete a Dapr job when:
- A one-time job should no longer run (user canceled an action)
- A recurring job is no longer needed (feature decommissioned)
- You are redeploying and want to replace old job configurations
- A user account is deleted and all associated jobs must be cleaned up

## Deleting a Job via HTTP API

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/{job-name}
```

Examples:

```bash
# Delete a one-time job
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/welcome-followup-user123

# Delete a recurring job
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/nightly-report

# Delete with verbose output
curl -v -X DELETE http://localhost:3500/v1.0-alpha1/jobs/my-scheduled-job
```

A successful deletion returns HTTP `204 No Content`. If the job does not exist, the API returns a `500` error.

## Deleting a Job via Python SDK

```python
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError

def delete_job(name: str) -> bool:
    """Delete a scheduled job. Returns True if deleted, False if not found."""
    with DaprClient() as d:
        try:
            d.delete_job_alpha1(name)
            print(f"Job deleted: {name}")
            return True
        except DaprInternalError as e:
            if "not found" in str(e).lower():
                print(f"Job not found (already deleted or never existed): {name}")
                return False
            raise

# Examples
delete_job("nightly-report")
delete_job("welcome-followup-user123")
```

## Deleting a Job via Go SDK

```go
package main

import (
    "context"
    "fmt"
    "log"
    dapr "github.com/dapr/go-sdk/client"
)

func deleteJob(name string) error {
    client, err := dapr.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    return client.DeleteJobAlpha1(context.Background(), name)
}

func main() {
    jobs := []string{
        "nightly-backup",
        "hourly-cache-refresh",
        "welcome-followup-user456",
    }

    for _, jobName := range jobs {
        if err := deleteJob(jobName); err != nil {
            log.Printf("Failed to delete job %s: %v", jobName, err)
        } else {
            fmt.Printf("Deleted job: %s\n", jobName)
        }
    }
}
```

## Job Lifecycle Patterns

### Cancel Before Execution (One-Time Jobs)

```python
def on_user_signup(user_id: str, email: str):
    """Schedule a followup email, store the job name for potential cancellation."""
    job_name = f"followup-{user_id}"
    schedule_one_time_job(job_name, "24h", {"email": email})
    # Store job name in database for later cancellation
    db.execute("UPDATE users SET followup_job = %s WHERE id = %s",
               [job_name, user_id])

def on_user_opt_out(user_id: str):
    """Cancel the followup if user opts out within 24h."""
    row = db.query("SELECT followup_job FROM users WHERE id = %s", user_id)
    if row and row["followup_job"]:
        delete_job(row["followup_job"])
        db.execute("UPDATE users SET followup_job = NULL WHERE id = %s", user_id)
```

### Cleanup Jobs on Account Deletion

```python
def delete_user_account(user_id: str):
    """Delete the user and all their associated scheduled jobs."""
    # Find all jobs associated with this user
    user_jobs = db.query(
        "SELECT job_name FROM user_jobs WHERE user_id = %s",
        user_id
    )

    with DaprClient() as d:
        for row in user_jobs:
            try:
                d.delete_job_alpha1(row["job_name"])
                print(f"Deleted job: {row['job_name']}")
            except Exception as e:
                print(f"Could not delete job {row['job_name']}: {e}")

    # Delete user from database
    db.execute("DELETE FROM users WHERE id = %s", user_id)
    db.execute("DELETE FROM user_jobs WHERE user_id = %s", user_id)
```

### Replace a Recurring Job (Update Schedule)

Dapr Jobs API does not have a dedicated update endpoint. To change a job's schedule, recreate it with the `overwrite` flag set to `True`:

```python
import json
from dapr.clients import DaprClient
from dapr.clients.grpc._helpers import Job
from google.protobuf.any_pb2 import Any as GrpcAny

def update_job_schedule(name: str, new_schedule: str, data: dict):
    """Update a recurring job's schedule by recreating it with overwrite."""
    job_data = GrpcAny()
    job_data.value = json.dumps(data).encode("utf-8")

    job = Job(name=name, schedule=new_schedule, data=job_data)

    with DaprClient() as d:
        d.schedule_job_alpha1(job=job, overwrite=True)
    print(f"Job '{name}' updated to schedule: {new_schedule}")
```

### Graceful Shutdown: Delete All Application Jobs

```python
import atexit

APPLICATION_JOBS = [
    "nightly-db-backup",
    "hourly-metrics-flush",
    "weekly-digest",
]

def cleanup_jobs_on_shutdown():
    """Delete all registered jobs when the application shuts down."""
    print("Cleaning up scheduled jobs...")
    with DaprClient() as d:
        for job_name in APPLICATION_JOBS:
            try:
                d.delete_job_alpha1(job_name)
                print(f"Deleted job on shutdown: {job_name}")
            except Exception as e:
                print(f"Could not delete job {job_name}: {e}")

atexit.register(cleanup_jobs_on_shutdown)
```

## Checking If a Job Exists Before Deleting

```python
def job_exists(name: str) -> bool:
    import requests
    resp = requests.get(f"http://localhost:3500/v1.0-alpha1/jobs/{name}")
    return resp.status_code == 200

def safe_delete_job(name: str):
    if job_exists(name):
        delete_job(name)
        print(f"Job deleted: {name}")
    else:
        print(f"Job does not exist: {name}")
```

## Summary

Deleting Dapr jobs is straightforward with the DELETE API or SDK methods. Key patterns include canceling one-time jobs before they fire (storing job names at creation), cleaning up all user-associated jobs on account deletion, and replacing recurring jobs by deleting and recreating them with the new schedule. Always handle errors gracefully since jobs may have already executed or been deleted.
