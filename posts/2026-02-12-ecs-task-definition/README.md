# How to Create an ECS Task Definition

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, Containers, Task Definition

Description: A detailed guide to creating ECS task definitions, covering container configuration, resource allocation, logging, environment variables, and multi-container setups.

---

A task definition is the blueprint for your containers in ECS. It tells ECS which Docker image to use, how much CPU and memory to allocate, what environment variables to set, where to send logs, and how containers within a task should interact. Before you can run anything on ECS, you need a task definition.

Think of it like a docker-compose file, but for AWS. If you haven't created your [ECS cluster](https://oneuptime.com/blog/post/2026-02-12-first-ecs-cluster/view) yet, do that first.

## Task Definition Basics

Every task definition specifies:

- **Family** - a name that groups revisions together
- **Container definitions** - one or more containers to run
- **CPU and memory** - resource limits for the entire task
- **Network mode** - how containers get their networking
- **Launch type compatibility** - Fargate, EC2, or both

## Creating a Simple Task Definition

Here's a basic task definition for a web application.

```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-web-app:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/web-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web"
        }
      }
    }
  ]
}
```

Register it with the AWS CLI.

```bash
# Register the task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# List all revisions of this task definition family
aws ecs list-task-definitions --family-prefix web-app
```

Each time you register a task definition with the same family name, ECS creates a new revision (web-app:1, web-app:2, etc.). Previous revisions remain available for rollback.

## CPU and Memory Combinations for Fargate

Fargate has specific valid combinations of CPU and memory. You can't just pick any values.

| CPU (units) | Memory Options |
|-------------|---------------|
| 256 (.25 vCPU) | 512 MB, 1 GB, 2 GB |
| 512 (.5 vCPU) | 1 GB through 4 GB (in 1 GB increments) |
| 1024 (1 vCPU) | 2 GB through 8 GB (in 1 GB increments) |
| 2048 (2 vCPU) | 4 GB through 16 GB (in 1 GB increments) |
| 4096 (4 vCPU) | 8 GB through 30 GB (in 1 GB increments) |

For EC2 launch type, you have more flexibility since the limits come from your instance sizes.

## Environment Variables and Secrets

There are three ways to pass configuration to your containers.

### Inline Environment Variables

Simple but not great for secrets since they're visible in the task definition.

```json
{
  "name": "web",
  "image": "my-app:latest",
  "environment": [
    {"name": "NODE_ENV", "value": "production"},
    {"name": "PORT", "value": "8080"},
    {"name": "LOG_LEVEL", "value": "info"}
  ]
}
```

### Secrets from AWS Secrets Manager

The right way to handle credentials and API keys.

```json
{
  "name": "web",
  "image": "my-app:latest",
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/database-url-AbCdEf"
    },
    {
      "name": "API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/api-key-GhIjKl"
    }
  ]
}
```

Your task execution role needs permission to read these secrets.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/*"
      ]
    }
  ]
}
```

### SSM Parameter Store

Cheaper than Secrets Manager for non-sensitive configuration.

```json
{
  "name": "web",
  "image": "my-app:latest",
  "secrets": [
    {
      "name": "FEATURE_FLAG_URL",
      "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/prod/feature-flag-url"
    }
  ]
}
```

## Logging Configuration

Always configure logging. The `awslogs` driver sends container stdout/stderr to CloudWatch Logs.

```json
{
  "name": "web",
  "image": "my-app:latest",
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/web-app",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "web",
      "awslogs-create-group": "true",
      "max-buffer-size": "25m",
      "mode": "non-blocking"
    }
  }
}
```

The `non-blocking` mode prevents your container from being blocked if CloudWatch is slow. The `max-buffer-size` controls how much log data to buffer before dropping.

For EC2 launch type, you can also use Fluentd, Splunk, or other log drivers.

## Multi-Container Task Definitions

A task can run multiple containers that share networking and optionally share storage. This is useful for sidecar patterns.

```json
{
  "family": "web-app-with-sidecar",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/web-app:latest",
      "essential": true,
      "portMappings": [
        {"containerPort": 8080, "protocol": "tcp"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/web-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web"
        }
      }
    },
    {
      "name": "nginx-proxy",
      "image": "nginx:alpine",
      "essential": true,
      "portMappings": [
        {"containerPort": 80, "protocol": "tcp"}
      ],
      "dependsOn": [
        {"containerName": "web", "condition": "START"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/web-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "nginx"
        }
      }
    },
    {
      "name": "datadog-agent",
      "image": "datadog/agent:latest",
      "essential": false,
      "environment": [
        {"name": "ECS_FARGATE", "value": "true"}
      ],
      "secrets": [
        {
          "name": "DD_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:datadog-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/web-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "datadog"
        }
      }
    }
  ]
}
```

Notice the `essential` flag. If an essential container stops, the entire task stops. The datadog-agent sidecar is marked non-essential because you don't want monitoring failures to take down your application.

The `dependsOn` field ensures nginx waits for the web container to start first.

## Health Checks

Define health checks at the container level to let ECS know when your application is ready.

```json
{
  "name": "web",
  "image": "my-app:latest",
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

The `startPeriod` gives your container time to boot before health checks start counting failures.

## Volumes and Storage

Mount EFS filesystems or ephemeral storage to your containers.

```json
{
  "family": "app-with-storage",
  "volumes": [
    {
      "name": "shared-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-12345678",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-12345678",
          "iam": "ENABLED"
        }
      }
    }
  ],
  "containerDefinitions": [
    {
      "name": "web",
      "image": "my-app:latest",
      "mountPoints": [
        {
          "sourceVolume": "shared-data",
          "containerPath": "/app/uploads",
          "readOnly": false
        }
      ]
    }
  ]
}
```

## Task Role vs Execution Role

This trips up a lot of people. There are two different IAM roles:

- **Execution role** (`executionRoleArn`) - used by the ECS agent to pull images, push logs, and fetch secrets. This is the infrastructure role.
- **Task role** (`taskRoleArn`) - used by your application code when it calls AWS APIs. This is the application role.

```json
{
  "family": "web-app",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/webAppTaskRole",
  "containerDefinitions": [...]
}
```

If your app needs to read from S3, write to DynamoDB, or publish to SNS, those permissions go on the task role, not the execution role.

## Wrapping Up

Task definitions are the most detailed piece of ECS configuration. Take the time to get them right - proper resource limits, good logging, secrets management, and health checks will save you from debugging issues in production. Start simple with a single container, get it running, then add sidecars and volumes as needed. Once you have your task definition, you're ready to [run it as a task](https://oneuptime.com/blog/post/2026-02-12-run-ecs-task-manually/view) or [create a service](https://oneuptime.com/blog/post/2026-02-12-ecs-service-long-running-containers/view) around it.
