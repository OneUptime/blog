# How to Create AWS Batch Job Definitions and Queues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, Jobs, DevOps

Description: Learn how to create and configure AWS Batch job definitions and job queues for different workload types, including retry strategies, timeouts, and dependencies.

---

Job definitions and queues are the core building blocks of AWS Batch. The job definition tells Batch what to run and how to run it, while the queue determines when and where it runs. Getting these right makes the difference between a smooth batch processing pipeline and one that constantly needs babysitting.

## Job Definitions Explained

A job definition is a template. Think of it like a Docker Compose service definition but for batch processing. You specify the container image, resource requirements, environment variables, and execution parameters.

## Creating a Basic Job Definition

Here's a straightforward job definition for a data processing task.

```bash
# Register a basic job definition for data processing
aws batch register-job-definition \
  --job-definition-name data-processor \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/data-processor:latest",
    "vcpus": 2,
    "memory": 4096,
    "command": ["python3", "/app/process.py", "Ref::input_file"],
    "environment": [
      {"name": "OUTPUT_BUCKET", "value": "my-output-bucket"},
      {"name": "LOG_LEVEL", "value": "INFO"}
    ]
  }'
```

The `Ref::input_file` is a parameter placeholder. When you submit a job, you can pass in the actual value.

```bash
# Submit a job with parameters
aws batch submit-job \
  --job-name process-2024-data \
  --job-queue data-processing \
  --job-definition data-processor \
  --parameters '{"input_file": "s3://my-bucket/data/2024-report.csv"}'
```

## Job Definition with Retry Strategy

For jobs that might fail due to transient issues (network timeouts, temporary service outages), configure automatic retries.

```bash
# Job definition with retry logic and exit code evaluation
aws batch register-job-definition \
  --job-definition-name resilient-processor \
  --type container \
  --retry-strategy '{
    "attempts": 3,
    "evaluateOnExit": [
      {
        "action": "RETRY",
        "onStatusReason": "Host EC2*"
      },
      {
        "action": "RETRY",
        "onExitCode": "137"
      },
      {
        "action": "RETRY",
        "onReason": "CannotPullContainer*"
      },
      {
        "action": "EXIT",
        "onExitCode": "0"
      }
    ]
  }' \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/data-processor:latest",
    "vcpus": 2,
    "memory": 4096,
    "command": ["python3", "/app/process.py"]
  }'
```

This retries up to 3 times when:
- The EC2 host had an issue (spot interruption)
- Exit code 137 (out of memory - might succeed with a different instance)
- Container image couldn't be pulled (transient ECR issue)

It exits immediately on success (exit code 0).

## Job Definition with Timeout

Prevent runaway jobs by setting a timeout.

```bash
# Job definition with a 1-hour timeout
aws batch register-job-definition \
  --job-definition-name time-limited-job \
  --type container \
  --timeout '{"attemptDurationSeconds": 3600}' \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/processor:latest",
    "vcpus": 4,
    "memory": 8192,
    "command": ["python3", "/app/run.py"]
  }'
```

If the job runs longer than 3600 seconds, Batch kills it and marks it as FAILED with reason "Job attempt duration exceeded timeout."

## Multi-Container Job Definitions

For jobs that need sidecar containers (like a log aggregator or service mesh proxy), you can define multiple containers.

```bash
# Job definition with a main container and a sidecar
aws batch register-job-definition \
  --job-definition-name multi-container-job \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/main-app:latest",
    "vcpus": 4,
    "memory": 8192,
    "command": ["python3", "/app/run.py"],
    "environment": [
      {"name": "REDIS_HOST", "value": "localhost"}
    ],
    "dependsOn": [],
    "essential": true
  }'
```

## Job Definitions with Volumes

Mount EFS or host volumes for jobs that need shared storage.

```bash
# Job definition with EFS volume mount
aws batch register-job-definition \
  --job-definition-name efs-job \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/processor:latest",
    "vcpus": 2,
    "memory": 4096,
    "command": ["python3", "/app/process.py"],
    "volumes": [
      {
        "name": "shared-data",
        "efsVolumeConfiguration": {
          "fileSystemId": "fs-abc123",
          "rootDirectory": "/batch-data",
          "transitEncryption": "ENABLED"
        }
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/data",
        "sourceVolume": "shared-data",
        "readOnly": false
      }
    ]
  }'
```

## Creating Job Queues

Job queues hold jobs until compute resources are available. You can create multiple queues with different priorities.

```bash
# Create a high-priority queue for urgent jobs
aws batch create-job-queue \
  --job-queue-name critical-jobs \
  --state ENABLED \
  --priority 100 \
  --compute-environment-order '[
    {
      "order": 1,
      "computeEnvironment": "on-demand-compute"
    }
  ]'

# Create a standard queue for regular workloads
aws batch create-job-queue \
  --job-queue-name standard-jobs \
  --state ENABLED \
  --priority 50 \
  --compute-environment-order '[
    {
      "order": 1,
      "computeEnvironment": "on-demand-compute"
    },
    {
      "order": 2,
      "computeEnvironment": "spot-compute"
    }
  ]'

# Create a low-cost queue using Spot instances
aws batch create-job-queue \
  --job-queue-name batch-jobs \
  --state ENABLED \
  --priority 1 \
  --compute-environment-order '[
    {
      "order": 1,
      "computeEnvironment": "spot-compute"
    }
  ]'
```

The `compute-environment-order` specifies failover. If the first compute environment is full, Batch tries the second.

## Job Dependencies

You can chain jobs so one starts only after another completes.

```bash
# Submit a data extraction job
EXTRACT_JOB=$(aws batch submit-job \
  --job-name extract-data \
  --job-queue standard-jobs \
  --job-definition data-processor \
  --query 'jobId' --output text)

echo "Extract job: $EXTRACT_JOB"

# Submit a transform job that depends on the extract job
TRANSFORM_JOB=$(aws batch submit-job \
  --job-name transform-data \
  --job-queue standard-jobs \
  --job-definition data-processor \
  --depends-on "[{\"jobId\": \"$EXTRACT_JOB\", \"type\": \"SEQUENTIAL\"}]" \
  --container-overrides '{
    "command": ["python3", "/app/transform.py"]
  }' \
  --query 'jobId' --output text)

echo "Transform job: $TRANSFORM_JOB"

# Submit a load job that depends on the transform job
aws batch submit-job \
  --job-name load-data \
  --job-queue standard-jobs \
  --job-definition data-processor \
  --depends-on "[{\"jobId\": \"$TRANSFORM_JOB\", \"type\": \"SEQUENTIAL\"}]" \
  --container-overrides '{
    "command": ["python3", "/app/load.py"]
  }'
```

For array jobs, you can use `N_TO_N` dependency type where each child depends on the corresponding index of the parent.

## Scheduling Policies

Fair-share scheduling policies let you distribute compute fairly between different teams or projects.

```bash
# Create a scheduling policy
aws batch create-scheduling-policy \
  --name fair-share-policy \
  --fairshare-policy '{
    "shareDecaySeconds": 3600,
    "computeReservation": 10,
    "shareDistribution": [
      {
        "shareIdentifier": "team-a",
        "weightFactor": 0.5
      },
      {
        "shareIdentifier": "team-b",
        "weightFactor": 0.3
      },
      {
        "shareIdentifier": "team-c",
        "weightFactor": 0.2
      }
    ]
  }'

# Create a queue that uses the scheduling policy
aws batch create-job-queue \
  --job-queue-name shared-queue \
  --state ENABLED \
  --priority 50 \
  --scheduling-policy-arn arn:aws:batch:us-east-1:123456789012:scheduling-policy/fair-share-policy \
  --compute-environment-order '[
    {"order": 1, "computeEnvironment": "shared-compute"}
  ]'
```

When submitting jobs, specify the share identifier.

```bash
# Submit a job with a share identifier for fair scheduling
aws batch submit-job \
  --job-name team-a-analysis \
  --job-queue shared-queue \
  --job-definition data-processor \
  --share-identifier team-a
```

## Updating Job Definitions

Job definitions are immutable, but you can register new revisions. The latest revision is used by default.

```bash
# Register a new revision with updated memory
aws batch register-job-definition \
  --job-definition-name data-processor \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/data-processor:v2",
    "vcpus": 4,
    "memory": 16384,
    "command": ["python3", "/app/process.py", "Ref::input_file"]
  }'

# Submit using a specific revision
aws batch submit-job \
  --job-name specific-version \
  --job-queue standard-jobs \
  --job-definition data-processor:3
```

## Troubleshooting Checklist

1. Check job definition status with `aws batch describe-job-definitions`
2. Verify job queue is ENABLED and has valid compute environments
3. For RUNNABLE jobs stuck in queue, check compute environment capacity
4. For FAILED jobs, check CloudWatch logs and the statusReason field
5. Ensure the container image is accessible from the compute environment
6. Verify the job role has permissions for any AWS services the job uses
7. Check that memory/vCPU requirements don't exceed instance capacity

Well-designed job definitions and queues are the foundation of a reliable batch processing system. Spend time getting the retry logic, timeouts, and priorities right up front, and your pipeline will handle failures gracefully. For using Fargate instead of EC2, check out our guide on [AWS Batch with Fargate](https://oneuptime.com/blog/post/use-aws-batch-with-fargate/view).
