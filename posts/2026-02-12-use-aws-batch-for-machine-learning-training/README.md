# How to Use AWS Batch for Machine Learning Training

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, Machine Learning, Deep Learning, GPU, Training, PyTorch, TensorFlow

Description: A complete guide to running machine learning training jobs on AWS Batch with GPU instances, S3 data pipelines, hyperparameter sweeps, and cost optimization.

---

AWS Batch is not just for traditional data processing. It is a solid platform for machine learning training, especially when you want to run lots of experiments, perform hyperparameter sweeps, or train models on a schedule. Compared to SageMaker, Batch gives you more control over the infrastructure and container setup, which some teams prefer.

This guide covers the full workflow: setting up GPU compute environments, building training containers, running experiments, and orchestrating hyperparameter searches.

## Why Batch for ML Training?

SageMaker is AWS's first-party ML training service, and it is great for many use cases. But Batch has advantages when:

- You want full control over your Docker container and do not want to conform to SageMaker's container contract
- You already have a Batch infrastructure for other workloads
- You need to run training as part of a larger batch pipeline
- You want to use custom instance types or AMIs that SageMaker does not support
- Cost: Batch has no per-job surcharge. You pay only for the EC2 instances.

## Step 1: Create a GPU Compute Environment

ML training typically requires GPUs. Set up a compute environment with the right instance types.

```bash
# Create a GPU compute environment for ML training
aws batch create-compute-environment \
  --compute-environment-name ml-training-env \
  --type MANAGED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 256,
    "instanceTypes": ["g5.xlarge", "g5.2xlarge", "g5.4xlarge", "g5.12xlarge", "p3.2xlarge", "p3.8xlarge"],
    "subnets": ["subnet-0abc123", "subnet-0def456"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {"imageType": "ECS_AL2_NVIDIA"}
    ]
  }' \
  --service-role arn:aws:iam::123456789012:role/AWSBatchServiceRole \
  --state ENABLED
```

For a detailed breakdown of GPU configuration, see our guide on [configuring AWS Batch for GPU workloads](https://oneuptime.com/blog/post/configure-aws-batch-for-gpu-workloads/view).

## Step 2: Build a Training Container

Here is a production-grade Dockerfile for PyTorch training.

```dockerfile
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

# System dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip git curl \
    && rm -rf /var/lib/apt/lists/*

# PyTorch with CUDA support
RUN pip3 install --no-cache-dir \
    torch==2.2.0 \
    torchvision==0.17.0 \
    --index-url https://download.pytorch.org/whl/cu121

# Training dependencies
RUN pip3 install --no-cache-dir \
    boto3 \
    wandb \
    tensorboard \
    transformers \
    datasets \
    accelerate \
    pyyaml

# Copy training code
COPY src/ /app/src/
COPY configs/ /app/configs/

WORKDIR /app
ENTRYPOINT ["python3", "src/train.py"]
```

Push to ECR:

```bash
# Build and push
docker build -t ml-training .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker tag ml-training:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/ml-training:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/ml-training:latest
```

## Step 3: Write the Training Script

Structure your training script to work well with Batch's environment.

```python
# src/train.py
import os
import json
import boto3
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from datetime import datetime

def main():
    # Read configuration from environment variables
    config = {
        'learning_rate': float(os.environ.get('LEARNING_RATE', '0.001')),
        'batch_size': int(os.environ.get('BATCH_SIZE', '32')),
        'epochs': int(os.environ.get('EPOCHS', '10')),
        'model_name': os.environ.get('MODEL_NAME', 'resnet50'),
        's3_data_path': os.environ.get('S3_DATA_PATH'),
        's3_output_path': os.environ.get('S3_OUTPUT_PATH'),
        'job_id': os.environ.get('AWS_BATCH_JOB_ID', 'local'),
    }

    print(f"Training config: {json.dumps(config, indent=2)}")

    # Select device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

    # Download training data from S3
    s3 = boto3.client('s3')
    download_data(s3, config['s3_data_path'], '/tmp/data')

    # Create model and data loaders
    model = create_model(config['model_name']).to(device)
    train_loader, val_loader = create_data_loaders('/tmp/data', config['batch_size'])

    # Training loop
    optimizer = torch.optim.Adam(model.parameters(), lr=config['learning_rate'])
    criterion = nn.CrossEntropyLoss()
    best_val_accuracy = 0.0

    for epoch in range(config['epochs']):
        # Training phase
        model.train()
        train_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

        train_accuracy = 100.0 * correct / total
        avg_loss = train_loss / len(train_loader)

        # Validation phase
        val_accuracy = evaluate(model, val_loader, device)

        print(f"Epoch {epoch+1}/{config['epochs']} - "
              f"Loss: {avg_loss:.4f} - "
              f"Train Acc: {train_accuracy:.2f}% - "
              f"Val Acc: {val_accuracy:.2f}%")

        # Save best model
        if val_accuracy > best_val_accuracy:
            best_val_accuracy = val_accuracy
            torch.save(model.state_dict(), '/tmp/best_model.pt')
            print(f"New best model saved (val accuracy: {val_accuracy:.2f}%)")

    # Upload model and metrics to S3
    upload_results(s3, config['s3_output_path'], config)
    print(f"Training complete. Best validation accuracy: {best_val_accuracy:.2f}%")


if __name__ == '__main__':
    main()
```

## Step 4: Register the Job Definition

```bash
# Register the ML training job definition
aws batch register-job-definition \
  --job-definition-name ml-training-job \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/ml-training:latest",
    "resourceRequirements": [
      {"type": "VCPU", "value": "8"},
      {"type": "MEMORY", "value": "32768"},
      {"type": "GPU", "value": "1"}
    ],
    "linuxParameters": {
      "sharedMemorySize": 8192
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/aws/batch/ml-training",
        "awslogs-stream-prefix": "train"
      }
    },
    "jobRoleArn": "arn:aws:iam::123456789012:role/BatchMLTrainingRole"
  }'
```

The `jobRoleArn` gives the container access to S3 (for data and model artifacts) and any other AWS services it needs.

## Step 5: Run a Hyperparameter Sweep

This is where Batch really shines. Use array jobs to run hundreds of training experiments in parallel, each with different hyperparameters.

```python
import boto3
import json
import itertools

batch = boto3.client('batch')
s3 = boto3.client('s3')

# Define the hyperparameter search space
learning_rates = [0.001, 0.0005, 0.0001, 0.00005]
batch_sizes = [16, 32, 64, 128]
models = ['resnet18', 'resnet50', 'efficientnet_b0']

# Generate all combinations
experiments = list(itertools.product(learning_rates, batch_sizes, models))
print(f"Total experiments: {len(experiments)}")

# Create a manifest mapping array indices to hyperparameters
manifest = []
for i, (lr, bs, model) in enumerate(experiments):
    manifest.append({
        'index': i,
        'learning_rate': lr,
        'batch_size': bs,
        'model_name': model,
    })

# Upload the manifest
s3.put_object(
    Bucket='ml-experiments',
    Key='sweeps/sweep-001/manifest.json',
    Body=json.dumps(manifest)
)

# Submit array job - one child per experiment
response = batch.submit_job(
    jobName='hp-sweep-001',
    jobQueue='ml-training-queue',
    jobDefinition='ml-training-job',
    arrayProperties={'size': len(experiments)},
    containerOverrides={
        'environment': [
            {'name': 'SWEEP_MANIFEST', 'value': 's3://ml-experiments/sweeps/sweep-001/manifest.json'},
            {'name': 'S3_DATA_PATH', 'value': 's3://ml-experiments/datasets/imagenet-subset/'},
            {'name': 'S3_OUTPUT_PATH', 'value': 's3://ml-experiments/sweeps/sweep-001/results/'},
            {'name': 'EPOCHS', 'value': '20'},
        ]
    }
)

print(f"Submitted sweep: {response['jobId']}")
```

For more on array jobs, see [using AWS Batch array jobs for parallel processing](https://oneuptime.com/blog/post/use-aws-batch-array-jobs-for-parallel-processing/view).

## Step 6: Aggregate Results

After the sweep finishes, collect and compare results.

```python
import boto3
import json
import pandas as pd

s3 = boto3.client('s3')

# List all result files
paginator = s3.get_paginator('list_objects_v2')
results = []

for page in paginator.paginate(Bucket='ml-experiments', Prefix='sweeps/sweep-001/results/'):
    for obj in page.get('Contents', []):
        if obj['Key'].endswith('metrics.json'):
            data = json.loads(s3.get_object(Bucket='ml-experiments', Key=obj['Key'])['Body'].read())
            results.append(data)

# Create a comparison table
df = pd.DataFrame(results)
df = df.sort_values('val_accuracy', ascending=False)
print(df[['model_name', 'learning_rate', 'batch_size', 'val_accuracy', 'train_loss']].head(10))
```

## Cost Optimization

ML training can get expensive. Here are ways to cut costs with Batch:

- **Use Spot Instances** for hyperparameter sweeps where individual experiments can be restarted. See [using Batch with Spot Instances](https://oneuptime.com/blog/post/use-aws-batch-with-spot-instances-for-cost-savings/view).
- **Right-size GPU instances** - Do not use a p3.8xlarge (4x V100) if your model fits on one GPU.
- **Set minvCpus to 0** so instances are terminated when no jobs are running.
- **Use mixed-precision training** (FP16/BF16) to train faster and use less GPU memory, potentially allowing smaller instances.

## Multi-GPU Training

For models that need multiple GPUs, update the job definition and use PyTorch's DistributedDataParallel:

```bash
# Job definition for 4-GPU training
aws batch register-job-definition \
  --job-definition-name ml-training-multigpu \
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
    },
    "command": ["--distributed", "--gpus", "4"]
  }'
```

## Wrapping Up

AWS Batch gives you a flexible, cost-effective platform for ML training. You control the container environment, the instance types, and the scaling behavior. For teams that do not want to be locked into SageMaker's patterns, or that need to run training alongside other batch workloads, Batch is a practical choice. The combination of GPU compute environments, array jobs for sweeps, and Spot Instances for cost savings makes it a strong alternative for production ML pipelines.
