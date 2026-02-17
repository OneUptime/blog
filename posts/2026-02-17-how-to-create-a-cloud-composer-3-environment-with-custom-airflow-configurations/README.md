# How to Create a Cloud Composer 3 Environment with Custom Airflow Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Configuration, Orchestration

Description: Step-by-step guide to creating a Cloud Composer 3 environment with custom Airflow configurations, resource settings, and environment overrides.

---

Cloud Composer 3 is the latest version of Google's managed Apache Airflow service. It brings significant improvements over Composer 2, including better autoscaling, simplified configuration, and reduced infrastructure management. But the default settings are just a starting point. For production workloads, you need to customize the Airflow configuration, adjust resource allocations, and tune the environment to match your pipeline requirements.

This guide walks you through creating a Composer 3 environment from scratch with all the custom configurations you are likely to need.

## What Changed in Cloud Composer 3

Before diving into setup, here is what is different from Composer 2:

- **No GKE cluster management** - Composer 3 does not expose the underlying GKE cluster. Google manages the infrastructure entirely.
- **Simplified scaling** - You configure compute resources in terms of "small", "medium", "large" presets, or custom CPU/memory allocations.
- **Faster environment creation** - Environments spin up significantly faster than Composer 2.
- **Built-in DAG processor** - The DAG processor is a separate component from the scheduler, improving parsing performance.

## Step 1: Create a Basic Composer 3 Environment

Start with a basic environment using the gcloud CLI:

```bash
# Create a Cloud Composer 3 environment with default settings
gcloud composer environments create my-composer3-env \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --environment-size=small
```

The `--environment-size` flag accepts `small`, `medium`, or `large`, which controls the base resource allocation for the Airflow components.

For more control over the environment, use a YAML configuration file:

```bash
# Create a Composer 3 environment with a config file
gcloud composer environments create my-composer3-env \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --config=composer-config.yaml
```

## Step 2: Configure Airflow Properties

Airflow has hundreds of configuration options. You can override any of them when creating the environment. Here are the most commonly customized settings:

```bash
# Create an environment with custom Airflow configuration overrides
gcloud composer environments create prod-composer3 \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --environment-size=medium \
  --airflow-configs="\
core-dags_are_paused_at_creation=True,\
core-max_active_runs_per_dag=3,\
core-max_active_tasks_per_dag=16,\
core-parallelism=32,\
scheduler-dag_dir_list_interval=60,\
scheduler-min_file_process_interval=30,\
celery-worker_concurrency=16,\
webserver-default_ui_timezone=America/New_York"
```

Key configuration properties explained:

- `core-parallelism` - Maximum number of tasks that can run across the entire environment
- `core-max_active_runs_per_dag` - Maximum concurrent DAG runs per DAG
- `core-max_active_tasks_per_dag` - Maximum tasks running per DAG at once
- `scheduler-dag_dir_list_interval` - How often (seconds) the scheduler scans for new DAGs
- `celery-worker_concurrency` - Number of tasks each worker process handles simultaneously

## Step 3: Update Configurations After Creation

You do not need to recreate the environment to change settings. Update configurations on a running environment:

```bash
# Update Airflow configuration on an existing environment
gcloud composer environments update my-composer3-env \
  --location=us-central1 \
  --update-airflow-configs="\
core-parallelism=64,\
core-max_active_tasks_per_dag=32,\
scheduler-min_file_process_interval=15"
```

To remove a configuration override and revert to the default:

```bash
# Remove specific configuration overrides
gcloud composer environments update my-composer3-env \
  --location=us-central1 \
  --remove-airflow-configs="core-parallelism,celery-worker_concurrency"
```

## Step 4: Configure Resource Allocations

Composer 3 lets you set CPU and memory for each Airflow component independently:

```bash
# Configure custom resource allocations for Airflow components
gcloud composer environments update my-composer3-env \
  --location=us-central1 \
  --scheduler-cpu=2 \
  --scheduler-memory=4 \
  --scheduler-storage=2 \
  --web-server-cpu=1 \
  --web-server-memory=2 \
  --web-server-storage=1 \
  --worker-cpu=2 \
  --worker-memory=4 \
  --worker-storage=2 \
  --min-workers=2 \
  --max-workers=10
```

The `--min-workers` and `--max-workers` settings control autoscaling. Composer 3 automatically adjusts the number of workers based on task queue depth.

## Step 5: Set Environment Variables

Environment variables are available to all DAGs and tasks. Use them for settings that should not be in Airflow Variables (like feature flags):

```bash
# Set environment variables for the Composer environment
gcloud composer environments update my-composer3-env \
  --location=us-central1 \
  --update-env-variables="\
GCP_PROJECT=my-project,\
DATA_BUCKET=gs://my-data-bucket,\
ENVIRONMENT=production,\
LOG_LEVEL=INFO"
```

Access these in your DAGs:

```python
# Access environment variables in your DAG code
import os

project = os.environ.get("GCP_PROJECT", "default-project")
data_bucket = os.environ.get("DATA_BUCKET", "gs://default-bucket")
environment = os.environ.get("ENVIRONMENT", "development")
```

## Step 6: Configure Networking

For production environments, you typically want private IP networking:

```bash
# Create a Composer 3 environment with private IP
gcloud composer environments create private-composer3 \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --environment-size=medium \
  --network=my-vpc \
  --subnetwork=my-subnet \
  --enable-private-environment \
  --web-server-allow-all
```

If you need to restrict access to the Airflow web server:

```bash
# Configure web server access controls
gcloud composer environments update private-composer3 \
  --location=us-central1 \
  --web-server-allow-ip="description=Office,ip_range=203.0.113.0/24" \
  --web-server-allow-ip="description=VPN,ip_range=198.51.100.0/24"
```

## Step 7: Configure Email and Alerting

Set up SMTP for Airflow email notifications:

```bash
# Configure SMTP for email notifications
gcloud composer environments update my-composer3-env \
  --location=us-central1 \
  --update-airflow-configs="\
smtp-smtp_host=smtp.sendgrid.net,\
smtp-smtp_port=587,\
smtp-smtp_starttls=True,\
smtp-smtp_user=apikey,\
smtp-smtp_mail_from=airflow@mycompany.com"
```

Store the SMTP password as a Secret:

```bash
# Store SMTP password in Secret Manager
echo -n "your-smtp-password" | gcloud secrets create airflow-smtp-password \
  --data-file=- \
  --replication-policy=automatic

# Configure Composer to use the secret
gcloud composer environments update my-composer3-env \
  --location=us-central1 \
  --update-airflow-configs="smtp-smtp_password_secret=projects/my-project/secrets/airflow-smtp-password/versions/latest"
```

## Step 8: Set Up Maintenance Windows

Define when Composer can perform maintenance operations to avoid disrupting critical pipeline windows:

```bash
# Configure a maintenance window (Sundays 2-6 AM UTC)
gcloud composer environments update my-composer3-env \
  --location=us-central1 \
  --maintenance-window-start="2025-01-05T02:00:00Z" \
  --maintenance-window-end="2025-01-05T06:00:00Z" \
  --maintenance-window-recurrence="FREQ=WEEKLY;BYDAY=SU"
```

## Step 9: Verify the Environment

After creating and configuring the environment, verify everything is set correctly:

```bash
# Check the environment status and configuration
gcloud composer environments describe my-composer3-env \
  --location=us-central1

# List all Airflow configuration overrides
gcloud composer environments describe my-composer3-env \
  --location=us-central1 \
  --format="table(config.softwareConfig.airflowConfigOverrides)"

# Get the Airflow web UI URL
gcloud composer environments describe my-composer3-env \
  --location=us-central1 \
  --format="value(config.airflowUri)"
```

## Step 10: Import Your DAGs

With the environment ready, upload your DAGs:

```bash
# Import a single DAG file
gcloud composer environments storage dags import \
  --environment=my-composer3-env \
  --location=us-central1 \
  --source=my_dag.py

# Import all DAGs from a local directory
gcloud composer environments storage dags import \
  --environment=my-composer3-env \
  --location=us-central1 \
  --source=dags/
```

## Production Checklist

Before running production workloads on your Composer 3 environment:

- Set `core-dags_are_paused_at_creation=True` so new DAGs do not run automatically
- Configure appropriate `parallelism` and `max_active_tasks_per_dag` limits
- Set up email or PagerDuty alerting for task failures
- Define a maintenance window outside your critical pipeline schedules
- Use private IP networking if your environment handles sensitive data
- Configure worker autoscaling with sensible min/max bounds
- Set appropriate task timeouts to prevent runaway tasks

## Wrapping Up

Cloud Composer 3 simplifies managed Airflow significantly compared to earlier versions. The infrastructure is fully managed, scaling is automatic, and configuration is straightforward. Start with a preset environment size, customize the Airflow properties for your workload patterns, and adjust resource allocations as you learn how your DAGs behave. The flexibility to update configurations without recreating the environment means you can iterate quickly as your pipeline needs evolve.
