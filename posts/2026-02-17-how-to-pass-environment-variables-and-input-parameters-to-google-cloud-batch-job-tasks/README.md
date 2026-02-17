# How to Pass Environment Variables and Input Parameters to Google Cloud Batch Job Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Batch, Environment Variables, Batch Processing, Configuration

Description: Learn how to pass environment variables and input parameters to Google Cloud Batch job tasks for flexible and configurable batch processing.

---

When running batch processing jobs on Google Cloud Batch, your tasks often need external configuration - database connection strings, input file paths, processing flags, or credentials. Google Cloud Batch provides several mechanisms for passing data to your tasks: built-in environment variables, custom environment variables, Secret Manager integration, and mounted files.

This guide covers all the approaches for getting configuration and parameters into your Batch job tasks.

## Built-in Environment Variables

Cloud Batch automatically sets several environment variables in every task. These are available without any configuration.

```bash
# Built-in variables available in every Batch task
# BATCH_TASK_INDEX   - Zero-based index of this task (0, 1, 2, ...)
# BATCH_TASK_COUNT   - Total number of tasks in the task group
# CLOUD_RUN_TASK_INDEX - Same as BATCH_TASK_INDEX (for compatibility)
# CLOUD_RUN_TASK_COUNT - Same as BATCH_TASK_COUNT

# Example: Use BATCH_TASK_INDEX to partition work
echo "I am task ${BATCH_TASK_INDEX} of ${BATCH_TASK_COUNT}"
```

These built-in variables are the primary mechanism for distributing work across tasks. Each task gets a unique index, so your code can use it to determine which data partition to process.

```python
# worker.py - Use built-in variables to partition work
import os

task_index = int(os.environ.get("BATCH_TASK_INDEX", 0))
task_count = int(os.environ.get("BATCH_TASK_COUNT", 1))

# Calculate which chunk of data this task should process
total_items = 10000
chunk_size = total_items // task_count
start = task_index * chunk_size
end = start + chunk_size if task_index < task_count - 1 else total_items

print(f"Task {task_index}: Processing items {start} to {end}")
```

## Custom Environment Variables

Set custom environment variables in the task specification to pass configuration values.

```python
# create_job_with_env.py - Pass custom environment variables to tasks
from google.cloud import batch_v1

def create_job_with_environment(project_id, region, config):
    """Create a Batch job with custom environment variables."""
    client = batch_v1.BatchServiceClient()
    parent = f"projects/{project_id}/locations/{region}"

    job = batch_v1.Job()
    task_spec = batch_v1.TaskSpec()

    # Define the container runnable
    runnable = batch_v1.Runnable()
    container = batch_v1.Runnable.Container()
    container.image_uri = "us-central1-docker.pkg.dev/YOUR_PROJECT/batch/processor:latest"
    runnable.container = container

    # Set environment variables on the runnable
    runnable.environment = batch_v1.Environment(
        variables={
            "INPUT_BUCKET": config["input_bucket"],
            "OUTPUT_BUCKET": config["output_bucket"],
            "PROCESSING_MODE": config["mode"],
            "LOG_LEVEL": config.get("log_level", "INFO"),
            "MAX_RETRIES": str(config.get("max_retries", 3)),
            "BATCH_SIZE": str(config.get("batch_size", 1000)),
        }
    )

    task_spec.runnables = [runnable]

    resources = batch_v1.ComputeResource()
    resources.cpu_milli = 4000
    resources.memory_mib = 8192
    task_spec.compute_resource = resources

    task_group = batch_v1.TaskGroup()
    task_group.task_spec = task_spec
    task_group.task_count = config.get("task_count", 10)
    task_group.parallelism = config.get("parallelism", 10)

    job.task_groups = [task_group]

    # Allocation policy
    allocation = batch_v1.AllocationPolicy()
    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    policy = batch_v1.AllocationPolicy.InstancePolicy()
    policy.machine_type = config.get("machine_type", "e2-standard-4")
    instance.policy = policy
    allocation.instances = [instance]
    job.allocation_policy = allocation

    job.logs_policy = batch_v1.LogsPolicy(
        destination=batch_v1.LogsPolicy.Destination.CLOUD_LOGGING
    )

    created_job = client.create_job(
        parent=parent, job=job, job_id=config["job_id"]
    )

    return created_job


# Usage
job = create_job_with_environment(
    project_id="my-project",
    region="us-central1",
    config={
        "job_id": "process-2026-02-17",
        "input_bucket": "gs://raw-data/2026/02/17",
        "output_bucket": "gs://processed-data/2026/02/17",
        "mode": "full",
        "log_level": "DEBUG",
        "max_retries": 5,
        "batch_size": 500,
        "task_count": 20,
        "parallelism": 20,
        "machine_type": "e2-standard-8",
    }
)
```

Access these variables in your task code.

```python
# processor.py - Read environment variables in the task
import os
import logging

# Read configuration from environment variables
INPUT_BUCKET = os.environ["INPUT_BUCKET"]
OUTPUT_BUCKET = os.environ["OUTPUT_BUCKET"]
PROCESSING_MODE = os.environ.get("PROCESSING_MODE", "incremental")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", 3))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 1000))

# Task identity
TASK_INDEX = int(os.environ.get("BATCH_TASK_INDEX", 0))
TASK_COUNT = int(os.environ.get("BATCH_TASK_COUNT", 1))

logging.basicConfig(level=getattr(logging, LOG_LEVEL))
logger = logging.getLogger(__name__)

logger.info(f"Task {TASK_INDEX}/{TASK_COUNT}")
logger.info(f"Input: {INPUT_BUCKET}")
logger.info(f"Output: {OUTPUT_BUCKET}")
logger.info(f"Mode: {PROCESSING_MODE}")
```

## Using Secret Manager for Sensitive Values

Never put passwords, API keys, or tokens in plain environment variables. Use Secret Manager integration instead.

```python
# create_job_with_secrets.py - Pass secrets securely to tasks
from google.cloud import batch_v1

def create_job_with_secrets(project_id, region):
    """Create a Batch job that accesses secrets from Secret Manager."""
    client = batch_v1.BatchServiceClient()
    parent = f"projects/{project_id}/locations/{region}"

    job = batch_v1.Job()
    task_spec = batch_v1.TaskSpec()

    runnable = batch_v1.Runnable()
    container = batch_v1.Runnable.Container()
    container.image_uri = "us-central1-docker.pkg.dev/YOUR_PROJECT/batch/api-worker:latest"
    runnable.container = container

    # Use Secret Manager references for sensitive values
    runnable.environment = batch_v1.Environment(
        variables={
            "API_ENDPOINT": "https://api.example.com/v2",
            "LOG_LEVEL": "INFO",
        },
        secret_variables={
            # Map environment variable names to Secret Manager secret versions
            "API_KEY": "projects/YOUR_PROJECT/secrets/api-key/versions/latest",
            "DB_PASSWORD": "projects/YOUR_PROJECT/secrets/db-password/versions/latest",
            "ENCRYPTION_KEY": "projects/YOUR_PROJECT/secrets/encryption-key/versions/latest",
        }
    )

    task_spec.runnables = [runnable]

    resources = batch_v1.ComputeResource()
    resources.cpu_milli = 2000
    resources.memory_mib = 4096
    task_spec.compute_resource = resources

    task_group = batch_v1.TaskGroup()
    task_group.task_spec = task_spec
    task_group.task_count = 5
    task_group.parallelism = 5

    job.task_groups = [task_group]

    allocation = batch_v1.AllocationPolicy()
    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    policy = batch_v1.AllocationPolicy.InstancePolicy()
    policy.machine_type = "e2-standard-2"
    instance.policy = policy
    allocation.instances = [instance]

    # The service account needs Secret Manager access
    sa = batch_v1.ServiceAccount()
    sa.email = f"batch-runner@{project_id}.iam.gserviceaccount.com"
    allocation.service_account = sa

    job.allocation_policy = allocation
    job.logs_policy = batch_v1.LogsPolicy(
        destination=batch_v1.LogsPolicy.Destination.CLOUD_LOGGING
    )

    return client.create_job(parent=parent, job=job, job_id="secure-api-job")
```

Grant the service account access to the secrets.

```bash
# Grant the Batch job service account access to secrets
gcloud secrets add-iam-policy-binding api-key \
  --member="serviceAccount:batch-runner@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:batch-runner@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Passing Input via Mounted Files

For larger configuration or input data, mount a Cloud Storage bucket and read files directly.

```python
# create_job_with_mounted_config.py - Use mounted files for configuration
from google.cloud import batch_v1

def create_job_with_config_file(project_id, region):
    """Create a job that reads configuration from a mounted GCS file."""
    client = batch_v1.BatchServiceClient()
    parent = f"projects/{project_id}/locations/{region}"

    job = batch_v1.Job()
    task_spec = batch_v1.TaskSpec()

    runnable = batch_v1.Runnable()
    script = batch_v1.Runnable.Script()

    # Read config from mounted GCS bucket
    script.text = """#!/bin/bash
    # Configuration file is available via GCS mount
    CONFIG_FILE="/mnt/config/job_config.json"

    echo "Reading configuration from ${CONFIG_FILE}"
    cat ${CONFIG_FILE}

    # Pass the config file to the processing script
    python3 /app/process.py --config ${CONFIG_FILE} --task-index ${BATCH_TASK_INDEX}
    """

    runnable.script = script
    task_spec.runnables = [runnable]

    # Mount the GCS bucket containing configuration files
    config_volume = batch_v1.Volume()
    gcs_source = batch_v1.GCS()
    gcs_source.remote_path = "batch-configs/current/"
    config_volume.gcs = gcs_source
    config_volume.mount_path = "/mnt/config"

    # Mount the input data bucket
    data_volume = batch_v1.Volume()
    data_gcs = batch_v1.GCS()
    data_gcs.remote_path = "input-data/"
    data_volume.gcs = data_gcs
    data_volume.mount_path = "/mnt/input"

    # Mount the output bucket
    output_volume = batch_v1.Volume()
    output_gcs = batch_v1.GCS()
    output_gcs.remote_path = "output-data/"
    output_volume.gcs = output_gcs
    output_volume.mount_path = "/mnt/output"

    task_spec.volumes = [config_volume, data_volume, output_volume]

    resources = batch_v1.ComputeResource()
    resources.cpu_milli = 4000
    resources.memory_mib = 8192
    task_spec.compute_resource = resources

    task_group = batch_v1.TaskGroup()
    task_group.task_spec = task_spec
    task_group.task_count = 10
    task_group.parallelism = 10

    job.task_groups = [task_group]

    allocation = batch_v1.AllocationPolicy()
    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    policy = batch_v1.AllocationPolicy.InstancePolicy()
    policy.machine_type = "e2-standard-4"
    instance.policy = policy
    allocation.instances = [instance]
    job.allocation_policy = allocation

    job.logs_policy = batch_v1.LogsPolicy(
        destination=batch_v1.LogsPolicy.Destination.CLOUD_LOGGING
    )

    return client.create_job(parent=parent, job=job, job_id="config-file-job")
```

The configuration file in GCS might look like this.

```json
{
    "processing": {
        "mode": "full_refresh",
        "batch_size": 5000,
        "max_retries": 3,
        "timeout_seconds": 300
    },
    "input": {
        "format": "parquet",
        "compression": "snappy",
        "partition_column": "date"
    },
    "output": {
        "format": "parquet",
        "compression": "gzip",
        "bigquery_table": "project.dataset.output_table"
    },
    "filters": {
        "date_range": {
            "start": "2026-02-01",
            "end": "2026-02-17"
        },
        "categories": ["electronics", "clothing", "home"]
    }
}
```

## Combining All Approaches

In practice, you often use multiple parameter-passing methods together.

```python
# combined_example.py - Use all parameter methods together
import os
import json

# Built-in variables for task identity
task_index = int(os.environ["BATCH_TASK_INDEX"])
task_count = int(os.environ["BATCH_TASK_COUNT"])

# Custom environment variables for non-sensitive config
log_level = os.environ.get("LOG_LEVEL", "INFO")
processing_mode = os.environ.get("PROCESSING_MODE", "incremental")

# Secret Manager variables for sensitive values
api_key = os.environ.get("API_KEY")
db_password = os.environ.get("DB_PASSWORD")

# Mounted file for complex configuration
with open("/mnt/config/job_config.json") as f:
    config = json.load(f)

# Input data from mounted GCS bucket
input_dir = "/mnt/input"
output_dir = "/mnt/output"

print(f"Task {task_index}/{task_count}")
print(f"Mode: {processing_mode}, Log level: {log_level}")
print(f"Config loaded: {len(config)} keys")
print(f"API key present: {api_key is not None}")
```

## Best Practices

Keep a few things in mind when passing parameters to Batch tasks:

Use environment variables for simple, small values like flags, bucket names, and modes. They are easy to set and read.

Use Secret Manager for anything sensitive. Environment variables can appear in logs and metadata, so passwords and keys should always come from Secret Manager.

Use mounted GCS files for large or complex configuration that does not fit well in environment variables - JSON configs, CSV lookup tables, or ML model parameters.

Validate all input parameters early in your task code. If a required variable is missing, fail fast with a clear error message rather than encountering a cryptic failure later in processing.

## Wrapping Up

Google Cloud Batch provides flexible options for parameterizing your tasks. Built-in variables handle task distribution, custom environment variables cover simple configuration, Secret Manager keeps credentials safe, and GCS mounts handle complex or large inputs. Using the right combination of these methods keeps your batch jobs configurable, secure, and maintainable.
