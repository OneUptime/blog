# How to Use Spot VMs with Google Cloud Batch to Reduce Batch Processing Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Batch, Spot VMs, Cost Optimization, Preemptible, Batch Processing, Google Cloud

Description: Use Spot VMs with Google Cloud Batch to reduce batch processing costs by up to 60-91% while handling preemption gracefully with automatic retries.

---

Batch processing workloads are the ideal candidate for Spot VMs (formerly called preemptible VMs). These are excess Compute Engine capacity available at a steep discount - typically 60-91% cheaper than on-demand pricing. The catch is that Google can reclaim them with 30 seconds notice when the capacity is needed elsewhere. For batch jobs, this is usually fine because Cloud Batch handles the preemption automatically: it detects when a VM is reclaimed, reschedules the affected tasks on new VMs, and retries them.

In this post, I will show you how to configure Spot VMs with Cloud Batch, handle preemption properly in your task code, set up fallback to on-demand VMs, and estimate the cost savings.

## How Much Can You Save

The savings depend on the machine type and region, but here are typical discount ranges:

| Machine Type | On-Demand $/hr | Spot $/hr | Savings |
|-------------|---------------|-----------|---------|
| e2-standard-4 | ~$0.134 | ~$0.040 | 70% |
| n2-standard-8 | ~$0.388 | ~$0.078 | 80% |
| c2-standard-16 | ~$0.834 | ~$0.167 | 80% |
| a2-highgpu-1g (A100) | ~$3.673 | ~$1.102 | 70% |

For a batch job that uses 100 VM-hours, switching from on-demand to Spot could save you $250+ depending on the machine type.

## Prerequisites

- Google Cloud Batch API enabled
- Spot VM quota in your target region (separate from on-demand quota)
- Workloads that can tolerate restarts (most batch workloads can)

## Step 1: Create a Basic Spot VM Batch Job

The simplest configuration just sets the provisioning model to SPOT in the allocation policy.

```bash
# Create a batch job using Spot VMs
gcloud batch jobs submit spot-batch-job \
  --location=us-central1 \
  --config=- <<'EOF'
{
  "taskGroups": [
    {
      "taskSpec": {
        "runnables": [
          {
            "container": {
              "imageUri": "gcr.io/MY_PROJECT/batch-processor:latest",
              "commands": ["python", "process.py"]
            }
          }
        ],
        "computeResource": {
          "cpuMilli": 4000,
          "memoryMib": 8192
        },
        "maxRetryCount": 5,
        "maxRunDuration": "7200s"
      },
      "taskCount": 100,
      "parallelism": 20
    }
  ],
  "allocationPolicy": {
    "instances": [
      {
        "policy": {
          "machineType": "e2-standard-4",
          "provisioningModel": "SPOT"
        }
      }
    ],
    "location": {
      "allowedLocations": [
        "zones/us-central1-a",
        "zones/us-central1-b",
        "zones/us-central1-c",
        "zones/us-central1-f"
      ]
    }
  },
  "logsPolicy": {
    "destination": "CLOUD_LOGGING"
  }
}
EOF
```

Key settings for Spot VMs:

- `provisioningModel: "SPOT"` - requests Spot VMs instead of on-demand
- `maxRetryCount: 5` - higher retry count to handle preemptions
- Multiple `allowedLocations` - more zones means better chance of getting capacity

## Step 2: Configure with the Python Client

For more control, use the Python client library to set up Spot VM jobs with fallback policies.

```python
from google.cloud import batch_v1

def create_spot_batch_job(project_id, region, job_name, task_count):
    """Creates a batch job using Spot VMs with fallback to on-demand."""
    client = batch_v1.BatchServiceClient()

    # Container workload
    runnable = batch_v1.Runnable()
    runnable.container = batch_v1.Runnable.Container()
    runnable.container.image_uri = f"gcr.io/{project_id}/batch-processor:latest"
    runnable.container.commands = ["python", "process.py"]

    # Task spec with higher retry count for preemption handling
    task = batch_v1.TaskSpec()
    task.runnables = [runnable]
    task.compute_resource = batch_v1.ComputeResource(
        cpu_milli=4000,
        memory_mib=8192,
    )
    task.max_retry_count = 5  # Allow retries for preemption
    task.max_run_duration = "7200s"

    # Task group
    group = batch_v1.TaskGroup()
    group.task_spec = task
    group.task_count = task_count
    group.parallelism = min(task_count, 20)

    # Spot VM allocation policy
    spot_policy = batch_v1.AllocationPolicy.InstancePolicy()
    spot_policy.machine_type = "e2-standard-4"
    spot_policy.provisioning_model = (
        batch_v1.AllocationPolicy.ProvisioningModel.SPOT
    )

    spot_instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    spot_instance.policy = spot_policy

    allocation = batch_v1.AllocationPolicy()
    allocation.instances = [spot_instance]

    # Allow multiple zones for better Spot availability
    location = batch_v1.AllocationPolicy.LocationPolicy()
    location.allowed_locations = [
        f"zones/{region}-a",
        f"zones/{region}-b",
        f"zones/{region}-c",
        f"zones/{region}-f",
    ]
    allocation.location = location

    # Build the job
    job = batch_v1.Job()
    job.task_groups = [group]
    job.allocation_policy = allocation
    job.logs_policy = batch_v1.LogsPolicy(
        destination=batch_v1.LogsPolicy.Destination.CLOUD_LOGGING
    )

    # Submit
    request = batch_v1.CreateJobRequest(
        parent=f"projects/{project_id}/locations/{region}",
        job=job,
        job_id=job_name,
    )

    response = client.create_job(request=request)
    print(f"Spot VM batch job created: {response.name}")
    print(f"Tasks: {task_count}, Parallelism: {min(task_count, 20)}")
    return response

create_spot_batch_job("my-project", "us-central1", "spot-processing-001", 100)
```

## Step 3: Write Preemption-Aware Task Code

While Cloud Batch handles retries automatically, your task code can be smarter about preemption by checkpointing progress.

This Python script saves checkpoints so that retried tasks can resume from where they left off:

```python
import os
import json
import signal
import sys
from google.cloud import storage
from datetime import datetime

# Track whether we have been signaled for preemption
preempted = False

def handle_preemption(signum, frame):
    """Handles the SIGTERM signal sent before preemption."""
    global preempted
    print(f"Received SIGTERM at {datetime.now()} - saving checkpoint before preemption")
    preempted = True

# Register the signal handler for graceful shutdown
signal.signal(signal.SIGTERM, handle_preemption)

def main():
    task_index = int(os.environ.get("BATCH_TASK_INDEX", "0"))
    gcs_client = storage.Client()
    checkpoint_bucket = gcs_client.bucket("my-checkpoints-bucket")

    # Check for existing checkpoint from a previous attempt
    checkpoint_blob = checkpoint_bucket.blob(f"checkpoints/task_{task_index}.json")
    start_from = 0

    if checkpoint_blob.exists():
        checkpoint = json.loads(checkpoint_blob.download_as_text())
        start_from = checkpoint.get("last_completed_item", 0) + 1
        print(f"Resuming task {task_index} from item {start_from}")

    # Get the list of items to process
    items = get_work_items(task_index)
    total_items = len(items)

    print(f"Task {task_index}: Processing items {start_from} to {total_items - 1}")

    for i in range(start_from, total_items):
        # Check for preemption signal before each item
        if preempted:
            save_checkpoint(checkpoint_blob, task_index, i - 1)
            print(f"Checkpoint saved at item {i - 1}. Exiting for preemption.")
            sys.exit(0)

        # Process the item
        process_item(items[i])

        # Save checkpoint every 10 items
        if i % 10 == 0:
            save_checkpoint(checkpoint_blob, task_index, i)

    # Clean up checkpoint after successful completion
    if checkpoint_blob.exists():
        checkpoint_blob.delete()

    print(f"Task {task_index} complete. Processed {total_items - start_from} items.")

def save_checkpoint(blob, task_index, last_item):
    """Saves a progress checkpoint to GCS."""
    checkpoint = {
        "task_index": task_index,
        "last_completed_item": last_item,
        "timestamp": datetime.now().isoformat(),
    }
    blob.upload_from_string(json.dumps(checkpoint))

def get_work_items(task_index):
    """Returns the list of items this task should process."""
    # This would typically query a database or list files
    return list(range(1000))  # Placeholder

def process_item(item):
    """Processes a single work item."""
    # Actual processing logic here
    import time
    time.sleep(0.1)  # Simulate work

if __name__ == "__main__":
    main()
```

## Step 4: Estimate Cost Savings

Calculate expected savings for your workload:

```python
def estimate_spot_savings(
    machine_type,
    on_demand_price_per_hour,
    spot_price_per_hour,
    task_count,
    avg_task_duration_hours,
    parallelism,
    expected_preemption_rate=0.05,
):
    """Estimates cost savings from using Spot VMs.

    Args:
        expected_preemption_rate: Fraction of tasks expected to be preempted (0-1)
    """
    # On-demand cost: straightforward
    on_demand_hours = task_count * avg_task_duration_hours
    on_demand_cost = on_demand_hours * on_demand_price_per_hour

    # Spot cost: includes extra work from retried preempted tasks
    # Assume preempted tasks lose half their progress on average
    extra_hours = task_count * expected_preemption_rate * (avg_task_duration_hours * 0.5)
    spot_hours = on_demand_hours + extra_hours
    spot_cost = spot_hours * spot_price_per_hour

    savings = on_demand_cost - spot_cost
    savings_pct = (savings / on_demand_cost) * 100

    # Wall clock time (total elapsed time, not VM-hours)
    on_demand_wall = (task_count / parallelism) * avg_task_duration_hours
    spot_wall = on_demand_wall * (1 + expected_preemption_rate * 0.5)

    print(f"Machine type: {machine_type}")
    print(f"On-demand cost: ${on_demand_cost:.2f} ({on_demand_hours:.0f} VM-hours)")
    print(f"Spot cost:      ${spot_cost:.2f} ({spot_hours:.0f} VM-hours)")
    print(f"Savings:        ${savings:.2f} ({savings_pct:.0f}%)")
    print(f"On-demand wall time: {on_demand_wall:.1f} hours")
    print(f"Spot wall time:      {spot_wall:.1f} hours (with preemption overhead)")

# Example: 100 tasks, 1 hour each, 20 parallel
estimate_spot_savings(
    "e2-standard-4",
    on_demand_price_per_hour=0.134,
    spot_price_per_hour=0.040,
    task_count=100,
    avg_task_duration_hours=1.0,
    parallelism=20,
    expected_preemption_rate=0.05,
)
```

## Step 5: Best Practices for Spot VM Batch Jobs

Follow these practices to maximize reliability with Spot VMs:

1. **Use multiple zones**: Spread across 3-4 zones to reduce the chance of all capacity being reclaimed simultaneously
2. **Keep tasks short**: Tasks under 1 hour are less likely to get preempted. If possible, break long tasks into smaller chunks
3. **Checkpoint progress**: For tasks longer than 15 minutes, save progress periodically
4. **Set generous retry counts**: A `maxRetryCount` of 3-5 handles most preemption scenarios
5. **Use diverse machine types**: If one type is scarce, consider allowing Cloud Batch to choose from a set of equivalent types
6. **Monitor preemption rates**: Track how often tasks are preempted and adjust parallelism accordingly

```bash
# Monitor job progress and preemption events
gcloud logging read \
  'resource.type="batch.googleapis.com/Job" AND labels.job_uid="JOB_UID" AND textPayload:"preempt"' \
  --format="table(timestamp, textPayload)" \
  --limit=50
```

## Summary

Spot VMs with Google Cloud Batch can cut your batch processing costs by 60-91% with minimal effort. The key is that batch workloads are naturally fault-tolerant - tasks can be retried without side effects, and Cloud Batch handles the retry logic automatically. Write your tasks to be idempotent, add checkpointing for longer-running tasks, spread across multiple zones for availability, and set a generous retry count. The slight increase in total processing time from occasional preemptions is usually a very good trade for the dramatic cost reduction.
