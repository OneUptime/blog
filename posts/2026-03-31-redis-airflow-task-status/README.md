# How to Use Redis with Apache Airflow for Task Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Apache Airflow, Workflow

Description: Learn how to use Redis as the Celery backend for Airflow task status, and implement custom task status caching for fast external status lookups.

---

Apache Airflow uses a result backend to store task state when using the Celery executor. Redis is the most common choice and also enables fast external task status lookups without hitting Airflow's database.

## Configure Airflow to Use Redis as Celery Backend

In `airflow.cfg`:

```text
[celery]
broker_url = redis://localhost:6379/0
result_backend = redis://localhost:6379/1
```

Or via environment variables:

```bash
export AIRFLOW__CELERY__BROKER_URL=redis://localhost:6379/0
export AIRFLOW__CELERY__RESULT_BACKEND=redis://localhost:6379/1
```

## Read Task Status from Redis

Airflow stores task states in Redis via Celery. You can read them directly:

```python
from celery import Celery

# Connect to the result backend
celery_app = Celery(
    "airflow",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

def get_task_result(task_id: str):
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "state": result.state,
        "result": result.result if result.ready() else None,
    }
```

## Publish Custom Task Progress to Redis

For long-running tasks, publish progress so dashboards can poll it:

```python
from airflow.decorators import task
import redis
import json

progress_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

@task
def process_large_dataset(dataset_id: str, **context):
    run_id = context["run_id"]
    progress_key = f"airflow:progress:{run_id}:{dataset_id}"

    rows = fetch_dataset(dataset_id)
    total = len(rows)

    for i, row in enumerate(rows):
        process_row(row)
        if i % 100 == 0:
            pct = round((i / total) * 100)
            progress_client.hset(progress_key, mapping={
                "processed": i,
                "total": total,
                "pct": pct,
            })
            progress_client.expire(progress_key, 3600)

    progress_client.hset(progress_key, mapping={"processed": total, "pct": 100})
```

## Cache DAG Run Status for APIs

Instead of querying Airflow's REST API repeatedly, cache DAG status in Redis:

```python
import redis
import json
import requests

cache = redis.Redis(host="localhost", port=6379, decode_responses=True)

AIRFLOW_API = "http://localhost:8080/api/v1"
AUTH = ("admin", "admin")

def get_dag_run_status(dag_id: str, dag_run_id: str, cache_ttl: int = 30) -> dict:
    key = f"airflow:dagrun:{dag_id}:{dag_run_id}"
    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    resp = requests.get(
        f"{AIRFLOW_API}/dags/{dag_id}/dagRuns/{dag_run_id}",
        auth=AUTH,
        timeout=5,
    )
    data = resp.json()

    # Only cache terminal states longer
    ttl = 3600 if data["state"] in ("success", "failed") else cache_ttl
    cache.set(key, json.dumps(data), ex=ttl)
    return data
```

## Monitor Queue Depth

```python
import redis

def get_celery_queue_depth(queue_name: str = "default") -> int:
    client = redis.Redis(host="localhost", port=6379)
    return client.llen(queue_name)

# Alert when queue grows too large
depth = get_celery_queue_depth("default")
if depth > 1000:
    print(f"WARNING: Airflow task queue has {depth} pending tasks")
```

## Summary

Redis serves Airflow as both a Celery broker for task distribution and a result backend for state storage. Beyond built-in Celery integration, you can publish custom task progress metrics from within tasks for real-time dashboards, cache DAG run status to reduce Airflow API load, and monitor Celery queue depth to detect processing backlogs before they become incidents.
