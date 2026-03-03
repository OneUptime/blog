# How to Fix Error Creating ECS Service InvalidParameterException

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Container, Troubleshooting

Description: Troubleshoot and resolve InvalidParameterException errors when creating ECS services with Terraform, including task definitions, networking, and load balancer issues.

---

Creating ECS services with Terraform involves coordinating multiple AWS resources - task definitions, clusters, load balancers, subnets, and security groups. The `InvalidParameterException` error means one of these pieces is misconfigured, but the error message does not always make it obvious which one. Let us break down the most common causes and their fixes.

## What the Error Looks Like

```text
Error: error creating ECS Service (my-service):
InvalidParameterException: Unable to assume the service linked
role. Please verify that the ECS service linked role exists.
    status code: 400, request id: abc123-def456

Error: error creating ECS Service (my-service):
InvalidParameterException: The target group with targetGroupArn
arn:aws:elasticloadbalancing:... does not have an associated
load balancer.
    status code: 400, request id: abc123-def456

Error: error creating ECS Service (my-service):
InvalidParameterException: The provided target group has a target
type that is incompatible with the deployment controller.
    status code: 400, request id: abc123-def456
```

## Common Causes and Fixes

### 1. Missing ECS Service-Linked Role

ECS requires a service-linked role to manage resources on your behalf. If this role does not exist in your account, service creation fails:

```bash
# Check if the service-linked role exists
aws iam get-role --role-name AWSServiceRoleForECS
```

**Fix:** Create the service-linked role:

```hcl
resource "aws_iam_service_linked_role" "ecs" {
  aws_service_name = "ecs.amazonaws.com"
}
```

Or create it via AWS CLI:

```bash
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
```

### 2. Target Group and Load Balancer Mismatch

The target group must be associated with a load balancer before you can reference it in an ECS service. Also, the target group type must match your ECS launch type:

- **Fargate** requires target groups with `target_type = "ip"`
- **EC2 launch type** can use `target_type = "instance"` or `"ip"`

```hcl
# WRONG for Fargate - target type is instance
resource "aws_lb_target_group" "bad" {
  name        = "my-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"  # Does not work with Fargate
}

# CORRECT for Fargate
resource "aws_lb_target_group" "good" {
  name        = "my-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"  # Required for Fargate
}
```

Make sure the target group is attached to a listener before creating the ECS service:

```hcl
resource "aws_lb" "main" {
  name               = "my-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "app" {
  name        = "my-app-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ECS service depends on the listener being created
resource "aws_ecs_service" "app" {
  depends_on = [aws_lb_listener.http]

  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 80
  }
}
```

### 3. Network Configuration Missing for Fargate

Fargate tasks require a `network_configuration` block. Omitting it causes an InvalidParameterException:

```hcl
# WRONG - missing network_configuration for Fargate
resource "aws_ecs_service" "app" {
  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  launch_type     = "FARGATE"
  desired_count   = 1
}

# CORRECT
resource "aws_ecs_service" "app" {
  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
}
```

### 4. Task Definition Network Mode Mismatch

Fargate requires the task definition to use `awsvpc` network mode:

```hcl
# WRONG for Fargate
resource "aws_ecs_task_definition" "app" {
  family                = "my-app"
  network_mode          = "bridge"  # Does not work with Fargate
  # ...
}

# CORRECT for Fargate
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  network_mode             = "awsvpc"  # Required for Fargate
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "nginx:latest"
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

### 5. Container Port Mismatch

The container port in the `load_balancer` block of the ECS service must match a port mapping in the task definition:

```hcl
# Task definition has port 8080
container_definitions = jsonencode([
  {
    name = "app"
    image = "my-app:latest"
    portMappings = [
      {
        containerPort = 8080
        hostPort      = 8080
      }
    ]
  }
])

# ECS service must reference port 8080, not 80
load_balancer {
  target_group_arn = aws_lb_target_group.app.arn
  container_name   = "app"
  container_port   = 8080  # Must match task definition
}
```

### 6. Missing Execution Role

Fargate tasks need an execution role for pulling container images and writing logs:

```hcl
resource "aws_iam_role" "ecs_execution" {
  name = "ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
```

### 7. Invalid CPU and Memory Combinations

Fargate has specific valid CPU and memory combinations:

```hcl
# Valid Fargate CPU/Memory combinations:
# CPU    | Memory (MB)
# 256    | 512, 1024, 2048
# 512    | 1024 - 4096 (in 1024 increments)
# 1024   | 2048 - 8192 (in 1024 increments)
# 2048   | 4096 - 16384 (in 1024 increments)
# 4096   | 8192 - 30720 (in 1024 increments)

resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"    # Must be a valid value
  memory                   = "1024"   # Must be compatible with CPU
  # ...
}
```

## Complete Working Example

```hcl
resource "aws_ecs_cluster" "main" {
  name = "my-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "nginx:latest"
      essential = true
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/my-app"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  depends_on = [aws_lb_listener.http]

  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 80
  }
}
```

## Monitoring ECS Services

After deploying your ECS service, set up monitoring with [OneUptime](https://oneuptime.com) to track service health, task failures, and deployment status. Catching container crashes early prevents them from becoming user-facing outages.

## Conclusion

The `InvalidParameterException` for ECS services covers a wide range of configuration issues. The most common are mismatched target group types for Fargate, missing network configuration, and incorrect CPU/memory combinations. Always use `target_type = "ip"` for Fargate, include a `network_configuration` block, and make sure your container port mappings are consistent between the task definition and the service's load balancer configuration.
