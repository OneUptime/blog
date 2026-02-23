# How to Build a Blue-Green Deployment Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Blue-Green Deployment, Zero Downtime, AWS, ALB

Description: A step-by-step guide to building blue-green deployment infrastructure with Terraform using ALB weighted target groups, DNS switching, and automated rollback.

---

Blue-green deployments are the gold standard for safe releases. You run two identical environments - blue (current production) and green (new version). You deploy your update to the green environment, test it, and then switch traffic from blue to green. If anything goes wrong, you switch back instantly. No downtime, no partial deployments, no praying that the rollback works. In this post, we will build this entire setup with Terraform.

## Why Blue-Green?

The key advantage over rolling deployments is that you always have a complete, known-good environment to fall back to. With rolling updates, if something goes wrong midway through, you have a mix of old and new instances. With blue-green, you either serve from blue or green - there is no mixed state. The switchover is atomic.

## Architecture Overview

Our blue-green infrastructure includes:

- Two identical environment stacks (blue and green)
- Application Load Balancer with weighted target groups
- Route53 for DNS-based switching
- Auto Scaling Groups for each environment
- Shared database with backward-compatible schema
- Automated health checking before cutover

## Shared Infrastructure

Some resources are shared between both environments.

```hcl
# Application Load Balancer - shared between blue and green
resource "aws_lb" "app" {
  name               = "app-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true

  tags = {
    Environment = var.environment
  }
}

# HTTPS Listener with weighted routing
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = var.blue_weight
      }

      target_group {
        arn    = aws_lb_target_group.green.arn
        weight = var.green_weight
      }

      stickiness {
        enabled  = true
        duration = 3600
      }
    }
  }
}

# Shared database
resource "aws_db_instance" "app" {
  identifier     = "app-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  multi_az       = true

  backup_retention_period = 35
  deletion_protection     = true
  storage_encrypted       = true

  tags = {
    Environment = var.environment
  }
}
```

## Blue Environment

The blue environment is the current production version.

```hcl
# Blue target group
resource "aws_lb_target_group" "blue" {
  name                 = "app-blue-${var.environment}"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "instance"
  deregistration_delay = 120

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  slow_start = 60

  tags = {
    Color       = "blue"
    Environment = var.environment
  }
}

# Blue launch template
resource "aws_launch_template" "blue" {
  name_prefix   = "app-blue-"
  image_id      = var.blue_ami_id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    app_version = var.blue_version
    environment = var.environment
    color       = "blue"
    db_host     = aws_db_instance.app.address
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name    = "app-blue-${var.environment}"
      Color   = "blue"
      Version = var.blue_version
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Blue Auto Scaling Group
resource "aws_autoscaling_group" "blue" {
  name                = "app-blue-${var.environment}"
  min_size            = var.blue_weight > 0 ? var.min_instances : 0
  max_size            = var.max_instances
  desired_capacity    = var.blue_weight > 0 ? var.desired_instances : 0
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.blue.arn]

  launch_template {
    id      = aws_launch_template.blue.id
    version = "$Latest"
  }

  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "Color"
    value               = "blue"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
```

## Green Environment

The green environment is where you deploy the new version.

```hcl
# Green target group
resource "aws_lb_target_group" "green" {
  name                 = "app-green-${var.environment}"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "instance"
  deregistration_delay = 120

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  slow_start = 60

  tags = {
    Color       = "green"
    Environment = var.environment
  }
}

# Green launch template
resource "aws_launch_template" "green" {
  name_prefix   = "app-green-"
  image_id      = var.green_ami_id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    app_version = var.green_version
    environment = var.environment
    color       = "green"
    db_host     = aws_db_instance.app.address
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name    = "app-green-${var.environment}"
      Color   = "green"
      Version = var.green_version
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Green Auto Scaling Group
resource "aws_autoscaling_group" "green" {
  name                = "app-green-${var.environment}"
  min_size            = var.green_weight > 0 ? var.min_instances : 0
  max_size            = var.max_instances
  desired_capacity    = var.green_weight > 0 ? var.desired_instances : 0
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.green.arn]

  launch_template {
    id      = aws_launch_template.green.id
    version = "$Latest"
  }

  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "Color"
    value               = "green"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
```

## Variables for Traffic Switching

The blue and green weights control where traffic goes.

```hcl
# variables.tf
variable "blue_weight" {
  description = "Traffic weight for blue environment (0-100)"
  type        = number
  default     = 100
}

variable "green_weight" {
  description = "Traffic weight for green environment (0-100)"
  type        = number
  default     = 0
}

variable "blue_ami_id" {
  description = "AMI ID for blue environment"
  type        = string
}

variable "green_ami_id" {
  description = "AMI ID for green environment"
  type        = string
}

variable "blue_version" {
  description = "Application version for blue"
  type        = string
}

variable "green_version" {
  description = "Application version for green"
  type        = string
}

# terraform.tfvars for initial state (blue is live)
# blue_weight   = 100
# green_weight  = 0
# blue_ami_id   = "ami-current"
# green_ami_id  = "ami-new"

# terraform.tfvars for cutover (green is live)
# blue_weight   = 0
# green_weight  = 100
```

## Health Check Lambda

Automate health validation before cutting over traffic.

```hcl
# Lambda function to validate green environment before cutover
resource "aws_lambda_function" "health_validator" {
  filename         = "health_validator.zip"
  function_name    = "blue-green-health-validator"
  role             = aws_iam_role.validator_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 120

  environment {
    variables = {
      GREEN_TARGET_GROUP_ARN = aws_lb_target_group.green.arn
      HEALTH_CHECK_URL       = "http://${aws_lb.app.dns_name}/health"
      SNS_TOPIC_ARN          = aws_sns_topic.deployment_alerts.arn
    }
  }
}

# Step Function for orchestrating the deployment
resource "aws_sfn_state_machine" "blue_green_deploy" {
  name     = "blue-green-deployment"
  role_arn = aws_iam_role.step_function.arn

  definition = jsonencode({
    Comment = "Blue-Green Deployment Workflow"
    StartAt = "ValidateGreenHealth"
    States = {
      ValidateGreenHealth = {
        Type     = "Task"
        Resource = aws_lambda_function.health_validator.arn
        Next     = "WaitForStabilization"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          Next        = "NotifyFailure"
        }]
      }
      WaitForStabilization = {
        Type    = "Wait"
        Seconds = 60
        Next    = "SecondHealthCheck"
      }
      SecondHealthCheck = {
        Type     = "Task"
        Resource = aws_lambda_function.health_validator.arn
        Next     = "NotifySuccess"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          Next        = "NotifyFailure"
        }]
      }
      NotifySuccess = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.deployment_alerts.arn
          Message  = "Green environment is healthy. Ready for traffic cutover."
        }
        End = true
      }
      NotifyFailure = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.deployment_alerts.arn
          Message  = "Green environment health check failed. Do NOT switch traffic."
        }
        End = true
      }
    }
  })
}
```

## Monitoring and Rollback

Track both environments and detect problems quickly.

```hcl
# Alarm on green environment errors during cutover
resource "aws_cloudwatch_metric_alarm" "green_errors" {
  alarm_name          = "green-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_actions       = [aws_sns_topic.deployment_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
    TargetGroup  = aws_lb_target_group.green.arn_suffix
  }
}

# Alarm on response time increase
resource "aws_cloudwatch_metric_alarm" "green_latency" {
  alarm_name          = "green-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 3
  alarm_actions       = [aws_sns_topic.deployment_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
    TargetGroup  = aws_lb_target_group.green.arn_suffix
  }
}

resource "aws_sns_topic" "deployment_alerts" {
  name = "blue-green-deployment-alerts"
}
```

## The Deployment Workflow

The deployment process with this infrastructure follows these steps:

1. Deploy new version to the green environment (update `green_ami_id` and `green_version`, set `green_weight = 0`)
2. Wait for green ASG instances to pass health checks
3. Run the health validator Step Function
4. Gradually shift traffic: `blue_weight = 90, green_weight = 10`
5. Monitor error rates and latency
6. Complete cutover: `blue_weight = 0, green_weight = 100`
7. Keep blue running for quick rollback
8. Once confident, scale down blue: update blue to become the new standby

Each step is a `terraform apply` with updated variable values. Rollback is just reverting the weights.

## Wrapping Up

Blue-green deployments give you the safest possible release process. Two complete environments, instant switching, and instant rollback. The cost is running double infrastructure during the transition period, but the peace of mind is worth it for critical applications.

Terraform makes the entire process manageable. Traffic weights are just variables. Switching between environments is a `terraform apply`. And the complete infrastructure definition ensures both environments are truly identical.

For monitoring both your blue and green environments during deployments and catching regressions before they affect users, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-blue-green-deployment-infrastructure-with-terraform/view) for deployment-aware observability.
