# How to Use Redis for Flask Background Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Flask, Background Task, RQ, Python

Description: Use Redis Queue (RQ) with Flask to run background tasks outside the request cycle without the complexity of a full Celery setup.

---

## Introduction

Redis Queue (RQ) is a lightweight Python library for queuing work and processing it in the background with Redis as the broker. Compared to Celery, RQ is simpler to set up and works well for most Flask applications. This guide shows how to integrate RQ with Flask for background task processing.

## Installation

```bash
pip install flask rq redis
```

## Setting Up Redis Queue with Flask

```python
from flask import Flask, jsonify, request
from redis import Redis
from rq import Queue

app = Flask(__name__)

redis_conn = Redis(host="localhost", port=6379, db=0)
task_queue = Queue(connection=redis_conn)
```

## Defining Background Functions

RQ does not require any special decorator. Any regular Python function can be queued:

```python
# tasks.py
import time
import smtplib
from email.mime.text import MIMEText

def send_welcome_email(user_email, user_name):
    """Send a welcome email - runs in background worker."""
    time.sleep(1)  # Simulate SMTP delay
    print(f"Welcome email sent to {user_email} ({user_name})")
    return {"status": "sent", "recipient": user_email}

def generate_report(report_id, user_id):
    """Generate a report - runs in background worker."""
    time.sleep(5)  # Simulate long computation
    return {"report_id": report_id, "user_id": user_id, "status": "complete"}

def process_file(file_path, operation):
    """Process an uploaded file."""
    time.sleep(3)
    return {"file": file_path, "operation": operation, "done": True}
```

## Enqueueing Tasks from Flask Routes

```python
from flask import Flask, jsonify, request
from redis import Redis
from rq import Queue
from rq.job import Job
from tasks import send_welcome_email, generate_report, process_file

app = Flask(__name__)
redis_conn = Redis()
q = Queue(connection=redis_conn)

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    user_email = data["email"]
    user_name = data["name"]

    # Enqueue the email task - does not block the response
    job = q.enqueue(send_welcome_email, user_email, user_name)

    return jsonify({
        "message": "Registered successfully",
        "email_job_id": job.id,
    })

@app.route("/report/<int:report_id>", methods=["POST"])
def trigger_report(report_id):
    job = q.enqueue(generate_report, report_id, 42, job_timeout=120)
    return jsonify({"job_id": job.id})

@app.route("/job-status/<job_id>")
def job_status(job_id):
    job = Job.fetch(job_id, connection=redis_conn)
    return jsonify({
        "id": job.id,
        "status": job.get_status(),
        "result": job.result,
        "created_at": str(job.created_at),
        "ended_at": str(job.ended_at),
    })
```

## Running the RQ Worker

```bash
# Start the default queue worker
rq worker --with-scheduler

# Start a worker for a specific queue
rq worker high default low
```

## Multiple Queues with Priorities

```python
from redis import Redis
from rq import Queue

redis_conn = Redis()

high_q = Queue("high", connection=redis_conn)
default_q = Queue("default", connection=redis_conn)
low_q = Queue("low", connection=redis_conn)

# Route tasks to appropriate queues
def enqueue_task(task_type, *args):
    if task_type == "email":
        return high_q.enqueue(send_welcome_email, *args)
    elif task_type == "report":
        return default_q.enqueue(generate_report, *args)
    else:
        return low_q.enqueue(process_file, *args)
```

## Scheduling Tasks

Use `rq-scheduler` or the built-in scheduler for delayed or periodic tasks:

```bash
pip install rq-scheduler
```

```python
from rq_scheduler import Scheduler
from datetime import datetime, timedelta

scheduler = Scheduler(connection=redis_conn)

# Run once in 30 minutes
scheduler.enqueue_in(
    timedelta(minutes=30),
    send_welcome_email,
    "user@example.com",
    "Alice"
)

# Run periodically every hour
scheduler.cron(
    "0 * * * *",            # Every hour
    generate_report,
    args=[1, 42],
    repeat=None,            # Repeat indefinitely
)
```

## Handling Job Failures

```python
from rq import Queue
from rq.job import Job

def get_failed_jobs(redis_conn):
    from rq.registry import FailedJobRegistry
    registry = FailedJobRegistry("default", redis_conn)
    failed = []
    for job_id in registry.get_job_ids():
        job = Job.fetch(job_id, connection=redis_conn)
        failed.append({
            "id": job.id,
            "description": job.description,
            "exc_info": job.exc_info,
        })
    return failed
```

## Summary

Redis Queue (RQ) provides a simple, Pythonic way to run background tasks in Flask applications with minimal configuration. You define regular Python functions, enqueue them with `q.enqueue()`, and run `rq worker` to process them. For priority-based processing, use multiple named queues and start workers for each. RQ is well-suited for Flask apps that need background processing without the operational overhead of Celery.
