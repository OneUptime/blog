# How to Configure AWS Batch for GPU Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, GPU, Machine Learning, Deep Learning, EC2, HPC

Description: Step-by-step guide to configuring AWS Batch compute environments and job definitions for GPU-accelerated workloads including ML training and rendering.

---

AWS Batch is a managed service that dynamically provisions compute resources and runs batch jobs. When your jobs need GPU acceleration - for deep learning training, video rendering, molecular simulations, or any CUDA-based workload - you need to configure Batch specifically for GPU instances. The default settings will not cut it.

This guide covers everything from setting up a GPU-enabled compute environment to writing job definitions that properly request and use GPU resources.

## Why Use AWS Batch for GPU Workloads?

Running GPU workloads manually means you are constantly babysitting instance launches, monitoring utilization, and cleaning up when jobs finish. AWS Batch handles all of that. You define what resources your job needs, submit it, and Batch finds or launches the right GPU instances, runs your containers, and scales down when the work is done.

The key benefits:

- Automatic provisioning of the right GPU instance types
- Queue-based job submission with priority management
- Native container support with GPU passthrough
- Integration with Spot Instances for cost savings
- Job dependency chains for complex pipelines

## Step 1: Create a GPU Compute Environment

The compute environment defines what instance types Batch can use. For GPU workloads, you need to specify GPU instance families.

```bash
# Create a managed compute environment with GPU instances
aws batch create-compute-environment \
  --compute-environment-name gpu-compute-env \
  --type MANAGED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 256,
    "instanceTypes": ["p3", "p4d", "p5", "g5", "g6"],
    "subnets": ["subnet-0abc123", "subnet-0def456"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2_NVIDIA"
      }
    ]
  }' \
  --service-role arn:aws:iam::123456789012:role/AWSBatchServiceRole \
  --state ENABLED
```

A few critical details here:

- **imageType: ECS_AL2_NVIDIA** - This is essential. It tells Batch to use an AMI with NVIDIA drivers pre-installed. If you use the default AMI, your containers will not see the GPUs.
- **instanceTypes** - List the GPU families you want. P-series for training, G-series for inference and graphics.
- **allocationStrategy: BEST_FIT_PROGRESSIVE** - This picks the cheapest instance type that fits your job's resource requirements.
- **minvCpus: 0** - Start with zero instances when there are no jobs.

## Step 2: Create a Job Queue

```bash
# Create a job queue attached to the GPU compute environment
aws batch create-job-queue \
  --job-queue-name gpu-job-queue \
  --state ENABLED \
  --priority 10 \
  --compute-environment-order '[
    {
      "order": 1,
      "computeEnvironment": "gpu-compute-env"
    }
  ]'
```

## Step 3: Write a GPU Job Definition

The job definition is where you specify that your container needs GPUs.

```bash
# Create a job definition that requests GPU resources
aws batch register-job-definition \
  --job-definition-name gpu-training-job \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/ml-training:latest",
    "resourceRequirements": [
      {
        "type": "VCPU",
        "value": "8"
      },
      {
        "type": "MEMORY",
        "value": "32768"
      },
      {
        "type": "GPU",
        "value": "1"
      }
    ],
    "linuxParameters": {
      "sharedMemorySize": 8192
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/aws/batch/gpu-jobs",
        "awslogs-stream-prefix": "training"
      }
    },
    "environment": [
      {
        "name": "NVIDIA_VISIBLE_DEVICES",
        "value": "all"
      }
    ]
  }'
```

Key points in this definition:

- **resourceRequirements with type GPU** - This is how you tell Batch your job needs a GPU. The value is the number of GPUs per container.
- **sharedMemorySize** - Deep learning frameworks like PyTorch use shared memory heavily. The default 64MB is way too small. Set it to at least 2048MB, more for large models.
- **NVIDIA_VISIBLE_DEVICES** - Ensures the container can see all allocated GPUs.

## Step 4: Build a GPU-Ready Container Image

Your Docker image needs the NVIDIA CUDA runtime. Here is a Dockerfile for a PyTorch training job.

```dockerfile
# Start from NVIDIA's CUDA base image
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch with CUDA support
RUN pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Copy your training code
COPY train.py /app/train.py
COPY requirements.txt /app/requirements.txt
RUN pip3 install -r /app/requirements.txt

WORKDIR /app

# Entry point for the training script
ENTRYPOINT ["python3", "train.py"]
```

Push it to ECR:

```bash
# Build and push the container image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

docker build -t ml-training .
docker tag ml-training:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/ml-training:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/ml-training:latest
```

## Step 5: Submit a GPU Job

```bash
# Submit a job to the GPU queue
aws batch submit-job \
  --job-name training-run-001 \
  --job-queue gpu-job-queue \
  --job-definition gpu-training-job \
  --container-overrides '{
    "environment": [
      {"name": "EPOCHS", "value": "50"},
      {"name": "BATCH_SIZE", "value": "64"},
      {"name": "LEARNING_RATE", "value": "0.001"},
      {"name": "S3_DATA_PATH", "value": "s3://my-bucket/training-data/"},
      {"name": "S3_OUTPUT_PATH", "value": "s3://my-bucket/models/run-001/"}
    ]
  }'
```

## Multi-GPU Jobs

For jobs that need multiple GPUs on a single instance, simply increase the GPU resource requirement.

```bash
# Job definition requesting 4 GPUs
aws batch register-job-definition \
  --job-definition-name multi-gpu-training \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/ml-training:latest",
    "resourceRequirements": [
      {"type": "VCPU", "value": "32"},
      {"type": "MEMORY", "value": "131072"},
      {"type": "GPU", "value": "4"}
    ],
    "linuxParameters": {
      "sharedMemorySize": 16384
    }
  }'
```

Batch will automatically select an instance type with at least 4 GPUs, like a p3.8xlarge (4x V100) or g5.12xlarge (4x A10G).

## Mixing Spot and On-Demand

For cost savings, you can create a Spot compute environment alongside your On-Demand one and use both in a single queue. For a deep dive into Spot with Batch, see our guide on [using AWS Batch with Spot Instances](https://oneuptime.com/blog/post/use-aws-batch-with-spot-instances-for-cost-savings/view).

```bash
# Create a Spot GPU compute environment
aws batch create-compute-environment \
  --compute-environment-name gpu-spot-compute-env \
  --type MANAGED \
  --compute-resources '{
    "type": "SPOT",
    "allocationStrategy": "SPOT_CAPACITY_OPTIMIZED",
    "minvCpus": 0,
    "maxvCpus": 256,
    "instanceTypes": ["p3", "g5"],
    "subnets": ["subnet-0abc123"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "spotIamFleetRole": "arn:aws:iam::123456789012:role/AmazonEC2SpotFleetRole",
    "ec2Configuration": [
      {"imageType": "ECS_AL2_NVIDIA"}
    ]
  }' \
  --state ENABLED
```

## Monitoring GPU Utilization

You should track GPU utilization to make sure your jobs are actually using the GPUs effectively. Install the CloudWatch agent in your container or use the NVIDIA DCGM exporter. For more on monitoring Batch jobs, check out [monitoring AWS Batch with CloudWatch](https://oneuptime.com/blog/post/monitor-aws-batch-jobs-with-cloudwatch/view).

```python
# Simple GPU utilization check inside your training script
import subprocess
import json

def log_gpu_stats():
    """Log GPU utilization to stdout (captured by CloudWatch Logs)"""
    result = subprocess.run(
        ['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total', '--format=csv,noheader'],
        capture_output=True, text=True
    )
    print(f"GPU Stats: {result.stdout.strip()}")
```

## Common Issues

- **Job stuck in RUNNABLE** - Usually means Batch cannot find or launch instances that match your GPU requirements. Check your instance type list, subnet capacity, and service quotas.
- **CUDA out of memory** - Reduce batch size or use a larger GPU instance. Also check that sharedMemorySize is set properly.
- **GPU not visible in container** - Make sure you are using the ECS_AL2_NVIDIA image type in your compute environment.

## Wrapping Up

AWS Batch takes the operational pain out of running GPU workloads at scale. The key things to remember are: use the NVIDIA AMI, request GPUs in your resource requirements, set adequate shared memory, and pick the right instance types for your workload. Once that is in place, you can focus on your actual ML training or rendering code instead of infrastructure management.
