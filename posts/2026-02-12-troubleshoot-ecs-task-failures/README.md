# How to Troubleshoot ECS Task Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Troubleshooting, Docker, Containers

Description: A practical troubleshooting guide for common Amazon ECS task failures, covering exit codes, resource limits, networking issues, and IAM permission problems.

---

There's nothing quite like seeing your ECS tasks cycle through "PENDING" to "STOPPED" over and over. The task starts, runs for a few seconds, crashes, and ECS dutifully starts another one. Before you know it, you've burned through fifty task launches in an hour and your service is still down.

ECS task failures fall into a handful of categories, and once you know the patterns, they're actually pretty methodical to debug. Let's walk through the most common failure modes and how to fix each one.

## First Step: Check the Stopped Task Reason

When a task fails, ECS records the reason. This is your starting point for every investigation:

```bash
# List recently stopped tasks for a service
aws ecs list-tasks \
  --cluster production \
  --service-name api-service \
  --desired-status STOPPED \
  --query "taskArns[0:5]"

# Describe the stopped task to see the failure reason
aws ecs describe-tasks \
  --cluster production \
  --tasks arn:aws:ecs:us-east-1:123456789012:task/production/abc123 \
  --query "tasks[0].{stopCode:stopCode, stoppedReason:stoppedReason, containers:containers[*].{name:name, exitCode:exitCode, reason:reason}}"
```

The `stoppedReason` and `stopCode` fields tell you what category of failure you're dealing with. Let's go through each one.

## Container Exit Code Failures

If your container exits with a non-zero exit code, the task stops. Common exit codes and what they mean:

| Exit Code | Meaning | Typical Cause |
|-----------|---------|---------------|
| 0 | Success | Normal exit (shouldn't cause restarts) |
| 1 | General error | Application crash, unhandled exception |
| 126 | Permission denied | Can't execute the entrypoint |
| 127 | Command not found | Bad entrypoint or missing binary |
| 137 | SIGKILL (OOM) | Container killed due to memory limit |
| 139 | Segfault | Application bug, corrupted binary |
| 143 | SIGTERM | Graceful shutdown signal |

### Exit Code 1 - Application Crash

This is the most common one. Your app is crashing on startup. Check the logs first:

```bash
# Grab logs from the stopped task
aws logs get-log-events \
  --log-group-name "/ecs/api-service" \
  --log-stream-name "ecs/api-service/abc123def456" \
  --limit 100 \
  --query "events[*].message" \
  --output text
```

Common causes include missing environment variables, database connection failures, invalid configuration files, and missing dependencies. Almost always, the application logs will tell you exactly what went wrong.

### Exit Code 127 - Command Not Found

This means your container's entrypoint or command doesn't exist in the image. Double-check your task definition:

```bash
# Check the task definition's container command and entrypoint
aws ecs describe-task-definition \
  --task-definition api-service \
  --query "taskDefinition.containerDefinitions[*].{name:name, command:command, entryPoint:entryPoint}"
```

Common fixes:
- Make sure the binary exists in your Docker image
- Check for typos in the command
- Verify the image was built correctly (multi-stage build issues can leave out binaries)

### Exit Code 137 - Out of Memory

Exit code 137 means the container was killed by the OOM killer. The container tried to use more memory than its hard limit allows.

```bash
# Check the memory configuration for the task
aws ecs describe-task-definition \
  --task-definition api-service \
  --query "taskDefinition.{taskMemory:memory, containers:containerDefinitions[*].{name:name, memory:memory, memoryReservation:memoryReservation}}"
```

Solutions:
1. Increase the container's memory limit
2. Increase the task-level memory (for Fargate)
3. Fix the memory leak in your application
4. Set appropriate JVM heap sizes if running Java

For a deep dive on OOM issues, see our guide on [troubleshooting ECS out-of-memory errors](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-ecs-out-of-memory-errors/view).

## Image Pull Failures

If ECS can't pull your container image, the task will fail with a message like "CannotPullContainerError". Common causes:

**Wrong image URI:**
```bash
# Verify the image exists in ECR
aws ecr describe-images \
  --repository-name api-service \
  --image-ids imageTag=latest \
  --query "imageDetails[0].{digest:imageDigest, pushedAt:imagePushedAt, size:imageSizeInBytes}"
```

**Missing ECR permissions:** The ECS task execution role needs `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, and `ecr:GetAuthorizationToken` permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    }
  ]
}
```

**Private registry authentication:** If you're pulling from Docker Hub or another private registry, you need to configure the `repositoryCredentials` in your task definition with a Secrets Manager ARN.

## Resource Constraint Failures

If your cluster doesn't have enough resources to place a task, you'll see "no container instances met all requirements" or similar messages.

For EC2 launch type, check your cluster's available resources:

```bash
# Check available resources on cluster instances
aws ecs describe-container-instances \
  --cluster production \
  --container-instances $(aws ecs list-container-instances --cluster production --query "containerInstanceArns" --output text) \
  --query "containerInstances[*].{id:ec2InstanceId, cpu:remainingResources[?name=='CPU'].integerValue, memory:remainingResources[?name=='MEMORY'].integerValue, status:status}"
```

For Fargate, resource constraints typically manifest as tasks staying in PROVISIONING state for too long. This can happen during AWS capacity shortages in your selected availability zones.

Solutions:
- Spread across multiple AZs in your service configuration
- Use Fargate Spot for non-critical workloads to access different capacity pools
- Right-size your tasks so they don't request more resources than needed

## Networking Failures

Tasks that fail due to networking issues often show errors like "unable to connect to pull secrets" or timeouts during startup.

### No Internet Access

If your tasks run in private subnets, they need either a NAT gateway or VPC endpoints to reach AWS services:

```bash
# Check if your task's subnet has a route to the internet
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-abc123" \
  --query "RouteTables[*].Routes[*].{dest:DestinationCidrBlock, target:NatGatewayId}" \
  --output table
```

Required VPC endpoints for private subnets (if you don't have a NAT gateway):
- `com.amazonaws.region.ecr.dkr` - ECR image pulls
- `com.amazonaws.region.ecr.api` - ECR API
- `com.amazonaws.region.s3` - S3 (ECR stores layers in S3)
- `com.amazonaws.region.logs` - CloudWatch Logs
- `com.amazonaws.region.secretsmanager` - If using Secrets Manager

### Security Group Issues

Your task's security group needs to allow outbound traffic:

```bash
# Check security group rules
aws ec2 describe-security-groups \
  --group-ids sg-abc123 \
  --query "SecurityGroups[0].{inbound:IpPermissions, outbound:IpPermissionsEgress}"
```

A common mistake is creating a security group with no outbound rules, which blocks all egress traffic including connections to ECR, CloudWatch, and your databases.

## Health Check Failures

If your container passes initial startup but then fails health checks, the ECS service will continuously drain and replace tasks.

Check your health check configuration:

```bash
# Review the container health check settings
aws ecs describe-task-definition \
  --task-definition api-service \
  --query "taskDefinition.containerDefinitions[*].{name:name, healthCheck:healthCheck}"
```

Common issues:
- **Start period too short** - Your app might take 30 seconds to start, but the health check starts at 10 seconds. Increase `startPeriod`.
- **Wrong health check endpoint** - The endpoint doesn't exist or returns an error
- **Port mismatch** - The health check is hitting the wrong port

For more details, see our post on [troubleshooting ECS container health check failures](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-ecs-container-health-check-failures/view).

## IAM Permission Failures

Tasks can fail if they can't assume their IAM roles or access the resources they need. Look for errors like "unable to retrieve credentials" in the logs.

Verify your task roles:

```bash
# Check that the execution role and task role are correct
aws ecs describe-task-definition \
  --task-definition api-service \
  --query "taskDefinition.{executionRoleArn:executionRoleArn, taskRoleArn:taskRoleArn}"

# Verify the trust policy on the task role allows ECS to assume it
aws iam get-role \
  --role-name ecsTaskRole \
  --query "Role.AssumeRolePolicyDocument"
```

The trust policy must allow `ecs-tasks.amazonaws.com` to assume the role:

```json
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
```

## Systematic Debugging Checklist

When you hit a task failure, work through this checklist:

1. Check the stopped task reason - `aws ecs describe-tasks`
2. Check container exit codes - non-zero means the app crashed
3. Check logs - `aws logs get-log-events`
4. Check the image - can you pull it manually?
5. Check IAM roles - execution role and task role
6. Check networking - security groups, route tables, VPC endpoints
7. Check resources - enough CPU/memory available?
8. Check health checks - are the timing and endpoints correct?

## Wrapping Up

ECS task failures are frustrating, but they're rarely mysterious once you know where to look. The stopped reason tells you the category, the exit code tells you the type, and the logs tell you the specifics.

Build the habit of checking these systematically instead of guessing. And set up proper monitoring so you catch failures early - our guide on [monitoring ECS tasks with CloudWatch metrics](https://oneuptime.com/blog/post/2026-02-12-monitor-ecs-tasks-cloudwatch-metrics/view) will help you get that in place.
