# How to Scale Cloud Composer Worker and Scheduler Resources for Large DAGs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Scaling, Performance

Description: Configure and scale Cloud Composer worker and scheduler resources to handle large numbers of DAGs and tasks without bottlenecks.

---

As your Airflow deployment grows - more DAGs, more tasks, more frequent schedules - you will inevitably hit resource limits. Tasks get stuck in the queued state, the scheduler falls behind on DAG parsing, and the web UI becomes sluggish. These are all symptoms of an under-resourced Composer environment.

This article covers how to identify resource bottlenecks and scale your Cloud Composer environment to handle large workloads.

## Understanding the Bottlenecks

Cloud Composer has three main components that can become bottlenecks:

1. **Scheduler** - Parses DAG files, determines which tasks should run, and places them in the queue. If the scheduler is too slow, tasks sit in the "scheduled" state waiting to be queued.

2. **Workers** - Execute the actual tasks. If you do not have enough workers or they do not have enough CPU/memory, tasks stay in the "queued" state.

3. **Web Server** - Serves the Airflow UI. Usually not a bottleneck unless you have many concurrent users or the metadata database is overloaded.

## Diagnosing the Problem

Before scaling, figure out what is actually the bottleneck:

```bash
# Check environment health and resource usage
gcloud composer environments describe my-composer-env \
  --location=us-central1 \
  --format="yaml(config.workloadsConfig)"
```

Look at these metrics in Cloud Monitoring:

- **Scheduler heartbeat** - If the scheduler is not sending heartbeats regularly, it is overloaded
- **DAG processing time** - How long it takes to parse all DAG files
- **Task queue depth** - How many tasks are waiting to be executed
- **Worker pod count** - How many workers are running vs. the maximum

You can also check from the Airflow CLI:

```bash
# Check scheduler status
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  dags list-import-errors

# Check how many tasks are in each state
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  tasks states-for-dag-run -- my_dag_id 2025-01-15
```

## Scaling the Scheduler

The scheduler is the most common bottleneck. It needs to:
- Parse all DAG files periodically
- Evaluate task dependencies and trigger conditions
- Place ready tasks into the execution queue

### Increase Scheduler Resources

```bash
# Increase scheduler CPU and memory
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --scheduler-cpu=4 \
  --scheduler-memory=8 \
  --scheduler-storage=4
```

### Run Multiple Scheduler Instances

Airflow supports running multiple scheduler instances for parallel DAG processing:

```bash
# Increase the number of scheduler instances (Composer 2)
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --scheduler-count=3
```

### Optimize Scheduler Configuration

Tune these Airflow settings to improve scheduler performance:

```bash
# Optimize scheduler settings for large deployments
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-airflow-configs="\
scheduler-dag_dir_list_interval=120,\
scheduler-min_file_process_interval=60,\
scheduler-parsing_processes=4,\
scheduler-max_dagruns_to_create_per_loop=10,\
scheduler-max_tis_per_query=512,\
scheduler-schedule_after_task_execution=False"
```

Key settings explained:

- `dag_dir_list_interval` - How often (seconds) the scheduler rescans the DAGs folder for new files. Increase this if you have many files.
- `min_file_process_interval` - Minimum seconds between reparsing a DAG file. Higher values reduce scheduler load.
- `parsing_processes` - Number of parallel processes for DAG parsing. Increase for faster parsing of many DAG files.
- `max_tis_per_query` - Number of task instances the scheduler processes per loop. Higher values are more efficient.

## Scaling Workers

Workers execute your tasks. The two dimensions of scaling are:

1. **Number of workers** - How many worker processes are running
2. **Worker resources** - CPU, memory, and concurrency per worker

### Configure Worker Autoscaling

```bash
# Configure worker autoscaling
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --min-workers=3 \
  --max-workers=20 \
  --worker-cpu=2 \
  --worker-memory=8 \
  --worker-storage=4
```

The autoscaler watches the task queue and adds workers when tasks are waiting. It removes workers when the queue is empty. Set `min-workers` high enough to handle your base load without waiting for scale-up.

### Tune Worker Concurrency

Worker concurrency controls how many tasks a single worker handles simultaneously:

```bash
# Set worker concurrency - how many tasks per worker
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-airflow-configs="\
celery-worker_concurrency=16"
```

A good starting point is 2x the number of CPU cores per worker. If your tasks are I/O-bound (waiting for APIs, database queries), you can go higher. If they are CPU-bound, keep it closer to the core count.

### Configure Parallelism

Parallelism controls the maximum number of tasks running across the entire environment:

```bash
# Set environment-wide parallelism limits
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-airflow-configs="\
core-parallelism=64,\
core-max_active_tasks_per_dag=32,\
core-max_active_runs_per_dag=5"
```

The relationship between these settings:

```
Total capacity = min(
    core-parallelism,                         # Environment-wide cap
    max_workers * celery-worker_concurrency    # Worker capacity
)

Per-DAG capacity = min(
    core-max_active_tasks_per_dag,            # Task cap per DAG
    core-max_active_runs_per_dag * tasks      # Runs * tasks per run
)
```

## Scaling for Many DAGs

When you have hundreds or thousands of DAGs, parsing becomes the main challenge.

### Reduce DAG Parsing Overhead

```python
# Optimize your DAG files for fast parsing

# Bad - slow parsing due to top-level imports and computation
import pandas as pd  # Heavy import at module level
import requests

data = requests.get("https://api.example.com/config").json()  # API call during parsing

dag = DAG(dag_id="slow_dag", ...)

# Good - defer heavy operations to task execution
from airflow import DAG
from airflow.operators.python import PythonOperator

dag = DAG(dag_id="fast_dag", ...)

def my_task():
    import pandas as pd  # Import inside the function
    import requests
    data = requests.get("https://api.example.com/config").json()
    # Process data
```

### Use DAG File Processing Metrics

Monitor how long it takes to parse your DAG files:

```bash
# Check DAG processing times
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  dags report
```

If specific DAGs take a long time to parse, optimize them or split them into separate files.

### Organize DAGs Efficiently

```
# Good: Flat structure with focused files
dags/
  sales_etl.py          # One or a few related DAGs per file
  marketing_etl.py
  support_pipeline.py
  dynamic_pipelines.py  # Dynamic DAGs from config

# Bad: Deeply nested with many helper modules
dags/
  pipelines/
    sales/
      dag.py
      helpers/
        transform.py
        validate.py
    marketing/
      dag.py
      helpers/
        ...
```

## Scaling the Database

The Airflow metadata database can become a bottleneck with many DAGs and task instances. Keep the database healthy:

```bash
# Clean up old DAG runs and task instances
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  db clean -- --clean-before-timestamp "2024-06-01T00:00:00+00:00" -y
```

Configure metadata cleanup in your environment:

```bash
# Set up automatic metadata cleanup
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-airflow-configs="\
core-max_num_rendered_ti_fields_per_task=3,\
core-store_dag_code=False"
```

## Monitoring at Scale

Set up Cloud Monitoring dashboards to track key metrics:

```bash
# Create a monitoring alert for high task queue depth
gcloud monitoring policies create --policy-from-file=- << 'EOF'
{
  "displayName": "Composer Task Queue Depth Alert",
  "conditions": [{
    "displayName": "Task queue depth > 50 for 10 minutes",
    "conditionThreshold": {
      "filter": "resource.type=\"cloud_composer_environment\" AND metric.type=\"composer.googleapis.com/environment/task_queue_length\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 50,
      "duration": "600s",
      "aggregations": [{
        "alignmentPeriod": "300s",
        "perSeriesAligner": "ALIGN_MEAN"
      }]
    }
  }],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF
```

## Scaling Checklist

Here is a quick reference for common scaling scenarios:

| Symptom | Root Cause | Fix |
|---|---|---|
| Tasks stuck in "scheduled" | Scheduler overloaded | Add scheduler instances, increase CPU/memory |
| Tasks stuck in "queued" | Not enough workers | Increase max-workers, worker concurrency |
| DAG parsing is slow | Too many or complex DAGs | Optimize DAG files, increase parsing_processes |
| Web UI is slow | Database overload | Clean old metadata, increase web server resources |
| Random task failures | Worker OOM | Increase worker memory |
| Autoscaler too slow | Scale-up delay | Increase min-workers |

## Wrapping Up

Scaling Cloud Composer is about matching resources to your workload's demands. Start by identifying the bottleneck - scheduler, workers, or database. Then apply targeted fixes: more scheduler instances for parsing, more workers for execution, or configuration tuning for efficiency. Monitor continuously, because workloads change. What works for 100 DAGs might not work for 500. The key is having observability into the system so you can spot problems before they cascade into missed SLAs.
