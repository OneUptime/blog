# How to Run an ECS Task Manually

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, Containers

Description: Learn how to run one-off ECS tasks manually for testing, batch jobs, migrations, and debugging, with examples using both Fargate and EC2 launch types.

---

Not everything needs to be a long-running service. Database migrations, batch processing jobs, one-time data exports, integration tests - these are all tasks that run once and exit. ECS handles these with the `run-task` API, which launches a task from a task definition, runs it, and cleans up when it's done.

This is also the fastest way to test a new task definition before wrapping it in a service. Let's walk through the different ways to run tasks manually.

## Prerequisites

You'll need:

- An ECS cluster (see [creating your first ECS cluster](https://oneuptime.com/blog/post/2026-02-12-first-ecs-cluster/view))
- A task definition (see [creating an ECS task definition](https://oneuptime.com/blog/post/2026-02-12-ecs-task-definition/view))
- Proper networking (VPC, subnets, security groups)

## Running a Task on Fargate

Running a Fargate task requires specifying the network configuration since Fargate uses `awsvpc` networking.

```bash
# Run a one-off task on Fargate
aws ecs run-task \
  --cluster my-first-cluster \
  --task-definition web-app:1 \
  --launch-type FARGATE \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123", "subnet-def456"],
      "securityGroups": ["sg-12345678"],
      "assignPublicIp": "ENABLED"
    }
  }'
```

Set `assignPublicIp` to `ENABLED` if your task needs internet access and your subnets are public. For private subnets with a NAT gateway, set it to `DISABLED`.

The command returns immediately with a task ARN. The task will take a minute or two to pull the image and start running.

## Checking Task Status

After launching a task, monitor its progress.

```bash
# Get the task ARN from the run-task output, then describe it
aws ecs describe-tasks \
  --cluster my-first-cluster \
  --tasks arn:aws:ecs:us-east-1:123456789:task/my-first-cluster/abc123def456 \
  --query 'tasks[0].{Status:lastStatus,Health:healthStatus,StoppedReason:stoppedReason,Containers:containers[*].{Name:name,Status:lastStatus,ExitCode:exitCode}}'
```

The task goes through these states: `PROVISIONING` -> `PENDING` -> `ACTIVATING` -> `RUNNING` -> `DEACTIVATING` -> `STOPPING` -> `DEPROVISIONING` -> `STOPPED`.

For a one-off task, it'll run through all of these. Check the `exitCode` of each container to determine success or failure.

## Running a Task on EC2

If your cluster uses EC2 instances, you can skip the network configuration for tasks using `bridge` or `host` networking.

```bash
# Run a task on EC2 launch type
aws ecs run-task \
  --cluster my-ec2-cluster \
  --task-definition batch-processor:3 \
  --launch-type EC2 \
  --count 1
```

If your EC2 task uses `awsvpc` networking, you still need the network configuration like Fargate.

## Overriding Container Settings at Run Time

One of the most useful features is overriding task definition settings when you run a task. This lets you use the same task definition with different commands or environment variables.

```bash
# Run a task with command override - useful for database migrations
aws ecs run-task \
  --cluster my-first-cluster \
  --task-definition web-app:1 \
  --launch-type FARGATE \
  --overrides '{
    "containerOverrides": [
      {
        "name": "web",
        "command": ["python", "manage.py", "migrate"],
        "environment": [
          {"name": "RUN_MODE", "value": "migration"},
          {"name": "MIGRATION_VERSION", "value": "20260212_001"}
        ]
      }
    ]
  }' \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123"],
      "securityGroups": ["sg-12345678"],
      "assignPublicIp": "DISABLED"
    }
  }'
```

You can also override CPU and memory at the task level.

```bash
# Run with more resources than the default task definition specifies
aws ecs run-task \
  --cluster my-first-cluster \
  --task-definition batch-processor:1 \
  --launch-type FARGATE \
  --overrides '{
    "cpu": "2048",
    "memory": "4096",
    "containerOverrides": [
      {
        "name": "processor",
        "command": ["python", "heavy_batch_job.py", "--full"]
      }
    ]
  }' \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123"],
      "securityGroups": ["sg-12345678"],
      "assignPublicIp": "DISABLED"
    }
  }'
```

## Running Multiple Tasks

Use the `--count` flag to launch multiple identical tasks.

```bash
# Run 5 parallel instances of a batch job
aws ecs run-task \
  --cluster my-first-cluster \
  --task-definition batch-processor:1 \
  --launch-type FARGATE \
  --count 5 \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123", "subnet-def456"],
      "securityGroups": ["sg-12345678"],
      "assignPublicIp": "DISABLED"
    }
  }'
```

Fargate allows up to 10 tasks per `run-task` call. If you need more, make multiple calls.

## Waiting for Task Completion

The CLI doesn't have a built-in wait command for tasks, but you can script it.

```bash
#!/bin/bash
# Script to run a task and wait for it to complete

CLUSTER="my-first-cluster"
TASK_DEF="db-migration:1"

# Run the task and capture the ARN
TASK_ARN=$(aws ecs run-task \
  --cluster $CLUSTER \
  --task-definition $TASK_DEF \
  --launch-type FARGATE \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc123"],
      "securityGroups": ["sg-12345678"],
      "assignPublicIp": "DISABLED"
    }
  }' \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Started task: $TASK_ARN"

# Wait for the task to stop
aws ecs wait tasks-stopped --cluster $CLUSTER --tasks $TASK_ARN

# Check the exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster $CLUSTER \
  --tasks $TASK_ARN \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

echo "Task completed with exit code: $EXIT_CODE"

if [ "$EXIT_CODE" != "0" ]; then
  echo "Task failed! Checking logs..."
  # Get the stopped reason
  aws ecs describe-tasks \
    --cluster $CLUSTER \
    --tasks $TASK_ARN \
    --query 'tasks[0].stoppedReason' \
    --output text
  exit 1
fi
```

## Running Tasks from a Script or CI/CD

In a CI/CD pipeline, you might use Python to get more control.

```python
# Python script to run an ECS task and wait for completion
import boto3
import time
import sys

ecs = boto3.client('ecs', region_name='us-east-1')

# Run the task
response = ecs.run_task(
    cluster='my-first-cluster',
    taskDefinition='db-migration:latest',
    launchType='FARGATE',
    networkConfiguration={
        'awsvpcConfiguration': {
            'subnets': ['subnet-abc123'],
            'securityGroups': ['sg-12345678'],
            'assignPublicIp': 'DISABLED'
        }
    },
    overrides={
        'containerOverrides': [{
            'name': 'migration',
            'command': ['python', 'migrate.py', '--apply']
        }]
    }
)

task_arn = response['tasks'][0]['taskArn']
print(f"Task started: {task_arn}")

# Poll until the task stops
waiter = ecs.get_waiter('tasks_stopped')
waiter.wait(
    cluster='my-first-cluster',
    tasks=[task_arn],
    WaiterConfig={'Delay': 10, 'MaxAttempts': 60}
)

# Check results
result = ecs.describe_tasks(
    cluster='my-first-cluster',
    tasks=[task_arn]
)

task = result['tasks'][0]
exit_code = task['containers'][0].get('exitCode', -1)
stopped_reason = task.get('stoppedReason', 'N/A')

print(f"Exit code: {exit_code}")
print(f"Stopped reason: {stopped_reason}")

if exit_code != 0:
    print("Task failed!")
    sys.exit(1)

print("Task completed successfully!")
```

## Viewing Task Logs

After a task runs, its logs are in CloudWatch (assuming you configured the awslogs driver in your task definition).

```bash
# View logs for a completed task
# The log stream name format is: prefix/container-name/task-id
aws logs get-log-events \
  --log-group-name /ecs/web-app \
  --log-stream-name web/web/abc123def456789 \
  --limit 100
```

Or use the `aws logs tail` command for a nicer output.

```bash
# Tail logs from the log group - shows recent entries
aws logs tail /ecs/web-app --since 1h --format short
```

## Common Issues

**Task stuck in PROVISIONING** - Usually means Fargate is waiting for capacity. This is rare but can happen during regional capacity constraints.

**Task stops immediately with no logs** - The image probably failed to pull. Check that the ECR repository exists, the image tag is correct, and the execution role has ECR pull permissions.

**Exit code 137** - Your container was killed by the OOM killer. Increase the memory allocation in your task definition.

**Exit code 1 with "CannotPullContainerError"** - Network issue. Make sure your subnets can reach ECR (either through a public IP, NAT gateway, or VPC endpoint).

## Wrapping Up

Running tasks manually is essential for testing, debugging, and one-off jobs. The override capability means you can reuse the same task definition for different scenarios without creating separate definitions for each. Master this workflow and you'll be able to quickly validate changes before deploying them as services. When you're ready for always-running workloads, check out our guide on [creating ECS services](https://oneuptime.com/blog/post/2026-02-12-ecs-service-long-running-containers/view).
