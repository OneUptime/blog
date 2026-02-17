# How to Mount Cloud Storage Buckets as File Systems in Google Cloud Batch Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Batch, Cloud Storage, GCS Fuse, File System, Batch Processing, Google Cloud

Description: Mount Cloud Storage buckets as file systems in Google Cloud Batch jobs using GCS FUSE for seamless file-based data access in batch processing workloads.

---

Many batch processing workloads are written to work with local files - reading input from a directory, processing it, and writing output to another directory. Rewriting this code to use Cloud Storage client libraries means changing your application logic. GCS FUSE provides a simpler path: mount a Cloud Storage bucket as a local file system, and your existing file-based code works without modification. Google Cloud Batch has built-in support for GCS FUSE volumes, making it straightforward to configure.

In this post, I will show you how to mount Cloud Storage buckets in batch jobs, configure read and write permissions, handle performance tuning, and work around common gotchas.

## How GCS FUSE Works

GCS FUSE is a FUSE adapter that presents a Cloud Storage bucket as a local directory. When your application reads a file from the mounted path, GCS FUSE translates that into a Cloud Storage API call behind the scenes. Writes work similarly - data written to the mounted path gets uploaded to the bucket.

```mermaid
graph LR
    A[Batch Task Code] -->|read/write files| B[/mnt/gcs/]
    B -->|GCS FUSE| C[Cloud Storage API]
    C -->|objects| D[GCS Bucket]
```

Important caveats:

- GCS FUSE is not a POSIX-compliant file system - some operations like file locking and atomic renames do not work
- Performance is not the same as a local SSD - there is latency on each file operation
- It works great for read-heavy workloads and sequential writes, but poorly for random access patterns

## Prerequisites

- Cloud Batch API enabled
- A Cloud Storage bucket with your data
- The batch job's service account needs `storage.objectViewer` (for read) or `storage.objectAdmin` (for read/write) on the bucket

## Step 1: Create a Basic Job with GCS FUSE Mount

The simplest configuration mounts a single bucket at a specified path.

```bash
# Create a batch job with a GCS FUSE mounted bucket
gcloud batch jobs submit gcs-mount-job \
  --location=us-central1 \
  --config=- <<'EOF'
{
  "taskGroups": [
    {
      "taskSpec": {
        "runnables": [
          {
            "script": {
              "text": "echo 'Files in mounted bucket:'\nls -la /mnt/input/\necho 'Processing files...'\nfor f in /mnt/input/data/*.csv; do\n  echo \"Processing $f\"\n  wc -l \"$f\" >> /mnt/output/results_${BATCH_TASK_INDEX}.txt\ndone\necho 'Done'"
            }
          }
        ],
        "volumes": [
          {
            "gcs": {
              "remotePath": "my-input-bucket"
            },
            "mountPath": "/mnt/input",
            "mountOptions": ["implicit-dirs", "file-mode=444", "dir-mode=555"]
          },
          {
            "gcs": {
              "remotePath": "my-output-bucket"
            },
            "mountPath": "/mnt/output",
            "mountOptions": ["implicit-dirs"]
          }
        ],
        "computeResource": {
          "cpuMilli": 2000,
          "memoryMib": 4096
        },
        "maxRetryCount": 2,
        "maxRunDuration": "3600s"
      },
      "taskCount": 10,
      "parallelism": 5
    }
  ],
  "allocationPolicy": {
    "instances": [
      {
        "policy": {
          "machineType": "e2-standard-4"
        }
      }
    ]
  },
  "logsPolicy": {
    "destination": "CLOUD_LOGGING"
  }
}
EOF
```

## Step 2: Configure with the Python Client

For more control over mount options and multiple bucket configurations:

```python
from google.cloud import batch_v1

def create_gcs_mount_job(project_id, region, job_name, input_bucket, output_bucket):
    """Creates a batch job with GCS FUSE mounted buckets."""
    client = batch_v1.BatchServiceClient()

    # Container runnable that reads/writes to mounted paths
    runnable = batch_v1.Runnable()
    runnable.container = batch_v1.Runnable.Container()
    runnable.container.image_uri = f"gcr.io/{project_id}/data-processor:latest"
    runnable.container.commands = [
        "python", "process.py",
        "--input-dir=/mnt/input/data",
        "--output-dir=/mnt/output/results",
        "--task-index=${BATCH_TASK_INDEX}",
    ]
    # Mount the GCS volumes inside the container
    runnable.container.volumes = [
        "/mnt/input:/mnt/input",
        "/mnt/output:/mnt/output",
    ]

    # Define the GCS FUSE volumes
    input_volume = batch_v1.Volume()
    input_volume.gcs = batch_v1.GCS(remote_path=input_bucket)
    input_volume.mount_path = "/mnt/input"
    input_volume.mount_options = [
        "implicit-dirs",          # Show directories that only exist as prefixes
        "file-mode=444",          # Read-only file permissions
        "dir-mode=555",           # Read-only directory permissions
        "max-conns-per-host=100", # Increase parallel connections for throughput
    ]

    output_volume = batch_v1.Volume()
    output_volume.gcs = batch_v1.GCS(remote_path=output_bucket)
    output_volume.mount_path = "/mnt/output"
    output_volume.mount_options = [
        "implicit-dirs",
    ]

    # Task spec with volumes
    task = batch_v1.TaskSpec()
    task.runnables = [runnable]
    task.compute_resource = batch_v1.ComputeResource(
        cpu_milli=4000,
        memory_mib=8192,
    )
    task.volumes = [input_volume, output_volume]
    task.max_retry_count = 3
    task.max_run_duration = "3600s"

    # Task group
    group = batch_v1.TaskGroup()
    group.task_spec = task
    group.task_count = 20
    group.parallelism = 10

    # Allocation
    instance_policy = batch_v1.AllocationPolicy.InstancePolicy()
    instance_policy.machine_type = "e2-standard-4"
    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    instance.policy = instance_policy

    allocation = batch_v1.AllocationPolicy()
    allocation.instances = [instance]

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
    print(f"GCS mount batch job created: {response.name}")
    return response

create_gcs_mount_job(
    "my-project",
    "us-central1",
    "gcs-processing-001",
    "my-input-data-bucket",
    "my-output-results-bucket"
)
```

## Step 3: Mount Specific Bucket Prefixes

You do not have to mount the entire bucket. Mount a specific prefix (directory) for faster listing and reduced scope.

```python
# Mount only a specific prefix within the bucket
input_volume = batch_v1.Volume()
input_volume.gcs = batch_v1.GCS(
    remote_path="my-bucket/data/2026-02-17/"  # Only mount this prefix
)
input_volume.mount_path = "/mnt/input"
```

## Step 4: Optimize Performance

GCS FUSE performance depends heavily on your access patterns. Here are configurations for common scenarios.

For read-heavy workloads with large files:

```python
# Optimized for reading large files sequentially
input_volume.mount_options = [
    "implicit-dirs",
    "file-mode=444",
    "dir-mode=555",
    "max-conns-per-host=100",    # More parallel connections
    "stat-cache-ttl=60s",        # Cache file metadata for 60 seconds
    "type-cache-ttl=60s",        # Cache directory listing for 60 seconds
    "kernel-list-cache-ttl-secs=60",  # Kernel-level directory cache
]
```

For write-heavy workloads:

```python
# Optimized for writing output files
output_volume.mount_options = [
    "implicit-dirs",
    "file-mode=666",
    "dir-mode=777",
    "max-conns-per-host=100",
]
```

For workloads that process many small files, consider copying to local disk first:

```python
# For small file workloads, copy to local SSD first, then process
runnable = batch_v1.Runnable()
runnable.script = batch_v1.Runnable.Script()
runnable.script.text = """#!/bin/bash
# Copy input files to local SSD for faster random access
echo "Copying input files to local disk..."
cp -r /mnt/gcs/input/partition_${BATCH_TASK_INDEX}/ /tmp/local_input/

# Process from local disk (much faster for random access patterns)
echo "Processing from local disk..."
python process.py --input=/tmp/local_input/ --output=/tmp/local_output/

# Copy results back to GCS
echo "Uploading results..."
cp -r /tmp/local_output/* /mnt/gcs/output/task_${BATCH_TASK_INDEX}/
echo "Done"
"""
```

## Step 5: Handle Concurrent Writes

Multiple tasks writing to the same bucket works, but they should not write to the same files. Use task-specific output paths to avoid conflicts.

```python
# Pattern: Each task writes to its own output path
# In your processing script:
import os

task_index = os.environ.get("BATCH_TASK_INDEX", "0")
output_dir = f"/mnt/output/task_{task_index}"
os.makedirs(output_dir, exist_ok=True)

# Write results to task-specific directory
with open(f"{output_dir}/results.json", "w") as f:
    json.dump(results, f)
```

## Step 6: Combine GCS FUSE with Local Disk

For optimal performance, use GCS FUSE for initial data access and local disk for temporary processing.

```python
from google.cloud import batch_v1

def create_hybrid_storage_job(project_id, region, job_name):
    """Creates a job that uses both GCS FUSE and local SSD."""
    client = batch_v1.BatchServiceClient()

    runnable = batch_v1.Runnable()
    runnable.script = batch_v1.Runnable.Script()
    runnable.script.text = """#!/bin/bash
    # GCS FUSE mount at /mnt/gcs for input/output
    # Local SSD at /mnt/local for temporary fast storage

    # Copy today's partition to local SSD
    echo "Staging data to local SSD..."
    cp /mnt/gcs/input/partition_${BATCH_TASK_INDEX}.parquet /mnt/local/

    # Process using local SSD (fast random access)
    echo "Processing..."
    python process.py \
      --input=/mnt/local/partition_${BATCH_TASK_INDEX}.parquet \
      --output=/mnt/local/result_${BATCH_TASK_INDEX}.parquet \
      --temp-dir=/mnt/local/tmp/

    # Write results back to GCS
    echo "Uploading results..."
    cp /mnt/local/result_${BATCH_TASK_INDEX}.parquet /mnt/gcs/output/
    echo "Task ${BATCH_TASK_INDEX} complete"
    """

    # GCS FUSE volume
    gcs_volume = batch_v1.Volume()
    gcs_volume.gcs = batch_v1.GCS(remote_path="my-data-bucket")
    gcs_volume.mount_path = "/mnt/gcs"
    gcs_volume.mount_options = ["implicit-dirs"]

    # Local SSD volume
    local_volume = batch_v1.Volume()
    local_volume.device_name = "local-ssd"
    local_volume.mount_path = "/mnt/local"

    task = batch_v1.TaskSpec()
    task.runnables = [runnable]
    task.compute_resource = batch_v1.ComputeResource(
        cpu_milli=4000, memory_mib=8192
    )
    task.volumes = [gcs_volume, local_volume]
    task.max_retry_count = 3

    group = batch_v1.TaskGroup()
    group.task_spec = task
    group.task_count = 50
    group.parallelism = 10

    # Use instance with local SSD
    instance_policy = batch_v1.AllocationPolicy.InstancePolicy()
    instance_policy.machine_type = "n2-standard-4"
    instance_policy.disks = [
        batch_v1.AllocationPolicy.AttachedDisk(
            new_disk=batch_v1.AllocationPolicy.Disk(
                type_="local-ssd",
                size_gb=375,
            ),
            device_name="local-ssd",
        )
    ]

    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    instance.policy = instance_policy

    allocation = batch_v1.AllocationPolicy()
    allocation.instances = [instance]

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
    print(f"Hybrid storage job created: {response.name}")
    return response
```

## Summary

Mounting Cloud Storage buckets in Google Cloud Batch jobs with GCS FUSE lets you use file-based processing code without rewriting it for object storage APIs. The key is understanding the performance characteristics: GCS FUSE works well for sequential reads of large files and streaming writes, but poorly for random access patterns with many small files. For the best of both worlds, use GCS FUSE to stage data to and from Cloud Storage, and local SSD for the actual processing. Always use task-specific output paths to avoid write conflicts, and tune the mount options for your specific access pattern.
