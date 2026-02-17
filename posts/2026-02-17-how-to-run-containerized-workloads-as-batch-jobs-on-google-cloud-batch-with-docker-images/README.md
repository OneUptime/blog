# How to Run Containerized Workloads as Batch Jobs on Google Cloud Batch with Docker Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Batch, Docker, Containers, Batch Processing, Compute, Google Cloud

Description: Run containerized workloads as batch jobs on Google Cloud Batch using Docker images for reproducible, portable, and scalable batch processing pipelines.

---

Containers solve the "it works on my machine" problem for batch processing just as well as they do for web services. When you package your batch workload as a Docker image, you get reproducible builds, consistent execution environments, and easy dependency management. Google Cloud Batch has first-class support for running Docker containers, pulling images from Artifact Registry or any public registry, and passing configuration through environment variables and mounted volumes.

In this post, I will cover creating containerized batch workloads, building and pushing Docker images, configuring Cloud Batch to run them, and handling common patterns like shared storage and multi-container jobs.

## Why Containers for Batch

Script-based batch jobs work for simple cases, but containers give you several advantages:

- **Reproducibility** - the same image produces the same results regardless of the host VM
- **Dependency isolation** - complex library requirements are baked into the image
- **Portability** - test locally with Docker, run in production on Cloud Batch
- **Versioning** - tag images for different versions of your processing logic
- **Reuse** - share processing images across different batch jobs

## Prerequisites

- Docker installed locally for building images
- Artifact Registry repository (or Docker Hub account)
- Cloud Batch API enabled
- A Google Cloud project with billing enabled

## Step 1: Build the Processing Container

Create a Docker image for your batch processing workload. This example builds a data processing container in Python.

The directory structure:

```
batch-processor/
  Dockerfile
  requirements.txt
  process.py
```

The processing script reads input, processes it, and writes output:

```python
# process.py - Main batch processing script
import os
import json
import csv
from datetime import datetime
from google.cloud import storage

def main():
    # Cloud Batch provides these environment variables
    task_index = int(os.environ.get("BATCH_TASK_INDEX", "0"))
    task_count = int(os.environ.get("BATCH_TASK_COUNT", "1"))

    # Custom environment variables from job config
    input_bucket = os.environ.get("INPUT_BUCKET", "my-input-bucket")
    output_bucket = os.environ.get("OUTPUT_BUCKET", "my-output-bucket")
    processing_date = os.environ.get("PROCESSING_DATE", datetime.now().strftime("%Y-%m-%d"))

    print(f"Task {task_index}/{task_count} starting at {datetime.now()}")
    print(f"Processing date: {processing_date}")

    # Initialize GCS client
    client = storage.Client()

    # List input files and select this task's portion
    input_blobs = list(client.list_blobs(input_bucket, prefix=f"data/{processing_date}/"))
    my_files = [b for i, b in enumerate(input_blobs) if i % task_count == task_index]

    print(f"Task {task_index} processing {len(my_files)} files out of {len(input_blobs)} total")

    results = []
    for blob in my_files:
        # Download and process each file
        data = blob.download_as_text()
        result = process_file(data, blob.name)
        results.append(result)

    # Write results to output bucket
    output_blob = client.bucket(output_bucket).blob(
        f"results/{processing_date}/task_{task_index}.json"
    )
    output_blob.upload_from_string(json.dumps(results, indent=2))

    print(f"Task {task_index} complete. Processed {len(results)} files.")

def process_file(data, filename):
    """Process a single input file and return results."""
    lines = data.strip().split("\n")
    reader = csv.DictReader(lines)

    row_count = 0
    error_count = 0
    total_value = 0.0

    for row in reader:
        row_count += 1
        try:
            total_value += float(row.get("value", 0))
        except (ValueError, TypeError):
            error_count += 1

    return {
        "filename": filename,
        "row_count": row_count,
        "error_count": error_count,
        "total_value": total_value,
    }

if __name__ == "__main__":
    main()
```

The Dockerfile:

```dockerfile
# Use a slim Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the processing script
COPY process.py .

# Run the processing script by default
CMD ["python", "process.py"]
```

The requirements file:

```
google-cloud-storage==2.14.0
```

## Step 2: Build and Push the Image

Build the Docker image and push it to Artifact Registry.

```bash
# Create an Artifact Registry repository if you don't have one
gcloud artifacts repositories create batch-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for batch processing"

# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the image
docker build -t us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:v1 .

# Test locally first
docker run \
  -e BATCH_TASK_INDEX=0 \
  -e BATCH_TASK_COUNT=1 \
  -e INPUT_BUCKET=my-test-bucket \
  -e OUTPUT_BUCKET=my-test-bucket \
  us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:v1

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:v1
```

## Step 3: Create the Batch Job with Container Configuration

Submit a Cloud Batch job that runs the container with custom environment variables.

```python
from google.cloud import batch_v1

def create_container_batch_job(
    project_id, region, job_name, image_uri, task_count, env_vars
):
    """Creates a batch job that runs a Docker container."""
    client = batch_v1.BatchServiceClient()

    # Define the container runnable
    container = batch_v1.Runnable.Container()
    container.image_uri = image_uri

    # Pass custom environment variables to the container
    runnable = batch_v1.Runnable()
    runnable.container = container
    runnable.environment = batch_v1.Environment(
        variables=env_vars
    )

    # Resource allocation per task
    resources = batch_v1.ComputeResource()
    resources.cpu_milli = 4000    # 4 vCPUs
    resources.memory_mib = 8192   # 8 GB

    # Task specification
    task = batch_v1.TaskSpec()
    task.runnables = [runnable]
    task.compute_resource = resources
    task.max_retry_count = 3
    task.max_run_duration = "3600s"  # 1 hour max

    # Task group
    group = batch_v1.TaskGroup()
    group.task_spec = task
    group.task_count = task_count
    group.parallelism = min(task_count, 10)

    # Allocation policy
    instance_policy = batch_v1.AllocationPolicy.InstancePolicy()
    instance_policy.machine_type = "e2-standard-4"

    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    instance.policy = instance_policy

    allocation = batch_v1.AllocationPolicy()
    allocation.instances = [instance]

    # Build and submit job
    job = batch_v1.Job()
    job.task_groups = [group]
    job.allocation_policy = allocation
    job.logs_policy = batch_v1.LogsPolicy(
        destination=batch_v1.LogsPolicy.Destination.CLOUD_LOGGING
    )

    request = batch_v1.CreateJobRequest(
        parent=f"projects/{project_id}/locations/{region}",
        job=job,
        job_id=job_name,
    )

    response = client.create_job(request=request)
    print(f"Container batch job created: {response.name}")
    return response

# Create the job
create_container_batch_job(
    "my-project",
    "us-central1",
    "data-processing-v1",
    "us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:v1",
    task_count=20,
    env_vars={
        "INPUT_BUCKET": "my-production-data",
        "OUTPUT_BUCKET": "my-production-results",
        "PROCESSING_DATE": "2026-02-17",
    }
)
```

## Step 4: Multi-Container Jobs

Sometimes you need to run multiple containers in sequence for a single task - for example, downloading data with one container and processing it with another.

```python
from google.cloud import batch_v1

def create_multi_container_job(project_id, region, job_name):
    """Creates a batch job with multiple sequential containers per task."""
    client = batch_v1.BatchServiceClient()

    # Step 1: Download and prepare data
    download_runnable = batch_v1.Runnable()
    download_runnable.container = batch_v1.Runnable.Container()
    download_runnable.container.image_uri = "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
    download_runnable.container.commands = [
        "bash", "-c",
        "gsutil cp gs://my-bucket/input/file_${BATCH_TASK_INDEX}.tar.gz /mnt/share/ && "
        "tar -xzf /mnt/share/file_${BATCH_TASK_INDEX}.tar.gz -C /mnt/share/"
    ]
    download_runnable.container.volumes = ["/mnt/share:/mnt/share"]

    # Step 2: Process the data with custom image
    process_runnable = batch_v1.Runnable()
    process_runnable.container = batch_v1.Runnable.Container()
    process_runnable.container.image_uri = (
        "us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:v1"
    )
    process_runnable.container.commands = [
        "python", "process.py",
        "--input-dir=/mnt/share/",
        "--output-dir=/mnt/share/output/"
    ]
    process_runnable.container.volumes = ["/mnt/share:/mnt/share"]

    # Step 3: Upload results
    upload_runnable = batch_v1.Runnable()
    upload_runnable.container = batch_v1.Runnable.Container()
    upload_runnable.container.image_uri = "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
    upload_runnable.container.commands = [
        "bash", "-c",
        "gsutil -m cp -r /mnt/share/output/* gs://my-bucket/output/task_${BATCH_TASK_INDEX}/"
    ]
    upload_runnable.container.volumes = ["/mnt/share:/mnt/share"]

    # Task spec with all three runnables in sequence
    task = batch_v1.TaskSpec()
    task.runnables = [download_runnable, process_runnable, upload_runnable]
    task.compute_resource = batch_v1.ComputeResource(
        cpu_milli=4000, memory_mib=8192
    )
    task.max_retry_count = 2

    # Configure shared volume between containers
    volume = batch_v1.Volume()
    volume.device_name = "share"
    volume.mount_path = "/mnt/share"
    task.volumes = [volume]

    group = batch_v1.TaskGroup()
    group.task_spec = task
    group.task_count = 50
    group.parallelism = 10

    job = batch_v1.Job()
    job.task_groups = [group]

    allocation = batch_v1.AllocationPolicy()
    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    instance.policy = batch_v1.AllocationPolicy.InstancePolicy(
        machine_type="e2-standard-4"
    )
    allocation.instances = [instance]
    job.allocation_policy = allocation
    job.logs_policy = batch_v1.LogsPolicy(
        destination=batch_v1.LogsPolicy.Destination.CLOUD_LOGGING
    )

    request = batch_v1.CreateJobRequest(
        parent=f"projects/{project_id}/locations/{region}",
        job=job,
        job_id=job_name,
    )

    response = client.create_job(request=request)
    print(f"Multi-container job created: {response.name}")
    return response
```

## Step 5: Image Versioning and Rollback

Use image tags to manage processing versions and enable rollback.

```bash
# Tag images with version and date
docker build -t us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:v2 .
docker build -t us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:2026-02-17 .

# Push all tags
docker push us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:v2
docker push us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor:2026-02-17

# List available image versions
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/MY_PROJECT/batch-images/data-processor
```

## Summary

Running containerized workloads on Google Cloud Batch gives you the reproducibility and dependency management of Docker with the scalability and cost efficiency of managed batch processing. Build your processing logic into a Docker image, push it to Artifact Registry, and reference it in your batch job configuration. Use environment variables to pass task-specific configuration, shared volumes for inter-container data exchange in multi-container jobs, and image tags for version management. Test containers locally with Docker before submitting to Cloud Batch to catch issues early - the fast feedback loop of local testing combined with the scale of cloud execution is a powerful workflow.
