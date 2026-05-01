# How to Enable ECS Exec for Container Debugging with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, ECS Exec, Debugging, Fargate, Terraform, Container

Description: Learn how to enable and use ECS Exec with OpenTofu to run interactive commands in running ECS Fargate containers for debugging without exposing SSH ports.

---

ECS Exec allows you to run interactive commands directly inside running ECS containers using AWS Systems Manager Session Manager - no SSH, no bastion hosts, no open ports required. This guide shows how to enable it with OpenTofu and use it for debugging.

---

## How ECS Exec Works

```text
Developer → AWS CLI → SSM Session Manager → ECS/Fargate Agent → Container
```

ECS Exec uses SSM to create a secure channel to the container without any inbound network access. The ECS task uses its task IAM role for the required SSM permissions.

---

## Step 1: IAM Role with SSM Permissions

```hcl
# iam.tf

resource "aws_iam_role" "ecs_task" {
  name = "ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_exec" {
  name = "ecs-exec-policy"
  role = aws_iam_role.ecs_task.id

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
      },
      # Required only if you use OVERRIDE logging later in this guide
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:CreateLogStream",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}
```

---

## Step 2: Enable ECS Exec on the Service

```hcl
# ecs.tf
resource "aws_ecs_cluster" "main" {
  name = "app-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "nginx:latest"
      essential = true
      portMappings = [{ containerPort = 80 }]

      # Recommended: clean up zombie SSM agent child processes
      linuxParameters = {
        initProcessEnabled = true
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Enable ECS Exec
  enable_execute_command = true

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }
}
```

---

## Step 3: Execute Commands in the Container

```bash
# Prereq: AWS CLI v2.3.6+ (or v1.22.3+) and the Session Manager plugin installed locally

# Get the task ARN
CLUSTER="app-cluster"
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER \
  --service-name app-service \
  --query 'taskArns[0]' --output text)

echo "Task: $TASK_ARN"

# Check if exec is enabled
aws ecs describe-tasks \
  --cluster $CLUSTER \
  --tasks $TASK_ARN \
  --query 'tasks[0].enableExecuteCommand'

# Open interactive shell
aws ecs execute-command \
  --cluster $CLUSTER \
  --task $TASK_ARN \
  --container app \
  --interactive \
  --command "/bin/sh"

# Run a single command
aws ecs execute-command \
  --cluster $CLUSTER \
  --task $TASK_ARN \
  --container app \
  --interactive \
  --command "cat /etc/os-release"
```

---

## VPC Endpoint for ECS Exec (Private Subnets)

For tasks in private subnets without a NAT gateway, add the `ssmmessages` interface VPC endpoint. If you use a customer-managed KMS key for ECS Exec encryption, add a `kms` endpoint too.

```hcl
resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id              = data.aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = data.aws_subnets.private.ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}
```

---

## Audit Logging for ECS Exec Sessions

For `OVERRIDE` logging, the container image must include `script` and `cat`.

```hcl
resource "aws_cloudwatch_log_group" "exec_audit" {
  name              = "/ecs/exec-audit"
  retention_in_days = 90
}

# Update your existing cluster resource to add ECS Exec audit logging
resource "aws_ecs_cluster" "main" {
  name = "app-cluster"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.exec_audit.name
      }
    }
  }
}
```

---

## Troubleshooting

```bash
# Error: "execute command failed... The execute command requires SSM"
# Fix: Ensure the task role has the required ssmmessages permissions and
# that the task can reach the ssmmessages endpoint

# Check ExecuteCommandAgent status in the task
aws ecs describe-tasks --cluster app-cluster --tasks $TASK_ARN \
  --query 'tasks[0].containers[0].managedAgents[?name==`ExecuteCommandAgent`]'

# ECS Exec only applies to new tasks
# Fix: force a new deployment after enabling execute command on a service

# Check ECS Exec is enabled on service
aws ecs describe-services --cluster app-cluster --services app-service \
  --query 'services[0].enableExecuteCommand'
```

---

## Best Practices

1. **Restrict ECS Exec access with IAM** - use condition keys to limit who can exec into containers
2. **Enable audit logging** to S3/CloudWatch for compliance and security review
3. **Use initProcessEnabled** to prevent zombie processes in the container
4. **Disable in production** for highly sensitive workloads - use only for debugging
5. **Use single-command execs** (`--command "cat /etc/os-release"`) for quick diagnostics without opening a full shell

---

## Conclusion

ECS Exec provides a secure, auditability-first approach to container debugging. Enable it in your OpenTofu service configuration, add the required IAM permissions, and use `aws ecs execute-command` to troubleshoot running containers without opening inbound ports.

---

*Monitor your ECS containers in production with [OneUptime](https://oneuptime.com) - full-stack observability.*
