# How to Create Terraform Modules for Compute Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Compute, ECS, EC2, Auto Scaling, Infrastructure as Code

Description: Build reusable Terraform compute modules for EC2 instances, auto scaling groups, ECS services, and Lambda functions with production-ready patterns.

---

Compute resources are at the heart of every application deployment. Whether you are running containers on ECS, instances in an auto scaling group, or serverless functions with Lambda, well-designed Terraform modules for compute patterns save time and reduce mistakes. This post covers the most common compute module patterns with production-ready examples.

## EC2 Instance Module

The simplest compute module wraps an EC2 instance with sensible defaults and security best practices.

```hcl
# modules/ec2-instance/variables.tf
variable "name" {
  description = "Name for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "ami_id" {
  description = "AMI ID for the instance"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID where the instance will be launched"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs to attach"
  type        = list(string)
  default     = []
}

variable "key_name" {
  description = "SSH key pair name"
  type        = string
  default     = null
}

variable "user_data" {
  description = "User data script for instance initialization"
  type        = string
  default     = null
}

variable "root_volume_size" {
  description = "Size of the root EBS volume in GB"
  type        = number
  default     = 20
}

variable "enable_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "iam_instance_profile" {
  description = "IAM instance profile name"
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/ec2-instance/main.tf

resource "aws_instance" "this" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = var.security_group_ids
  key_name               = var.key_name
  user_data              = var.user_data
  iam_instance_profile   = var.iam_instance_profile
  monitoring             = var.enable_monitoring

  # Enforce IMDSv2 for security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  tags = merge(var.tags, {
    Name = var.name
  })

  lifecycle {
    # Prevent accidental destruction
    prevent_destroy = false
  }
}
```

```hcl
# modules/ec2-instance/outputs.tf
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.this.id
}

output "private_ip" {
  description = "Private IP address"
  value       = aws_instance.this.private_ip
}

output "public_ip" {
  description = "Public IP address (if applicable)"
  value       = aws_instance.this.public_ip
}

output "arn" {
  description = "ARN of the EC2 instance"
  value       = aws_instance.this.arn
}
```

## Auto Scaling Group Module

For production workloads, you almost always want an auto scaling group instead of standalone instances.

```hcl
# modules/asg/main.tf

# Launch template defines what instances look like
resource "aws_launch_template" "this" {
  name_prefix   = "${var.name}-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  # Security
  vpc_security_group_ids = var.security_group_ids

  # Enforce IMDSv2
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  # Root volume
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  # IAM role
  iam_instance_profile {
    name = var.iam_instance_profile
  }

  # Startup script
  user_data = var.user_data != null ? base64encode(var.user_data) : null

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = var.name
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

# The auto scaling group itself
resource "aws_autoscaling_group" "this" {
  name                = var.name
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity
  vpc_zone_identifier = var.subnet_ids

  # Use the launch template
  launch_template {
    id      = aws_launch_template.this.id
    version = "$Latest"
  }

  # Health check configuration
  health_check_type         = var.target_group_arn != null ? "ELB" : "EC2"
  health_check_grace_period = var.health_check_grace_period

  # Attach to load balancer if provided
  target_group_arns = var.target_group_arn != null ? [var.target_group_arn] : []

  # Instance refresh for zero-downtime deployments
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
      instance_warmup        = var.instance_warmup
    }
  }

  # Tags propagated to instances
  dynamic "tag" {
    for_each = merge(var.tags, { Name = var.name })
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

# Scaling policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.name}-scale-up"
  autoscaling_group_name = aws_autoscaling_group.this.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.target_cpu_utilization
  }
}
```

## ECS Service Module

Container-based compute is increasingly the default for modern applications. Here is a module for ECS Fargate services.

```hcl
# modules/ecs-service/main.tf

# Task definition describes the containers
resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = var.name
      image     = var.container_image
      cpu       = var.cpu
      memory    = var.memory
      essential = true

      # Port mapping
      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      # Environment variables
      environment = [
        for key, value in var.environment_variables : {
          name  = key
          value = value
        }
      ]

      # Secrets from SSM or Secrets Manager
      secrets = [
        for key, arn in var.secrets : {
          name      = key
          valueFrom = arn
        }
      ]

      # Logging to CloudWatch
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = var.name
        }
      }

      # Health check
      healthCheck = var.health_check_command != null ? {
        command     = ["CMD-SHELL", var.health_check_command]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      } : null
    }
  ])

  tags = var.tags
}

# CloudWatch log group for container logs
resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ECS service runs and maintains the desired number of tasks
resource "aws_ecs_service" "this" {
  name            = var.name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  # Load balancer integration
  dynamic "load_balancer" {
    for_each = var.target_group_arn != null ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.name
      container_port   = var.container_port
    }
  }

  # Enable circuit breaker for automatic rollback
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = var.tags
}

# Auto scaling for the ECS service
resource "aws_appautoscaling_target" "this" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.max_count
  min_capacity       = var.desired_count
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[0].resource_id
  scalable_dimension = aws_appautoscaling_target.this[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.target_cpu_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Data sources
data "aws_region" "current" {}
```

## Lambda Function Module

For serverless compute, a Lambda module encapsulates deployment and configuration.

```hcl
# modules/lambda/main.tf

resource "aws_lambda_function" "this" {
  function_name = var.name
  role          = var.role_arn
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  memory_size   = var.memory_size

  # Deploy from S3 or local zip
  filename         = var.filename
  source_code_hash = var.filename != null ? filebase64sha256(var.filename) : null
  s3_bucket        = var.s3_bucket
  s3_key           = var.s3_key

  environment {
    variables = var.environment_variables
  }

  # VPC configuration for database access
  dynamic "vpc_config" {
    for_each = var.subnet_ids != null ? [1] : []
    content {
      subnet_ids         = var.subnet_ids
      security_group_ids = var.security_group_ids
    }
  }

  tags = var.tags
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}
```

## Using Compute Modules Together

Here is how you might compose these modules in a real deployment:

```hcl
# Deploy an ECS-based web application
module "ecs_cluster" {
  source = "./modules/ecs-cluster"
  name   = "production"
}

module "api_service" {
  source = "./modules/ecs-service"

  name             = "api"
  cluster_id       = module.ecs_cluster.id
  cluster_name     = module.ecs_cluster.name
  container_image  = "myorg/api:v1.2.3"
  container_port   = 8080
  cpu              = 512
  memory           = 1024
  desired_count    = 3
  subnet_ids       = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.app_sg_id]
  target_group_arn = module.alb.target_group_arn
  execution_role_arn = module.iam.ecs_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn

  environment_variables = {
    DB_HOST     = module.database.endpoint
    ENVIRONMENT = "production"
  }

  enable_autoscaling     = true
  max_count              = 10
  target_cpu_utilization = 70
}
```

## Conclusion

Compute modules are some of the most frequently reused modules in any organization. Build them with sensible defaults, enforce security best practices like IMDSv2 and encrypted volumes, and include auto scaling from the start. The patterns here - EC2 instances, auto scaling groups, ECS services, and Lambda functions - cover the vast majority of compute workloads on AWS.

For related content, see our posts on [how to create Terraform modules for networking patterns](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-networking-patterns/view) and [how to create Terraform modules for storage patterns](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-storage-patterns/view).
