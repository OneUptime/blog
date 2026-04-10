# How to Use Redis as Celery Broker in Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Flask, Celery, Task Queue, Python

Description: Configure Celery with Redis as the message broker in a Flask application to run background tasks outside the request-response cycle.

---

## Introduction

Flask is a synchronous web framework, which means any slow operation inside a request handler blocks the server. Celery with Redis lets you offload work like sending emails, processing files, or calling external APIs to background workers. This guide walks through the complete setup.

## Installation

```bash
pip install flask celery redis
```

## Application Structure

```text
myapp/
  app.py
  celery_app.py
  tasks.py
```

## Creating the Flask App with Celery

In `app.py`:

```python
from flask import Flask, jsonify, request
from celery_app import make_celery

app = Flask(__name__)
app.config.update(
    CELERY_BROKER_URL="redis://localhost:6379/0",
    CELERY_RESULT_BACKEND="redis://localhost:6379/0",
)

celery = make_celery(app)
```

In `celery_app.py`:

```python
from celery import Celery

def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=app.config["CELERY_BROKER_URL"],
        backend=app.config["CELERY_RESULT_BACKEND"],
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
```

## Defining Tasks

In `tasks.py`:

```python
from app import celery
import time

@celery.task
def send_email(to_address, subject, body):
    # Simulate email sending
    time.sleep(2)
    print(f"Sending email to {to_address}: {subject}")
    return {"status": "sent", "to": to_address}

@celery.task
def resize_image(image_path, width, height):
    # Simulate image processing
    time.sleep(3)
    print(f"Resizing {image_path} to {width}x{height}")
    return {"path": image_path, "size": f"{width}x{height}"}
```

## Flask Routes Dispatching Tasks

Add these routes to `app.py`:

```python
from tasks import send_email, resize_image

@app.route("/send-email", methods=["POST"])
def trigger_email():
    data = request.json
    task = send_email.delay(data["to"], data["subject"], data["body"])
    return jsonify({"task_id": task.id, "status": "queued"})

@app.route("/resize-image", methods=["POST"])
def trigger_resize():
    data = request.json
    task = resize_image.delay(data["path"], data["width"], data["height"])
    return jsonify({"task_id": task.id, "status": "queued"})

@app.route("/task-status/<task_id>")
def task_status(task_id):
    task = celery.AsyncResult(task_id)
    return jsonify({
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.ready() else None,
    })
```

## Running the Application

Start Flask and Celery in separate terminals:

```bash
# Terminal 1: Start Flask
flask run

# Terminal 2: Start Celery worker
celery -A app.celery worker --loglevel=info
```

## Task Chaining and Groups

Chain tasks together or run them in parallel:

```python
from celery import chain, group
from tasks import send_email, resize_image

def process_upload(image_path, user_email):
    # Chain: resize image then send notification email
    workflow = chain(
        resize_image.s(image_path, 800, 600),
        send_email.si(user_email, "Upload processed", "Your image is ready.")
    )
    result = workflow.delay()
    return result.id
```

## Retrying Failed Tasks

```python
from app import celery
import requests

@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def call_external_api(self, endpoint, payload):
    try:
        response = requests.post(endpoint, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        raise self.retry(exc=exc)
```

## Summary

Integrating Celery with Redis in Flask requires a `make_celery` factory function that wraps tasks in the Flask application context, ensuring database connections and configuration are available in background workers. Tasks are dispatched with `.delay()` or `.apply_async()` and return an `AsyncResult` object for status polling. This pattern keeps Flask request handlers fast by moving all slow operations to the Celery worker process.
