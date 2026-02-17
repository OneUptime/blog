# How to Monitor Cloud Composer Health Using the Built-In Monitoring Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Monitoring, Airflow, Observability

Description: Learn how to use the built-in monitoring dashboard in Google Cloud Composer to track environment health, DAG performance, and resource utilization in your Airflow workflows.

---

Google Cloud Composer is a managed Apache Airflow service, and like any orchestration tool, keeping an eye on its health is critical for production workloads. If your DAGs start silently failing or your workers run out of memory, you want to know about it before anyone files a ticket. Fortunately, Cloud Composer ships with a built-in monitoring dashboard that gives you a solid overview of your environment without needing to set up anything extra.

In this guide, we will walk through how to access and use the Cloud Composer monitoring dashboard, what metrics to pay attention to, and how to interpret the signals it gives you.

## Accessing the Monitoring Dashboard

The monitoring dashboard is built right into the Google Cloud Console. To get to it, navigate to the Cloud Composer section, select your environment, and click on the "Monitoring" tab. This tab is divided into several sections, each focusing on a different aspect of your Composer environment.

You will see sections for:

- Environment overview
- DAG runs
- Task instances
- Worker and scheduler resource usage
- Database health

Each of these panels pulls data from Cloud Monitoring metrics that Composer automatically emits.

## Understanding the Environment Overview

The environment overview section gives you the high-level picture. It shows whether your environment is healthy, degraded, or unhealthy. The health status is determined by a combination of factors including scheduler heartbeat, database connectivity, and worker availability.

A healthy environment means all components are running as expected. A degraded state usually means something is partially failing - perhaps one of the workers has restarted or the scheduler is behind. An unhealthy state is a red flag that needs immediate attention.

The overview also shows the Composer and Airflow versions, which is useful when debugging compatibility issues after upgrades.

## Monitoring DAG Runs

The DAG runs panel shows you the success and failure rate of your DAG runs over time. This is one of the most important panels to watch because it tells you whether your pipelines are actually completing successfully.

You can filter by time range to zoom into specific periods. If you see a spike in failures, correlate it with deployment timestamps or infrastructure changes. Common causes include:

- Code changes that introduced bugs in task logic
- Upstream data sources becoming unavailable
- Resource exhaustion on workers

The panel also shows the distribution of DAG run durations, which helps you spot performance regressions. If a DAG that normally takes 5 minutes suddenly takes 30, something has changed.

## Task Instance Metrics

Drilling down from DAG runs, the task instance metrics show you individual task performance. You can see how many tasks are in each state - queued, running, success, failed, or up for retry.

A growing number of queued tasks is a warning sign. It means your workers cannot keep up with the workload. This could indicate you need to scale up your worker count or increase worker resources.

Here is how you can check task instance counts programmatically using the gcloud CLI:

```bash
# List recent task instances for a specific DAG
gcloud composer environments run my-environment \
  --location us-central1 \
  tasks list -- my-dag-id 2026-02-17
```

Retried tasks also deserve attention. A task that succeeds on its third retry is technically successful, but it is wasting resources and slowing down your pipeline. Track retry rates and fix the underlying issues.

## Worker and Scheduler Resource Usage

The resource usage panels show CPU, memory, and disk utilization for both workers and the scheduler. These metrics come directly from GKE pod metrics since Composer runs on Google Kubernetes Engine under the hood.

Key things to watch:

**Worker CPU and Memory**: If workers consistently run above 80% CPU or memory, you are at risk of OOM kills and task failures. Consider either increasing the machine type or adding more workers.

**Scheduler CPU**: The scheduler is the brain of Airflow. If it is CPU-starved, DAGs will not get parsed on time, and task scheduling will lag. For environments with hundreds of DAGs, the scheduler needs sufficient resources.

**Disk Usage**: The workers store temporary files and logs locally. If disk usage creeps up, old logs may not be getting cleaned up, or tasks are writing too much temporary data.

You can configure worker resources through Terraform or the Console. Here is a Terraform example:

```hcl
# Configure Composer environment with custom worker resources
resource "google_composer_environment" "production" {
  name   = "production-composer"
  region = "us-central1"

  config {
    workloads_config {
      worker {
        cpu        = 2      # 2 vCPUs per worker
        memory_gb  = 4      # 4 GB memory per worker
        storage_gb = 10     # 10 GB disk per worker
        min_count  = 2      # Minimum 2 workers
        max_count  = 6      # Scale up to 6 workers
      }
      scheduler {
        cpu       = 2
        memory_gb = 4
        count     = 1
      }
    }
  }
}
```

## Database Health

Cloud Composer uses a Cloud SQL instance as its metadata database. The monitoring dashboard shows database CPU, memory, and connection counts. A struggling database is one of the most common causes of Composer environment issues.

Watch for:

- **High connection counts**: If you are close to the connection limit, tasks will start failing with database connection errors. This happens frequently when you have too many parallel tasks.
- **High CPU**: Database CPU spikes during DAG parsing because the scheduler writes parsed DAG metadata to the database. If you have many large DAGs, parsing can overwhelm the database.
- **Storage growth**: The metadata database stores task instance records, XCom values, and variable history. Without cleanup, it grows over time.

Set up a maintenance DAG to clean old records:

```python
# DAG to clean up old Airflow metadata and keep the database healthy
from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'platform-team',
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'metadata_cleanup',
    default_args=default_args,
    schedule_interval='@weekly',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # Clean task instances older than 90 days
    cleanup = BashOperator(
        task_id='cleanup_old_metadata',
        bash_command='airflow db clean --clean-before-timestamp "$(date -d \'-90 days\' +%Y-%m-%d)" --yes',
    )
```

## Setting Up Custom Monitoring Views

While the built-in dashboard covers the essentials, you can create custom dashboards in Cloud Monitoring for deeper analysis. Composer exports metrics under the `composer.googleapis.com` namespace.

Some useful metrics to add to a custom dashboard:

- `composer.googleapis.com/environment/dagbag_size` - Number of DAGs loaded
- `composer.googleapis.com/environment/scheduler_heartbeat` - Scheduler liveness
- `composer.googleapis.com/environment/zombie_task_killed` - Zombie tasks the scheduler had to clean up
- `composer.googleapis.com/workflow/run_duration` - DAG run duration

```bash
# Query Composer metrics using gcloud
gcloud monitoring metrics list \
  --filter="metric.type = starts_with(\"composer.googleapis.com\")" \
  --format="table(metric.type, metric.labels)"
```

## Best Practices for Ongoing Monitoring

Based on running Composer in production, here are some patterns that work well:

1. **Check the dashboard daily** during initial rollout of new DAGs. Once stable, weekly checks are usually sufficient.

2. **Set up alerts** for environment health state changes. The dashboard is great for investigation, but alerts catch problems when you are not looking.

3. **Track trends over time**. A slow increase in task queue depth or scheduler lag often precedes a major incident.

4. **Correlate with deployments**. Keep a record of when DAGs were updated or environment configs changed. This makes root cause analysis much faster.

5. **Right-size your environment**. The monitoring data tells you if you are over-provisioned (wasting money) or under-provisioned (risking failures). Review resource utilization monthly and adjust.

## Wrapping Up

The Cloud Composer monitoring dashboard is a solid starting point for keeping your Airflow environments healthy. It gives you visibility into DAG performance, resource utilization, and database health without any extra setup. For production environments, combine the built-in dashboard with custom Cloud Monitoring dashboards and alerting policies to build a comprehensive observability layer around your data pipelines.
