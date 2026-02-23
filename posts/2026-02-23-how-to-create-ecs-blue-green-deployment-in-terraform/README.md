# How to Create ECS Blue-Green Deployment in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Blue-Green Deployment, CodeDeploy, Zero Downtime, Infrastructure as Code

Description: Learn how to set up blue-green deployments for ECS services using Terraform with AWS CodeDeploy for zero-downtime releases and automatic rollbacks.

---

Blue-green deployment is a release strategy that reduces downtime and risk by running two identical production environments. One environment (blue) serves live traffic while the other (green) is updated with the new version. Once the green environment is validated, traffic is switched over. If something goes wrong, you can instantly switch back to the blue environment. This guide shows you how to implement blue-green deployments for ECS using Terraform with AWS CodeDeploy.

## How Blue-Green Works with ECS

AWS CodeDeploy manages the blue-green deployment process for ECS services. Here is the flow:

1. A new task definition is registered with the updated container image
2. CodeDeploy creates new tasks (green) using the new task definition
3. The new tasks are registered with a test target group for validation
4. After validation, traffic is shifted from the blue target group to the green target group
5. The old tasks (blue) are terminated after a configurable wait period

Traffic shifting can happen all at once, linearly (e.g., 10% every 5 minutes), or in a canary pattern (e.g., 10% first, then 90% after 15 minutes).

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with public and private subnets
- An ECR repository with your application image

## Network and ALB Setup

```hcl
provider "aws" {
  region = "us-east-1"
}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}

# ALB security group
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Test listener for blue-green validation"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "ecs-blue-green-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.public.ids

  tags = {
    Name = "ecs-blue-green-alb"
  }
}

# Blue target group (initial production)
resource "aws_lb_target_group" "blue" {
  name        = "ecs-blue-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "blue-target-group"
  }
}

# Green target group (new deployment)
resource "aws_lb_target_group" "green" {
  name        = "ecs-green-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "green-target-group"
  }
}

# Production listener (port 80)
resource "aws_lb_listener" "production" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn
  }

  # Ignore changes because CodeDeploy will modify the target group
  lifecycle {
    ignore_changes = [default_action]
  }
}

# Test listener (port 8080) for validation before traffic switch
resource "aws_lb_listener" "test" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8080
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.green.arn
  }

  lifecycle {
    ignore_changes = [default_action]
  }
}
```

## ECS Cluster and Task Definition

```hcl
# ECS security group
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "blue-green-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Task execution role
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/blue-green-app"
  retention_in_days = 30
}

# Task definition
resource "aws_ecs_task_definition" "app" {
  family                   = "blue-green-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      cpu       = 512
      memory    = 1024
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
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])
}

# ECS Service configured for blue-green deployment
resource "aws_ecs_service" "app" {
  name            = "blue-green-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.blue.arn
    container_name   = "app"
    container_port   = 80
  }

  # CodeDeploy manages deployments, so tell Terraform to ignore changes
  deployment_controller {
    type = "CODE_DEPLOY"
  }

  lifecycle {
    ignore_changes = [
      task_definition,
      load_balancer,
      desired_count,
    ]
  }

  depends_on = [aws_lb_listener.production]
}
```

## CodeDeploy Configuration

Set up CodeDeploy to manage the blue-green deployment process.

```hcl
# CodeDeploy IAM role
resource "aws_iam_role" "codedeploy" {
  name = "ecs-codedeploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codedeploy.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

# CodeDeploy application
resource "aws_codedeploy_app" "main" {
  compute_platform = "ECS"
  name             = "blue-green-app"
}

# CodeDeploy deployment group
resource "aws_codedeploy_deployment_group" "main" {
  app_name               = aws_codedeploy_app.main.name
  deployment_group_name  = "blue-green-deployment-group"
  deployment_config_name = "CodeDeployDefault.ECSCanary10Percent5Minutes"
  service_role_arn       = aws_iam_role.codedeploy.arn

  # Automatic rollback on deployment failure
  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  # Blue-green deployment configuration
  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
      wait_time_in_minutes = 0
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  # ECS service details
  ecs_service {
    cluster_name = aws_ecs_cluster.main.name
    service_name = aws_ecs_service.app.name
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  # Load balancer configuration for traffic shifting
  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [aws_lb_listener.production.arn]
      }

      test_traffic_route {
        listener_arns = [aws_lb_listener.test.arn]
      }

      target_group {
        name = aws_lb_target_group.blue.name
      }

      target_group {
        name = aws_lb_target_group.green.name
      }
    }
  }
}
```

## Deployment Configuration Options

AWS provides several built-in deployment configurations, or you can create custom ones.

```hcl
# Custom deployment configuration: shift 25% every 5 minutes
resource "aws_codedeploy_deployment_config" "linear_25" {
  deployment_config_name = "ECSLinear25Percent5Minutes"
  compute_platform       = "ECS"

  traffic_routing_config {
    type = "TimeBasedLinear"

    time_based_linear {
      interval   = 5    # Minutes between each shift
      percentage = 25   # Percentage to shift each interval
    }
  }
}

# Custom deployment configuration: canary 20% for 10 minutes
resource "aws_codedeploy_deployment_config" "canary_20" {
  deployment_config_name = "ECSCanary20Percent10Minutes"
  compute_platform       = "ECS"

  traffic_routing_config {
    type = "TimeBasedCanary"

    time_based_canary {
      interval   = 10   # Wait 10 minutes after initial canary
      percentage = 20   # Send 20% first, then 80% after interval
    }
  }
}
```

## Variables and Outputs

```hcl
variable "ecr_repository_url" {
  description = "ECR repository URL for the application image"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

output "alb_dns_name" {
  description = "ALB DNS name for production traffic"
  value       = aws_lb.main.dns_name
}

output "test_url" {
  description = "URL for testing the green deployment"
  value       = "http://${aws_lb.main.dns_name}:8080"
}

output "codedeploy_app" {
  description = "CodeDeploy application name"
  value       = aws_codedeploy_app.main.name
}
```

## Best Practices

When implementing blue-green deployments, use canary or linear traffic shifting rather than all-at-once to catch issues before they affect all users. Always enable automatic rollback on deployment failure. Set up CloudWatch alarms that trigger rollbacks when error rates or latency exceed thresholds. Use the test listener on port 8080 to validate the green environment before shifting production traffic. Keep the blue instance termination wait time long enough to confirm the deployment is stable.

## Monitoring with OneUptime

Blue-green deployments need close monitoring during traffic shifts. Use [OneUptime](https://oneuptime.com) to track error rates, response times, and availability during deployments, and get immediate alerts if the new version causes issues.

## Conclusion

Blue-green deployment with ECS and CodeDeploy provides a safe, automated way to release new versions of your containerized applications. Terraform makes the entire setup reproducible, from the dual target groups to the CodeDeploy configuration. By using canary or linear traffic shifting with automatic rollback, you can deploy with confidence knowing that any issues will be caught quickly and rolled back automatically.

For related ECS topics, check out our guides on [ECS with capacity providers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-capacity-providers-in-terraform/view) and [ECS with CloudWatch Container Insights](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-cloudwatch-container-insights-in-terraform/view).
