# How to Use AWS Batch with Fargate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, Fargate, Serverless

Description: Set up AWS Batch with Fargate for serverless batch processing, eliminating the need to manage EC2 instances while running containerized jobs at scale.

---

Running AWS Batch with Fargate means you don't have to manage any EC2 instances at all. Fargate handles the compute infrastructure - you just define your job, submit it, and Fargate spins up the container, runs it, and tears it down. No patching, no AMI management, no worrying about instance types. Let's set it up.

## Why Fargate for Batch Jobs

Fargate makes sense when:
- You don't want to manage EC2 instances
- Your jobs don't need GPU access
- Individual jobs need up to 16 vCPUs and 120 GB of memory
- You want per-second billing with no idle instances
- You need consistent, isolated compute for each job

EC2 is still better when:
- You need GPU instances
- Jobs need more than 16 vCPUs or 120 GB memory
- You want to use Spot instances for cost savings
- You need custom AMIs with specific software pre-installed

## Setting Up the IAM Role

Fargate Batch jobs need an execution role (to pull container images) and optionally a job role (for AWS API access from within the container).

Create the execution role first.

```bash
# Create trust policy for ECS tasks
cat > /tmp/ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the execution role
aws iam create-role \
  --role-name BatchFargateExecutionRole \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

# Attach the ECS task execution policy (allows pulling images and writing logs)
aws iam attach-role-policy \
  --role-name BatchFargateExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

Now create a job role for your containers to access AWS services.

```bash
# Create the job role (same trust policy)
aws iam create-role \
  --role-name BatchFargateJobRole \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

# Attach a policy for S3 access (customize based on your needs)
aws iam put-role-policy \
  --role-name BatchFargateJobRole \
  --policy-name S3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        "Resource": ["arn:aws:s3:::my-data-bucket", "arn:aws:s3:::my-data-bucket/*"]
      }
    ]
  }'
```

## Creating a Fargate Compute Environment

The Fargate compute environment is simpler than EC2 because you don't need to configure instance types or AMIs.

```bash
# Create a Fargate compute environment
aws batch create-compute-environment \
  --compute-environment-name fargate-compute \
  --type MANAGED \
  --state ENABLED \
  --compute-resources '{
    "type": "FARGATE",
    "maxvCpus": 256,
    "subnets": ["subnet-abc123", "subnet-def456"],
    "securityGroupIds": ["sg-abc123"]
  }'
```

Notice there's no `minvCpus` or `desiredvCpus` - Fargate scales from 0 automatically. The `maxvCpus` limits the total concurrent compute capacity.

For cost savings on fault-tolerant workloads, use Fargate Spot.

```bash
# Create a Fargate Spot compute environment (up to 70% cheaper)
aws batch create-compute-environment \
  --compute-environment-name fargate-spot-compute \
  --type MANAGED \
  --state ENABLED \
  --compute-resources '{
    "type": "FARGATE_SPOT",
    "maxvCpus": 256,
    "subnets": ["subnet-abc123", "subnet-def456"],
    "securityGroupIds": ["sg-abc123"]
  }'
```

## Creating a Job Queue

Connect the queue to your Fargate compute environment. You can use both regular and Spot Fargate for failover.

```bash
# Create a job queue with Spot as primary and on-demand as fallback
aws batch create-job-queue \
  --job-queue-name fargate-jobs \
  --state ENABLED \
  --priority 10 \
  --compute-environment-order '[
    {
      "order": 1,
      "computeEnvironment": "fargate-spot-compute"
    },
    {
      "order": 2,
      "computeEnvironment": "fargate-compute"
    }
  ]'
```

## Creating a Fargate Job Definition

Fargate job definitions require a few extra fields compared to EC2 ones. You must specify the execution role and use Fargate-compatible resource configurations.

```bash
# Register a Fargate job definition
aws batch register-job-definition \
  --job-definition-name fargate-processor \
  --type container \
  --platform-capabilities FARGATE \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/processor:latest",
    "command": ["python3", "/app/process.py"],
    "resourceRequirements": [
      {"type": "VCPU", "value": "2"},
      {"type": "MEMORY", "value": "4096"}
    ],
    "executionRoleArn": "arn:aws:iam::123456789012:role/BatchFargateExecutionRole",
    "jobRoleArn": "arn:aws:iam::123456789012:role/BatchFargateJobRole",
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/aws/batch/fargate-processor",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "batch"
      }
    },
    "networkConfiguration": {
      "assignPublicIp": "ENABLED"
    },
    "fargatePlatformConfiguration": {
      "platformVersion": "LATEST"
    }
  }'
```

Important differences from EC2 job definitions:
- Use `resourceRequirements` instead of `vcpus` and `memory`
- Must include `executionRoleArn`
- Must specify `platformCapabilities` as `FARGATE`
- `networkConfiguration` controls public IP assignment
- Must set `assignPublicIp` to `ENABLED` if the subnet doesn't have a NAT Gateway

## Valid Fargate Resource Combinations

Fargate has specific valid CPU and memory combinations. Here are the common ones.

| vCPU | Memory Range |
|------|-------------|
| 0.25 | 512 MB - 2 GB |
| 0.5  | 1 GB - 4 GB |
| 1    | 2 GB - 8 GB |
| 2    | 4 GB - 16 GB |
| 4    | 8 GB - 30 GB |
| 8    | 16 GB - 60 GB |
| 16   | 32 GB - 120 GB |

If you specify an invalid combination, the job will fail to launch.

## Submitting Jobs

Submitting works the same as with EC2-based Batch.

```bash
# Submit a single job
aws batch submit-job \
  --job-name process-report \
  --job-queue fargate-jobs \
  --job-definition fargate-processor \
  --container-overrides '{
    "environment": [
      {"name": "INPUT_FILE", "value": "s3://my-bucket/reports/jan-2026.csv"},
      {"name": "OUTPUT_PREFIX", "value": "s3://my-bucket/results/jan-2026/"}
    ]
  }'

# Submit an array of jobs
aws batch submit-job \
  --job-name batch-process \
  --job-queue fargate-jobs \
  --job-definition fargate-processor \
  --array-properties '{"size": 50}'
```

You can also override resource requirements when submitting if a particular job needs more power.

```bash
# Submit with increased resources
aws batch submit-job \
  --job-name heavy-process \
  --job-queue fargate-jobs \
  --job-definition fargate-processor \
  --container-overrides '{
    "resourceRequirements": [
      {"type": "VCPU", "value": "4"},
      {"type": "MEMORY", "value": "16384"}
    ]
  }'
```

## Using Ephemeral Storage

Fargate tasks get 20 GB of ephemeral storage by default. You can increase it up to 200 GB.

```bash
# Job definition with increased ephemeral storage
aws batch register-job-definition \
  --job-definition-name big-storage-job \
  --type container \
  --platform-capabilities FARGATE \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/processor:latest",
    "command": ["python3", "/app/process.py"],
    "resourceRequirements": [
      {"type": "VCPU", "value": "4"},
      {"type": "MEMORY", "value": "8192"}
    ],
    "executionRoleArn": "arn:aws:iam::123456789012:role/BatchFargateExecutionRole",
    "ephemeralStorage": {
      "sizeInGiB": 100
    },
    "networkConfiguration": {
      "assignPublicIp": "ENABLED"
    }
  }'
```

## Monitoring Fargate Batch Jobs

Monitor your jobs through the CLI or CloudWatch.

```bash
# Check the status of recent jobs in a queue
aws batch list-jobs \
  --job-queue fargate-jobs \
  --job-status RUNNING \
  --query 'jobSummaryList[].{Name: jobName, Id: jobId, StartedAt: startedAt, Status: status}'

# Get logs for a specific job
JOB_ID="your-job-id"
LOG_STREAM=$(aws batch describe-jobs --jobs "$JOB_ID" \
  --query 'jobs[0].container.logStreamName' --output text)

aws logs get-log-events \
  --log-group-name /aws/batch/fargate-processor \
  --log-stream-name "$LOG_STREAM"
```

## Networking Considerations

Fargate tasks need network access to pull container images and potentially reach AWS services. You have two options:

1. **Public subnet with public IP**: Set `assignPublicIp` to `ENABLED`
2. **Private subnet with NAT Gateway**: Set `assignPublicIp` to `DISABLED` and ensure the subnet has a route to a NAT Gateway

For accessing AWS services privately, use VPC endpoints.

```bash
# Create VPC endpoints for ECR and S3 (so Fargate doesn't need internet access)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.ecr.dkr \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-abc123 \
  --security-group-ids sg-abc123

aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.s3 \
  --vpc-endpoint-type Gateway \
  --route-table-ids rtb-abc123
```

## Troubleshooting Checklist

1. Verify vCPU and memory are a valid Fargate combination
2. Check that the execution role can pull from ECR
3. Ensure subnets have internet access or VPC endpoints for ECR/S3/CloudWatch
4. Verify the security group allows outbound HTTPS (port 443)
5. Check CloudWatch logs for container errors
6. If jobs are stuck in RUNNABLE, check compute environment capacity and subnet availability
7. For Fargate Spot, ensure your job handles interruptions gracefully

Fargate with AWS Batch gives you the best of both worlds - powerful batch processing without infrastructure management. For configuring the compute environment in more detail, see our guide on [configuring Batch compute environments](https://oneuptime.com/blog/post/2026-02-12-configure-aws-batch-compute-environments/view).
