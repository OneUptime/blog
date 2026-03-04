# How to Fix ECS Task Stuck in 'PENDING' State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Containers, Debugging, Fargate

Description: Diagnose and fix ECS tasks stuck in PENDING state due to resource constraints, networking issues, image pull problems, and capacity provider limitations.

---

You launch an ECS task or update a service, and the task just sits there in PENDING. It never transitions to RUNNING. No error, no crash - just an endless wait. This is especially maddening because there's often no clear error message telling you what's wrong. ECS is quietly waiting for conditions to be met before it can start the task.

Let's walk through the reasons this happens and how to get your tasks running.

## Understanding the PENDING State

When a task is in PENDING, ECS is trying to do one or more of these things:

1. Find a container instance with enough resources (EC2 launch type)
2. Provision compute capacity (Fargate)
3. Pull the container image
4. Set up networking (ENI attachment for awsvpc mode)
5. Fetch secrets from Secrets Manager or SSM

The task stays in PENDING until all of these succeed or ECS gives up.

```bash
# Check the task's current status and reason
aws ecs describe-tasks \
    --cluster my-cluster \
    --tasks <task-arn> \
    --query 'tasks[0].{Status:lastStatus,StopCode:stopCode,Reason:stoppedReason,Attachments:attachments}'
```

## Insufficient Resources (EC2 Launch Type)

This is the most common cause for EC2 launch type. Your cluster doesn't have enough CPU, memory, or ports available on any instance to place the task.

```bash
# Check cluster resource utilization
aws ecs describe-container-instances \
    --cluster my-cluster \
    --container-instances $(aws ecs list-container-instances --cluster my-cluster --query 'containerInstanceArns[]' --output text) \
    --query 'containerInstances[].{Id:ec2InstanceId,CPU:remainingResources[?name==`CPU`].integerValue|[0],Memory:remainingResources[?name==`MEMORY`].integerValue|[0],Status:status}'
```

If all instances show low remaining CPU or memory, you need to either:

1. Scale up your auto-scaling group
2. Reduce the resource requirements in your task definition
3. Stop unnecessary tasks to free up resources

```bash
# Check what your task requires
aws ecs describe-task-definition \
    --task-definition my-app \
    --query 'taskDefinition.containerDefinitions[].{Name:name,CPU:cpu,Memory:memory,MemoryReservation:memoryReservation}'
```

A common gotcha: if you set `memory` (hard limit) but not `memoryReservation` (soft limit), ECS uses the hard limit for placement. Setting `memoryReservation` to a lower value allows more tasks per instance:

```json
{
    "containerDefinitions": [
        {
            "name": "app",
            "cpu": 256,
            "memory": 1024,
            "memoryReservation": 512
        }
    ]
}
```

## ENI Limits (awsvpc Network Mode)

In `awsvpc` network mode, each task gets its own Elastic Network Interface (ENI). EC2 instances have limits on how many ENIs they can support.

| Instance Type | Max ENIs | Tasks per Instance |
|--------------|----------|-------------------|
| t3.micro | 2 | 1 (one for the instance) |
| t3.small | 3 | 2 |
| t3.medium | 3 | 2 |
| m5.large | 3 | 2 |
| m5.xlarge | 4 | 3 |

If all ENI slots are taken, new tasks stay in PENDING.

```bash
# Check ENI usage on instances
aws ec2 describe-network-interfaces \
    --filters Name=attachment.instance-id,Values=i-12345678 \
    --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Description:Description}'
```

Enable ENI trunking to support more tasks per instance:

```bash
# Enable ENI trunking for the account
aws ecs put-account-setting \
    --name awsvpcTrunking \
    --value enabled
```

Note: ENI trunking requires instances launched after enabling this setting, running an ECS-optimized AMI, and supported instance types.

## Fargate Capacity Not Available

For Fargate tasks, PENDING usually means Fargate is having trouble provisioning capacity. This can happen during high demand periods or in less popular availability zones.

```bash
# Check if there are Fargate capacity issues
# Look at service events for clues
aws ecs describe-services \
    --cluster my-cluster \
    --services my-service \
    --query 'services[0].events[:5]'
```

If you see messages like "service was unable to place a task because no container instance met all of its requirements," try:

1. Use Fargate Spot as a fallback capacity provider
2. Spread across multiple AZs
3. Use `FARGATE` and `FARGATE_SPOT` capacity providers together

```json
{
    "capacityProviderStrategy": [
        {
            "capacityProvider": "FARGATE",
            "weight": 1,
            "base": 1
        },
        {
            "capacityProvider": "FARGATE_SPOT",
            "weight": 3
        }
    ]
}
```

## Subnet and Security Group Issues

Tasks in `awsvpc` mode need valid subnets and security groups. If the specified subnet doesn't exist, has no available IP addresses, or the security group is invalid, the task stays in PENDING.

```bash
# Check available IPs in your subnet
aws ec2 describe-subnets \
    --subnet-ids subnet-12345 \
    --query 'Subnets[0].{AvailableIPs:AvailableIpAddressCount,CidrBlock:CidrBlock}'
```

If available IPs is very low or zero, you need a larger subnet or need to clean up unused ENIs.

## Secrets and Parameter Store Access

If your task definition references secrets from AWS Secrets Manager or SSM Parameter Store, and the task execution role can't access them, the task gets stuck in PENDING.

```json
{
    "containerDefinitions": [
        {
            "secrets": [
                {
                    "name": "DB_PASSWORD",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-pwd-abc123"
                }
            ]
        }
    ]
}
```

Verify the task execution role has permission:

```bash
# Check the task execution role policies
aws iam list-attached-role-policies \
    --role-name ecsTaskExecutionRole

# The role needs these permissions for secrets
# secretsmanager:GetSecretValue
# ssm:GetParameters
# kms:Decrypt (if using custom KMS keys)
```

## Image Pull Taking Too Long

Large container images can take minutes to pull, especially on small instances with limited bandwidth. During this time, the task stays in PENDING.

```bash
# Check image size
aws ecr describe-images \
    --repository-name my-app \
    --image-ids imageTag=latest \
    --query 'imageDetails[0].imageSizeInBytes'
```

Reduce image size by:
- Using multi-stage Docker builds
- Starting from smaller base images (Alpine, slim variants)
- Avoiding unnecessary files in the image

## Service Event Messages

ECS services log events that tell you why tasks can't be placed:

```bash
# Get recent service events
aws ecs describe-services \
    --cluster my-cluster \
    --services my-service \
    --query 'services[0].events[:10].{Time:createdAt,Message:message}' \
    --output table
```

Look for messages like:
- "service was unable to place a task because no container instance met all requirements"
- "service is unable to consistently start tasks successfully"
- "ECS was unable to assume the role"

These messages are the single best source of debugging information for PENDING tasks.

For continuous visibility into task placement issues, set up [monitoring on your ECS cluster](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) to alert you when tasks stay pending for too long.

## Summary

Tasks stuck in PENDING are waiting for resources. On EC2, it's usually insufficient CPU, memory, or ENI capacity. On Fargate, it's capacity availability. Check subnet IP availability, security group validity, secret access permissions, and service events for specific error messages. The service events are your best debugging tool - they tell you exactly what ECS is waiting for.
