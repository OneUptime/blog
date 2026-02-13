# How to Troubleshoot AWS Batch Job Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, Troubleshooting, Debugging, CloudWatch, Container, DevOps

Description: A systematic guide to diagnosing and fixing common AWS Batch job failures including stuck jobs, container errors, resource issues, and permission problems.

---

Your AWS Batch job failed. The status says FAILED, the reason is cryptic, and you need to figure out what went wrong. This is one of the most common frustrations with Batch - the error messages are often not very helpful, and the root cause can be in the job definition, the container, the compute environment, IAM permissions, or the infrastructure itself.

This guide gives you a systematic troubleshooting approach for the most common failure scenarios.

## First Steps: Get the Error Details

Always start by getting the full job details.

```bash
# Get complete job information
aws batch describe-jobs --jobs <job-id> \
  --query 'jobs[0].{
    Status: status,
    StatusReason: statusReason,
    ExitCode: container.exitCode,
    Reason: container.reason,
    LogStream: container.logStreamName,
    StartedAt: startedAt,
    StoppedAt: stoppedAt,
    CreatedAt: createdAt
  }'
```

The key fields are:
- **statusReason** - AWS-level reason for failure
- **container.exitCode** - The exit code from your container (null if container never started)
- **container.reason** - Container-level failure reason
- **container.logStreamName** - Where to find the logs

## Problem: Job Stuck in RUNNABLE

This is the single most common issue. The job is submitted but never starts running.

### Check 1: Compute Environment Capacity

```bash
# Check compute environment status
aws batch describe-compute-environments \
  --compute-environments <env-name> \
  --query 'computeEnvironments[0].{
    Status: status,
    State: state,
    DesiredvCpus: computeResources.desiredvCpus,
    MaxvCpus: computeResources.maxvCpus,
    MinvCpus: computeResources.minvCpus
  }'
```

Common causes:
- **maxvCpus too low** - Your job needs more vCPUs than the environment allows
- **State is DISABLED** - The compute environment is not accepting work
- **Status is INVALID** - Configuration error. Check the statusReason.

### Check 2: Resource Requirements Mismatch

```bash
# Compare job requirements with available instance types
aws batch describe-job-definitions --job-definitions <job-def> \
  --query 'jobDefinitions[0].containerProperties.resourceRequirements'
```

If your job requests 4 GPUs but your compute environment only has instance types with 1 GPU, the job will never run. Similarly, if you request 128GB of memory but your largest instance only has 64GB, it stays stuck.

### Check 3: Service Quotas

```bash
# Check EC2 instance limits
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --query 'Quota.Value'
```

If you have hit your vCPU limit for the instance family, Batch cannot launch new instances.

### Check 4: Subnet and Security Group

```bash
# Verify subnets have available IPs
for subnet in subnet-0abc123 subnet-0def456; do
  aws ec2 describe-subnets --subnet-ids $subnet \
    --query 'Subnets[0].{SubnetId:SubnetId,AvailableIps:AvailableIpAddressCount,AZ:AvailabilityZone}'
done
```

If your subnets are full, instances cannot launch.

## Problem: Job Fails Immediately (Exit Code 1)

Exit code 1 usually means your application code hit an error.

### Get the Logs

```bash
# Get the log stream name from the job
LOG_STREAM=$(aws batch describe-jobs --jobs <job-id> \
  --query 'jobs[0].container.logStreamName' --output text)

# Fetch the logs
aws logs get-log-events \
  --log-group-name /aws/batch/job \
  --log-stream-name "$LOG_STREAM" \
  --query 'events[*].message'
```

Common causes:
- Missing environment variables
- Cannot connect to a database or API
- Input file not found in S3
- Code bug in the application

## Problem: Exit Code 137 (Out of Memory)

Exit code 137 means the container was killed by the OOM (Out of Memory) killer.

```bash
# Check how much memory the job requested
aws batch describe-jobs --jobs <job-id> \
  --query 'jobs[0].container.{
    Memory: memory,
    ResourceRequirements: resourceRequirements
  }'
```

Fixes:
- Increase the memory in your job definition
- Optimize your code to use less memory
- Process data in smaller chunks
- For GPU workloads, increase `sharedMemorySize` in `linuxParameters`

```bash
# Update job definition with more memory
aws batch register-job-definition \
  --job-definition-name my-job-def \
  --type container \
  --container-properties '{
    "image": "my-image:latest",
    "resourceRequirements": [
      {"type": "VCPU", "value": "4"},
      {"type": "MEMORY", "value": "16384"}
    ]
  }'
```

## Problem: Exit Code 139 (Segmentation Fault)

Exit code 139 indicates a segfault. This usually means:

- A native library crash (C/C++ extension)
- Stack overflow
- Memory corruption

Debug approach:

```bash
# Run the container locally with debugging enabled
docker run --rm -it \
  -e AWS_BATCH_JOB_ID=local-debug \
  my-image:latest /bin/bash

# Inside the container, run with GDB or valgrind
apt-get install -y gdb valgrind
valgrind --tool=memcheck python3 my_script.py
```

## Problem: CannotPullContainerError

The ECS agent could not pull your Docker image.

```bash
# Check the specific error
aws batch describe-jobs --jobs <job-id> \
  --query 'jobs[0].container.reason'
```

Common causes and fixes:

1. **Image does not exist** - Verify the image URI is correct
```bash
aws ecr describe-images --repository-name my-repo --image-ids imageTag=latest
```

2. **ECR permissions** - The instance role needs ECR pull permissions
```json
{
    "Effect": "Allow",
    "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetAuthorizationToken"
    ],
    "Resource": "*"
}
```

3. **No internet access** - If instances are in a private subnet without a NAT Gateway, they cannot reach ECR
```bash
# Check if the subnet has internet access
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-0abc123" \
  --query 'RouteTables[0].Routes'
```

## Problem: Host EC2 Instance Terminated

The underlying EC2 instance was terminated or reclaimed (common with Spot Instances).

```bash
# Check if this was a Spot interruption
aws batch describe-jobs --jobs <job-id> \
  --query 'jobs[0].statusReason'
# "Host EC2 (instance i-xxx) terminated" indicates Spot reclamation
```

Fix: Add a retry strategy that handles Spot interruptions.

```bash
aws batch register-job-definition \
  --job-definition-name spot-resilient-job \
  --type container \
  --container-properties '{ "image": "my-image:latest", "resourceRequirements": [{"type": "VCPU", "value": "2"}, {"type": "MEMORY", "value": "4096"}] }' \
  --retry-strategy '{
    "attempts": 3,
    "evaluateOnExit": [
      {"onStatusReason": "Host EC2*", "action": "RETRY"},
      {"onExitCode": "0", "action": "EXIT"}
    ]
  }'
```

For more on Spot Instance resilience, see [using Batch with Spot Instances](https://oneuptime.com/blog/post/2026-02-12-use-aws-batch-with-spot-instances-for-cost-savings/view).

## Problem: IAM Permission Errors

Your container cannot access AWS services because of missing permissions.

```bash
# Check the job role (container-level permissions)
aws batch describe-job-definitions --job-definitions <job-def> \
  --query 'jobDefinitions[0].containerProperties.jobRoleArn'

# Check the execution role (ECS task execution permissions)
aws batch describe-job-definitions --job-definitions <job-def> \
  --query 'jobDefinitions[0].containerProperties.executionRoleArn'

# Check the instance role (compute environment permissions)
aws batch describe-compute-environments --compute-environments <env> \
  --query 'computeEnvironments[0].computeResources.instanceRole'
```

Three different IAM roles are involved:
- **Job role** - What your container code can access (S3, DynamoDB, etc.)
- **Execution role** - What ECS needs to run the task (ECR pull, CloudWatch Logs)
- **Instance role** - What the EC2 instance can do (ECS agent communication)

## Problem: Job Timeout

Batch does not have a built-in timeout, but you can implement one.

```bash
# Set timeout in job definition
aws batch register-job-definition \
  --job-definition-name timeout-job \
  --type container \
  --container-properties '{
    "image": "my-image:latest",
    "resourceRequirements": [
      {"type": "VCPU", "value": "2"},
      {"type": "MEMORY", "value": "4096"}
    ]
  }' \
  --timeout '{"attemptDurationSeconds": 3600}'
```

The `attemptDurationSeconds` kills the job if it exceeds the specified time.

## Systematic Debugging Checklist

When a job fails, work through this checklist:

1. Get job details with `describe-jobs`
2. Check the `statusReason` and `container.reason`
3. Check the exit code:
   - 0 = success (should not be FAILED)
   - 1 = application error (check logs)
   - 137 = OOM kill (increase memory)
   - 139 = segfault (debug native code)
   - null = container never started (check permissions, AMI, image)
4. Fetch CloudWatch Logs for the job
5. Verify compute environment is VALID and ENABLED
6. Verify resource requirements match available instance types
7. Check IAM roles (job, execution, instance)
8. Check networking (subnets, security groups, internet access)
9. Check service quotas

## Wrapping Up

Most AWS Batch job failures fall into a few categories: resource mismatches, permission errors, container issues, or infrastructure problems. The key to fast debugging is a systematic approach: get the error details, check the logs, and work through the likely causes methodically. Setting up proper monitoring and alerting (see [monitoring Batch with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-aws-batch-jobs-with-cloudwatch/view)) helps you catch issues early before they pile up. And adding retry strategies to your job definitions handles the transient failures that are inevitable in any cloud environment.
