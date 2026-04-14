# How to Configure Dapr Scheduler Jobs Persistence in Self-Hosted Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Job, Self-Hosted, Persistence

Description: Configure persistent storage for Dapr Scheduler jobs in self-hosted mode so scheduled tasks survive restarts and process failures.

---

## Overview

The Dapr Scheduler service manages job scheduling for the Jobs API. In self-hosted mode, the scheduler uses an embedded etcd instance with a default data directory of `./data` (relative to the working directory). Configuring an explicit, absolute data directory ensures your scheduled jobs are stored in a predictable location and survive process restarts reliably.

## Prerequisites

- Dapr CLI v1.14+
- Dapr initialized in self-hosted mode
- Embedded etcd (included with Dapr by default)

## Step 1: Understand Scheduler Storage

The Dapr Scheduler uses an embedded `etcd` instance for storage in both Kubernetes and self-hosted mode. In self-hosted mode, the default data directory is `./data` (relative to the working directory), which can be unreliable. You should configure an explicit, absolute path for the data directory.

Check the scheduler binary location:

```bash
dapr status
ls ~/.dapr/bin/
# daprd  scheduler  placement
```

## Step 2: Start the Scheduler with Persistence

Run the scheduler with a persistent data directory:

```bash
~/.dapr/bin/scheduler \
  --port 50006 \
  --etcd-data-dir ~/.dapr/scheduler-data \
  --log-level info &
```

Create the data directory first:

```bash
mkdir -p ~/.dapr/scheduler-data
```

## Step 3: Run Dapr Apps Pointing to the Scheduler

```bash
dapr run --app-id job-worker \
  --app-port 8080 \
  --scheduler-host-address localhost:50006 \
  python3 worker.py
```

## Step 4: Schedule a Persistent Job

```python
import requests
import json

# Schedule a job via Dapr HTTP API
job = {
    "schedule": "@every 5m",
    "data": {
        "value": "process-batch"
    }
}

response = requests.post(
    'http://localhost:3500/v1.0-alpha1/jobs/batch-processor',
    headers={'Content-Type': 'application/json'},
    data=json.dumps(job)
)
print(response.status_code)
```

## Step 5: Handle Job Callbacks

```python
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/job/batch-processor', methods=['POST'])
def handle_job():
    data = request.get_json()
    print(f"Processing job: {data}")
    return jsonify(success=True), 200

app.run(port=8080)
```

## Step 6: Verify Persistence After Restart

```bash
# List scheduled jobs
curl http://localhost:3500/v1.0-alpha1/jobs/batch-processor

# Stop and restart scheduler
kill $(pgrep -f scheduler)
~/.dapr/bin/scheduler --port 50006 --etcd-data-dir ~/.dapr/scheduler-data &

# Jobs should still be present
curl http://localhost:3500/v1.0-alpha1/jobs/batch-processor
```

## Summary

Configuring Dapr Scheduler with an explicit data directory ensures your scheduled jobs are stored in a predictable location and are not lost when the process restarts. By specifying `--etcd-data-dir` with an absolute path when launching the scheduler and pointing apps to the scheduler address, you get reliable job persistence in self-hosted mode. This is critical for production-like local development and testing scenarios.
