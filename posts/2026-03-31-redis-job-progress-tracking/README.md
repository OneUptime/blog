# How to Implement Job Progress Tracking with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Monitoring

Description: Track long-running job progress in Redis using hashes to store status, percentage, and log messages that clients can poll in real time.

---

Long-running jobs like report generation, bulk imports, or video processing need progress feedback. Without it, users see a spinner and don't know if anything is happening. Redis hashes provide a perfect store for job state - workers write progress updates and clients poll for the current status.

## Job State Data Model

Store job state as a Redis hash with these fields:

```text
job:{job_id}:state -> Hash {
    status:      pending|running|completed|failed
    progress:    0-100
    total:       total items to process
    processed:   items processed so far
    message:     current status message
    created_at:  timestamp
    updated_at:  timestamp
    result:      (on completion) JSON-encoded result
    error:       (on failure) error message
}
```

## Creating a Job with Initial State

```python
import redis
import uuid
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

JOB_TTL = 86400  # Keep job state for 24 hours

def create_job(job_type: str, payload: dict) -> str:
    job_id = str(uuid.uuid4())
    state_key = f"job:{job_id}:state"

    r.hset(state_key, mapping={
        "id": job_id,
        "type": job_type,
        "status": "pending",
        "progress": 0,
        "total": 0,
        "processed": 0,
        "message": "Job queued",
        "created_at": time.time(),
        "updated_at": time.time(),
    })
    r.expire(state_key, JOB_TTL)

    # Enqueue
    r.lpush("queue:jobs", json.dumps({"id": job_id, "type": job_type, "payload": payload}))
    return job_id
```

## Updating Progress from the Worker

```python
def update_progress(job_id: str, processed: int, total: int, message: str = ""):
    state_key = f"job:{job_id}:state"
    progress = int((processed / total) * 100) if total > 0 else 0

    r.hset(state_key, mapping={
        "status": "running",
        "progress": progress,
        "processed": processed,
        "total": total,
        "message": message or f"Processing {processed}/{total}",
        "updated_at": time.time(),
    })
    r.expire(state_key, JOB_TTL)

def complete_job(job_id: str, result: dict):
    r.hset(f"job:{job_id}:state", mapping={
        "status": "completed",
        "progress": 100,
        "message": "Job completed successfully",
        "result": json.dumps(result),
        "completed_at": time.time(),
        "updated_at": time.time(),
    })

def fail_job(job_id: str, error: str):
    r.hset(f"job:{job_id}:state", mapping={
        "status": "failed",
        "message": "Job failed",
        "error": error,
        "failed_at": time.time(),
        "updated_at": time.time(),
    })
```

## Worker Example: Bulk CSV Import

```python
import csv
import io

def process_csv_import(job_id: str, csv_content: str):
    r.hset(f"job:{job_id}:state", "status", "running")
    reader = list(csv.DictReader(io.StringIO(csv_content)))
    total = len(reader)

    for i, row in enumerate(reader, 1):
        import_row_to_db(row)
        if i % 100 == 0:
            update_progress(job_id, i, total, f"Imported {i} of {total} rows")

    complete_job(job_id, {"rows_imported": total})
```

## Polling Endpoint

```python
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/api/jobs/<job_id>/status')
def job_status(job_id):
    state = r.hgetall(f"job:{job_id}:state")
    if not state:
        return jsonify({"error": "Job not found"}), 404

    state['progress'] = int(state.get('progress', 0))
    state['processed'] = int(state.get('processed', 0))
    state['total'] = int(state.get('total', 0))

    if state.get('result'):
        state['result'] = json.loads(state['result'])

    return jsonify(state)
```

## Inspecting Job State

```bash
# Get all state fields for a job
redis-cli HGETALL "job:abc123:state"

# Get just progress
redis-cli HGET "job:abc123:state" "progress"

# Get status and message
redis-cli HMGET "job:abc123:state" status message progress
```

## Summary

Redis hashes provide a lightweight, queryable store for job progress state. Workers call `HSET` to update progress incrementally, and clients poll the status endpoint to display real-time feedback. Setting a TTL on the state key ensures automatic cleanup. This pattern scales to thousands of concurrent jobs without additional infrastructure, making it ideal for bulk processing, import/export, and report generation workflows.
