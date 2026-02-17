# How to Debug Cloud Run Container Startup Failures Using Cloud Logging Structured Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Cloud Logging, Debugging, Container Startup, Google Cloud

Description: Learn how to use Cloud Logging structured queries to diagnose and fix Cloud Run container startup failures, from missing dependencies to port binding issues.

---

Your Cloud Run deployment finished successfully, but the service is not working. Requests return 503 errors, the revision shows "failed to start," and you are staring at a container that works fine locally but refuses to start in Cloud Run. This is one of the most common and frustrating issues with Cloud Run.

The good news is that Cloud Logging captures detailed information about startup failures. The trick is knowing how to query for it. This guide covers the structured queries that surface the actual error, common startup failure patterns, and how to fix each one.

## Why Containers Fail to Start on Cloud Run

Before we get into debugging, here are the most common reasons a container fails to start:

1. **The container does not listen on the expected port** - Cloud Run sends traffic to $PORT (default 8080)
2. **Missing environment variables** - Your app crashes because a required config value is not set
3. **Missing dependencies** - A library or file is not in the container image
4. **Out of memory** - The container exceeds its memory limit during initialization
5. **Startup timeout** - The container takes too long to start
6. **Permission errors** - The process cannot read files or bind to ports
7. **Binary incompatibility** - The binary was built for a different architecture

## Basic Startup Failure Query

Start with this query to see all startup-related logs for your service:

```
resource.type = "cloud_run_revision"
resource.labels.service_name = "my-service"
severity >= ERROR
timestamp >= "2026-02-17T00:00:00Z"
```

Run it with gcloud:

```bash
# Query for startup errors in the last hour
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND severity>=ERROR
  AND timestamp>="2026-02-17T00:00:00Z"
' --limit=20 --format="table(timestamp, textPayload, jsonPayload.message)"
```

## Specific Startup Failure Queries

### Port Binding Failures

The most common startup failure. Cloud Run expects your container to listen on the port specified by the PORT environment variable:

```bash
# Look for port-related startup failures
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND (textPayload:"failed to start" OR textPayload:"port" OR textPayload:"EADDRINUSE" OR textPayload:"bind")
  AND severity>=WARNING
' --limit=10 --format="json"
```

Common error messages:
- "Container failed to start. Failed to start and then listen on the port defined by the PORT environment variable."
- "Container called exit(1)"

The fix is to make sure your application reads the PORT environment variable:

```python
# Correct: read PORT from environment
import os
port = int(os.environ.get("PORT", 8080))
app.run(host="0.0.0.0", port=port)
```

```javascript
// Correct: read PORT from environment in Node.js
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on port ${port}`);
});
```

### Out of Memory Failures

When your container exceeds its memory limit during startup, Cloud Run kills it:

```bash
# Query for OOM (out of memory) kills
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND (textPayload:"memory" OR textPayload:"OOM" OR textPayload:"killed" OR jsonPayload.message:"memory limit")
' --limit=10 --format="table(timestamp, textPayload)"
```

If you see OOM errors, increase the memory allocation:

```bash
# Increase memory to 1 GiB
gcloud run services update my-service \
  --region=us-central1 \
  --memory=1Gi
```

### Crash During Initialization

If your application crashes during startup (uncaught exception, missing config, etc.), look for exit codes:

```bash
# Query for container exit events
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND (textPayload:"exit" OR textPayload:"crash" OR textPayload:"terminated" OR textPayload:"error")
  AND severity>=ERROR
' --limit=20 --format="table(timestamp, textPayload)"
```

### Dependency and Import Errors

Python, Node.js, and other runtimes often fail during module imports:

```bash
# Look for import/module errors
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND (textPayload:"ModuleNotFoundError" OR textPayload:"ImportError" OR textPayload:"Cannot find module" OR textPayload:"no such file")
' --limit=10 --format="table(timestamp, textPayload)"
```

### Startup Timeout

If your container takes too long to start listening on the port:

```bash
# Query for timeout-related failures
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND (textPayload:"timeout" OR textPayload:"deadline" OR textPayload:"failed to start")
' --limit=10 --format="table(timestamp, textPayload)"
```

Increase the startup timeout if your app needs more time to initialize:

```bash
# Increase startup CPU boost and configure startup probe timeout
gcloud run services update my-service \
  --region=us-central1 \
  --startup-cpu-boost
```

## Using the Log Explorer for Advanced Debugging

The gcloud CLI is good for quick checks, but the Log Explorer in the Cloud Console provides more powerful filtering. Here are some useful structured queries to paste into the Log Explorer:

### All Logs from a Specific Revision

```
resource.type = "cloud_run_revision"
resource.labels.service_name = "my-service"
resource.labels.revision_name = "my-service-00005-abc"
```

### System Logs (from Cloud Run platform, not your app)

```
resource.type = "cloud_run_revision"
resource.labels.service_name = "my-service"
logName = "projects/MY_PROJECT/logs/run.googleapis.com%2Frequests"
httpRequest.status >= 500
```

### Combining Application and System Logs

```
resource.type = "cloud_run_revision"
resource.labels.service_name = "my-service"
(severity >= ERROR OR httpRequest.status >= 500)
timestamp >= "2026-02-17T10:00:00Z"
timestamp <= "2026-02-17T11:00:00Z"
```

## Structured Logging for Better Debugging

If your application writes structured JSON logs, you get much better querying capability. Here is how to set up structured logging:

```python
# structured_logging.py - JSON logging for Cloud Run
import json
import sys
import os

def log(severity, message, **kwargs):
    """Write a structured log entry that Cloud Logging can parse."""
    entry = {
        "severity": severity,
        "message": message,
        # Include trace context if available
        "logging.googleapis.com/trace": os.environ.get("TRACE_CONTEXT", ""),
    }
    entry.update(kwargs)
    print(json.dumps(entry), file=sys.stderr)

# Usage during startup
log("INFO", "Starting application", version="1.2.3")
log("INFO", "Connecting to database", host="10.0.0.5", port=5432)
log("ERROR", "Failed to connect to database", error="connection refused", retries=3)
```

Then query for specific fields:

```bash
# Query structured logs for database connection errors during startup
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND jsonPayload.message:"database"
  AND severity="ERROR"
' --limit=10 --format="json"
```

## Step-by-Step Debugging Workflow

When a container fails to start, follow this sequence:

**1. Check the revision status:**

```bash
# List recent revisions and their status
gcloud run revisions list --service=my-service \
  --region=us-central1 \
  --format="table(name, status.conditions[0].type, status.conditions[0].status, status.conditions[0].message)"
```

**2. Get the specific error from system logs:**

```bash
# System-level error for the failing revision
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND resource.labels.revision_name="FAILING_REVISION_NAME"
  AND severity>=ERROR
' --limit=5 --format="json"
```

**3. Check application stdout/stderr:**

```bash
# Application output during startup
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND resource.labels.revision_name="FAILING_REVISION_NAME"
  AND (logName:"stdout" OR logName:"stderr")
' --limit=30 --format="table(timestamp, textPayload)"
```

**4. If still unclear, test locally with the same environment:**

```bash
# Run the container locally with the same PORT env var
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e DATABASE_URL="your-connection-string" \
  us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:latest
```

## Common Fixes

| Error | Fix |
|-------|-----|
| "Failed to start and then listen on the port" | Read PORT env var, bind to 0.0.0.0 |
| Container exit code 137 | Increase memory allocation |
| Container exit code 1 | Check application logs for exceptions |
| "exec format error" | Build for linux/amd64 architecture |
| Module/import not found | Check Dockerfile installs all dependencies |
| Connection refused to database | Check VPC connector or direct VPC egress setup |

## Summary

Cloud Logging is your primary tool for debugging Cloud Run startup failures. Start with broad severity-based queries to find the error, then narrow down with specific log fields. Use structured JSON logging in your application for better queryability. Most startup failures fall into a handful of categories: wrong port, missing dependencies, out of memory, or timeout. The structured queries in this guide will help you identify the root cause quickly instead of guessing.
