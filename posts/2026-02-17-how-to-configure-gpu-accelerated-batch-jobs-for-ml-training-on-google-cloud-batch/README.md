# How to Configure GPU-Accelerated Batch Jobs for ML Training on Google Cloud Batch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Batch, GPU, Machine Learning, Training, NVIDIA, Google Cloud

Description: Configure GPU-accelerated batch jobs on Google Cloud Batch for machine learning training workloads with NVIDIA GPUs and automatic resource management.

---

Training machine learning models often requires GPU resources, but you do not always need them running 24/7. Maybe you train models nightly on new data, run hyperparameter sweeps on weekends, or periodically retrain when model drift is detected. Google Cloud Batch is a good fit for these scenarios because it provisions GPU-equipped VMs only when your job runs, executes the training, and tears everything down when it finishes. No idle GPUs burning money.

In this post, I will show you how to configure Cloud Batch jobs with NVIDIA GPUs, set up the CUDA drivers, run containerized training workloads, and handle common GPU-specific challenges.

## Why Cloud Batch for ML Training

Compared to other options like Vertex AI Training or GKE, Cloud Batch gives you:

- Direct control over the VM and GPU configuration
- No framework lock-in - run any training code, any framework
- Simple pricing model - pay for VM time only
- Built-in retry logic for handling GPU errors
- Automatic cleanup so you do not forget to delete expensive GPU VMs

The tradeoff is that you handle more of the setup yourself compared to a managed training service.

## Prerequisites

- A Google Cloud project with Batch API and Compute Engine API enabled
- GPU quota in your target region (check and request at IAM > Quotas)
- A containerized training script (recommended) or training code in Cloud Storage

## Step 1: Check GPU Quota

Before creating a GPU batch job, verify you have sufficient GPU quota in your region.

```bash
# Check NVIDIA T4 GPU quota in us-central1
gcloud compute regions describe us-central1 \
  --format="table(quotas.filter(metric='NVIDIA_T4_GPUS').metric, quotas.filter(metric='NVIDIA_T4_GPUS').limit, quotas.filter(metric='NVIDIA_T4_GPUS').usage)"

# Check NVIDIA A100 GPU quota
gcloud compute regions describe us-central1 \
  --format="table(quotas.filter(metric='NVIDIA_A100_GPUS').metric, quotas.filter(metric='NVIDIA_A100_GPUS').limit, quotas.filter(metric='NVIDIA_A100_GPUS').usage)"
```

## Step 2: Create a GPU Batch Job with gcloud

This is the simplest way to run a GPU-accelerated batch job. The job installs GPU drivers automatically and runs your training script.

```bash
# Create a batch job with NVIDIA T4 GPU
gcloud batch jobs submit gpu-training-job \
  --location=us-central1 \
  --config=- <<'EOF'
{
  "taskGroups": [
    {
      "taskSpec": {
        "runnables": [
          {
            "container": {
              "imageUri": "gcr.io/MY_PROJECT/ml-training:latest",
              "entrypoint": "python",
              "commands": [
                "train.py",
                "--epochs=50",
                "--batch-size=64",
                "--learning-rate=0.001",
                "--model-output=gs://my-models-bucket/model_${BATCH_TASK_INDEX}"
              ],
              "volumes": ["/mnt/disks/data:/data"]
            }
          }
        ],
        "computeResource": {
          "cpuMilli": 4000,
          "memoryMib": 16384
        },
        "maxRetryCount": 2,
        "maxRunDuration": "14400s"
      },
      "taskCount": 1,
      "parallelism": 1
    }
  ],
  "allocationPolicy": {
    "instances": [
      {
        "installGpuDrivers": true,
        "policy": {
          "machineType": "n1-standard-8",
          "accelerators": [
            {
              "type": "nvidia-tesla-t4",
              "count": 1
            }
          ]
        }
      }
    ],
    "location": {
      "allowedLocations": ["zones/us-central1-a", "zones/us-central1-b"]
    }
  },
  "logsPolicy": {
    "destination": "CLOUD_LOGGING"
  }
}
EOF
```

Key settings for GPU jobs:

- `installGpuDrivers: true` - Cloud Batch automatically installs the appropriate NVIDIA drivers
- `accelerators` - specifies the GPU type and count
- `machineType` - must be compatible with the chosen GPU (e.g., n1-standard for T4, a2-highgpu for A100)

## Step 3: Create a GPU Job with the Python Client

For programmatic control, especially when running hyperparameter sweeps, use the Python client.

This script creates a GPU batch job for distributed hyperparameter tuning:

```python
from google.cloud import batch_v1

def create_gpu_training_job(project_id, region, job_name, gpu_type, gpu_count, task_count):
    """Creates a GPU batch job for ML training."""
    client = batch_v1.BatchServiceClient()

    # Define the containerized training workload
    runnable = batch_v1.Runnable()
    runnable.container = batch_v1.Runnable.Container()
    runnable.container.image_uri = f"gcr.io/{project_id}/ml-training:latest"
    runnable.container.commands = [
        "python", "train.py",
        "--task-index=${BATCH_TASK_INDEX}",
        "--task-count=${BATCH_TASK_COUNT}",
        "--model-output=gs://my-models-bucket/experiments/${BATCH_TASK_INDEX}",
    ]
    # Enable GPU access inside the container
    runnable.container.options = "--gpus all"

    # Define compute resources per task
    resources = batch_v1.ComputeResource()
    resources.cpu_milli = 8000     # 8 vCPUs
    resources.memory_mib = 32768   # 32 GB RAM

    # Build task spec
    task = batch_v1.TaskSpec()
    task.runnables = [runnable]
    task.compute_resource = resources
    task.max_retry_count = 2
    task.max_run_duration = "28800s"  # 8 hours max

    # Task group - one task per hyperparameter combination
    group = batch_v1.TaskGroup()
    group.task_spec = task
    group.task_count = task_count
    group.parallelism = min(task_count, 4)  # Run up to 4 in parallel

    # GPU allocation policy
    accelerator = batch_v1.AllocationPolicy.Accelerator()
    accelerator.type_ = gpu_type
    accelerator.count = gpu_count

    # Machine type depends on GPU choice
    machine_types = {
        "nvidia-tesla-t4": "n1-standard-8",
        "nvidia-tesla-v100": "n1-standard-8",
        "nvidia-tesla-a100": "a2-highgpu-1g",
        "nvidia-l4": "g2-standard-8",
    }

    instance_policy = batch_v1.AllocationPolicy.InstancePolicy()
    instance_policy.machine_type = machine_types.get(gpu_type, "n1-standard-8")
    instance_policy.accelerators = [accelerator]

    instance = batch_v1.AllocationPolicy.InstancePolicyOrTemplate()
    instance.policy = instance_policy
    instance.install_gpu_drivers = True

    allocation = batch_v1.AllocationPolicy()
    allocation.instances = [instance]

    location = batch_v1.AllocationPolicy.LocationPolicy()
    location.allowed_locations = [
        f"zones/{region}-a",
        f"zones/{region}-b",
        f"zones/{region}-c",
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
    print(f"GPU training job created: {response.name}")
    return response

# Run hyperparameter sweep with T4 GPUs
create_gpu_training_job(
    "my-project",
    "us-central1",
    "hparam-sweep-001",
    gpu_type="nvidia-tesla-t4",
    gpu_count=1,
    task_count=16  # 16 hyperparameter combinations
)
```

## Step 4: Build the Training Container

Your training container needs CUDA support. Here is a Dockerfile that works with Cloud Batch GPU jobs:

```dockerfile
# Use NVIDIA's CUDA base image matching your driver version
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install ML training dependencies
COPY requirements.txt /app/
RUN pip3 install -r /app/requirements.txt

# Copy training code
COPY train.py /app/
COPY model/ /app/model/

WORKDIR /app

# Verify GPU is accessible at build time (optional)
# RUN python3 -c "import torch; print(torch.cuda.is_available())"

ENTRYPOINT ["python3"]
CMD ["train.py"]
```

The training script should use the BATCH_TASK_INDEX environment variable to select different hyperparameters:

```python
import os
import torch
import json

# Hyperparameter grid - each task gets a different combination
HPARAM_GRID = [
    {"lr": 0.001, "batch_size": 32, "hidden_size": 128},
    {"lr": 0.001, "batch_size": 64, "hidden_size": 256},
    {"lr": 0.0001, "batch_size": 32, "hidden_size": 128},
    {"lr": 0.0001, "batch_size": 64, "hidden_size": 256},
    # ... more combinations
]

def main():
    # Get task index from Cloud Batch environment variable
    task_index = int(os.environ.get("BATCH_TASK_INDEX", "0"))

    # Select hyperparameters for this task
    hparams = HPARAM_GRID[task_index % len(HPARAM_GRID)]
    print(f"Task {task_index}: Training with {hparams}")

    # Verify GPU is available
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"Memory: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

    # Training loop (simplified)
    model = build_model(hparams["hidden_size"]).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=hparams["lr"])

    for epoch in range(50):
        train_loss = train_epoch(model, optimizer, hparams["batch_size"], device)
        val_loss = validate(model, device)
        print(f"Epoch {epoch}: train_loss={train_loss:.4f}, val_loss={val_loss:.4f}")

    # Save results
    output_path = os.environ.get("MODEL_OUTPUT", f"/tmp/model_{task_index}")
    save_results(model, hparams, output_path)

if __name__ == "__main__":
    main()
```

## Step 5: Monitor GPU Utilization

Check that your tasks are actually using the GPUs efficiently:

```bash
# View GPU-related logs for a task
gcloud logging read \
  'resource.type="batch.googleapis.com/Job" AND labels.job_uid="JOB_UID"' \
  --format="table(timestamp, textPayload)" \
  --limit=100
```

Add GPU monitoring to your training script:

```python
import subprocess

def log_gpu_stats():
    """Logs NVIDIA GPU utilization statistics."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            gpu_util, mem_util, mem_used, mem_total, temp = result.stdout.strip().split(", ")
            print(f"GPU Util: {gpu_util}% | Memory: {mem_used}/{mem_total} MB ({mem_util}%) | Temp: {temp}C")
    except Exception as e:
        print(f"Could not read GPU stats: {e}")
```

## GPU Type Selection Guide

Choose the right GPU for your workload:

| GPU Type | Memory | Best For |
|----------|--------|----------|
| NVIDIA T4 | 16 GB | Inference, small model training, cost-effective |
| NVIDIA L4 | 24 GB | General ML training, good price/performance |
| NVIDIA V100 | 16 GB | Medium model training, HPC |
| NVIDIA A100 40GB | 40 GB | Large model training, mixed precision |
| NVIDIA A100 80GB | 80 GB | Very large models, distributed training |
| NVIDIA H100 | 80 GB | Cutting-edge large model training |

## Summary

GPU-accelerated batch jobs on Google Cloud Batch give you on-demand access to GPU compute without managing persistent infrastructure. The key settings are `installGpuDrivers: true` for automatic driver installation, the right `machineType` for your chosen GPU, and using CUDA-enabled container images. For hyperparameter sweeps, leverage the BATCH_TASK_INDEX variable to assign different configurations to each task and run them in parallel. Always check your GPU quota before submitting jobs, and monitor GPU utilization to make sure you are actually using the expensive hardware you are paying for.
