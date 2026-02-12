# How to Fix ECS 'Essential Container in Task Exited' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, Debugging, Containers

Description: Diagnose and resolve the ECS essential container exited error by checking exit codes, container health, log drivers, and task definition configuration.

---

When an ECS task stops with the message "Essential container in task exited," it means one of your containers marked as essential has stopped running. ECS considers this a task failure and shuts down the entire task. If it's a service, ECS will try to launch a replacement, but if the same problem keeps happening, you'll see tasks cycling endlessly.

Let's figure out why the container is exiting and how to fix it.

## Understanding Essential Containers

In an ECS task definition, every container is essential by default. When an essential container exits (for any reason), the entire task is stopped. You can mark a container as non-essential by setting `essential: false`, which is useful for sidecar containers that aren't critical.

```json
{
    "containerDefinitions": [
        {
            "name": "app",
            "image": "my-app:latest",
            "essential": true,
            "memory": 512
        },
        {
            "name": "log-router",
            "image": "fluent-bit:latest",
            "essential": false,
            "memory": 128
        }
    ]
}
```

If the `log-router` container crashes, the task continues. If the `app` container crashes, the whole task stops.

## Step 1: Check the Exit Code

The exit code tells you why the container stopped. Find it in the stopped task details:

```bash
# Get details about stopped tasks
aws ecs describe-tasks \
    --cluster my-cluster \
    --tasks $(aws ecs list-tasks --cluster my-cluster --desired-status STOPPED --query 'taskArns[0]' --output text) \
    --query 'tasks[0].containers[].{Name:name,ExitCode:exitCode,Reason:reason,Status:lastStatus}'
```

Common exit codes and their meanings:

| Exit Code | Meaning |
|-----------|---------|
| 0 | Clean exit (container finished its work) |
| 1 | General application error |
| 137 | Killed by SIGKILL (usually OOM) |
| 139 | Segmentation fault |
| 143 | Killed by SIGTERM (graceful shutdown) |
| 255 | Exit status out of range |

## Step 2: Check Container Logs

The logs are your best friend. If you're using the `awslogs` driver (which you should be), check CloudWatch:

```bash
# View recent logs from the container
aws logs get-log-events \
    --log-group-name /ecs/my-task \
    --log-stream-name "ecs/app/<task-id>" \
    --limit 50 \
    --query 'events[].message' \
    --output text
```

If you don't see any logs, the container might be crashing before the log driver initializes. Check the ECS agent logs instead:

```bash
# For EC2 launch type - SSH to the instance and check
# /var/log/ecs/ecs-agent.log
```

## Step 3: Common Causes and Fixes

### Application Crash on Startup

The most common cause is the application itself crashing. Maybe it can't connect to a database, a required environment variable is missing, or there's a configuration error.

```json
{
    "containerDefinitions": [
        {
            "name": "app",
            "image": "my-app:latest",
            "essential": true,
            "environment": [
                {
                    "name": "DATABASE_URL",
                    "value": "postgres://db.example.com:5432/mydb"
                },
                {
                    "name": "PORT",
                    "value": "8080"
                }
            ],
            "secrets": [
                {
                    "name": "DB_PASSWORD",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-password"
                }
            ]
        }
    ]
}
```

Verify your environment variables and secrets are correct. A missing secret or wrong database URL will crash most applications at startup.

### Out of Memory (Exit Code 137)

If the container is killed with exit code 137, it ran out of memory. The container tried to use more memory than its limit allows.

```json
{
    "containerDefinitions": [
        {
            "name": "app",
            "image": "my-app:latest",
            "memory": 512,
            "memoryReservation": 256
        }
    ]
}
```

`memory` is the hard limit - if the container exceeds this, it's killed. `memoryReservation` is the soft limit used for placement. Increase the hard limit:

```json
{
    "memory": 1024,
    "memoryReservation": 512
}
```

For Fargate tasks, you also need to ensure the task-level memory is sufficient:

```json
{
    "cpu": "512",
    "memory": "1024",
    "containerDefinitions": [
        {
            "name": "app",
            "memory": 1024
        }
    ]
}
```

Check out our guide on [fixing ECS OutOfMemoryError](https://oneuptime.com/blog/post/fix-ecs-outofmemoryerror-container-tasks/view) for a deeper dive into memory issues.

### Entrypoint or Command Errors

If the Docker entrypoint or command is wrong, the container exits immediately:

```json
{
    "containerDefinitions": [
        {
            "name": "app",
            "image": "my-app:latest",
            "entryPoint": ["/bin/sh", "-c"],
            "command": ["node", "server.js"]
        }
    ]
}
```

Test the same command locally:

```bash
# Test the container locally with the same entrypoint
docker run --rm my-app:latest node server.js
```

### Health Check Failures

If you've configured a health check, the container might be killed because it fails the health check, not because it crashed:

```json
{
    "containerDefinitions": [
        {
            "name": "app",
            "healthCheck": {
                "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
```

The `startPeriod` gives your container time to start up before health checks begin failing. If your app takes 30 seconds to start, set `startPeriod` to at least 60 seconds.

### Image Pull Issues

Sometimes the container can't start because the image doesn't exist or can't be pulled. This shows up differently - usually as a `CannotPullContainerError` rather than an essential container exit. But if the image is corrupt or has a broken entrypoint, you'll see the essential container exit error.

```bash
# Verify the image exists and is pullable
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

## Step 4: Check Task Stopped Reason

ECS provides a stopped reason at the task level:

```bash
# Get the stopped reason
aws ecs describe-tasks \
    --cluster my-cluster \
    --tasks <task-arn> \
    --query 'tasks[0].{StoppedReason:stoppedReason,StopCode:stopCode}'
```

The `stopCode` field gives you categories like `TaskFailedToStart`, `EssentialContainerExited`, or `ServiceSchedulerInitiated`.

## Preventing Recurring Crashes

If your service keeps launching and crashing in a loop, it can cause cascading problems. Configure your service's deployment circuit breaker:

```json
{
    "deploymentConfiguration": {
        "deploymentCircuitBreaker": {
            "enable": true,
            "rollback": true
        },
        "maximumPercent": 200,
        "minimumHealthyPercent": 100
    }
}
```

This automatically rolls back to the previous working version if the new tasks keep failing. And set up [monitoring on your ECS services](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) to get alerted when tasks are failing rather than discovering it from user reports.

## Summary

"Essential container in task exited" means your container stopped running. Check the exit code to understand why (137 is memory, 1 is application error), check the CloudWatch logs for error messages, and verify your environment variables, secrets, and resource limits. Most issues are application-level problems that show up in the logs. Use circuit breakers to prevent crash loops in production.
