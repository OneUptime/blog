# How to Set Up AWS Batch for High-Performance Computing Jobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, HPC, Computing

Description: A complete guide to setting up AWS Batch for high-performance computing workloads, covering compute environments, job queues, and job definitions.

---

AWS Batch is built for running batch computing workloads at scale. Whether you're processing genomics data, rendering video, running financial simulations, or training ML models, Batch handles the infrastructure so you can focus on the computation. Let's set up a complete Batch environment from scratch.

## What AWS Batch Provides

Batch manages three main components:

1. **Compute Environments** - the EC2 instances (or Fargate tasks) that run your jobs
2. **Job Queues** - where jobs wait until compute resources are available
3. **Job Definitions** - templates that describe how to run your jobs

```mermaid
graph LR
    A[Submit Job] --> B[Job Queue]
    B --> C[Scheduler]
    C --> D[Compute Environment]
    D --> E[EC2/Fargate]
    E --> F[Container runs your job]
```

## Prerequisites

Before setting up Batch, you need a few things in place. First, create the IAM roles that Batch needs.

The Batch service role lets Batch manage EC2 instances on your behalf.

```bash
# Create the trust policy for the Batch service role
cat > /tmp/batch-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "batch.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the service role
aws iam create-role \
  --role-name AWSBatchServiceRole \
  --assume-role-policy-document file:///tmp/batch-trust-policy.json

# Attach the managed policy
aws iam attach-role-policy \
  --role-name AWSBatchServiceRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole
```

Next, create an instance role for the EC2 instances that will run your jobs.

```bash
# Create the trust policy for EC2 instances
cat > /tmp/ec2-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the instance role
aws iam create-role \
  --role-name ecsInstanceRole \
  --assume-role-policy-document file:///tmp/ec2-trust-policy.json

# Attach the required policy for ECS container instances
aws iam attach-role-policy \
  --role-name ecsInstanceRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role

# Create the instance profile
aws iam create-instance-profile \
  --instance-profile-name ecsInstanceRole

aws iam add-role-to-instance-profile \
  --instance-profile-name ecsInstanceRole \
  --role-name ecsInstanceRole
```

## Creating a Compute Environment

The compute environment defines what kind of instances Batch can launch. For HPC workloads, you'll want compute-optimized or memory-optimized instances.

```bash
# Create a managed compute environment for HPC workloads
aws batch create-compute-environment \
  --compute-environment-name hpc-compute-env \
  --type MANAGED \
  --state ENABLED \
  --service-role arn:aws:iam::123456789012:role/AWSBatchServiceRole \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 256,
    "desiredvCpus": 0,
    "instanceTypes": ["c5.xlarge", "c5.2xlarge", "c5.4xlarge", "m5.xlarge", "m5.2xlarge"],
    "subnets": ["subnet-abc123", "subnet-def456"],
    "securityGroupIds": ["sg-abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "tags": {
      "Environment": "production",
      "Workload": "hpc"
    }
  }'
```

Key settings explained:
- `minvCpus: 0` means Batch scales down to zero when there are no jobs
- `maxvCpus: 256` limits total compute capacity
- `BEST_FIT_PROGRESSIVE` picks the best instance type for each job's requirements
- Multiple instance types give Batch flexibility to find capacity

## Creating a Job Queue

Job queues connect job submissions to compute environments. You can set up priority queues for different workload types.

```bash
# Create a high-priority job queue
aws batch create-job-queue \
  --job-queue-name hpc-high-priority \
  --state ENABLED \
  --priority 10 \
  --compute-environment-order '[
    {
      "order": 1,
      "computeEnvironment": "hpc-compute-env"
    }
  ]'

# Create a low-priority queue (for non-urgent jobs)
aws batch create-job-queue \
  --job-queue-name hpc-low-priority \
  --state ENABLED \
  --priority 1 \
  --compute-environment-order '[
    {
      "order": 1,
      "computeEnvironment": "hpc-compute-env"
    }
  ]'
```

Higher priority numbers mean the queue gets resources first. When both queues need resources, high-priority jobs are scheduled before low-priority ones.

## Creating a Job Definition

The job definition is a template for your actual computation. It's essentially a Docker container configuration.

```bash
# Create a job definition for a compute-intensive task
aws batch register-job-definition \
  --job-definition-name hpc-simulation \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-hpc-app:latest",
    "vcpus": 4,
    "memory": 8192,
    "command": ["python3", "/app/run_simulation.py"],
    "environment": [
      {"name": "SIMULATION_TYPE", "value": "monte-carlo"},
      {"name": "OUTPUT_BUCKET", "value": "my-results-bucket"}
    ],
    "jobRoleArn": "arn:aws:iam::123456789012:role/batch-job-role",
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/aws/batch/hpc-simulation",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "batch"
      }
    }
  }'
```

## Building Your HPC Container

Your Docker image contains the actual computation code. Here's a template for an HPC workload.

```dockerfile
FROM python:3.11-slim

# Install system dependencies for scientific computing
RUN apt-get update && apt-get install -y \
    gcc \
    gfortran \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install numpy scipy pandas boto3

WORKDIR /app
COPY run_simulation.py .

ENTRYPOINT ["python3", "run_simulation.py"]
```

And the simulation script that reads parameters from environment variables and writes results to S3.

```python
import os
import json
import boto3
import numpy as np

def run_simulation():
    """Run a compute-intensive simulation job."""
    sim_type = os.environ.get('SIMULATION_TYPE', 'default')
    iterations = int(os.environ.get('ITERATIONS', '1000000'))
    job_id = os.environ.get('AWS_BATCH_JOB_ID', 'local')
    output_bucket = os.environ.get('OUTPUT_BUCKET')

    print(f"Starting {sim_type} simulation with {iterations} iterations")
    print(f"Job ID: {job_id}")

    # Run the actual computation
    results = np.random.normal(size=(iterations, 10))
    summary = {
        'mean': float(results.mean()),
        'std': float(results.std()),
        'min': float(results.min()),
        'max': float(results.max()),
        'iterations': iterations,
        'job_id': job_id
    }

    print(f"Results: {json.dumps(summary, indent=2)}")

    # Upload results to S3
    if output_bucket:
        s3 = boto3.client('s3')
        s3.put_object(
            Bucket=output_bucket,
            Key=f'results/{job_id}.json',
            Body=json.dumps(summary)
        )
        print(f"Results uploaded to s3://{output_bucket}/results/{job_id}.json")

if __name__ == '__main__':
    run_simulation()
```

## Submitting Jobs

Submit individual jobs or arrays of jobs.

```bash
# Submit a single job
aws batch submit-job \
  --job-name simulation-001 \
  --job-queue hpc-high-priority \
  --job-definition hpc-simulation \
  --container-overrides '{
    "environment": [
      {"name": "ITERATIONS", "value": "5000000"}
    ]
  }'

# Submit an array job (runs the same job multiple times with different indices)
aws batch submit-job \
  --job-name simulation-array \
  --job-queue hpc-high-priority \
  --job-definition hpc-simulation \
  --array-properties '{"size": 100}' \
  --container-overrides '{
    "environment": [
      {"name": "ITERATIONS", "value": "1000000"}
    ]
  }'
```

Array jobs are perfect for embarrassingly parallel workloads. Each job gets an `AWS_BATCH_JOB_ARRAY_INDEX` environment variable (0 to size-1) that you can use to partition the work.

## Monitoring Jobs

Track your jobs' progress.

```bash
# List running jobs
aws batch list-jobs \
  --job-queue hpc-high-priority \
  --job-status RUNNING

# Get details on a specific job
aws batch describe-jobs \
  --jobs job-id-here \
  --query 'jobs[0].{Status: status, StartedAt: startedAt, StatusReason: statusReason}'

# Check CloudWatch logs for a job
aws logs get-log-events \
  --log-group-name /aws/batch/hpc-simulation \
  --log-stream-name "batch/hpc-simulation/job-id-here"
```

## Troubleshooting Checklist

1. Verify compute environment is VALID and ENABLED
2. Check that subnets have internet access (or VPC endpoints) for pulling container images
3. Ensure the instance role has ECR permissions to pull your image
4. Check CloudWatch logs for container errors
5. Verify the job definition's memory and vCPU settings are within instance limits
6. Make sure the job queue is ENABLED and connected to a valid compute environment

AWS Batch handles the undifferentiated heavy lifting of managing compute infrastructure for batch jobs. You define what to run and how much compute it needs, and Batch handles the rest. For job definition specifics, see our guide on [creating Batch job definitions and queues](https://oneuptime.com/blog/post/2026-02-12-create-aws-batch-job-definitions-queues/view).
