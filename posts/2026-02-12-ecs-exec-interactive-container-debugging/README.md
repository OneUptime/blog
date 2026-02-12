# How to Set Up ECS Exec for Interactive Container Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Debugging, Containers, DevOps

Description: A step-by-step guide to setting up ECS Exec so you can open interactive shell sessions inside running Fargate and EC2-backed containers for debugging.

---

There's nothing more frustrating than a container that works fine locally but behaves differently in ECS. You check the logs, add more logging, redeploy, check again - it's a slow cycle. ECS Exec changes the game by letting you open an interactive shell session directly into a running container, just like you'd SSH into a regular server.

ECS Exec uses AWS Systems Manager (SSM) under the hood to create a secure channel between your terminal and the container. It works with both Fargate and EC2 launch types. Let's walk through the complete setup.

## Prerequisites

Before you can use ECS Exec, you need a few things in place:

1. The AWS CLI v2 installed (v1 doesn't support ECS Exec)
2. The Session Manager plugin for the AWS CLI
3. Proper IAM permissions on the task role
4. ECS Exec enabled on the service or task

Let's install the Session Manager plugin first.

```bash
# macOS installation
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip" \
  -o "sessionmanager-bundle.zip"
unzip sessionmanager-bundle.zip
sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin \
  -b /usr/local/bin/session-manager-plugin

# Verify installation
session-manager-plugin --version
```

For Linux:

```bash
# Linux (64-bit) installation
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" \
  -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

## Configuring the Task Role

Your ECS task role needs permissions to communicate with SSM. Add this policy to the task role (not the execution role - that's a common mistake).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ],
      "Resource": "*"
    }
  ]
}
```

If you want to log ECS Exec sessions to CloudWatch or S3 (recommended for audit purposes), you'll need additional permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ecs/exec-logs:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetEncryptionConfiguration"
      ],
      "Resource": "arn:aws:s3:::my-exec-logs-bucket/*"
    }
  ]
}
```

In Terraform, you'd attach this policy like so.

```hcl
# IAM policy for ECS Exec
resource "aws_iam_role_policy" "ecs_exec" {
  name = "ecs-exec-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Enabling ECS Exec on a Service

ECS Exec needs to be explicitly enabled on your service or when running a standalone task. For services, set the `enableExecuteCommand` flag.

```bash
# Enable ECS Exec when creating a new service
aws ecs create-service \
  --cluster my-cluster \
  --service-name my-service \
  --task-definition my-task:1 \
  --desired-count 2 \
  --enable-execute-command \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-abc123],securityGroups=[sg-abc123],assignPublicIp=ENABLED}"
```

For an existing service, update it.

```bash
# Enable ECS Exec on an existing service
aws ecs update-service \
  --cluster my-cluster \
  --service my-service \
  --enable-execute-command \
  --force-new-deployment
```

The `--force-new-deployment` flag is important. Existing tasks won't get ECS Exec capabilities - you need to replace them with new tasks that have the SSM agent sidecar injected.

In Terraform:

```hcl
resource "aws_ecs_service" "app" {
  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  # Enable ECS Exec for debugging
  enable_execute_command = true

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }
}
```

## Executing Commands

With everything set up, you can now exec into a running container.

```bash
# Open an interactive shell
aws ecs execute-command \
  --cluster my-cluster \
  --task arn:aws:ecs:us-east-1:123456789:task/my-cluster/abc123def456 \
  --container my-container \
  --interactive \
  --command "/bin/sh"
```

If your task only has one container, you can omit the `--container` flag. The `--interactive` flag is required for shell sessions.

You can also run non-interactive commands.

```bash
# Check environment variables
aws ecs execute-command \
  --cluster my-cluster \
  --task abc123def456 \
  --command "env | sort" \
  --interactive

# Check network connectivity
aws ecs execute-command \
  --cluster my-cluster \
  --task abc123def456 \
  --command "curl -s http://api.production.local:8080/health" \
  --interactive

# Inspect the filesystem
aws ecs execute-command \
  --cluster my-cluster \
  --task abc123def456 \
  --command "ls -la /app" \
  --interactive
```

## Finding the Task ID

You need the task ID or ARN to exec into it. Here's how to find it.

```bash
# List running tasks in a service
aws ecs list-tasks \
  --cluster my-cluster \
  --service-name my-service \
  --desired-status RUNNING

# Get more details about the tasks
aws ecs describe-tasks \
  --cluster my-cluster \
  --tasks $(aws ecs list-tasks --cluster my-cluster --service-name my-service --query 'taskArns[0]' --output text) \
  --query 'tasks[0].{taskArn:taskArn,lastStatus:lastStatus,enableExecuteCommand:enableExecuteCommand}'
```

Check that `enableExecuteCommand` is `true` in the output. If it's `false`, the task was launched before ECS Exec was enabled and you need to force a new deployment.

## Configuring Session Logging

For production environments, you should log all ECS Exec sessions. This is crucial for audit trails and security compliance.

```hcl
# Configure ECS cluster for exec logging
resource "aws_ecs_cluster" "main" {
  name = "my-cluster"

  configuration {
    execute_command_configuration {
      # Encrypt sessions with KMS
      kms_key_id = aws_kms_key.exec.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.exec.name
        s3_bucket_name             = aws_s3_bucket.exec_logs.id
        s3_key_prefix              = "exec-logs"
      }
    }
  }
}

# CloudWatch log group for exec sessions
resource "aws_cloudwatch_log_group" "exec" {
  name              = "/ecs/exec-logs"
  retention_in_days = 90
}
```

## Troubleshooting Common Issues

**"The execute command failed" error**: This usually means the SSM agent inside the container can't reach the SSM endpoints. Make sure your task's security group allows outbound HTTPS (port 443) to SSM endpoints, or that you have VPC endpoints for SSM set up.

```bash
# Check if ECS Exec is properly configured
aws ecs describe-tasks \
  --cluster my-cluster \
  --tasks YOUR_TASK_ID \
  --query 'tasks[0].containers[0].managedAgents'
```

Look for the `ExecuteCommandAgent` in the output. Its `lastStatus` should be `RUNNING`.

**"TargetNotConnectedException"**: The SSM agent in the container hasn't connected yet. Wait 30-60 seconds after the task starts, then try again.

**Container doesn't have a shell**: If your container is based on a minimal image like `scratch` or `distroless`, there's no shell to exec into. You'll need to use a debug image or add busybox to your image.

```dockerfile
# Add debugging tools to a minimal image
FROM gcr.io/distroless/base-debian12 AS production

# For debug builds, add a shell
FROM production AS debug
COPY --from=busybox:1.36 /bin/sh /bin/sh
COPY --from=busybox:1.36 /bin/busybox /bin/busybox
```

## Security Considerations

ECS Exec is a powerful tool, and with great power comes the need for access controls. Here are a few recommendations:

1. **Restrict who can use it** - Use IAM policies to limit which users can execute commands and on which clusters.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecs:ExecuteCommand",
      "Resource": "arn:aws:ecs:us-east-1:123456789:task/dev-cluster/*",
      "Condition": {
        "StringEquals": {
          "ecs:container-name": "app"
        }
      }
    }
  ]
}
```

2. **Always enable logging** - Every exec session should be recorded for audit purposes.
3. **Disable in production** - Consider only enabling ECS Exec in non-production environments, or enabling it temporarily when debugging is needed.
4. **Use KMS encryption** - Encrypt the SSM channel for sensitive workloads.

## Quick Reference Script

Here's a handy script that combines task discovery and exec.

```bash
#!/bin/bash
# ecs-exec.sh - Quick exec into an ECS service
CLUSTER=${1:?"Usage: ecs-exec.sh CLUSTER SERVICE [COMMAND]"}
SERVICE=${2:?"Usage: ecs-exec.sh CLUSTER SERVICE [COMMAND]"}
COMMAND=${3:-"/bin/sh"}

# Get the first running task
TASK_ARN=$(aws ecs list-tasks \
  --cluster "$CLUSTER" \
  --service-name "$SERVICE" \
  --desired-status RUNNING \
  --query 'taskArns[0]' \
  --output text)

if [ "$TASK_ARN" = "None" ]; then
  echo "No running tasks found for $SERVICE in $CLUSTER"
  exit 1
fi

echo "Connecting to task: $TASK_ARN"
aws ecs execute-command \
  --cluster "$CLUSTER" \
  --task "$TASK_ARN" \
  --interactive \
  --command "$COMMAND"
```

Save this as `ecs-exec.sh` and use it like `./ecs-exec.sh my-cluster my-service`. It beats typing out the full command every time.

ECS Exec turns container debugging from a painful log-reading exercise into an interactive experience. Set it up in your non-production environments, and you'll wonder how you lived without it. For related debugging and monitoring approaches, check out our post on [container monitoring best practices](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).
